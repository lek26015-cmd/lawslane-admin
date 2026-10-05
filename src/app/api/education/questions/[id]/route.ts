import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';
import { recomputeOcrIssues } from '@/lib/exam-import';
import { invalidateExamListCache } from '@/lib/education-cache';

// Helper: find question, given its parent exam id directly when known
// (avoids scanning every examSets doc — see LAWSLANE-PLAN-01 2.1).
async function findQuestion(db: admin.firestore.Firestore, questionId: string, examId?: string | null) {
    if (examId) {
        const qRef = db.collection('examSets').doc(examId).collection('questions').doc(questionId);
        const qSnap = await qRef.get();
        if (qSnap.exists) {
            return { ref: qRef, data: { id: qSnap.id, ...qSnap.data() }, examId };
        }
        // Fall through to the full scan in case the given examId was stale/wrong.
    }

    // Fallback: search every examSets sub-collection for this question ID.
    const examSetsSnap = await db.collection('examSets').get();
    for (const examDoc of examSetsSnap.docs) {
        const qRef = examDoc.ref.collection('questions').doc(questionId);
        const qSnap = await qRef.get();
        if (qSnap.exists) {
            return { ref: qRef, data: { id: qSnap.id, ...qSnap.data() }, examId: examDoc.id };
        }
    }
    return null;
}

// GET /api/education/questions/[id] - Get single question
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // ข้อมูลดิบรวมเฉลย — เดิมไม่มีด่าน ใครรู้ id ก็อ่านได้ (middleware ไม่ครอบ /api)
        try {
            await requireAdmin('education.exams');
        } catch (e) {
            return authErrorResponse(e);
        }

        const { id } = await params;
        const app = await initAdmin();
        if (!app) return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });

        const db = admin.firestore();
        const examId = request.nextUrl.searchParams.get('examId');
        const result = await findQuestion(db, id, examId);

        if (!result) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 });
        }

        return NextResponse.json(result.data);
    } catch (error) {
        console.error('Error fetching question:', error);
        return NextResponse.json({ error: 'Failed to fetch question' }, { status: 500 });
    }
}

// PUT /api/education/questions/[id] - Update question
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // ยกมาจาก lawlanes-education ตอนรวมหลังบ้าน (Module 5)
        // ด่านเดิมเป็น session cookie ของระบบ email/password แยกของ education
        // repo นี้ใช้ Firebase custom claim ผ่าน requireAdmin() ของ auth-guard
        try {
            await requireAdmin('education.exams');
        } catch (e) {
            return authErrorResponse(e);
        }

        const { id } = await params;
        const body = await request.json();
        const app = await initAdmin();
        if (!app) return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });

        const db = admin.firestore();
        const result = await findQuestion(db, id, body.examId);

        if (!result) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 });
        }

        const updates: Record<string, any> = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const allowedFields = [
            'questionText', 'text', 'type', 'choices', 'options',
            'correctOptionIndex', 'correctAnswer', 'correctAnswerText',
            'modelAnswer', 'explanation', 'orderIndex', 'order',
            'subject', 'tags'
        ];
        for (const key of allowedFields) {
            if (body[key] !== undefined) updates[key] = body[key];
        }

        const existing = (await result.ref.get()).data() || {};

        // หน้าแก้ไขส่งฟิลด์ชื่อฝั่ง UI (text/options/correctOptionIndex/correctAnswerText/ESSAY)
        // แต่ทุกตัวอ่าน (เว็บนักศึกษา, หน้า review) ใช้ questionText/choices/correctAnswer/modelAnswer
        // จึงเขียนฟิลด์ชื่อจริงคู่กันไปด้วย ไม่งั้นแก้แล้วไม่มีผลกับข้อสอบที่นักศึกษาเห็น
        if (typeof body.text === 'string' && body.questionText === undefined) updates.questionText = body.text;
        if (body.type === 'ESSAY') updates.type = 'essay';
        if (body.type === 'MULTIPLE_CHOICE') updates.type = 'multiple_choice';
        if (Array.isArray(body.options) && body.choices === undefined) {
            updates.choices = updates.type === 'essay' ? [] : body.options;
        }
        if (Number.isInteger(body.correctOptionIndex) && body.correctAnswer === undefined && updates.type !== 'essay') {
            // รูปแบบเดียวกับตอนสร้าง "(n) ข้อความตัวเลือก" — เดิมเขียนแค่ "(n)" ข้อความเฉลยหาย
            const choices: unknown[] = Array.isArray(updates.choices) ? updates.choices
                : Array.isArray(existing.choices) ? existing.choices : [];
            const choice = choices[body.correctOptionIndex];
            const choiceText = typeof choice === 'string' ? choice : (choice as any)?.text || '';
            updates.correctAnswer = `(${body.correctOptionIndex + 1})${choiceText ? ` ${choiceText}` : ''}`;
        }
        if (typeof body.correctAnswerText === 'string' && body.modelAnswer === undefined && updates.type !== 'multiple_choice') {
            updates.modelAnswer = body.correctAnswerText;
        }
        // หมวดวิชาที่ทุกตัวอ่านใช้คือ tags[0] (ฟิลด์ subject ไม่มีใครอ่าน)
        if (typeof body.subject === 'string' && body.tags === undefined) {
            const rest = Array.isArray(existing.tags) ? existing.tags.slice(1) : [];
            updates.tags = body.subject.trim() ? [body.subject.trim(), ...rest] : rest;
        }

        // ข้อจากระบบนำเข้า OCR: ตรวจภาษา/ความครบใหม่ (ใช้ตัดสินว่าเผยแพร่ได้หรือยัง)
        const ocrIssues = recomputeOcrIssues(existing, updates);
        if (ocrIssues) updates.ocrIssues = ocrIssues;

        await result.ref.update(updates);

        // หน้าแก้ไขเอาผลนี้ไปแสดงแทนข้อเดิม จึงคืน type ในรูปแบบที่หน้านั้นส่งมา (ESSAY / MULTIPLE_CHOICE)
        return NextResponse.json({ id, ...updates, ...(body.type !== undefined ? { type: body.type } : {}) });
    } catch (error) {
        console.error('Error updating question:', error);
        return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
    }
}

// DELETE /api/education/questions/[id] - Delete question
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // ยกมาจาก lawlanes-education ตอนรวมหลังบ้าน (Module 5)
        // ด่านเดิมเป็น session cookie ของระบบ email/password แยกของ education
        // repo นี้ใช้ Firebase custom claim ผ่าน requireAdmin() ของ auth-guard
        try {
            await requireAdmin('education.exams');
        } catch (e) {
            return authErrorResponse(e);
        }

        const { id } = await params;
        const app = await initAdmin();
        if (!app) return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });

        const db = admin.firestore();
        const examId = request.nextUrl.searchParams.get('examId');
        const result = await findQuestion(db, id, examId);

        if (!result) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 });
        }

        await result.ref.delete();

        // นับจำนวนจริงแล้วเขียนทับ totalQuestions เหมือนตอนเพิ่มข้อ — เดิมลบแล้วตัวเลขไม่ลด
        const examRef = db.collection('examSets').doc(result.examId);
        const countSnap = await examRef.collection('questions').count().get();
        await examRef.update({
            totalQuestions: countSnap.data().count,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        invalidateExamListCache();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting question:', error);
        return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
    }
}

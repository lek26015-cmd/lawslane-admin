import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';

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

        await result.ref.update(updates);

        return NextResponse.json({ id, ...updates });
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
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting question:', error);
        return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
    }
}

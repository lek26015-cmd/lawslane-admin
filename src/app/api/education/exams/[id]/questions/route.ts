import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';
import { initAdmin } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { stripAnswerFromQuestion, formatExamText } from '@/lib/exam-utils';
import { anonymizeExamTexts } from '@/lib/name-anonymizer';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
    // route ชุดนี้ใน repo หลังบ้านถูกเรียกจากหน้าแอดมินเท่านั้น (ฝั่งเว็บนักเรียน
    // ใช้สำเนาของตัวเองใน lawlanes-education) จึงใส่ด่านให้ครบ — ของเดิมเป็น GET
    // สาธารณะเพราะออกแบบไว้ให้เว็บนักเรียนเรียก
    try {
        await requireAdmin('education.exams');
    } catch (e) {
        return authErrorResponse(e);
    }
        const { id } = await params;
        const app = await initAdmin();
        if (!app) return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });

        const db = admin.firestore();
        const examDoc = await db.collection('examSets').doc(id).get();
        if (!examDoc.exists) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }

        const qSnap = await examDoc.ref.collection('questions')
            .orderBy('orderIndex', 'asc')
            .get();

        const questions = qSnap.docs.map((qDoc, idx) => {
            const q = qDoc.data();
            const rawType = q.type === 'multiple_choice' || q.type === 'MULTIPLE_CHOICE';
            
            let options: string[] | undefined;
            let correctOptionIndex: number | undefined;
            let hasRealChoices = false;
            
            if (rawType && Array.isArray(q.choices) && q.choices.length > 0) {
                options = q.choices.map((c: any) => typeof c === 'string' ? c : c.text || c);
                hasRealChoices = true;
                if (q.correctAnswer) {
                    const match = q.correctAnswer.match(/\((\d+)\)/);
                    if (match) correctOptionIndex = parseInt(match[1]) - 1;
                }
            }

            const finalType = (rawType && hasRealChoices) ? 'MULTIPLE_CHOICE' : 'ESSAY';
            const { question: cleanText } = stripAnswerFromQuestion(q.questionText || '');

            return {
                id: qDoc.id,
                examId: id,
                text: formatExamText(cleanText),
                type: finalType,
                options: finalType === 'MULTIPLE_CHOICE' ? options : undefined,
                correctOptionIndex: finalType === 'MULTIPLE_CHOICE' ? correctOptionIndex : undefined,
                explanation: q.explanation || '',
                order: q.orderIndex ?? idx + 1,
                subject: q.tags?.[0] || '',
                tags: q.tags || [],
            };
        });

        // Batch anonymize
        const allTexts = questions.map((q: any) => q.text);
        const anonymized = anonymizeExamTexts(allTexts, id);
        const anonymizedQuestions = questions.map((q: any, i: number) => ({
            ...q,
            text: anonymized[i],
        }));

        return NextResponse.json(anonymizedQuestions);
    } catch (error) {
        console.error('Error fetching questions:', error);
        return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }
}

// ข้อจำกัดขนาดข้อมูลกันคนส่ง payload ใหญ่ผิดปกติเข้ามาเขียน Firestore
const MAX_TEXT_LENGTH = 20000;
const MAX_OPTIONS = 10;
const MAX_OPTION_LENGTH = 2000;

type ParsedQuestion = {
    text: string;
    type: 'MULTIPLE_CHOICE' | 'ESSAY';
    options: string[];
    correctOptionIndex?: number;
    correctAnswerText: string;
    explanation: string;
    subject: string;
};

/**
 * ตรวจ body ให้ตรงกับที่หน้าแก้ไขข้อสอบส่งมา (edit/page.tsx) ทั้ง 2 จุด:
 *   - ปุ่ม "เพิ่มคำถาม" ส่ง newQuestion ทีละข้อ
 *   - "สร้างด้วย AI" วนส่ง GeneratedQuestion ทีละข้อ (ไม่ใช่ array)
 * รูปแบบ: { text, type: 'MULTIPLE_CHOICE' | 'ESSAY', options?, correctOptionIndex?,
 *          correctAnswerText?, explanation?, subject? }
 */
function parseQuestionBody(body: unknown): { ok: true; value: ParsedQuestion } | { ok: false; error: string } {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return { ok: false, error: 'รูปแบบข้อมูลไม่ถูกต้อง' };
    }
    const b = body as Record<string, unknown>;

    const text = typeof b.text === 'string' ? b.text.trim() : '';
    if (!text) return { ok: false, error: 'กรุณากรอกคำถาม' };
    if (text.length > MAX_TEXT_LENGTH) return { ok: false, error: 'คำถามยาวเกินไป' };

    const rawType = typeof b.type === 'string' ? b.type.toUpperCase() : 'ESSAY';
    if (rawType !== 'MULTIPLE_CHOICE' && rawType !== 'ESSAY') {
        return { ok: false, error: 'ประเภทคำถามไม่ถูกต้อง' };
    }

    const optionalString = (v: unknown, max: number) =>
        typeof v === 'string' ? v.trim().slice(0, max) : '';
    const explanation = optionalString(b.explanation, MAX_TEXT_LENGTH);
    const correctAnswerText = optionalString(b.correctAnswerText, MAX_TEXT_LENGTH);
    const subject = optionalString(b.subject, 200);

    if (rawType === 'ESSAY') {
        return { ok: true, value: { text, type: 'ESSAY', options: [], correctAnswerText, explanation, subject } };
    }

    // ปรนัย — หน้าแก้ไขเริ่มต้นด้วยตัวเลือกว่าง 4 ช่อง ถ้ากรอกไม่ครบจะตัดช่องว่างทิ้ง
    // แล้วเลื่อน index ของข้อที่ถูกตามไปด้วย
    if (!Array.isArray(b.options)) return { ok: false, error: 'คำถามปรนัยต้องมีตัวเลือก' };
    if (b.options.length > MAX_OPTIONS) return { ok: false, error: `ตัวเลือกได้ไม่เกิน ${MAX_OPTIONS} ข้อ` };

    let correct: number | undefined;
    if (b.correctOptionIndex !== undefined && b.correctOptionIndex !== null) {
        if (typeof b.correctOptionIndex !== 'number' || !Number.isInteger(b.correctOptionIndex)
            || b.correctOptionIndex < 0 || b.correctOptionIndex >= b.options.length) {
            return { ok: false, error: 'ข้อที่ถูกต้องไม่อยู่ในช่วงตัวเลือก' };
        }
        correct = b.correctOptionIndex;
    }

    const options: string[] = [];
    let correctOptionIndex: number | undefined;
    b.options.forEach((opt, idx) => {
        const s = typeof opt === 'string' ? opt.trim().slice(0, MAX_OPTION_LENGTH) : '';
        if (!s) return;
        if (idx === correct) correctOptionIndex = options.length;
        options.push(s);
    });

    if (options.length < 2) return { ok: false, error: 'คำถามปรนัยต้องมีตัวเลือกอย่างน้อย 2 ข้อ' };
    if (correct !== undefined && correctOptionIndex === undefined) {
        return { ok: false, error: 'ตัวเลือกที่ตั้งเป็นข้อถูกต้องว่างอยู่' };
    }

    return {
        ok: true,
        value: { text, type: 'MULTIPLE_CHOICE', options, correctOptionIndex, correctAnswerText, explanation, subject },
    };
}

// POST /api/education/exams/[id]/questions - เพิ่มคำถามทีละข้อ
// ใช้จากหน้าแก้ไขข้อสอบ (เพิ่มเอง + บันทึกผลจาก AI) — เดิมไม่มี handler นี้จึงได้ 405
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        try {
            await requireAdmin('education.exams');
        } catch (e) {
            return authErrorResponse(e);
        }

        const { id } = await params;

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'รูปแบบ JSON ไม่ถูกต้อง' }, { status: 400 });
        }
        const parsed = parseQuestionBody(body);
        if (!parsed.ok) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }
        const q = parsed.value;

        const app = await initAdmin();
        if (!app) return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });

        const db = admin.firestore();
        const examRef = db.collection('examSets').doc(id);
        const questionsRef = examRef.collection('questions');
        const newRef = questionsRef.doc();

        // เก็บตามโครงเดียวกับข้อสอบที่มาจาก OCR: questionText / choices /
        // correctAnswer รูปแบบ "(n) ..." (ตัวอ่านทุกจุดดึงเลขข้อจาก /\((\d+)\)/) และ tags[0] = หมวดวิชา
        const isMc = q.type === 'MULTIPLE_CHOICE';
        const correctAnswer = isMc && q.correctOptionIndex !== undefined
            ? `(${q.correctOptionIndex + 1}) ${q.options[q.correctOptionIndex]}`
            : '';

        let orderIndex = 1;
        const exists = await db.runTransaction(async (tx) => {
            const examSnap = await tx.get(examRef);
            if (!examSnap.exists) return false;

            // orderIndex = ค่ามากสุดที่มีอยู่ + 1 (อ่านใน transaction กันสองคำขอชนกัน)
            const lastSnap = await tx.get(questionsRef.orderBy('orderIndex', 'desc').limit(1));
            const lastOrder = lastSnap.empty ? 0 : Number(lastSnap.docs[0].data().orderIndex) || 0;
            orderIndex = lastOrder + 1;

            tx.set(newRef, {
                questionText: q.text,
                type: isMc ? 'multiple_choice' : 'essay',
                choices: isMc ? q.options : [],
                correctAnswer,
                modelAnswer: isMc ? '' : q.correctAnswerText,
                explanation: q.explanation,
                tags: q.subject ? [q.subject] : [],
                orderIndex,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return true;
        });

        if (!exists) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }

        // นับจำนวนจริงหลังเพิ่มแล้วเขียนทับ totalQuestions (ชื่อฟิลด์ที่หน้ารายการ/API อ่าน)
        // ใช้ค่านับจริงแทน increment เพราะชุดข้อสอบเก่าบางชุดมีแค่ essayCount หรือค่าไม่ตรง
        const countSnap = await questionsRef.count().get();
        await examRef.update({
            totalQuestions: countSnap.data().count,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // ตอบกลับเป็นรูปเดียวกับ GET เพื่อให้หน้าแก้ไขต่อท้ายรายการได้เลย
        return NextResponse.json({
            id: newRef.id,
            examId: id,
            text: q.text,
            type: q.type,
            options: isMc ? q.options : undefined,
            correctOptionIndex: isMc ? q.correctOptionIndex : undefined,
            explanation: q.explanation,
            order: orderIndex,
            subject: q.subject,
            tags: q.subject ? [q.subject] : [],
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating question:', error);
        return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
    }
}

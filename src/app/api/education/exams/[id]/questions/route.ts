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

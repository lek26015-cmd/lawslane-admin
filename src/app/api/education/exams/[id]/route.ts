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
        const { searchParams } = new URL(request.url);
        const includeQuestions = searchParams.get('questions') === 'true';

        const app = await initAdmin();
        if (!app) return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });

        const db = admin.firestore();
        const doc = await db.collection('examSets').doc(id).get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }

        const data = doc.data()!;
        const result: any = {
            id: doc.id,
            title: data.title || '',
            description: data.description || data.instructions || '',
            durationMinutes: data.timeLimitMinutes || 180,
            passingScore: 50,
            totalQuestions: data.totalQuestions || data.essayCount || 0,
            category: data.subjectCode || data.category || 'other',
            difficulty: 'medium',
            subjectCode: data.subjectCode || '',
            session: data.session || '',
            examLevel: data.examLevel || '',
            pageImages: data.pageImages || [],
            hasImages: data.hasImages || false,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
        };

        if (includeQuestions) {
            const qSnap = await doc.ref.collection('questions')
                .orderBy('orderIndex', 'asc')
                .get();

            result.questions = qSnap.docs.map((qDoc, idx) => {
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
                
                // Strip embedded answers from question text
                const rawText = q.questionText || '';
                const { question: cleanText } = stripAnswerFromQuestion(rawText);

                return {
                    id: qDoc.id,
                    examId: id,
                    text: formatExamText(cleanText),
                    type: finalType,
                    options: finalType === 'MULTIPLE_CHOICE' ? options : undefined,
                    correctOptionIndex: finalType === 'MULTIPLE_CHOICE' ? correctOptionIndex : undefined,
                    // Don't send answer to client during exam taking
                    explanation: q.explanation || '',
                    order: q.orderIndex ?? idx + 1,
                    subject: q.tags?.[0] || '',
                    tags: q.tags || [],
                };
            });
            result.totalQuestions = result.questions.length;
        }

        // Batch anonymize question texts
        if (result.questions) {
            const allTexts = result.questions.map((q: any) => q.text);
            const anonymized = anonymizeExamTexts(allTexts, id);
            result.questions = result.questions.map((q: any, i: number) => ({
                ...q,
                text: anonymized[i],
            }));
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching exam:', error);
        return NextResponse.json({ error: 'Failed to fetch exam' }, { status: 500 });
    }
}

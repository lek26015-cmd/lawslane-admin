import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { generateAnswer } from '@/lib/ai-answer-generator';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';

/**
 * Generate AI answers for questions that don't have model answers
 * POST /api/education/exams/[id]/generate-answers
 * Body: { questionIds?: string[] } — optional, if not provided generates for all unanswered
 */
export async function POST(
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
        const body = await request.json().catch(() => ({}));
        const targetQuestionIds: string[] | undefined = body.questionIds;

        const app = await initAdmin();
        if (!app) return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });

        const db = admin.firestore();
        const examDoc = await db.collection('examSets').doc(id).get();
        if (!examDoc.exists) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

        const examData = examDoc.data()!;
        const qSnap = await examDoc.ref.collection('questions')
            .orderBy('orderIndex', 'asc')
            .get();

        const allQuestions = qSnap.docs.map(qDoc => ({
            id: qDoc.id,
            ref: qDoc.ref,
            ...qDoc.data(),
        }));

        // Separate answered and unanswered questions
        const answeredQuestions = allQuestions.filter((q: any) => q.modelAnswer || q.correctAnswer);
        let unansweredQuestions = allQuestions.filter((q: any) => !q.modelAnswer && !q.correctAnswer);

        // If specific questionIds provided, filter to only those
        if (targetQuestionIds && targetQuestionIds.length > 0) {
            unansweredQuestions = allQuestions.filter((q: any) => targetQuestionIds.includes(q.id));
        }

        if (unansweredQuestions.length === 0) {
            return NextResponse.json({
                message: 'ไม่มีข้อที่ต้อง generate',
                generated: 0,
                failed: 0,
                total: allQuestions.length,
            });
        }

        // Build few-shot examples from answered questions
        const fewShotExamples = answeredQuestions.slice(0, 3).map((q: any) => ({
            question: q.questionText || '',
            answer: q.modelAnswer || q.correctAnswer || '',
        }));

        // Generate in concurrency-limited groups instead of one-at-a-time with a
        // fixed 1s sleep between every call — for 40 questions that was ~2-4
        // minutes serial. Groups of 4 (rather than firing all N at once) keep
        // this from hammering the AI provider's rate limit, and each group's
        // Firestore writes go through a single batch instead of N awaited
        // updates. See LAWSLANE-PLAN-01 2.6.
        const CONCURRENCY = 4;
        const GROUP_PAUSE_MS = 500;
        const results: any[] = [];
        let generated = 0;
        let failed = 0;

        for (let i = 0; i < unansweredQuestions.length; i += CONCURRENCY) {
            const group = unansweredQuestions.slice(i, i + CONCURRENCY);

            const groupResults = await Promise.all(group.map(async (q) => {
                const qData = q as any;
                try {
                    const answer = await generateAnswer({
                        questionText: qData.questionText || '',
                        questionType: qData.type || 'essay',
                        choices: qData.choices?.map((c: any) => typeof c === 'string' ? c : c.text || c) || [],
                        subjectCode: examData.subjectCode || '',
                        examLevel: examData.examLevel || '',
                        fewShotExamples,
                    });
                    return { q, answer, error: null as unknown };
                } catch (error) {
                    return { q, answer: null, error };
                }
            }));

            const batch = db.batch();
            let hasWrites = false;
            for (const { q, answer, error } of groupResults) {
                if (error || !answer) {
                    console.error(`Failed to generate answer for question ${q.id}:`, error);
                    results.push({ questionId: q.id, success: false, error: String(error) });
                    failed++;
                    continue;
                }
                batch.update((q as any).ref, {
                    modelAnswer: answer.modelAnswer,
                    explanation: answer.explanation,
                    isAiGenerated: true,
                    aiGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                hasWrites = true;
                results.push({
                    questionId: q.id,
                    success: true,
                    modelAnswer: answer.modelAnswer,
                    explanation: answer.explanation,
                });
                generated++;
            }
            if (hasWrites) await batch.commit();

            if (i + CONCURRENCY < unansweredQuestions.length) {
                await new Promise(resolve => setTimeout(resolve, GROUP_PAUSE_MS));
            }
        }

        return NextResponse.json({
            message: `สร้างธงคำตอบสำเร็จ ${generated} ข้อ${failed > 0 ? ` (ล้มเหลว ${failed} ข้อ)` : ''}`,
            generated,
            failed,
            total: allQuestions.length,
            results,
        });
    } catch (error) {
        console.error('Error generating answers:', error);
        return NextResponse.json({ error: 'Failed to generate answers', details: String(error) }, { status: 500 });
    }
}

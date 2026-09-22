import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';

/**
 * Get comprehensive review data for an exam (raw OCR text + page images + answer status)
 * GET /api/education/exams/[id]/review-data
 */
export async function GET(
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
        const examDoc = await db.collection('examSets').doc(id).get();
        if (!examDoc.exists) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

        const data = examDoc.data()!;
        const qSnap = await examDoc.ref.collection('questions')
            .orderBy('orderIndex', 'asc')
            .get();

        const questions = qSnap.docs.map((qDoc, idx) => {
            const q = qDoc.data();
            return {
                id: qDoc.id,
                order: q.orderIndex ?? idx + 1,
                // Raw OCR text — NOT cleaned or anonymized (admin sees original)
                questionText: q.questionText || '',
                type: q.type || 'essay',
                choices: q.choices || [],
                correctAnswer: q.correctAnswer || '',
                modelAnswer: q.modelAnswer || '',
                explanation: q.explanation || '',
                tags: q.tags || [],
                isAiGenerated: !!q.isAiGenerated,
                aiGeneratedAt: q.aiGeneratedAt?.toDate?.() || null,
                // Page mapping — which scanned page this question is from
                sourcePage: q.sourcePage || null,
            };
        });

        return NextResponse.json({
            id: examDoc.id,
            title: data.title || '',
            description: data.description || '',
            subjectCode: data.subjectCode || '',
            session: data.session || '',
            examLevel: data.examLevel || '',
            sourceFile: data.sourceFile || '',
            pageImages: data.pageImages || [],
            hasImages: data.hasImages || false,
            totalQuestions: questions.length,
            questions,
        });
    } catch (error) {
        console.error('Error fetching review data:', error);
        return NextResponse.json({ error: 'Failed to fetch review data' }, { status: 500 });
    }
}

/**
 * Update a specific question's text/answer (admin editing)
 * PATCH /api/education/exams/[id]/review-data
 * Body: { questionId, questionText?, modelAnswer?, explanation?, correctAnswer? }
 */
export async function PATCH(
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
        const { questionId, ...updates } = body;

        if (!questionId) {
            return NextResponse.json({ error: 'questionId is required' }, { status: 400 });
        }

        const app = await initAdmin();
        if (!app) return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });

        const db = admin.firestore();
        const qRef = db.collection('examSets').doc(id).collection('questions').doc(questionId);
        const qDoc = await qRef.get();

        if (!qDoc.exists) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 });
        }

        // Only allow specific fields to be updated
        const allowedFields = ['questionText', 'modelAnswer', 'explanation', 'correctAnswer', 'choices', 'type'];
        const safeUpdates: Record<string, any> = {};
        for (const key of allowedFields) {
            if (updates[key] !== undefined) {
                safeUpdates[key] = updates[key];
            }
        }

        safeUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        await qRef.update(safeUpdates);

        return NextResponse.json({ success: true, updated: Object.keys(safeUpdates) });
    } catch (error) {
        console.error('Error updating question:', error);
        return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
    }
}

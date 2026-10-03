import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';
import { initAdmin } from '@/lib/firebase-admin';
import { invalidateExamListCache } from '@/lib/education-cache';
import {
    MAX_IMPORT_PAGES,
    categoryFromSubjectCode,
    composeQuestionText,
    computeQuestionIssues,
    sanitizeImportQuestion,
} from '@/lib/exam-import';
import { isExamPageImageUrl } from '@/lib/exam-ocr';

export const maxDuration = 60;

const MAX_QUESTIONS = 200;

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

/**
 * บันทึกข้อสอบที่นำเข้าจาก OCR เป็นชุดใหม่สถานะ draft
 * POST /api/education/exams/import
 * Body: {
 *   meta: { title, subjectCode?, session?, description?, timeLimitMinutes?, passingScore?, examLevel?, sourceFile? },
 *   pages: [{ page, url }],          // ภาพหน้าข้อสอบใน R2 (ใช้ในหน้า review แบบแบ่งจอ)
 *   questions: ImportQuestion[],     // ผลจัดโครงสร้างที่แอดมินตรวจ/แก้ในหน้า preview แล้ว
 * }
 *
 * รูปแบบ document ตรงกับ scripts/seed-ocr-exams.mjs ของ lawlanes-education (เว็บนักศึกษาอ่านอยู่)
 * ทุกข้อมี ocrIssues — ถ้าไม่ว่าง PUT จะไม่ยอมให้เผยแพร่จนกว่าจะแก้ในหน้าตรวจ
 */
export async function POST(request: NextRequest) {
    let uid: string;
    try {
        ({ uid } = await requireAdmin('education.exams'));
    } catch (e) {
        return authErrorResponse(e);
    }

    const body = await request.json().catch(() => null);
    const meta = (body?.meta && typeof body.meta === 'object') ? body.meta as Record<string, unknown> : {};
    const title = typeof meta.title === 'string' ? meta.title.trim().slice(0, 200) : '';
    if (!title) return NextResponse.json({ error: 'กรุณากรอกชื่อข้อสอบ' }, { status: 400 });

    // ภาพหน้าข้อสอบต้องเป็นไฟล์ที่อัปโหลดผ่านระบบนี้เท่านั้น
    const rawPages: unknown[] = Array.isArray(body?.pages) ? body.pages : [];
    if (rawPages.length > MAX_IMPORT_PAGES) {
        return NextResponse.json({ error: `เกิน ${MAX_IMPORT_PAGES} หน้า` }, { status: 400 });
    }
    const pageImages: { page: number; url: string }[] = [];
    for (const p of rawPages) {
        const r = p as Record<string, unknown>;
        if (!Number.isInteger(r?.page) || typeof r?.url !== 'string' || !isExamPageImageUrl(r.url)) {
            return NextResponse.json({ error: 'ข้อมูลภาพหน้าข้อสอบไม่ถูกต้อง' }, { status: 400 });
        }
        pageImages.push({ page: r.page as number, url: r.url });
    }
    pageImages.sort((a, b) => a.page - b.page);

    const rawQuestions: unknown[] = Array.isArray(body?.questions) ? body.questions : [];
    const questions = rawQuestions
        .map(sanitizeImportQuestion)
        .filter((q): q is NonNullable<typeof q> => !!q && q.include)
        .filter(q => q.questionText.trim() || q.attachmentText.trim());
    if (questions.length === 0) {
        return NextResponse.json({ error: 'ไม่มีข้อสอบที่เลือกไว้ให้บันทึก' }, { status: 400 });
    }
    if (questions.length > MAX_QUESTIONS) {
        return NextResponse.json({ error: `เกิน ${MAX_QUESTIONS} ข้อ` }, { status: 400 });
    }

    const app = await initAdmin();
    if (!app) return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });
    const db = admin.firestore();

    try {
        const subjectCode = typeof meta.subjectCode === 'string' ? meta.subjectCode.trim().toUpperCase().slice(0, 20) : '';
        const category = categoryFromSubjectCode(subjectCode);
        const mcCount = questions.filter(q => q.type === 'multiple_choice').length;
        const now = admin.firestore.FieldValue.serverTimestamp();

        const prepared = questions.map((q, i) => {
            const questionText = composeQuestionText(q);
            // ocrIssues = ปัญหาที่ต้องแก้ก่อนเผยแพร่ (คำนวณใหม่ทุกครั้งที่แก้ในหน้าตรวจ)
            // importNotes = หมายเหตุจากขั้นจัดโครงสร้าง ไว้ให้แอดมินอ่าน ไม่บล็อกการเผยแพร่
            const ocrIssues = computeQuestionIssues({ questionText, type: q.type, choices: q.choices, correctAnswer: q.correctAnswer });
            const doc: Record<string, unknown> = {
                orderIndex: i + 1,
                type: q.type,
                questionText,
                correctAnswer: q.correctAnswer,
                modelAnswer: q.modelAnswer,
                explanation: '',
                tags: [title],
                isAiGenerated: false,
                sourcePage: q.sourcePage,
                requiresForm: q.requiresForm,
                ocrIssues,
                createdAt: now,
                updatedAt: now,
            };
            if (q.type === 'multiple_choice') doc.choices = q.choices;
            if (q.requiresForm) doc.formType = q.formType;
            if (q.attachmentText) {
                doc.hasAttachment = true;
                doc.attachmentTitle = q.attachmentTitle || 'เอกสารประกอบ';
            }
            if (q.number) doc.sourceNumber = q.number;
            if (q.notes.length) doc.importNotes = q.notes;
            return doc;
        });
        const flagged = prepared.filter(d => (d.ocrIssues as string[]).length > 0).length;

        const examDoc: Record<string, unknown> = {
            title,
            description: typeof meta.description === 'string' && meta.description.trim()
                ? meta.description.slice(0, 5000)
                : `ข้อสอบเก่าวิชา${title}`,
            subjectCode,
            session: typeof meta.session === 'string' ? meta.session.trim().slice(0, 100) : '',
            examLevel: typeof meta.examLevel === 'string' && meta.examLevel.trim() ? meta.examLevel.trim().slice(0, 100) : 'ปริญญาตรี',
            timeLimitMinutes: clampNumber(meta.timeLimitMinutes, 1, 600, 180),
            passingScore: clampNumber(meta.passingScore, 0, 100, 50),
            totalQuestions: prepared.length,
            essayCount: prepared.length - mcCount,
            multipleChoiceCount: mcCount,
            pageImages,
            hasImages: pageImages.length > 0,
            // draft เสมอ — ต้องผ่านหน้าตรวจ OCR และกดเผยแพร่จากหน้าแก้ไข
            status: 'draft',
            source: 'admin-ocr',
            sourceFile: typeof meta.sourceFile === 'string' ? meta.sourceFile.trim().slice(0, 300) : '',
            needsReview: true,
            ocrFlaggedCount: flagged,
            createdBy: uid,
            createdAt: now,
            updatedAt: now,
        };
        if (category) examDoc.category = category;

        // สร้าง examSet ก่อน แล้วเขียนคำถามทีละ batch (≤ 450 ต่อ batch แบบ seed script)
        const examRef = db.collection('examSets').doc();
        let batch = db.batch();
        batch.set(examRef, examDoc);
        let n = 1;
        for (const q of prepared) {
            batch.set(examRef.collection('questions').doc(), q);
            if (++n >= 450) {
                await batch.commit();
                batch = db.batch();
                n = 0;
            }
        }
        if (n > 0) await batch.commit();

        invalidateExamListCache();
        return NextResponse.json({ id: examRef.id, totalQuestions: prepared.length, flaggedQuestions: flagged }, { status: 201 });
    } catch (error) {
        console.error('EXAM_IMPORT_ERROR', error);
        return NextResponse.json({ error: 'บันทึกข้อสอบไม่สำเร็จ' }, { status: 500 });
    }
}

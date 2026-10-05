import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';
import {
    MAX_OCR_IMAGE_BYTES,
    OCR_IMAGE_TYPES,
    OcrError,
    examPagePathFromUrl,
    ocrExamPageImage,
} from '@/lib/exam-ocr';
import { initAdmin } from '@/lib/firebase-admin';

// OCR ทีละหน้า — หน้าเว็บเรียกทีละคำขอ แต่ละคำขอจึงจบได้ใน 60 วินาที
export const maxDuration = 60;

/**
 * OCR ภาพหน้าข้อสอบ 1 หน้า (Gemini vision → สำรองด้วย Typhoon OCR)
 * POST /api/education/exams/ocr-page
 * Body: { url } — ต้องเป็นภาพใต้ exam-pages/ ใน Firebase Storage ของเรา อ่านด้วย admin SDK ตรง
 * (ไม่ fetch URL ที่ผู้เรียกส่งมา — กัน SSRF)
 */
export async function POST(request: NextRequest) {
    try {
        await requireAdmin('education.exams');
    } catch (e) {
        return authErrorResponse(e);
    }

    const body = await request.json().catch(() => null);
    const url = typeof body?.url === 'string' ? body.url : '';
    const path = examPagePathFromUrl(url);
    if (!path) {
        return NextResponse.json({ error: 'URL ภาพไม่ใช่ไฟล์ที่อัปโหลดผ่านระบบนำเข้าข้อสอบ' }, { status: 400 });
    }

    const startedAt = Date.now();
    try {
        const app = await initAdmin();
        if (!app) return NextResponse.json({ error: 'Firebase ยังไม่พร้อม' }, { status: 500 });
        const file = app.storage().bucket().file(path);
        const [meta] = await file.getMetadata();
        const mimeType = String(meta.contentType || 'image/jpeg').split(';')[0].trim();
        if (!OCR_IMAGE_TYPES.includes(mimeType)) {
            return NextResponse.json({ error: `ไฟล์ไม่ใช่ภาพที่รองรับ (${mimeType})` }, { status: 400 });
        }
        if (Number(meta.size || 0) > MAX_OCR_IMAGE_BYTES) {
            return NextResponse.json({ error: 'ภาพใหญ่เกิน 12MB' }, { status: 413 });
        }
        const [image] = await file.download();

        // เวลาที่เหลือของ function (maxDuration 60 วิ เผื่อไว้ 5 วิ)
        const result = await ocrExamPageImage(image, mimeType, 55000 - (Date.now() - startedAt));
        return NextResponse.json(result);
    } catch (error) {
        if (error instanceof OcrError) {
            return NextResponse.json({ error: error.message }, { status: 502 });
        }
        console.error('EXAM_OCR_PAGE_ERROR', error);
        return NextResponse.json({ error: 'OCR ไม่สำเร็จ ลองใหม่อีกครั้ง' }, { status: 500 });
    }
}

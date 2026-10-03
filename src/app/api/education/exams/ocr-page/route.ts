import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';
import {
    MAX_OCR_IMAGE_BYTES,
    OCR_IMAGE_TYPES,
    OcrError,
    isExamPageImageUrl,
    ocrExamPageImage,
} from '@/lib/exam-ocr';

// OCR ทีละหน้า — หน้าเว็บเรียกทีละคำขอ แต่ละคำขอจึงจบได้ใน 60 วินาที
export const maxDuration = 60;

/**
 * OCR ภาพหน้าข้อสอบ 1 หน้า (Gemini vision → สำรองด้วย Typhoon OCR)
 * POST /api/education/exams/ocr-page
 * Body: { url } — ต้องเป็นภาพใน R2_PUBLIC_URL/exam-pages/ เท่านั้น (กัน SSRF)
 */
export async function POST(request: NextRequest) {
    try {
        await requireAdmin('education.exams');
    } catch (e) {
        return authErrorResponse(e);
    }

    const body = await request.json().catch(() => null);
    const url = typeof body?.url === 'string' ? body.url : '';
    if (!process.env.R2_PUBLIC_URL) {
        return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า R2_PUBLIC_URL' }, { status: 500 });
    }
    if (!isExamPageImageUrl(url)) {
        return NextResponse.json({ error: 'URL ภาพไม่ใช่ไฟล์ที่อัปโหลดผ่านระบบนำเข้าข้อสอบ' }, { status: 400 });
    }

    const startedAt = Date.now();
    try {
        // redirect: 'error' — ห้ามตาม redirect ไปโฮสต์อื่น
        const res = await fetch(url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000) });
        if (!res.ok) {
            return NextResponse.json({ error: `ดึงภาพจาก R2 ไม่ได้ (${res.status}) — ตรวจว่า bucket เปิดสาธารณะผ่าน R2_PUBLIC_URL` }, { status: 502 });
        }
        const mimeType = (res.headers.get('content-type') || '').split(';')[0].trim() || 'image/jpeg';
        if (!OCR_IMAGE_TYPES.includes(mimeType)) {
            return NextResponse.json({ error: `ไฟล์ไม่ใช่ภาพที่รองรับ (${mimeType})` }, { status: 400 });
        }
        const declared = Number(res.headers.get('content-length') || 0);
        if (declared > MAX_OCR_IMAGE_BYTES) {
            return NextResponse.json({ error: 'ภาพใหญ่เกิน 12MB' }, { status: 413 });
        }
        const image = Buffer.from(await res.arrayBuffer());
        if (image.length > MAX_OCR_IMAGE_BYTES) {
            return NextResponse.json({ error: 'ภาพใหญ่เกิน 12MB' }, { status: 413 });
        }

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

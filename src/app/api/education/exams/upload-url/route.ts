import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';
import { r2 } from '@/lib/r2';
import { EXAM_PAGE_PREFIX, MAX_IMPORT_PAGES } from '@/lib/exam-import';
import { examPagePublicUrl } from '@/lib/exam-ocr';

/**
 * ขอ presigned URL สำหรับอัปโหลดภาพหน้าข้อสอบขึ้น R2 ตรงจาก browser
 * POST /api/education/exams/upload-url
 * Body: { count: number }
 *
 * ไฟล์ไม่ผ่าน Vercel function เลย (body ของ function จำกัด 4.5MB) — หน้าเว็บแปลงทุกหน้า
 * เป็น JPEG เองก่อน จึงรับเฉพาะ image/jpeg และ server เป็นคนตั้งชื่อไฟล์ (ผู้เรียกเลือก path ไม่ได้)
 */
export async function POST(request: NextRequest) {
    try {
        await requireAdmin('education.exams');
    } catch (e) {
        return authErrorResponse(e);
    }

    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket || !process.env.R2_PUBLIC_URL || !process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
        return NextResponse.json({
            error: 'ยังไม่ได้ตั้งค่า R2 (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL)',
        }, { status: 500 });
    }

    const body = await request.json().catch(() => null);
    const count = Number(body?.count);
    if (!Number.isInteger(count) || count < 1 || count > MAX_IMPORT_PAGES) {
        return NextResponse.json({ error: `จำนวนหน้าต้องอยู่ระหว่าง 1-${MAX_IMPORT_PAGES}` }, { status: 400 });
    }

    try {
        const month = new Date().toISOString().slice(0, 7);
        const batchId = randomUUID();
        const items = await Promise.all(Array.from({ length: count }, async (_, i) => {
            const key = `${EXAM_PAGE_PREFIX}/${month}/${batchId}/p${String(i + 1).padStart(2, '0')}.jpg`;
            const uploadUrl = await getSignedUrl(
                r2,
                new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: 'image/jpeg' }),
                { expiresIn: 15 * 60 },
            );
            return { page: i + 1, key, uploadUrl, publicUrl: examPagePublicUrl(key) };
        }));
        return NextResponse.json({ batchId, items });
    } catch (error) {
        console.error('EXAM_UPLOAD_URL_ERROR', error);
        return NextResponse.json({ error: 'สร้างลิงก์อัปโหลดไม่สำเร็จ' }, { status: 500 });
    }
}

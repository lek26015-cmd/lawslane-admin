import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';
import { initAdmin } from '@/lib/firebase-admin';
import { EXAM_PAGE_PREFIX, MAX_IMPORT_PAGES } from '@/lib/exam-import';
import { examPageBucket, examPageDownloadUrl } from '@/lib/exam-ocr';

/**
 * อัปโหลดภาพหน้าข้อสอบ 1 หน้าขึ้น Firebase Storage
 * POST /api/education/exams/upload-page (multipart: file, batchId, page)
 *
 * เดิมอัปโหลดตรงจาก browser ไป R2 ด้วย presigned URL แต่ R2 ถูกระงับ (บิลค้าง) และต้องตั้ง CORS
 * ตอนนี้ส่งผ่าน server ทีละหน้า — หน้าเว็บบีบเป็น JPEG ~2000px แล้ว หน้าละไม่ถึง 1-2MB
 * จึงไม่ติดเพดาน body 4.5MB ของ Vercel และไม่ต้องตั้ง CORS
 */
const MAX_PAGE_BYTES = 4 * 1024 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
    try {
        await requireAdmin('education.exams');
    } catch (e) {
        return authErrorResponse(e);
    }
    if (!examPageBucket()) {
        return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET' }, { status: 500 });
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    const batchId = String(form?.get('batchId') ?? '');
    const page = Number(form?.get('page'));
    if (!(file instanceof Blob) || !UUID_RE.test(batchId) || !Number.isInteger(page) || page < 1 || page > MAX_IMPORT_PAGES) {
        return NextResponse.json({ error: 'ข้อมูลอัปโหลดไม่ถูกต้อง' }, { status: 400 });
    }
    if (file.size > MAX_PAGE_BYTES) {
        return NextResponse.json({ error: `ภาพหน้า ${page} ใหญ่เกิน 4MB` }, { status: 413 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    // ต้องเป็น JPEG จริง (หน้าเว็บแปลงทุกหน้าเป็น JPEG ก่อนส่ง) — ดู magic bytes ไม่เชื่อ content-type
    if (buf.length < 3 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) {
        return NextResponse.json({ error: 'รับเฉพาะภาพ JPEG' }, { status: 400 });
    }

    try {
        const app = await initAdmin();
        if (!app) return NextResponse.json({ error: 'Firebase ยังไม่พร้อม' }, { status: 500 });
        const month = new Date().toISOString().slice(0, 7);
        const path = `${EXAM_PAGE_PREFIX}/${month}/${batchId}/p${String(page).padStart(2, '0')}.jpg`;
        const token = randomUUID();
        await app.storage().bucket().file(path).save(buf, {
            resumable: false,
            contentType: 'image/jpeg',
            metadata: { cacheControl: 'public, max-age=31536000', metadata: { firebaseStorageDownloadTokens: token } },
        });
        return NextResponse.json({ page, path, url: examPageDownloadUrl(path, token) });
    } catch (error) {
        console.error('EXAM_UPLOAD_PAGE_ERROR', error);
        return NextResponse.json({ error: 'อัปโหลดภาพไม่สำเร็จ' }, { status: 500 });
    }
}

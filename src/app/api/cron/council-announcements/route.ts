import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { initAdmin } from '@/lib/firebase-admin';
import { processPendingImages, syncCouncilSources } from '@/lib/council-pipeline';

// อ่านรูปทีละใบใช้เวลา ~7–20 วิ — จำกัดต่อรอบ ที่เหลือไปรอบถัดไป (ย้อนหลังค่อย ๆ ครบเอง)
export const maxDuration = 300;
const MAX_IMAGES_PER_RUN = 12;

/**
 * Vercel Cron (vercel.json) — หาประกาศรับใบอนุญาตใหม่ของสภาทนายความ แล้วอ่านรูปที่ค้าง
 * ไม่นำเข้า verifiedLawyers เอง: แอดมินต้องตรวจที่ /lawyer-registry/council แล้วกดนำเข้า
 */
export async function GET(request: Request) {
    // fail closed เหมือน cron อื่น — ไม่มี CRON_SECRET = ไม่ทำงาน · เทียบแบบเวลาคงที่
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        console.error('[Cron council] CRON_SECRET is not configured — refusing request.');
        return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
    }
    const a = createHash('sha256').update(request.headers.get('authorization') || '').digest();
    const b = createHash('sha256').update(`Bearer ${cronSecret}`).digest();
    if (!timingSafeEqual(a, b)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const admin = await initAdmin();
        if (!admin) throw new Error('Firebase Admin not initialized');
        const db = admin.firestore();
        const sync = await syncCouncilSources(db);
        const processed = await processPendingImages(db, MAX_IMAGES_PER_RUN);
        return NextResponse.json({ ok: true, ...sync, processed });
    } catch (error: any) {
        console.error('[Cron council] failed', error?.message || error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

'use server';

import { revalidatePath } from 'next/cache';
import { initAdmin } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/auth-guard';

/**
 * ตั้งค่าระบบ education — ยกมาจาก api/education/settings ตอนรวมหลังบ้าน (Module 6)
 *
 * เดิม GET เปิดสาธารณะ (เว็บนักเรียนอ่านค่าบางอย่างไปแสดง) ส่วน PUT กันด้วย
 * session cookie ของระบบ email/password แยกของ education ที่กำลังจะถูกถอดทิ้ง
 * ในหลังบ้านรวมทั้งอ่านและเขียนต้องเป็นแอดมินที่มี custom claim
 */

const SETTINGS_DOC = 'education_config';

async function db() {
    const app = await initAdmin();
    if (!app) throw new Error('Firebase Admin not initialized');
    return app.firestore();
}

export async function getEducationSettingsAction(): Promise<Record<string, unknown>> {
    await requireAdmin('education.settings');
    const doc = await (await db()).collection('settings').doc(SETTINGS_DOC).get();
    return doc.exists ? (doc.data() as Record<string, unknown>) : {};
}

export async function saveEducationSettingsAction(settings: Record<string, unknown>) {
    await requireAdmin('education.settings');
    try {
        await (await db()).collection('settings').doc(SETTINGS_DOC).set(
            { ...settings, updatedAt: new Date() },
            { merge: true },
        );
        revalidatePath('/settings/education');
        return { success: true as const };
    } catch (error) {
        console.error('saveEducationSettingsAction failed:', error);
        return { success: false as const, error: String(error) };
    }
}

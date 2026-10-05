'use server';

import { initAdmin } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { requireUser, AuthError } from '@/lib/auth-guard';

export async function addToVerifiedRegistry(data: {
    licenseNumber: string;
    firstName: string;
    lastName: string;
    province: string;
}) {
    try {
        // เดิมไม่มีด่าน และใช้ .set() ทับ verifiedLawyers/{เลขใบอนุญาต} → ใครก็เขียนทับ
        // รายการในฐานข้อมูลทนายที่ตรวจแล้ว (เช่นเปลี่ยนชื่อ/สถานะของเลขใบอนุญาตคนอื่น)
        // ตอนนี้ต้องล็อกอิน (หน้า lawyer-signup ตั้ง session ก่อนเรียก) และสร้างได้เฉพาะ
        // เลขที่ยังไม่มีในระบบ — ของที่มีอยู่แล้วห้ามแตะ
        const { uid } = await requireUser();
        const licenseNumber = String(data?.licenseNumber ?? '').trim();
        if (!licenseNumber || licenseNumber.length > 50) {
            return { success: false, error: 'เลขใบอนุญาตไม่ถูกต้อง' };
        }
        const app = await initAdmin();
        if (!app) {
            return { success: false, error: 'Firebase Admin initialization failed' };
        }
        const db = getFirestore();

        // Sanitize ID
        const docId = licenseNumber.replace(/\//g, '-');

        // create() ล้มถ้ามีเอกสารอยู่แล้ว (ALREADY_EXISTS) — ถือว่าสำเร็จ ไม่ทับของเดิม
        await db.collection('verifiedLawyers').doc(docId).create({
            licenseNumber,
            firstName: String(data.firstName ?? '').slice(0, 100),
            lastName: String(data.lastName ?? '').slice(0, 100),
            province: String(data.province ?? '').slice(0, 100),
            status: 'pending',
            registeredBy: uid,
            registeredDate: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        return { success: true };
    } catch (error: any) {
        if (error instanceof AuthError) return { success: false, error: error.message };
        if (error?.code === 6 /* ALREADY_EXISTS */) return { success: true };
        console.error("Error adding to verified registry:", error);
        return { success: false, error: error.message };
    }
}

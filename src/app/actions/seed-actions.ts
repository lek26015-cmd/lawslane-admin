'use server';

import { initAdmin } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { requireAdmin, requireSuperAdmin, AuthError } from '@/lib/auth-guard';

/*
 * ⚠️ เดิมทั้งสอง action ในไฟล์นี้ไม่มีด่านตรวจสิทธิ์ — ใครก็ลบโปรไฟล์ทนายคนไหนก็ได้
 * ด้วย id เดียว (deleteLawyerById) หรือสั่งกวาดลบแชท/ทนายทั้งระบบ (deleteTestData)
 * บน Firestore production ที่ใช้ร่วมกันทุกแอป
 */

export async function deleteTestData() {
    // ลบข้อมูลเป็นชุดทั่วทั้งฐาน — super admin เท่านั้น
    try {
        await requireSuperAdmin();
    } catch (e) {
        if (e instanceof AuthError) return { success: false, error: e.message };
        throw e;
    }
    const app = await initAdmin();
    if (!app) {
        return { success: false, error: 'Firebase Admin not initialized' };
    }

    const db = getFirestore(app);

    try {
        let deletedChats = 0;
        let deletedLawyers = 0;

        // Delete mock chats (those with [ทดสอบ] in caseTitle or with mock-lawyer-001)
        const chatsRef = db.collection('chats');
        const chatsSnapshot = await chatsRef.get();

        for (const chatDoc of chatsSnapshot.docs) {
            const data = chatDoc.data();
            if (data.caseTitle?.includes('[ทดสอบ]') || data.lawyerId === 'mock-lawyer-001') {
                // Delete messages subcollection first
                const messagesRef = chatDoc.ref.collection('messages');
                const messagesSnapshot = await messagesRef.get();

                const batch = db.batch();
                messagesSnapshot.docs.forEach((msgDoc: FirebaseFirestore.QueryDocumentSnapshot) => {
                    batch.delete(msgDoc.ref);
                });
                await batch.commit();

                // Delete chat document
                await chatDoc.ref.delete();
                deletedChats++;
            }
        }

        // Delete mock lawyer profiles (with mock ID or test names)
        const lawyersRef = db.collection('lawyerProfiles');
        const lawyersSnapshot = await lawyersRef.get();

        for (const lawyerDoc of lawyersSnapshot.docs) {
            const data = lawyerDoc.data();
            const name = data.name || '';
            if (
                lawyerDoc.id === 'mock-lawyer-001' ||
                name.includes('[ทดสอบ]') ||
                name.includes('จำลอง') ||
                name.includes('ทดสอบ')
            ) {
                await lawyerDoc.ref.delete();
                deletedLawyers++;
            }
        }

        return {
            success: true,
            deletedChats,
            deletedLawyers
        };
    } catch (error: any) {
        console.error('Error deleting test data:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteLawyerById(lawyerId: string) {
    try {
        await requireAdmin('users.lawyers');
    } catch (e) {
        if (e instanceof AuthError) return { success: false, error: e.message };
        throw e;
    }
    const app = await initAdmin();
    if (!app) {
        return { success: false, error: 'Firebase Admin not initialized' };
    }

    const db = getFirestore(app);

    try {
        // Delete lawyer profile
        const lawyerRef = db.collection('lawyerProfiles').doc(lawyerId);
        const lawyerDoc = await lawyerRef.get();

        if (!lawyerDoc.exists) {
            return { success: false, error: 'ไม่พบข้อมูลทนายความ' };
        }

        await lawyerRef.delete();

        return { success: true };
    } catch (error: any) {
        console.error('Error deleting lawyer:', error);
        return { success: false, error: error.message };
    }
}

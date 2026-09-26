'use server';

import { initAdmin } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { requireAdmin, requireUser, AuthError } from '@/lib/auth-guard';
import { sendAdminNotification, type AdminNotificationType } from '@/lib/admin-notify';
import { checkRateLimit } from '@/lib/security/rate-limiter';

export interface NotificationPreferences {
    email: string;
    notifyOnNewUser: boolean;
    notifyOnNewTicket: boolean;
    notifyOnPayment: boolean;
    notifyOnNewLawyer?: boolean;
}

/**
 * ⚠️ เดิมสอง action ด้านล่างรับ `uid` จากผู้เรียกแล้วอ่าน/เขียน users/{uid} ตรงๆ
 * โดยไม่มีด่าน → ใครก็เปลี่ยน notificationPreferences.email ของแอดมินเป็นอีเมล
 * ตัวเองได้ แล้วรับอีเมลแจ้งเตือนของแอดมินแทน (รวมคำร้องถอนเงินที่มีเลขบัญชีธนาคาร)
 * ตอนนี้ต้องเป็นแอดมิน และแก้ได้เฉพาะของตัวเอง — `uid` ที่ส่งมาต้องตรงกับผู้ล็อกอิน
 */
export async function saveNotificationPreferences(uid: string, preferences: NotificationPreferences) {
    try {
        const { uid: callerUid } = await requireAdmin();
        if (uid !== callerUid) return { success: false, error: 'แก้ได้เฉพาะการตั้งค่าของตัวเอง' };
        const app = await initAdmin();
        if (!app) {
            return { success: false, error: 'Firebase Admin initialization failed' };
        }
        const db = getFirestore();

        // เก็บเฉพาะฟิลด์ที่รู้จัก — ไม่เชื่อ object ทั้งก้อนจากผู้เรียก
        await db.collection('users').doc(callerUid).update({
            notificationPreferences: {
                email: String(preferences?.email ?? '').trim().slice(0, 254),
                notifyOnNewUser: preferences?.notifyOnNewUser === true,
                notifyOnNewTicket: preferences?.notifyOnNewTicket === true,
                notifyOnPayment: preferences?.notifyOnPayment === true,
                notifyOnNewLawyer: preferences?.notifyOnNewLawyer !== false,
            }
        });

        return { success: true };
    } catch (error: any) {
        if (error instanceof AuthError) return { success: false, error: error.message };
        console.error('Error saving notification preferences:', error);
        return { success: false, error: error.message };
    }
}

export async function getNotificationPreferences(uid: string): Promise<{ success: boolean, preferences?: NotificationPreferences, error?: string }> {
    try {
        const { uid: callerUid } = await requireAdmin();
        if (uid !== callerUid) return { success: false, error: 'ดูได้เฉพาะการตั้งค่าของตัวเอง' };
        const app = await initAdmin();
        if (!app) {
            return { success: false, error: 'Firebase Admin initialization failed' };
        }
        const db = getFirestore();
        const doc = await db.collection('users').doc(uid).get();

        if (!doc.exists) {
            return { success: false, error: 'User not found' };
        }

        const data = doc.data();
        return { success: true, preferences: data?.notificationPreferences };
    } catch (error: any) {
        if (error instanceof AuthError) return { success: false, error: error.message };
        console.error('Error fetching notification preferences:', error);
        return { success: false, error: error.message };
    }
}


/**
 * แจ้งแอดมินจากหน้าเว็บ
 *
 * เดิมเป็น action เปิดที่รับทั้ง type และ data จากผู้เรียก (ดู lib/admin-notify.ts)
 * ตอนนี้:
 *   - แอดมิน: ส่งได้ทุกประเภทเหมือนเดิม
 *   - ผู้ใช้ทั่วไป: ส่งได้แค่ 'new_lawyer' (หน้า lawyer-signup) และข้อมูลในอีเมล
 *     อ่านจาก lawyerProfiles/{uid ของตัวเอง} ฝั่ง server — ไม่ใช้ data ที่ส่งมา
 *     พร้อมจำกัดความถี่ กันยิงวนให้กล่องอีเมลแอดมินท่วม
 */
export async function notifyAdmins(type: AdminNotificationType, data: any) {
    try {
        const { uid, token, adminApp } = await requireUser();
        const isAdmin = await requireAdmin().then(() => true, () => false);
        if (isAdmin) {
            return await sendAdminNotification(type, data);
        }

        if (type !== 'new_lawyer') {
            console.warn(`[notifyAdmins] non-admin ${uid} tried to send "${type}"`);
            return;
        }

        const rate = await checkRateLimit(`notify-new-lawyer:${uid}`, 1, 10 * 60 * 1000);
        if (!rate.success) return;

        const profile = await adminApp.firestore().collection('lawyerProfiles').doc(uid).get();
        if (!profile.exists) return;
        const p = profile.data() || {};
        await sendAdminNotification('new_lawyer', {
            name: String(p.name || ''),
            email: token.email || '',
            licenseNumber: String(p.licenseNumber || ''),
            uid,
        });
    } catch (error) {
        // ของเดิมไม่เคย throw ออกไปหาหน้าเว็บ — คงพฤติกรรมนั้นไว้ (หน้า signup ไม่ควรล้มเพราะแจ้งเตือน)
        if (!(error instanceof AuthError)) console.error('Error in notifyAdmins action:', error);
    }
}

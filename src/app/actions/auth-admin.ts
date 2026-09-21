'use server';

import { initAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { Resend } from 'resend';

export async function requestAdminPasswordReset(email: string) {
    if (!email) {
        return { success: false, error: 'Email is required' };
    }

    try {
        const app = await initAdmin();
        if (!app) {
            return { success: false, error: 'Firebase Admin initialization failed' };
        }

        const auth = getAuth();

        // 1. Verify user exists in Auth
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(email);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // ตอบเหมือนกรณีสำเร็จ เพื่อไม่ให้ใช้ endpoint นี้ไล่เดาว่าอีเมลไหนมีบัญชีอยู่
                return { success: true };
            }
            throw error;
        }

        // 2. ปลายทางของลิงก์รีเซ็ตต้องเป็นอีเมลของบัญชีใน Firebase Auth เท่านั้น
        //    เดิมใช้ users/{uid}.notificationPreferences.email ซึ่งเป็นฟิลด์ใน Firestore
        //    ที่เจ้าของบัญชีเขียนเองได้ — ลิงก์รีเซ็ตรหัสผ่านไม่ควรวิ่งตามค่าที่แก้ได้
        const targetEmail = userRecord.email;
        if (!targetEmail) {
            return { success: true };
        }

        // 3. Generate Password Reset Link
        const link = await auth.generatePasswordResetLink(email);

        // 4. Send Email via Resend
        if (!process.env.RESEND_API_KEY) {
            console.warn('RESEND_API_KEY is not set. Cannot send email.');
            return { success: false, error: 'Email service not configured' };
        }

        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
            from: 'Lawslane Admin <noreply@lawslane.com>',
            to: targetEmail,
            subject: 'รีเซ็ตรหัสผ่านของคุณ (Lawslane Password Reset)',
            html: `
        <h1>รีเซ็ตรหัสผ่าน</h1>
        <p>คุณได้ทำการร้องขอเพื่อรีเซ็ตรหัสผ่านสำหรับบัญชี: ${email}</p>
        <p>กรุณาคลิกลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่:</p>
        <p><a href="${link}">รีเซ็ตรหัสผ่าน</a></p>
        <p>หากคุณไม่ได้เป็นผู้ร้องขอ กรุณาเพิกเฉยต่ออีเมลฉบับนี้</p>
        <hr />
        <p style="font-size: 12px; color: #666;">อีเมลนี้ถูกส่งไปยังอีเมลที่ผูกกับบัญชีนี้</p>
      `,
        });

        return { success: true };

    } catch (error: any) {
        console.error('Error requesting password reset:', error);
        return { success: false, error: 'ไม่สามารถส่งอีเมลรีเซ็ตรหัสผ่านได้ กรุณาลองใหม่ภายหลัง' };
    }
}

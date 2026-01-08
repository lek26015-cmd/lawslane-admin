'use server';

import { initAdmin } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { Resend } from 'resend';



export interface NotificationPreferences {
    email: string;
    notifyOnNewUser: boolean;
    notifyOnNewTicket: boolean;
    notifyOnPayment: boolean;
    notifyOnNewLawyer?: boolean;
}

export async function saveNotificationPreferences(uid: string, preferences: NotificationPreferences) {
    try {
        const app = await initAdmin();
        if (!app) {
            return { success: false, error: 'Firebase Admin initialization failed' };
        }
        const db = getFirestore();

        await db.collection('users').doc(uid).update({
            notificationPreferences: preferences
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error saving notification preferences:', error);
        return { success: false, error: error.message };
    }
}

export async function getNotificationPreferences(uid: string): Promise<{ success: boolean, preferences?: NotificationPreferences, error?: string }> {
    try {
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
        console.error('Error fetching notification preferences:', error);
        return { success: false, error: error.message };
    }
}

export async function notifyAdmins(type: 'new_user' | 'new_ticket' | 'payment' | 'withdrawal' | 'slip_limit_warning' | 'new_lawyer', data: any) {
    if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY is not set. Skipping admin notifications.');
        return;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const app = await initAdmin();
        if (!app) return;
        const db = getFirestore();

        // 1. Get all admins
        const adminsSnapshot = await db.collection('users').where('role', '==', 'admin').get();

        if (adminsSnapshot.empty) return;

        // 2. Filter admins who want this notification
        const recipients: string[] = [];

        adminsSnapshot.docs.forEach(doc => {
            const userData = doc.data();
            const prefs = userData.notificationPreferences as NotificationPreferences | undefined;

            // Special case for slip_limit_warning: Send ONLY to specific email
            if (type === 'slip_limit_warning') {
                return; // Skip normal admin loop
            }

            // Default to true if no prefs set (or handle as you see fit - maybe default false?)
            // Let's assume if no prefs, they get everything to be safe, or nothing?
            // Based on user request "want to configure", implies current default is "everyone gets it" or "hardcoded".
            // Let's default to: if prefs exist, check them. If not, maybe send to account email?
            // For now, let's say if no prefs, we DON'T send to avoid spam, OR we send to account email.
            // Let's try: If prefs exist, use them. If not, use account email (legacy behavior).

            let shouldNotify = true;
            let emailToSend = userData.email;

            if (prefs) {
                emailToSend = prefs.email || userData.email;
                if (type === 'new_user' && !prefs.notifyOnNewUser) shouldNotify = false;
                if (type === 'new_ticket' && !prefs.notifyOnNewTicket) shouldNotify = false;
                if (type === 'payment' && !prefs.notifyOnPayment) shouldNotify = false;
                if (type === 'new_lawyer' && (prefs.notifyOnNewLawyer === false)) shouldNotify = false;
            }

            if (shouldNotify && emailToSend) {
                recipients.push(emailToSend);
            }
        });

        // Special case injection
        if (type === 'slip_limit_warning') {
            recipients.push('lek.26015@gmail.com');
        }

        if (recipients.length === 0) return;

        // 3. Prepare Email Content
        let subject = '';
        let html = '';

        if (type === 'new_user') {
            subject = `[Lawslane Admin] มีผู้ใช้งานใหม่ลงทะเบียน: ${data.name}`;
            html = `
        <h1>มีผู้ใช้งานใหม่ลงทะเบียน</h1>
        <p><strong>ชื่อ:</strong> ${data.name}</p>
        <p><strong>อีเมล:</strong> ${data.email}</p>
        <p><strong>เวลา:</strong> ${new Date().toLocaleString('th-TH')}</p>
      `;
        } else if (type === 'new_ticket') {
            subject = `[Lawslane Admin] Ticket ใหม่: ${data.problemType}`;
            html = `
        <h1>มีการแจ้งปัญหาใหม่ (Ticket)</h1>
        <p><strong>หัวข้อ:</strong> ${data.problemType}</p>
        <p><strong>รายละเอียด:</strong> ${data.description}</p>
        <p><strong>จาก:</strong> ${data.clientName} (${data.email})</p>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://lawslane.com'}/admin/tickets/${data.ticketId}">ดูรายละเอียด</a></p>
      `;
        } else if (type === 'payment') {
            // Placeholder for payment
            subject = `[Lawslane Admin] การชำระเงินสำเร็จ`;
            html = `<p>มีการชำระเงินเข้ามาใหม่</p>`;
        } else if (type === 'withdrawal') {
            subject = `[Lawslane Admin] คำร้องขอถอนเงินใหม่: ฿${data.amount.toLocaleString()}`;
            html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a365d;">มีคำร้องขอถอนเงินใหม่</h2>
            <div style="background-color: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>ทนายความ:</strong> ${data.lawyerName}</p>
                <p><strong>จำนวนเงิน:</strong> <span style="color: #2563eb; font-weight: bold;">฿${data.amount.toLocaleString()}</span></p>
                <p><strong>ธนาคาร:</strong> ${data.bankName}</p>
                <p><strong>เลขที่บัญชี:</strong> ${data.accountNumber}</p>
                <p><strong>เวลา:</strong> ${new Date().toLocaleString('th-TH')}</p>
            </div>
            <p>กรุณาตรวจสอบและดำเนินการโอนเงินได้ที่ระบบหลังบ้าน:</p>
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://lawslane.com'}/admin/financials" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                ไปที่หน้าการเงิน (Admin)
            </a>
        </div>
            `;
        } else if (type === 'slip_limit_warning') {
            subject = `[Lawslane Admin] แจ้งเตือน: การใช้งาน SlipOK ใกล้เต็มโควต้า (${data.count}/100)`;
            html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #c53030;">แจ้งเตือนโควต้า SlipOK</h2>
            <div style="background-color: #fff5f5; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #feb2b2;">
                <p>ขณะนี้มีการใช้งานตรวจสอบสลิปไปแล้ว</p>
                <p style="font-size: 24px; font-weight: bold; color: #c53030; text-align: center; margin: 20px 0;">
                    ${data.count} / 100 ครั้ง
                </p>
                <p>ประจำเดือน: <strong>${data.month}</strong></p>
            </div>
            <p>กรุณาตรวจสอบแพ็คเกจของคุณ หรือเติมเครดิตหากจำเป็น เพื่อให้ระบบตรวจสอบสลิปทำงานได้อย่างต่อเนื่อง</p>
        </div>
            `;
        } else if (type === 'new_lawyer') {
            subject = `[Lawslane Admin] มีทนายความใหม่สมัครสมาชิก: ${data.name}`;
            html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a365d;">มีทนายความใหม่สมัครสมาชิก</h2>
            <div style="background-color: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>ชื่อ:</strong> ${data.name}</p>
                <p><strong>อีเมล:</strong> ${data.email}</p>
                <p><strong>เลขใบอนุญาต:</strong> ${data.licenseNumber}</p>
                <p><strong>เวลา:</strong> ${new Date().toLocaleString('th-TH')}</p>
            </div>
            <p>กรุณาตรวจสอบข้อมูลและอนุมัติการใช้งานได้ที่ระบบหลังบ้าน:</p>
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://lawslane.com'}/admin/lawyers/${data.uid}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                ตรวจสอบข้อมูลทนายความ
            </a>
        </div>
            `;
        }

        // 4. Send Emails (Batch or Loop)
        // Resend supports multiple 'to' addresses, but they see each other? 
        // Better to send individually or use BCC if supported, or loop.
        // Resend 'to' array sends to all. To hide, use bcc.
        // But let's just loop for now to personalize if needed, or just send one batch.
        // Batch is safer for quota.

        // Remove duplicates
        const uniqueRecipients = [...new Set(recipients)];

        await resend.emails.send({
            from: 'Lawslane Admin <noreply@lawslane.com>',
            to: uniqueRecipients, // This puts everyone in TO. If privacy matters between admins, use bcc.
            // bcc: uniqueRecipients, 
            // to: 'admin@lawslane.com', // Dummy TO
            subject: subject,
            html: html,
        });

        console.log(`[notifyAdmins] Sent ${type} notification to ${uniqueRecipients.length} admins.`);

    } catch (error) {
        console.error('Error sending admin notifications:', error);
    }
}

import 'server-only';

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { initAdmin } from '@/lib/firebase-admin';
import { DESIGNATED_SUPER_ADMIN_EMAILS } from '@/lib/super-admin';

/**
 * ส่งอีเมล + สร้างแจ้งเตือนในระบบถึงแอดมิน — ตัวทำงานจริง (ไม่ใช่ server action)
 *
 * เดิมโค้ดนี้อยู่ใน `notifyAdmins` ของ app/actions/admin-notifications.ts ซึ่งเป็น
 * 'use server' ที่ไม่มีด่าน → ใครก็ยิงให้ระบบส่งอีเมล "[Lawslane Admin] คำร้องถอนเงิน /
 * การชำระเงินสำเร็จ" ปลอมพร้อมเนื้อหาที่ตัวเองกำหนดถึงแอดมินทุกคน และเขียนแจ้งเตือน
 * ลง notifications ได้ ย้ายมาไว้ใน lib (server-only) ให้โค้ดฝั่ง server เรียกตรงได้
 * (เช่น api/verify-slip) ส่วน action ที่เปิดให้หน้าเว็บเรียกมีด่านของตัวเอง
 */

export type AdminNotificationType = 'new_user' | 'new_ticket' | 'payment' | 'withdrawal' | 'slip_limit_warning' | 'new_lawyer';

type NotificationPreferences = {
    email: string;
    notifyOnNewUser: boolean;
    notifyOnNewTicket: boolean;
    notifyOnPayment: boolean;
    notifyOnNewLawyer?: boolean;
};

function escapeHtml(v: string) {
    return v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function escapeDataForHtml(data: any) {
    if (!data || typeof data !== 'object') return data;
    return Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, typeof v === 'string' ? escapeHtml(v) : v])
    );
}

export async function sendAdminNotification(type: AdminNotificationType, data: any) {
    if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY is not set. Skipping admin notifications.');
        return;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // ค่าใน data มาจากข้อมูลที่ผู้ใช้กรอกเอง (ชื่อ, อีเมล, รายละเอียด ticket) แล้วถูกยัด
    // ลง HTML ของอีเมลตรงๆ → แทรกลิงก์/ฟอร์มปลอมเข้ากล่องจดหมายแอดมินได้
    // อีเมลใช้ค่าที่ escape แล้ว ส่วนแจ้งเตือนในระบบ (React render เป็น text อยู่แล้ว) ใช้ค่าดิบ
    const raw = data;
    data = escapeDataForHtml(data);

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


        // Special case injection for slip limit warning
        if (type === 'slip_limit_warning') {
            recipients.push(DESIGNATED_SUPER_ADMIN_EMAILS[0]);
        }

        // FORCE ADD SUPER ADMIN
        recipients.push(DESIGNATED_SUPER_ADMIN_EMAILS[0]);

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
            subject = `[Lawslane Admin] การชำระเงินสำเร็จ - ${data.lawyerName || 'ทนายความ'}`;
            html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a365d;">มีการชำระเงินเข้ามาใหม่</h2>
            <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #86efac;">
                ${data.lawyerName ? `<p><strong>ทนายความ:</strong> ${data.lawyerName}</p>` : ''}
                ${data.amount ? `<p><strong>จำนวนเงิน:</strong> <span style="color: #16a34a; font-weight: bold;">฿${data.amount.toLocaleString()}</span></p>` : ''}
                ${data.slipUrl ? `<p><strong>สลิปการโอน:</strong> <a href="${data.slipUrl}" style="color: #2563eb;">ดูสลิป</a></p>` : ''}
                <p><strong>เวลา:</strong> ${new Date().toLocaleString('th-TH')}</p>
            </div>
            <p>กรุณาตรวจสอบและอนุมัติการชำระเงินได้ที่ระบบหลังบ้าน:</p>
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://lawslane.com'}/admin/financials" style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                ไปที่หน้าตรวจสอบการชำระเงิน
            </a>
        </div>
            `;
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

        // 5. Create In-System Notifications for Admin
        // We link these to the 'admin' recipient which NotificationBell listens to
        try {
            let notificationTitle = subject.replace(/\[Lawslane Admin\] /g, '');
            let notificationMessage = '';
            let notificationLink = '/';

            if (type === 'new_user') {
                notificationMessage = `มีผู้ใช้งานใหม่: ${raw.name} (${raw.email})`;
                notificationLink = '/customers';
            } else if (type === 'new_ticket') {
                notificationMessage = `หัวข้อ: ${raw.problemType} จาก ${raw.clientName}`;
                notificationLink = `/tickets/${raw.ticketId}`;
            } else if (type === 'payment') {
                notificationMessage = `มีการชำระเงินใหม่ ฿${raw.amount?.toLocaleString()} ${raw.lawyerName ? `สำหรับ ${raw.lawyerName}` : ''}`;
                notificationLink = '/financials';
            } else if (type === 'withdrawal') {
                notificationMessage = `คำร้องขอถอนเงินใหม่ ฿${raw.amount?.toLocaleString()} จาก ${raw.lawyerName}`;
                notificationLink = '/financials';
            } else if (type === 'new_lawyer') {
                notificationMessage = `ทนายความใหม่สมัครสมาชิก: ${raw.name}`;
                notificationLink = `/lawyers/${raw.uid}`;
            }

            if (notificationMessage) {
                await db.collection('notifications').add({
                    type: type,
                    title: notificationTitle,
                    message: notificationMessage,
                    link: notificationLink,
                    recipient: 'admin',
                    read: false,
                    createdAt: FieldValue.serverTimestamp(),
                    relatedId: raw.ticketId || raw.uid || null
                });
            }
        } catch (notifError) {
            console.error('Error creating in-system admin notification:', notifError);
        }

        console.log(`[notifyAdmins] Sent ${type} notification to ${uniqueRecipients.length} admins and created in-system notification.`);

    } catch (error) {
        console.error('Error sending admin notifications:', error);
    }
}

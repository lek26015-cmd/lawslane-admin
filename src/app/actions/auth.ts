'use server';

import { getAuth } from 'firebase-admin/auth';
import { Resend } from 'resend';
import { initAdmin } from '@/lib/firebase-admin';
import { requireUser, AuthError } from '@/lib/auth-guard';
import { getMainLink } from '@/lib/domain-utils';

function escapeHtml(v: string) {
  return v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

// Initialize Firebase Admin
initAdmin();

// Helper function to generate premium HTML email
function generateEmailHtml(title: string, content: string, buttonText: string, link: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f9; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 28px; font-weight: bold; color: #0B3979; text-decoration: none; letter-spacing: -0.5px; }
        .card { background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
        .title { color: #1e293b; font-size: 24px; font-weight: bold; margin-top: 0; margin-bottom: 20px; text-align: center; }
        .text { color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
        .button-container { text-align: center; margin: 32px 0; }
        .button { background-color: #0B3979; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(11, 57, 121, 0.2); transition: background-color 0.2s; }
        .button:hover { background-color: #082a5a; }
        .link-text { font-size: 14px; color: #94a3b8; word-break: break-all; text-align: center; margin-top: 24px; }
        .link-text a { color: #0B3979; text-decoration: none; }
        .footer { text-align: center; margin-top: 30px; color: #94a3b8; font-size: 12px; }
        .footer p { margin: 8px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <a href="https://lawslane.com" class="logo">Lawslane</a>
        </div>
        <div class="card">
          <h1 class="title">${title}</h1>
          <div class="text">
            ${content}
          </div>
          <div class="button-container">
            <a href="${link}" class="button">${buttonText}</a>
          </div>
          <div class="link-text">
            หรือคลิกลิงก์นี้:<br>
            <a href="${link}">${link}</a>
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Lawslane. All rights reserved.</p>
          <p>อีเมลนี้เป็นการแจ้งเตือนอัตโนมัติ กรุณาอย่าตอบกลับ</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendCustomVerificationEmail(email: string, name: string) {
  try {
    // เดิมไม่มีด่านเลย และรับทั้ง email และ name จากผู้เรียก → ใครก็ยิงให้ระบบส่งอีเมล
    // หน้าตาเป็นทางการจาก noreply@lawslane.com ไปหาใครก็ได้ พร้อมแทรก HTML ผ่าน name
    // (ใช้ทำ phishing ในนาม Lawslane) — ตอนนี้ต้องล็อกอินอยู่ และส่งได้เฉพาะอีเมลของบัญชีตัวเอง
    const { token } = await requireUser();
    if (!token.email || token.email.toLowerCase() !== String(email || '').trim().toLowerCase()) {
      return { success: false, error: 'ส่งอีเมลยืนยันได้เฉพาะอีเมลของบัญชีที่ล็อกอินอยู่' };
    }
    email = token.email;
    name = escapeHtml(String(name || '').slice(0, 100));

    const auth = getAuth();

    // Generate the email verification link
    const link = await auth.generateEmailVerificationLink(email);

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is missing');
      return { success: false, error: 'Server configuration error: Missing Email API Key' };
    }
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send the email using Resend
    const subject = 'ยืนยันอีเมลเพื่อเริ่มใช้งาน Lawslane';
    const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;

    const content = `
      <p>สวัสดีคุณ <strong>${name}</strong>,</p>
      <p>ขอบคุณที่สมัครสมาชิก Lawslane แพลตฟอร์มสำหรับทนายความมืออาชีพ</p>
      <p>เพื่อให้มั่นใจว่านี่คืออีเมลของคุณจริงๆ กรุณากดยืนยันตัวตนเพื่อเริ่มใช้งานระบบได้ทันที</p>
    `;

    await resend.emails.send({
      from: 'Lawslane <noreply@lawslane.com>',
      to: email,
      subject: encodedSubject,
      html: generateEmailHtml('ยืนยันอีเมลของคุณ', content, 'ยืนยันอีเมล', link),
      text: `สวัสดีคุณ ${name},\n\nขอบคุณที่สมัครสมาชิก Lawslane\nกรุณาคลิกลิงก์ด้านล่างเพื่อยืนยันที่อยู่อีเมลของคุณ:\n\n${link}\n\nหากคุณไม่ได้เป็นผู้ทำการสมัครนี้ กรุณาเพิกเฉยต่ออีเมลฉบับนี้\n\nทีมงาน Lawslane`,
    });

    return { success: true };
  } catch (error: any) {
    if (error instanceof AuthError) return { success: false, error: error.message };
    console.error('Error sending verification email:', error);
    return { success: false, error: 'ส่งอีเมลยืนยันไม่สำเร็จ' };
  }
}

export async function sendCustomPasswordResetEmailV2(email: string) {
  try {
    const auth = getAuth();

    // action นี้เปิดสาธารณะโดยตั้งใจ (หน้าลืมรหัสผ่านยังไม่ได้ล็อกอิน) — จึงห้ามบอกว่า
    // อีเมลไหนมีบัญชี ไม่งั้นใช้ไล่เดารายชื่อผู้ใช้ได้
    let firebaseLink: string;
    try {
      firebaseLink = await auth.generatePasswordResetLink(email);
    } catch (e: any) {
      if (e?.code === 'auth/user-not-found' || e?.code === 'auth/email-not-found') return { success: true };
      throw e;
    }

    // Extract the oobCode from the Firebase link
    const url = new URL(firebaseLink);
    const oobCode = url.searchParams.get('oobCode');

    if (!oobCode) {
      throw new Error('Could not extract reset code');
    }

    // เดิมสร้างลิงก์จาก header `host` ของ request — ผู้โจมตีตั้ง Host เป็นโดเมนตัวเอง
    // แล้วกด "ลืมรหัสผ่าน" ให้เหยื่อ ลิงก์ในอีเมล (ส่งจาก lawslane.com จริง) จะพา
    // oobCode ของเหยื่อไปที่เว็บผู้โจมตี = ยึดบัญชีได้ (password reset poisoning)
    // ต้องใช้โดเมนจาก config เท่านั้น — หน้า reset-password อยู่ที่เว็บหลัก
    const link = getMainLink(`/reset-password?oobCode=${encodeURIComponent(oobCode)}`, 'admin', true);

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is missing');
      return { success: false, error: 'Server configuration error: Missing Email API Key' };
    }
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send the email using Resend
    const subject = 'รีเซ็ตรหัสผ่านของคุณ (Lawslane Password Reset)';
    const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;

    const content = `
      <p>เราได้รับคำขอให้รีเซ็ตรหัสผ่านสำหรับบัญชี Lawslane ของคุณ</p>
      <p>หากคุณเป็นผู้ร้องขอ กรุณากดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่ได้เลยครับ</p>
      <p style="margin-top: 20px; font-size: 14px; color: #64748b;">หากคุณไม่ได้เป็นผู้ร้องขอ กรุณาเพิกเฉยต่ออีเมลฉบับนี้ รหัสผ่านของคุณจะยังคงปลอดภัยเหมือนเดิม</p>
    `;

    await resend.emails.send({
      from: 'Lawslane <noreply@lawslane.com>',
      to: email,
      subject: encodedSubject,
      html: generateEmailHtml('รีเซ็ตรหัสผ่าน', content, 'ตั้งรหัสผ่านใหม่', link),
      text: `รีเซ็ตรหัสผ่าน\n\nเราได้รับคำขอให้รีเซ็ตรหัสผ่านสำหรับบัญชี Lawslane ของคุณ\nกรุณาคลิกลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่:\n\n${link}\n\nหากคุณไม่ได้เป็นผู้ร้องขอ กรุณาเพิกเฉยต่ออีเมลฉบับนี้ รหัสผ่านของคุณจะยังคงเหมือนเดิม\n\nทีมงาน Lawslane`,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: 'ส่งอีเมลรีเซ็ตรหัสผ่านไม่สำเร็จ' };
  }
}

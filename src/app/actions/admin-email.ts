'use server';

import { Resend } from 'resend';
import { requireAdmin, AuthError } from '@/lib/auth-guard';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendAdminEmail(
    recipients: string[],
    subject: string,
    body: string
) {
    // เดิมไม่มีด่านตรวจสิทธิ์ — action นี้รับรายชื่อผู้รับ + หัวข้อ + เนื้อหา HTML จากผู้เรียก
    // ตรงๆ ใครก็ใช้ส่งอีเมลในนาม noreply@lawslane.com ไปหาใครก็ได้ (open relay สำหรับ phishing)
    try {
        await requireAdmin('support');
    } catch (e) {
        if (e instanceof AuthError) return { success: false, error: e.message };
        throw e;
    }

    if (!process.env.RESEND_API_KEY) {
        return { success: false, error: 'Missing API Key' };
    }

    if (!recipients || recipients.length === 0) {
        return { success: false, error: 'No recipients provided' };
    }

    // Resend allows sending to multiple recipients in the 'to' field, 
    // but for privacy (bcc) or individual tracking, it might be better to send individually or use bcc.
    // However, for "All Users" blasts, we should be careful about rate limits and exposing emails.
    // Best practice for blasts is usually BCC or individual sends.
    // Resend's free tier has limits.

    // Let's use BCC for bulk, or loop for small batches.
    // For simplicity in this admin tool, we'll try to send in batches of 50 (Resend limit is often 50 per request).

    const BATCH_SIZE = 50;
    const results = [];
    const errors = [];

    // Split recipients into batches
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);

        try {
            const { data, error } = await resend.emails.send({
                from: 'Lawslane Admin <noreply@lawslane.com>',
                to: ['noreply@lawslane.com'], // Send to self
                bcc: batch, // BCC the actual recipients
                subject: subject,
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            ${body.replace(/\n/g, '<br>')}
            
            <hr style="margin-top: 40px; border: 0; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              This email was sent from the Lawslane Admin Dashboard.
            </p>
          </div>
        `,
            });

            if (error) {
                console.error('Resend Batch Error:', error);
                errors.push(error);
            } else {
                results.push(data);
            }
        } catch (e) {
            console.error('Email Sending Exception:', e);
            errors.push(e);
        }
    }

    if (errors.length > 0) {
        return { success: false, error: 'Some emails failed to send', details: errors };
    }

    return { success: true, data: results, recipients: recipients, subject: subject, body: body, timestamp: new Date().toISOString() };
}

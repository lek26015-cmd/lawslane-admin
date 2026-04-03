'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendLawyerNewCaseEmail(
  lawyerEmail: string,
  lawyerName: string,
  clientName: string,
  caseTitle: string,
  caseLink: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Skipping email notification.');
    return { success: false, error: 'Missing API Key' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Lawslane <noreply@lawslane.com>',
      to: [lawyerEmail],
      subject: `[Lawslane] มีคดีใหม่จากคุณ ${clientName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a365d;">เรียน ทนายความ ${lawyerName}</h2>
          <p>มีลูกค้าใหม่ต้องการปรึกษาคดีกับคุณ โดยมีรายละเอียดดังนี้:</p>
          
          <div style="background-color: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>ลูกค้า:</strong> ${clientName}</p>
            <p><strong>หัวข้อคดี:</strong> ${caseTitle}</p>
          </div>

          <p>คุณสามารถกดปุ่มด้านล่างเพื่อเข้าสู่ห้องแชทและเริ่มให้คำปรึกษาได้ทันที:</p>
          
          <a href="${caseLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            เข้าสู่ห้องแชท
          </a>
          
          <p style="margin-top: 30px; font-size: 12px; color: #718096;">
            หากปุ่มใช้งานไม่ได้ สามารถคลิกที่ลิงก์นี้: <br>
            <a href="${caseLink}">${caseLink}</a>
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend Error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Email Sending Error:', error);
    return { success: false, error };
  }
}

/**
 * Send email to client when admin approves payment
 */
export async function sendClientPaymentApprovedEmail(
  clientEmail: string,
  clientName: string,
  amount: number,
  serviceType: string,
  dashboardLink: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Skipping email.');
    return { success: false, error: 'Missing API Key' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Lawslane <noreply@lawslane.com>',
      to: [clientEmail],
      subject: `[Lawslane] ✅ ยืนยันการชำระเงินสำเร็จ — ฿${amount.toLocaleString()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a365d;">เรียนคุณ ${clientName}</h2>
          <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #86efac;">
            <p style="text-align: center; font-size: 14px; font-weight: bold; color: #16a34a;">✅ การชำระเงินได้รับการอนุมัติเรียบร้อยแล้ว</p>
            <p><strong>ประเภท:</strong> ${serviceType}</p>
            <p><strong>จำนวนเงิน:</strong> <span style="color: #16a34a; font-weight: bold;">฿${amount.toLocaleString()}</span></p>
          </div>
          <p>ท่านสามารถเข้าใช้บริการได้ทันที</p>
          <a href="${dashboardLink}" style="display: inline-block; background-color: #0B3979; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            เข้าสู่ระบบ
          </a>
          <p style="margin-top: 30px; font-size: 12px; color: #718096;">
            © ${new Date().getFullYear()} Lawslane. นี่คือการแจ้งเตือนอัตโนมัติ
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend Error:', error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (error) {
    console.error('Email Sending Error:', error);
    return { success: false, error };
  }
}

/**
 * Send email to client when admin rejects payment
 */
export async function sendClientPaymentRejectedEmail(
  clientEmail: string,
  clientName: string,
  amount: number,
  rejectReason: string,
  retryLink: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Skipping email.');
    return { success: false, error: 'Missing API Key' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Lawslane <noreply@lawslane.com>',
      to: [clientEmail],
      subject: `[Lawslane] ❌ สลิปถูกปฏิเสธ — กรุณาส่งใหม่`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #c53030;">เรียนคุณ ${clientName}</h2>
          <div style="background-color: #fff5f5; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #feb2b2;">
            <p style="text-align: center; font-size: 14px; font-weight: bold; color: #c53030;">❌ สลิปการชำระเงินถูกปฏิเสธ</p>
            <p><strong>จำนวนเงิน:</strong> ฿${amount.toLocaleString()}</p>
            <p><strong>เหตุผล:</strong> ${rejectReason}</p>
          </div>
          <p>กรุณาส่งหลักฐานการชำระเงินใหม่อีกครั้ง</p>
          <a href="${retryLink}" style="display: inline-block; background-color: #e53e3e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            ส่งสลิปใหม่
          </a>
          <p style="margin-top: 30px; font-size: 12px; color: #718096;">
            © ${new Date().getFullYear()} Lawslane. นี่คือการแจ้งเตือนอัตโนมัติ
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend Error:', error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (error) {
    console.error('Email Sending Error:', error);
    return { success: false, error };
  }
}

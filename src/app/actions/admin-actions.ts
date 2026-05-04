'use server';

import { initAdmin } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

/**
 * Approves a pending payment for either a chat case or an appointment.
 */
export async function approvePaymentSlipAction(params: {
    type: 'chat' | 'appointment',
    id: string,
    lawyerId: string,
    amount: number,
    caseTitle?: string,
    payerName?: string
}) {
    try {
        const adminApp = await initAdmin();
        if (!adminApp) return { success: false, error: 'Firebase Admin not initialized.' };
        const db = adminApp.firestore();

        const { type, id, lawyerId, amount, caseTitle, payerName } = params;

        if (type === 'chat') {
            const chatRef = db.collection('chats').doc(id);
            await chatRef.update({
                status: 'active',
                hasNewPayment: false,
                lastMessage: `✅ ระบบยืนยันการชำระเงินเรียบร้อยแล้ว (฿${amount.toLocaleString()})`,
                lastMessageAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Trigger Email Notification using the existing Action in chat-actions
            const { notifyPaymentCompletedAction } = await import('@/app/actions/chat-actions');
            await notifyPaymentCompletedAction({
                chatId: id,
                lawyerId,
                amount,
                caseTitle: caseTitle || 'เคส',
                payerName: payerName || 'ลูกความ',
                isAutoApproved: false,
                skipAdminNotification: true
            });

        } else if (type === 'appointment') {
            const appointmentRef = db.collection('appointments').doc(id);
            await appointmentRef.update({
                status: 'paid',
                hasNewPayment: false
            });
            // We can add appointment specific notification here if desired
        }

        return { success: true };

    } catch (error: any) {
        console.error("Error approving payment slip:", error);
        return { success: false, error: 'เกิดข้อผิดพลาดในการอนุมัติ' };
    }
}

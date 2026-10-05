'use server';

import * as admin from 'firebase-admin';
import { requireAdmin, AuthError } from '@/lib/auth-guard';
import { getPendingAdditionalFee } from '@/lib/additional-fee';

/**
 * อนุมัติ / ปฏิเสธสลิปการชำระเงินของเคสแชทและนัดหมาย
 *
 * ของเดิม: เป็น server action ที่ "ไม่มีด่านตรวจสิทธิ์เลย" และเชื่อ `amount` /
 * `lawyerId` / `caseTitle` / `payerName` จากผู้เรียก → ใครก็ได้ที่ล็อกอินอยู่
 * ยิง action นี้ตรงๆ เปลี่ยนเคสของตัวเองเป็น 'active' หรือนัดหมายเป็น 'paid'
 * โดยไม่ต้องจ่ายเงิน แถมระบบยังส่งอีเมล "ชำระเงินแล้ว" ด้วยยอดที่ผู้ยิงพิมพ์เองให้ทนาย
 *
 * ตอนนี้:
 *   - ต้องเป็นแอดมินที่ถือสิทธิ์ 'financials.verification' (ตรวจสอบสลิป)
 *   - รับแค่ type + id — ยอด/ทนาย/ชื่อเคส/ผู้จ่าย อ่านจากเอกสารใน Firestore เท่านั้น
 *   - อ่าน + ตรวจ + เขียนใน transaction เดียว และอนุมัติได้เฉพาะเอกสารที่รอตรวจจริง
 *     (กันแอดมินสองคนกดพร้อมกัน / กดซ้ำจากหน้าจอที่ค้างไว้ แล้วยอดถูกบวกสองรอบ)
 *   - บันทึก approvedBy / approvedAt ทุกครั้งเพื่อไล่ย้อนหลังได้
 */

const PERM = 'financials.verification';

type Result = { success: true } | { success: false; error: string };

class Rejected extends Error {}

function fail(e: unknown): { success: false; error: string } {
    if (e instanceof AuthError) return { success: false, error: e.message };
    if (e instanceof Rejected) return { success: false, error: e.message };
    console.error('ADMIN_PAYMENT_ACTION_ERROR', e);
    return { success: false, error: 'เกิดข้อผิดพลาดในการอนุมัติ' };
}

function toAmount(v: unknown): number {
    const n = parseFloat(String(v ?? '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
}

/**
 * แยกว่าห้องแชทนี้กำลังรอตรวจสลิป "ของอะไร"
 *
 * ต้องแยกให้ชัด เพราะการอนุมัติแต่ละแบบเขียนข้อมูลต่างกันมาก:
 *   - 'additional'  ค่าบริการเพิ่มเติมของเคสที่ active อยู่แล้ว — เว็บหลัก
 *                   (markCasePaidAction) และ capdeal (payAdditionalFee) เขียน
 *                   pendingPaymentDetails { type: 'additional' } + hasNewPayment: true
 *                   โดยจงใจไม่แตะ chat.amount และไม่ปิดคำขอของทนาย รอขั้นนี้เป็นคนทำ
 *   - 'installment' งวดผ่อนที่สลิปไม่ผ่าน SlipOK (installments[i].status = 'pending_verification')
 *   - 'initial'     ค่าเปิดเคสครั้งแรก (status = 'pending_payment')
 *
 * ห้ามเดาจาก status อย่างเดียว: เคส active ที่มี hasNewPayment ค้างอาจเป็นข้อมูลเก่า
 * ที่ไม่มีรายละเอียดอะไรให้อนุมัติ — ถ้าเหมาว่าเป็นค่าเปิดเคส ก็จะ "อนุมัติ" ทั้งที่
 * ไม่รู้ว่าอนุมัติยอดอะไร จึงคืน null แล้วให้ผู้เรียกปฏิเสธ
 */
type ChatPayment =
    | { kind: 'additional'; amount: number; payerName?: string }
    | { kind: 'installment'; amount: number; index: number; payerName?: string }
    | { kind: 'initial'; amount: number; payerName?: string };

function classifyChatPayment(chat: FirebaseFirestore.DocumentData): ChatPayment | null {
    const details = chat.pendingPaymentDetails;

    if (details?.type === 'additional' && chat.hasNewPayment === true) {
        return { kind: 'additional', amount: toAmount(details.amount), payerName: details.payerName };
    }

    const installments: any[] = Array.isArray(chat.installments) ? chat.installments : [];
    const index = installments.findIndex((i) => i?.status === 'pending_verification');
    if (index >= 0 && (chat.hasNewPayment === true || chat.status === 'pending_payment')) {
        const instDetails = chat[`pendingPaymentDetails_installment_${index}`];
        return {
            kind: 'installment',
            index,
            amount: toAmount(instDetails?.amount ?? installments[index].amount),
            payerName: instDetails?.payerName,
        };
    }

    if (chat.status === 'pending_payment') {
        return {
            kind: 'initial',
            amount: toAmount(details?.amount ?? chat.amount),
            payerName: details?.payerName,
        };
    }

    return null;
}

function recomputeInstallments(installments: any[]) {
    const paid = installments.filter((i) => i?.status === 'paid');
    return {
        paidInstallments: paid.length,
        totalPaid: paid.reduce((sum, i) => sum + toAmount(i.amount), 0),
    };
}

export async function approvePaymentSlipAction(params: {
    type: 'chat' | 'appointment';
    id: string;
}): Promise<Result> {
    try {
        const { uid: adminUid, adminApp } = await requireAdmin(PERM);
        const db = adminApp.firestore();
        const { type, id } = params;
        if (!id || typeof id !== 'string') return { success: false, error: 'ไม่พบรายการ' };

        const now = admin.firestore.FieldValue.serverTimestamp();

        if (type === 'appointment') {
            const ref = db.collection('appointments').doc(id);
            await db.runTransaction(async (tx) => {
                const snap = await tx.get(ref);
                if (!snap.exists) throw new Rejected('ไม่พบนัดหมายนี้');
                // เฉพาะนัดหมายที่ยังรอชำระเท่านั้น — กันกดซ้ำนัดที่จ่ายแล้ว/ยกเลิกแล้ว
                if (snap.get('status') !== 'pending_payment') {
                    throw new Rejected('นัดหมายนี้ไม่ได้อยู่ในสถานะรอตรวจสลิปแล้ว');
                }
                tx.update(ref, {
                    status: 'paid',
                    hasNewPayment: false,
                    approvedBy: adminUid,
                    approvedAt: now,
                });
            });
            return { success: true };
        }

        if (type !== 'chat') {
            // ใบแจ้งหนี้ (invoices) ยังไม่มีขั้นอนุมัติฝั่ง server — ของเดิมตอบ success
            // ทั้งที่ไม่ได้เขียนอะไรเลย แอดมินจึงเข้าใจผิดว่าอนุมัติไปแล้ว
            return { success: false, error: 'ยังไม่รองรับการอนุมัติรายการประเภทนี้' };
        }

        const chatRef = db.collection('chats').doc(id);
        const messageRef = chatRef.collection('messages').doc();

        const outcome = await db.runTransaction(async (tx) => {
            const snap = await tx.get(chatRef);
            if (!snap.exists) throw new Rejected('ไม่พบห้องแชทนี้');
            const chat = snap.data()!;

            const payment = classifyChatPayment(chat);
            if (!payment) throw new Rejected('เคสนี้ไม่มีสลิปที่รอตรวจแล้ว (อาจถูกอนุมัติไปแล้ว)');
            if (!(payment.amount > 0)) throw new Rejected('ยอดที่รอตรวจไม่ถูกต้อง — กรุณาตรวจข้อมูลเคสนี้');

            const update: Record<string, any> = {
                hasNewPayment: false,
                updatedAt: now,
                lastMessageAt: now,
                lastPaymentApprovedBy: adminUid,
                lastPaymentApprovedAt: now,
            };
            let text: string;

            if (payment.kind === 'additional') {
                // ค่าบริการเพิ่มเติม: ยอดรวมของเคสเพิ่มขึ้น "ตอนนี้" เท่านั้น (ตอนแจ้งโอน
                // ทั้งเว็บหลักและ capdeal จงใจไม่แตะ amount) — แบบเดียวกับที่ capdeal
                // เดิมทำ `amount = currentAmount + finalFee` แต่ย้ายมาหลังยืนยันเงินเข้าแล้ว
                // paidAmount ใช้คิดยอดคืนเงินตอนยกเลิกเคส จึงต้องสะสมตามด้วย
                // (เคสเก่าที่ไม่มี paidAmount ถือว่าจ่ายครบตาม amount เดิมแล้ว — เคสนี้
                // active อยู่ แปลว่าค่าเปิดเคสผ่านไปแล้ว)
                const baseAmount = toAmount(chat.amount);
                // paidAmount ≤ 0 ถือว่าไม่มีข้อมูลเหมือนกัน — หน้าแจ้งโอนรุ่นเก่าเขียน 0 ไว้ตอนรอตรวจ
                // และการอนุมัติมือรุ่นเก่าไม่เคยตั้งค่าให้ ทั้งที่เคส active = จ่ายค่าเปิดเคสแล้ว
                const recordedPaid = toAmount(chat.paidAmount);
                const basePaid = recordedPaid > 0 ? recordedPaid : baseAmount;
                update.amount = baseAmount + payment.amount;
                update.paidAmount = basePaid + payment.amount;
                update.pendingPaymentDetails = admin.firestore.FieldValue.delete();

                // ปิดคำขอของทนายตัวที่ลูกความจ่ายจริง — ใช้ตัวเลือกเดียวกับเว็บหลัก
                // (lib/additional-fee.ts) ไม่งั้นคำขอที่จ่ายแล้วจะค้างให้จ่ายซ้ำ
                const fee = getPendingAdditionalFee(chat);
                if (fee?.source === 'pendingFeeRequest') {
                    update.pendingFeeRequest = null;
                } else if (fee?.source === 'additionalFeeRequest') {
                    update['additionalFeeRequest.status'] = 'paid';
                    update['additionalFeeRequest.paidAt'] = now;
                }
                // เคสที่ปิด/ค้างอยู่ในสถานะอื่นไม่ต้องไปแก้ status — แต่ถ้าเว็บหลักตั้ง
                // 'pending_payment' ไว้ตอนแจ้งโอน ให้คืนเป็น active
                if (chat.status === 'pending_payment') {
                    update.status = 'active';
                    update.paidAt = now;
                }
                text = `✅ ระบบยืนยันการชำระค่าบริการเพิ่มเติมเรียบร้อยแล้ว (฿${payment.amount.toLocaleString()})`;
            } else if (payment.kind === 'installment') {
                const installments = [...chat.installments];
                installments[payment.index] = {
                    ...installments[payment.index],
                    status: 'paid',
                    paidAt: new Date().toISOString(),
                };
                const totals = recomputeInstallments(installments);
                update.installments = installments;
                update.paidInstallments = totals.paidInstallments;
                update.totalPaid = totals.totalPaid;
                // ยังมีงวดอื่นรอตรวจอยู่ = ยังต้องค้างในคิว
                update.hasNewPayment = installments.some((i) => i?.status === 'pending_verification');
                if (chat.status === 'pending_payment') {
                    update.status = 'active';
                    update.paidAt = now;
                }
                text = `✅ ระบบยืนยันการชำระเงินงวดที่ ${payment.index + 1} เรียบร้อยแล้ว (฿${payment.amount.toLocaleString()})`;
            } else {
                update.status = 'active';
                update.paidAt = now;
                update.paidAmount = payment.amount;
                update.pendingPaymentDetails = admin.firestore.FieldValue.delete();
                // จ่ายเต็มจำนวนทั้งเคส (เว็บหลักตั้งงวดเป็น paid เฉพาะตอน SlipOK ผ่าน —
                // ถ้าแอดมินเป็นคนยืนยันก็ต้องปิดงวดให้เหมือนกัน)
                if (chat.pendingPaymentDetails?.type === 'case' && Array.isArray(chat.installments) && chat.installments.length > 0) {
                    const installments = chat.installments.map((i: any) => ({
                        ...i,
                        status: 'paid',
                        paidAt: i.paidAt || new Date().toISOString(),
                        slipUrl: i.slipUrl || chat.pendingPaymentDetails?.slipUrl || null,
                    }));
                    const totals = recomputeInstallments(installments);
                    update.installments = installments;
                    update.paidInstallments = totals.paidInstallments;
                    update.totalPaid = totals.totalPaid;
                }
                text = `✅ ระบบยืนยันการชำระเงินเรียบร้อยแล้ว (฿${payment.amount.toLocaleString()})`;
            }

            update.lastMessage = text;
            tx.update(chatRef, update);
            tx.set(messageRef, {
                chatId: id,
                text,
                senderId: 'system',
                senderName: 'ระบบแจ้งเตือน',
                timestamp: now,
                type: 'system_payment',
            });

            return {
                amount: payment.amount,
                lawyerId: String(chat.lawyerId || ''),
                caseTitle: String(chat.caseTitle || 'เคส'),
                payerName: String(payment.payerName || chat.clientName || 'ลูกความ'),
            };
        });

        // อีเมลแจ้งทนาย/ลูกความใช้ค่าที่อ่านจากเอกสาร ไม่ใช่จากผู้เรียก — และส่งไม่สำเร็จ
        // ก็ไม่ทำให้การอนุมัติล้ม (สถานะถูกเขียนไปแล้ว ถ้าตอบ error แอดมินจะกดซ้ำ)
        if (outcome.lawyerId) {
            try {
                const { notifyPaymentCompletedAction } = await import('@/app/actions/chat-actions');
                await notifyPaymentCompletedAction({
                    chatId: id,
                    lawyerId: outcome.lawyerId,
                    amount: outcome.amount,
                    caseTitle: outcome.caseTitle,
                    payerName: outcome.payerName,
                    isAutoApproved: false,
                    skipAdminNotification: true,
                });
            } catch (notifyErr) {
                console.error('ADMIN_PAYMENT_NOTIFY_ERROR', notifyErr);
            }
        }

        return { success: true };
    } catch (e) {
        return fail(e);
    }
}

/**
 * ปฏิเสธสลิปค่าบริการเพิ่มเติม
 *
 * ล้างเฉพาะ "การแจ้งโอนครั้งนี้" (hasNewPayment / pendingPaymentDetails) แต่ "คง"
 * คำขอค่าบริการของทนายไว้ (pendingFeeRequest / additionalFeeRequest) — ลูกความต้อง
 * แนบสลิปใหม่กับคำขอเดิมได้ ถ้าล้างคำขอทิ้งด้วย ทนายต้องขอใหม่ทั้งที่ยังไม่ได้เงิน
 *
 * ยังรองรับเฉพาะค่าบริการเพิ่มเติม — ค่าเปิดเคส/งวดผ่อนมีผลกับสถานะเคส ต้องตัดสินใจ
 * เรื่อง flow ก่อน (ยกเลิกเคส? ให้แนบใหม่?) จึงยังไม่เปิดทางปฏิเสธจากหน้านี้
 */
export async function rejectPaymentSlipAction(params: {
    type: 'chat';
    id: string;
    reason?: string;
}): Promise<Result> {
    try {
        const { uid: adminUid, adminApp } = await requireAdmin(PERM);
        const db = adminApp.firestore();
        if (params.type !== 'chat' || !params.id) {
            return { success: false, error: 'ยังไม่รองรับการปฏิเสธรายการประเภทนี้' };
        }
        const reason = String(params.reason ?? '').trim().slice(0, 500);

        const chatRef = db.collection('chats').doc(params.id);
        const messageRef = chatRef.collection('messages').doc();
        const notificationRef = db.collection('notifications').doc();
        const now = admin.firestore.FieldValue.serverTimestamp();

        await db.runTransaction(async (tx) => {
            const snap = await tx.get(chatRef);
            if (!snap.exists) throw new Rejected('ไม่พบห้องแชทนี้');
            const chat = snap.data()!;

            const payment = classifyChatPayment(chat);
            if (payment?.kind !== 'additional') {
                throw new Rejected('ปฏิเสธได้เฉพาะสลิปค่าบริการเพิ่มเติมที่รอตรวจอยู่');
            }

            const text = `❌ สลิปค่าบริการเพิ่มเติม (฿${payment.amount.toLocaleString()}) ไม่ผ่านการตรวจสอบ` +
                (reason ? ` — ${reason}` : '') + ' กรุณาแนบสลิปใหม่';

            tx.update(chatRef, {
                hasNewPayment: false,
                pendingPaymentDetails: admin.firestore.FieldValue.delete(),
                lastPaymentRejectedBy: adminUid,
                lastPaymentRejectedAt: now,
                lastPaymentRejectReason: reason || null,
                lastMessage: text,
                lastMessageAt: now,
                updatedAt: now,
            });
            tx.set(messageRef, {
                chatId: params.id,
                text,
                senderId: 'system',
                senderName: 'ระบบแจ้งเตือน',
                timestamp: now,
                type: 'system_payment',
            });

            const clientId = chat.clientId || chat.userId;
            if (clientId) {
                tx.set(notificationRef, {
                    type: 'payment_rejected',
                    title: 'สลิปค่าบริการเพิ่มเติมไม่ผ่านการตรวจสอบ',
                    message: text,
                    createdAt: now,
                    read: false,
                    recipient: clientId,
                    link: `/payment?chatId=${params.id}&type=additional`,
                    relatedId: params.id,
                });
            }
        });

        return { success: true };
    } catch (e) {
        return fail(e);
    }
}

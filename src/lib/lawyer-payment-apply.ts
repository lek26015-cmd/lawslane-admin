import 'server-only';
import * as admin from 'firebase-admin';
import { createContractFromChat } from '@/lib/lawyer-contract-service';
import { getPendingAdditionalFee } from '@/lib/additional-fee';
import { partialKey, pendingTotal, readPartial, remainingOf, round2 } from '@/lib/lawyer-payment-partial';

/**
 * สำเนาของ Lawslane/src/lib/lawyer-payment-core.ts — ค่าทนายจ่ายผ่านบัญชีระบบ (LAWSLANE-PLAN-10)
 *
 * หลังบ้านใช้ตอนแอดมินยืนยันสลิปค่าทนาย (applyPaidInTx + postPaidEffects) ให้ห้องแชทเปลี่ยนเป็น
 * "จ่ายแล้ว" แบบเดียวกับที่เว็บหลักทำตอน SlipOK ผ่าน และใช้ listOutstanding/pickDue หา
 * รายการเดียวกันกับที่ลูกความจ่าย
 *
 * ⚠️ แก้ไฟล์นี้ต้องแก้ Lawslane/src/lib/lawyer-payment-core.ts ด้วย (และกลับกัน)
 */

export const LAWYER_PAYMENTS = 'lawyerPayments';
export const DEFAULT_LAWYER_GP_PERCENT = 10;
export const LAWYER_GP_LIMITS = { min: 0, max: 50 };

export type LawyerPaymentType = 'case' | 'installment' | 'additional';
export type LawyerPaymentStatus = 'pending_review' | 'paid' | 'rejected' | 'refund_pending' | 'refunded';
/** held = รอทนายปิดเคส · due = รอแอดมินโอนให้ทนาย · paid = โอนให้ทนายแล้ว · none = คืนเงินลูกความ */
export type LawyerPayoutStatus = 'held' | 'due' | 'paid' | 'none';

export type LawyerPaymentDue = {
    type: LawyerPaymentType;
    /** ยอดเต็มของรายการ */
    amount: number;
    installmentIndex?: number;
    description: string;
    /** แบ่งจ่าย: ยอดที่ยืนยันแล้ว · ยอดสลิปที่รอแอดมินตรวจ · ยอดที่ยังจ่ายได้ (บาท) */
    paidAmount: number;
    pendingAmount: number;
    remaining: number;
    /** มีสลิปรอแอดมินตรวจ (ยอดนั้นถูกกันไว้ จ่ายส่วนที่เหลือได้) */
    pendingReview: boolean;
    /** ลูกความแจ้งโอนตรงให้ทนายก่อนเปลี่ยนเป็นจ่ายผ่านระบบ — ให้ทนายยืนยันรับเงินได้ */
    legacyNotice: { notifiedAt: string; proofUrl: string | null; note: string | null } | null;
};

export function parseAmount(v: unknown): number {
    const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
}

export function isoOrNull(v: any): string | null {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (typeof v?.toDate === 'function') return v.toDate().toISOString();
    if (v instanceof Date) return v.toISOString();
    return null;
}

export const bahtToSatang = (baht: number) => Math.round(baht * 100);

/** ค่าบริการเพิ่มเติมที่จ่ายแล้ว (additionalPayments[]) รวมกัน */
function additionalPaidTotal(chat: FirebaseFirestore.DocumentData): number {
    const list: any[] = Array.isArray(chat.additionalPayments) ? chat.additionalPayments : [];
    return list.reduce((s, p) => s + parseAmount(p?.amount), 0);
}

/**
 * ค่าบริการหลักของเคสก้อนเดียว = chat.amount ลบค่าบริการเพิ่มเติมที่จ่ายแล้ว
 * (จ่ายค่าเพิ่มเติมจะบวกเข้า chat.amount ให้ยอดรวมที่ UI อื่นแสดงยังถูก)
 */
export function caseBaseAmount(chat: FirebaseFirestore.DocumentData): number {
    return Math.max(0, parseAmount(chat.amount) - additionalPaidTotal(chat));
}

/** ค่าบริการแบบจ่ายก้อนเดียว (เคสไม่มีงวด) จ่ายแล้วหรือยัง — รองรับข้อมูลรุ่นเก่า */
export function isCaseFeeSettled(chat: FirebaseFirestore.DocumentData): boolean {
    if (chat.paymentConfirmedAt) return true;
    if (chat.paidAt) return true;
    const base = caseBaseAmount(chat);
    const paid = parseAmount(chat.paidAmount);
    return base > 0 && paid >= base;
}

function legacy(n: any) {
    return n ? { notifiedAt: isoOrNull(n.notifiedAt) || '', proofUrl: n.proofUrl ?? null, note: n.note ?? null } : null;
}

function withPartial(
    chat: FirebaseFirestore.DocumentData,
    d: Omit<LawyerPaymentDue, 'paidAmount' | 'pendingAmount' | 'remaining' | 'pendingReview'>,
): LawyerPaymentDue {
    const part = readPartial(chat, partialKey(d.type, d.installmentIndex));
    const pendingAmount = pendingTotal(part);
    return { ...d, paidAmount: part.paid, pendingAmount, remaining: remainingOf(d.amount, part), pendingReview: pendingAmount > 0 };
}

export function listOutstanding(chat: FirebaseFirestore.DocumentData): LawyerPaymentDue[] {
    const out: LawyerPaymentDue[] = [];

    const additional = getPendingAdditionalFee(chat);
    if (additional) {
        out.push(withPartial(chat, {
            type: 'additional',
            amount: additional.amount,
            description: chat.pendingFeeRequest?.reason || chat.additionalFeeRequest?.reason || 'ค่าบริการเพิ่มเติม',
            legacyNotice: legacy(chat.clientPaymentNotice?.type === 'additional' ? chat.clientPaymentNotice : null),
        }));
    }

    const installments: any[] = Array.isArray(chat.installments) ? chat.installments : [];
    if (installments.length > 0) {
        installments.forEach((inst, i) => {
            if (inst?.status === 'paid') return;
            out.push(withPartial(chat, {
                type: 'installment',
                amount: parseAmount(inst?.amount),
                installmentIndex: i,
                description: `งวดที่ ${i + 1}${inst?.description ? `: ${inst.description}` : ''}`,
                legacyNotice: legacy(inst?.clientNotice),
            }));
        });
    } else if (caseBaseAmount(chat) > 0 && !isCaseFeeSettled(chat)) {
        out.push(withPartial(chat, {
            type: 'case',
            amount: caseBaseAmount(chat),
            description: chat.caseTitle || 'ค่าบริการทนายความ',
            legacyNotice: legacy(chat.clientPaymentNotice?.type === 'case' ? chat.clientPaymentNotice : null),
        }));
    }
    return out;
}

/** เคสนี้มีงวด/ค่าบริการที่จ่ายครบแล้วหรือยัง (ใช้ตัดสินว่าต้องออกสัญญาจ้างไหม) */
function hasAnyPaidItem(chat: FirebaseFirestore.DocumentData): boolean {
    if (chat.paidAt || isCaseFeeSettled(chat)) return true;
    return Array.isArray(chat.installments) && chat.installments.some((x: any) => x?.status === 'paid');
}

export function pickDue(
    outstanding: LawyerPaymentDue[],
    want?: { type?: LawyerPaymentType; installmentIndex?: number },
): LawyerPaymentDue | null {
    if (want?.type === 'installment' && Number.isInteger(want.installmentIndex)) {
        return outstanding.find(d => d.type === 'installment' && d.installmentIndex === want.installmentIndex) ?? null;
    }
    if (want?.type) {
        const hit = outstanding.find(d => d.type === want.type);
        if (hit) return hit;
    }
    return outstanding.find(d => d.remaining > 0) ?? outstanding[0] ?? null;
}

export function dueLabel(type: LawyerPaymentType, installmentIndex?: number | null): string {
    if (type === 'installment') return `งวดที่ ${Number(installmentIndex) + 1}`;
    return type === 'case' ? 'ค่าบริการ' : 'ค่าบริการเพิ่มเติม';
}

/** GP ทนาย (%) — แยกจาก GP ล่าม · ค่าผิดรูป/ยังไม่ตั้ง = ค่าเริ่มต้น */
export async function readLawyerGpPercent(db: FirebaseFirestore.Firestore, tx?: FirebaseFirestore.Transaction): Promise<number> {
    const ref = db.collection('settings').doc('lawyerFees');
    const snap = tx ? await tx.get(ref) : await ref.get();
    const v = snap.data()?.gpPercent;
    return typeof v === 'number' && Number.isFinite(v) && v >= LAWYER_GP_LIMITS.min && v <= LAWYER_GP_LIMITS.max
        ? v
        : DEFAULT_LAWYER_GP_PERCENT;
}

/** แบ่งยอดเต็ม (สตางค์) เป็น GP + สุทธิให้ทนาย */
export function splitGp(grossAmount: number, gpPercent: number) {
    const gpAmount = Math.round((grossAmount * gpPercent) / 100);
    return { gpAmount, netToLawyer: grossAmount - gpAmount };
}

export class LawyerPaymentRejected extends Error {}

export type PaidConfirmation = {
    confirmedBy: string;
    /** platform = เงินเข้าบัญชีระบบ (SlipOK/แอดมิน) · lawyer/admin = ยืนยันรับเงินโอนตรงแบบเดิม */
    confirmedByRole: 'platform' | 'lawyer' | 'admin';
    paymentId?: string | null;
};

/** ยอดเต็มของรายการ (ตรวจว่ารายการยังค้างอยู่) */
function itemAmountOf(chat: FirebaseFirestore.DocumentData, type: LawyerPaymentType, installmentIndex?: number | null): number {
    if (type === 'installment') {
        const installments: any[] = Array.isArray(chat.installments) ? chat.installments : [];
        const i = Number(installmentIndex);
        if (!Number.isInteger(i) || i < 0 || i >= installments.length) throw new LawyerPaymentRejected('หมายเลขงวดไม่ถูกต้อง');
        if (installments[i]?.status === 'paid') throw new LawyerPaymentRejected('งวดนี้ชำระแล้ว');
        return parseAmount(installments[i]?.amount);
    }
    if (type === 'case') {
        if (Array.isArray(chat.installments) && chat.installments.length > 0) {
            throw new LawyerPaymentRejected('เคสนี้แบ่งชำระเป็นงวด กรุณาชำระทีละงวด');
        }
        if (isCaseFeeSettled(chat)) throw new LawyerPaymentRejected('รายการนี้ชำระแล้ว');
        return caseBaseAmount(chat);
    }
    if (type === 'additional') {
        const additional = getPendingAdditionalFee(chat);
        if (!additional) throw new LawyerPaymentRejected('ไม่พบคำขอค่าบริการเพิ่มเติมที่ค้างอยู่');
        return additional.amount;
    }
    throw new LawyerPaymentRejected('ประเภทรายการไม่ถูกต้อง');
}

/**
 * กันยอดสลิปที่รอแอดมินตรวจไว้ในห้อง (partialPayments[key].pending[paymentId]) — คืน update
 * ยอดรวม (จ่ายแล้ว + รอตรวจ + ครั้งนี้) ต้องไม่เกินยอดรายการ
 */
export function reservePendingInTx(
    chat: FirebaseFirestore.DocumentData,
    input: { type: LawyerPaymentType; installmentIndex?: number | null },
    paymentId: string,
    amount: number,
): Record<string, any> {
    const itemAmount = itemAmountOf(chat, input.type, input.installmentIndex);
    const key = partialKey(input.type, input.installmentIndex);
    const part = readPartial(chat, key);
    if (amount <= 0 || amount > remainingOf(itemAmount, part) + 0.005) {
        throw new LawyerPaymentRejected('ยอดเกินยอดคงเหลือของรายการนี้');
    }
    return { [`partialPayments.${key}`]: { paid: part.paid, pending: { ...part.pending, [paymentId]: amount }, itemAmount } };
}

/** แอดมินปฏิเสธสลิป — ปล่อยยอดที่กันไว้ (ไม่มีรายการกันไว้ = คืน {} ) */
export function releasePendingUpdate(
    chat: FirebaseFirestore.DocumentData,
    input: { type: LawyerPaymentType; installmentIndex?: number | null },
    paymentId: string,
): Record<string, any> {
    const key = partialKey(input.type, input.installmentIndex);
    if (readPartial(chat, key).pending[paymentId] === undefined) return {};
    return { [`partialPayments.${key}.pending.${paymentId}`]: admin.firestore.FieldValue.delete() };
}

/**
 * บันทึกเงินที่ได้รับของรายการในห้อง — คืน update ให้ผู้เรียก tx.update เอง (ต้องอ่าน chat ใน tx เดียวกันมาก่อน)
 * payAmount = ยอดครั้งนี้ (ไม่ระบุ = ยอดที่เหลือทั้งหมด) · ยอดสะสมครบยอดรายการ → รายการเป็น "จ่ายแล้ว" ตามฟิลด์เดิม
 * ถ้า confirmation.paymentId เคยกันยอดไว้ตอนรอตรวจ จะย้ายจาก pending มาเป็น paid
 * จ่ายครบแล้วล้างสถานะแบ่งจ่ายและคำแจ้งโอนแบบเดิมของรายการนั้นไปด้วย
 */
export function applyPaidInTx(
    chat: FirebaseFirestore.DocumentData,
    input: { type: LawyerPaymentType; installmentIndex?: number | null },
    confirmation: PaidConfirmation,
    payAmount?: number,
) {
    const nowIso = new Date().toISOString();
    const ts = admin.firestore.FieldValue.serverTimestamp();
    const update: Record<string, any> = { updatedAt: ts, lastMessageAt: ts };
    const conf = {
        confirmedBy: confirmation.confirmedBy,
        confirmedByRole: confirmation.confirmedByRole,
        ...(confirmation.paymentId ? { platformPaymentId: confirmation.paymentId } : {}),
    };

    const itemAmount = itemAmountOf(chat, input.type, input.installmentIndex);
    if (itemAmount <= 0) throw new LawyerPaymentRejected('เคสนี้ยังไม่มียอดค่าบริการ');
    const key = partialKey(input.type, input.installmentIndex);
    const part = readPartial(chat, key);
    const pending = { ...part.pending };
    if (confirmation.paymentId) delete pending[confirmation.paymentId];
    const amount = round2(payAmount ?? itemAmount - part.paid - pendingTotal({ paid: 0, pending }));
    if (amount <= 0) throw new LawyerPaymentRejected('รายการนี้ไม่มียอดคงเหลือให้ชำระ');
    if (part.paid + amount + pendingTotal({ paid: 0, pending }) > itemAmount + 0.005) {
        throw new LawyerPaymentRejected('ยอดเกินยอดคงเหลือของรายการนี้');
    }
    const paidTotal = round2(part.paid + amount);
    const complete = paidTotal >= itemAmount - 0.005;
    // งวด/ค่าบริการแรกที่จ่ายครบ → ออกสัญญาจ้าง (แบ่งจ่ายยังไม่ครบ = ยังไม่ออก)
    // chat.paidAt ตั้งเฉพาะตอนจ่ายครบรายการ (isCaseFeeSettled ถือ paidAt = จ่ายครบ)
    const firstPaid = complete && !hasAnyPaidItem(chat) && input.type !== 'additional';
    if (complete && !chat.paidAt && input.type !== 'additional') update.paidAt = ts;

    if (!complete) {
        update[`partialPayments.${key}`] = { paid: paidTotal, pending, itemAmount };
    } else {
        if (chat.partialPayments?.[key]) update[`partialPayments.${key}`] = admin.firestore.FieldValue.delete();
        if (input.type === 'installment') {
            const installments: any[] = [...chat.installments];
            const i = Number(input.installmentIndex);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { clientNotice, platformPaymentId, ...rest } = installments[i] || {};
            installments[i] = { ...rest, status: 'paid', paidAt: nowIso, ...conf };
            update.installments = installments;
            update.paidInstallments = installments.filter(x => x?.status === 'paid').length;
        } else if (input.type === 'case') {
            update.paidAmount = itemAmount;
            update.paymentConfirmedAt = ts;
            update.paymentConfirmedBy = confirmation.confirmedBy;
            update.paymentConfirmedByRole = confirmation.confirmedByRole;
            if (chat.clientPaymentNotice?.type === 'case') update.clientPaymentNotice = admin.firestore.FieldValue.delete();
        } else {
            const additional = getPendingAdditionalFee(chat)!;
            // ยอดรวมที่เสนอ (chat.amount) บวกเพิ่ม ส่วนที่จ่ายแล้วเก็บแยกใน additionalPayments[]
            // ไม่บวกเข้า paidAmount (= ค่าบริการหลักของเคสก้อนเดียว)
            update.amount = parseAmount(chat.amount) + itemAmount;
            update.additionalPayments = admin.firestore.FieldValue.arrayUnion({
                amount: itemAmount,
                reason: chat.pendingFeeRequest?.reason || chat.additionalFeeRequest?.reason || 'ค่าบริการเพิ่มเติม',
                paidAt: nowIso,
                ...conf,
            });
            if (additional.source === 'pendingFeeRequest') {
                update.pendingFeeRequest = null;
            } else {
                update['additionalFeeRequest.status'] = 'paid';
                update['additionalFeeRequest.paidAt'] = ts;
                update['additionalFeeRequest.confirmedBy'] = confirmation.confirmedBy;
            }
            if (chat.clientPaymentNotice?.type === 'additional') update.clientPaymentNotice = admin.firestore.FieldValue.delete();
        }
    }

    // ยอดที่ได้รับแล้วของงวดทั้งหมด (รวมงวดที่จ่ายบางส่วน)
    if (input.type === 'installment') {
        const insts: any[] = update.installments ?? chat.installments;
        update.totalPaid = round2(insts.reduce((s: number, x: any, i: number) => {
            if (x?.status === 'paid') return s + parseAmount(x?.amount);
            if (i === Number(input.installmentIndex)) return s + paidTotal;
            return s + readPartial(chat, partialKey('installment', i)).paid;
        }, 0));
    }

    // ยังมีคำแจ้งโอนแบบเดิมค้างอยู่ไหม (หลังอัปเดตนี้)
    const nextInstallments: any[] = update.installments ?? chat.installments ?? [];
    update.hasPaymentNotice =
        nextInstallments.some(x => x?.status !== 'paid' && x?.clientNotice) ||
        (update.clientPaymentNotice === undefined && !!chat.clientPaymentNotice);
    // ห้องเก่าที่ค้าง pending_payment จากโมเดลเดิม — จ่ายแล้วก็เปิดใช้งานตามปกติ
    if (chat.status === 'pending_payment') update.status = 'active';

    const label = dueLabel(input.type, input.installmentIndex);
    const remaining = complete ? 0 : round2(itemAmount - paidTotal);
    const partialNote = complete
        ? (amount < itemAmount ? ' (ครบยอดแล้ว)' : '')
        : ` (บางส่วน คงเหลือ ฿${remaining.toLocaleString()})`;
    update.lastMessage = confirmation.confirmedByRole === 'platform'
        ? `✅ ชำระ${label} ฿${amount.toLocaleString()} เข้าระบบแล้ว${partialNote}`
        : `✅ ทนายยืนยันได้รับ${label} ฿${amount.toLocaleString()} แล้ว${partialNote}`;
    return { update, amount, itemAmount, remaining, complete, label, firstPaid };
}

/** หลังตั้งจ่ายแล้ว: สัญญาจ้าง (ก้อนแรก) + ข้อความในห้อง + แจ้งเตือนลูกความและทนาย — ล้มได้โดยไม่ย้อนการจ่าย */
export async function postPaidEffects(
    db: FirebaseFirestore.Firestore,
    chatId: string,
    outcome: {
        chat: FirebaseFirestore.DocumentData; amount: number; label: string; firstPaid: boolean;
        /** ยอดเต็มของรายการ (สัญญาจ้าง) · ยอดที่ยังค้างหลังครั้งนี้ — ไม่ระบุ = จ่ายครบรายการ */
        itemAmount?: number; remaining?: number;
    },
    by: PaidConfirmation['confirmedByRole'],
) {
    const chatRef = db.collection('chats').doc(chatId);
    const messagesRef = chatRef.collection('messages');
    const ts = admin.firestore.FieldValue.serverTimestamp();
    if (outcome.firstPaid) {
        try {
            await createContractFromChat(db, { chatId, chatData: outcome.chat, amount: outcome.itemAmount ?? outcome.amount, messagesRef });
        } catch (err) {
            console.error('createContractFromChat failed after payment:', err);
        }
    }
    const platform = by === 'platform';
    const remaining = outcome.remaining ?? 0;
    const amountText = remaining > 0
        ? `฿${outcome.amount.toLocaleString()} (ชำระบางส่วน คงเหลือ ฿${remaining.toLocaleString()})`
        : `฿${outcome.amount.toLocaleString()}`;
    await messagesRef.add({
        chatId,
        text: platform
            ? `✅ ลูกความชำระ${outcome.label} ${amountText} เข้าบัญชี Lawslane เรียบร้อยแล้ว\nLawslane จะโอนค่าบริการให้ทนายหลังปิดเคส`
            : `✅ ทนายความยืนยันว่าได้รับ${outcome.label} ${amountText} เรียบร้อยแล้ว`,
        senderId: 'system',
        senderName: 'ระบบแจ้งเตือน',
        timestamp: ts,
        type: 'system_payment',
    }).catch(err => console.error('payment message failed:', err));

    const clientId: string = outcome.chat.clientId || outcome.chat.userId || '';
    const notifications: Record<string, any>[] = [];
    if (clientId) {
        notifications.push({
            type: 'payment',
            title: platform ? 'ชำระเงินเรียบร้อย' : 'ทนายยืนยันได้รับเงินแล้ว',
            message: `${outcome.label} ${amountText}`,
            recipient: clientId,
            link: `/chat/${chatId}`,
        });
    }
    if (platform) {
        const profileId: string = outcome.chat.lawyerId || '';
        const lp = profileId ? (await db.collection('lawyerProfiles').doc(profileId).get()).data() : null;
        if (lp?.userId) {
            notifications.push({
                type: 'payment',
                title: 'ลูกความชำระเงินเข้าระบบแล้ว',
                message: `${outcome.label} ${amountText} — Lawslane จะโอนยอดสุทธิให้คุณหลังปิดเคส`,
                recipient: lp.userId,
                link: `/chat/${chatId}?view=lawyer`,
            });
        }
    }
    for (const n of notifications) {
        await db.collection('notifications').add({ ...n, createdAt: ts, read: false, relatedId: chatId })
            .catch(err => console.error('payment notification failed:', err));
    }
}

/** ทนายปิดเคส → เงินที่ถือไว้ของเคสนี้ไปรอแอดมินโอนให้ทนาย */
export async function releaseHeldPayouts(db: FirebaseFirestore.Firestore, chatId: string): Promise<number> {
    const snap = await db.collection(LAWYER_PAYMENTS).where('chatId', '==', chatId).get();
    const held = snap.docs.filter(d => d.data().status === 'paid' && d.data().payoutStatus === 'held');
    if (held.length === 0) return 0;
    const batch = db.batch();
    const ts = admin.firestore.FieldValue.serverTimestamp();
    for (const d of held) batch.update(d.ref, { payoutStatus: 'due', payoutDueAt: ts, updatedAt: ts });
    await batch.commit();
    return held.length;
}

/**
 * ยกเลิกเคสก่อนปิด → เงินที่ถือไว้ (ยังไม่ได้โอนให้ทนาย) ไปรอแอดมินคืนลูกความ
 * คืนยอดที่ต้องคืน (บาท) · สลิปที่ยังรอตรวจ แอดมินตัดสินต่อที่หลังบ้าน
 */
export async function moveHeldToRefund(db: FirebaseFirestore.Firestore, chatId: string): Promise<number> {
    const snap = await db.collection(LAWYER_PAYMENTS).where('chatId', '==', chatId).get();
    const held = snap.docs.filter(d => d.data().status === 'paid' && d.data().payoutStatus === 'held');
    if (held.length === 0) return 0;
    const batch = db.batch();
    const ts = admin.firestore.FieldValue.serverTimestamp();
    let satang = 0;
    for (const d of held) {
        satang += Number(d.data().grossAmount) || 0;
        batch.update(d.ref, { status: 'refund_pending', payoutStatus: 'none', refundRequestedAt: ts, updatedAt: ts });
    }
    await batch.commit();
    await db.collection('notifications').add({
        type: 'lawyer_payment',
        title: 'ค่าทนายรอคืนเงิน',
        message: `เคสถูกยกเลิก — คืนลูกความ ฿${(satang / 100).toLocaleString()}`,
        createdAt: ts,
        read: false,
        recipient: 'admin',
        link: '/lawyer-payments?tab=refund',
        relatedId: chatId,
    }).catch(err => console.error('refund notification failed:', err));
    return satang / 100;
}

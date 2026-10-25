'use server';

/**
 * หลังบ้านค่าทนายที่ลูกความชำระเข้าบัญชีระบบ (LAWSLANE-PLAN-10)
 * ตรวจสลิป → ห้องแชทเป็น "จ่ายแล้ว" · คืนเงินเคสที่ยกเลิก · โอนยอดสุทธิให้ทนายหลังปิดเคส
 *
 * เอกสาร lawyerPayments สร้างจากเว็บหลัก (Lawslane/src/app/actions/lawyer-payment-actions.ts)
 * อ่าน/เขียนผ่าน Admin SDK เท่านั้น · เงินทุกตัวเป็นสตางค์
 */

import * as admin from 'firebase-admin';
import { requireAdmin, AuthError } from '@/lib/auth-guard';
import {
    LAWYER_PAYMENTS,
    LawyerPaymentRejected,
    applyPaidInTx,
    bahtToSatang,
    dueLabel,
    listOutstanding,
    pickDue,
    postPaidEffects,
    readLawyerGpPercent,
    releasePendingUpdate,
} from '@/lib/lawyer-payment-apply';
import { partialKey, readPartial } from '@/lib/lawyer-payment-partial';

const PERM_REVIEW = 'financials.verification';
const PERM_PAYOUTS = 'financials.lawyerPayouts';

type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: string };

class ActionError extends Error {}

function fail(e: unknown, fallback: string): { ok: false; error: string } {
    if (e instanceof ActionError || e instanceof LawyerPaymentRejected) return { ok: false, error: e.message };
    if (e instanceof AuthError) return { ok: false, error: e.status === 401 ? 'กรุณาเข้าสู่ระบบ' : 'ไม่มีสิทธิ์ทำรายการนี้' };
    console.error(fallback, e);
    return { ok: false, error: fallback };
}

const iso = (v: any): string | null => (v?.toDate ? v.toDate().toISOString() : null);
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const safeId = (v: unknown) => {
    const s = str(v, 128);
    if (!s || s.includes('/')) throw new ActionError('ไม่พบรายการ');
    return s;
};

export interface AdminLawyerPayment {
    id: string;
    chatId: string;
    caseTitle: string;
    clientId: string;
    lawyerProfileId: string;
    lawyerName: string;
    type: string;
    installmentIndex: number | null;
    description: string;
    grossAmount: number;
    /** แบ่งจ่าย: ยอดเต็มของรายการ · ยอดที่ยืนยันแล้วก่อนครั้งนี้ (สตางค์) — 0 = ข้อมูลก่อนมีแบ่งจ่าย */
    itemAmount: number;
    paidBefore: number;
    partial: boolean;
    gpPercent: number;
    gpAmount: number;
    netToLawyer: number;
    slipVerified: boolean;
    status: string;
    payoutStatus: string;
    payoutId: string | null;
    reviewNote: string | null;
    refundReference: string | null;
    createdAt: string | null;
    paidAt: string | null;
}

function toRow(id: string, x: FirebaseFirestore.DocumentData): AdminLawyerPayment {
    return {
        id,
        chatId: x.chatId || '',
        caseTitle: x.caseTitle || '',
        clientId: x.clientId || '',
        lawyerProfileId: x.lawyerProfileId || '',
        lawyerName: x.lawyerName || '',
        type: x.type || '',
        installmentIndex: typeof x.installmentIndex === 'number' ? x.installmentIndex : null,
        description: x.description || '',
        grossAmount: Number(x.grossAmount) || 0,
        itemAmount: Number(x.itemAmount) || 0,
        paidBefore: Number(x.paidBefore) || 0,
        partial: x.partial === true,
        gpPercent: Number(x.gpPercent) || 0,
        gpAmount: Number(x.gpAmount) || 0,
        netToLawyer: Number(x.netToLawyer) || 0,
        slipVerified: x.slipVerified === true,
        status: x.status || '',
        payoutStatus: x.payoutStatus || '',
        payoutId: x.payoutId || null,
        reviewNote: x.slipReviewNote || null,
        refundReference: x.refundReference || null,
        createdAt: iso(x.createdAt),
        paidAt: iso(x.paidAt),
    };
}

/** review = สลิปรอตรวจ · held = รอปิดเคส · due = รอโอนให้ทนาย · refund = รอคืนลูกความ · all */
export async function listLawyerPaymentsAction(filter: string): Promise<AdminLawyerPayment[]> {
    const { adminApp } = await requireAdmin(PERM_REVIEW);
    const col = adminApp.firestore().collection(LAWYER_PAYMENTS);
    let q: FirebaseFirestore.Query;
    if (filter === 'review') q = col.where('status', '==', 'pending_review');
    else if (filter === 'refund') q = col.where('status', '==', 'refund_pending');
    else if (filter === 'held' || filter === 'due') q = col.where('payoutStatus', '==', filter);
    else q = col.orderBy('createdAt', 'desc');
    const snap = await q.limit(300).get();
    return JSON.parse(JSON.stringify(
        snap.docs.map(d => toRow(d.id, d.data())).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    ));
}

export async function getLawyerPaymentDetailAction(id: string): Promise<{
    payment: AdminLawyerPayment;
    slipImage: string | null;
    client: { name: string; email: string; phone: string };
    chatStatus: string;
} | null> {
    const { adminApp } = await requireAdmin(PERM_REVIEW);
    const db = adminApp.firestore();
    const snap = await db.collection(LAWYER_PAYMENTS).doc(safeId(id)).get();
    if (!snap.exists) return null;
    const x = snap.data()!;
    let slipImage: string | null = null;
    const m = typeof x.slipUrl === 'string' ? x.slipUrl.match(/^base64_slip_([A-Za-z0-9]+)$/) : null;
    if (m) slipImage = (await db.collection('slipImages').doc(m[1]).get()).data()?.base64Data ?? null;
    const [u, chat] = await Promise.all([
        x.clientId ? db.collection('users').doc(x.clientId).get() : null,
        x.chatId ? db.collection('chats').doc(x.chatId).get() : null,
    ]);
    const ud = u?.data() || {};
    return JSON.parse(JSON.stringify({
        payment: toRow(snap.id, x),
        slipImage,
        client: { name: ud.name || '', email: ud.email || '', phone: ud.phone || '' },
        chatStatus: chat?.data()?.status || '',
    }));
}

/**
 * ผลตรวจสลิปด้วยมือ
 * - approve: ยอดของสลิปนี้ยังถูกกันไว้ในห้อง (partialPayments) → นับเป็นยอดที่ชำระแล้วของรายการ
 *   ยอดสะสมครบ = รายการในห้องเป็นจ่ายแล้ว · payoutStatus held (หรือ due ถ้าปิดเคสแล้ว)
 * - reject: ปล่อยยอดที่กันไว้ ให้ลูกความแนบสลิปใหม่ได้
 */
export async function reviewLawyerSlipAction(id: string, approve: boolean, note?: string): Promise<Result> {
    try {
        const { uid: adminUid, adminApp } = await requireAdmin(PERM_REVIEW);
        const db = adminApp.firestore();
        const ref = db.collection(LAWYER_PAYMENTS).doc(safeId(id));
        const reviewNote = str(note, 500) || null;

        const outcome = await db.runTransaction(async tx => {
            const snap = await tx.get(ref);
            const p = snap.data();
            if (!snap.exists || !p) throw new ActionError('ไม่พบรายการ');
            if (p.status !== 'pending_review') throw new ActionError('รายการนี้ไม่อยู่ในสถานะรอตรวจสลิป');
            const chatRef = db.collection('chats').doc(String(p.chatId));
            const chatSnap = await tx.get(chatRef);
            const chat = chatSnap.data();
            if (!chatSnap.exists || !chat) throw new ActionError('ไม่พบห้องสนทนาของรายการนี้');
            const ts = admin.firestore.FieldValue.serverTimestamp();
            const review = { slipReviewedBy: adminUid, slipReviewedAt: ts, slipReviewNote: reviewNote, updatedAt: ts };
            const want = { type: p.type, installmentIndex: p.installmentIndex ?? undefined };

            if (approve) {
                const due = pickDue(listOutstanding(chat), want);
                if (!due || due.type !== p.type || (p.type === 'installment' && due.installmentIndex !== p.installmentIndex)) {
                    throw new ActionError('รายการนี้ในห้องชำระแล้วหรือถูกลบ — ให้ปฏิเสธและคืนเงินแทน');
                }
                // ยอดสลิปนี้ต้องยังถูกกันไว้ในห้อง และยอดเต็มของรายการไม่เปลี่ยนจากตอนแนบ
                const reserved = readPartial(chat, partialKey(p.type, p.installmentIndex)).pending[ref.id];
                if (reserved === undefined || bahtToSatang(reserved) !== Number(p.grossAmount)) {
                    throw new ActionError('ไม่พบยอดของสลิปนี้ในห้อง (รายการอาจถูกแก้ไข) — ให้ปฏิเสธแล้วให้ลูกความแนบใหม่');
                }
                if (p.itemAmount && bahtToSatang(due.amount) !== Number(p.itemAmount)) {
                    throw new ActionError('ยอดรายการในห้องเปลี่ยนไปจากตอนแนบสลิป — ให้ปฏิเสธแล้วให้ลูกความแนบใหม่');
                }
                const applied = applyPaidInTx(
                    chat, due, { confirmedBy: adminUid, confirmedByRole: 'platform', paymentId: ref.id }, Number(p.grossAmount) / 100,
                );
                tx.update(chatRef, applied.update);
                tx.update(ref, { ...review, status: 'paid', paidAt: ts, payoutStatus: chat.status === 'closed' ? 'due' : 'held' });
                return {
                    approve, chat, amount: applied.amount, label: applied.label, firstPaid: applied.firstPaid,
                    itemAmount: applied.itemAmount, remaining: applied.remaining,
                    clientId: String(p.clientId || ''), chatId: String(p.chatId),
                };
            }

            // ปล่อยยอดที่กันไว้ในห้อง (ถ้ายังกันไว้ให้การจ่ายนี้)
            tx.update(chatRef, { ...releasePendingUpdate(chat, { type: p.type, installmentIndex: p.installmentIndex }, ref.id), updatedAt: ts });
            tx.update(ref, { ...review, status: 'rejected', payoutStatus: 'none' });
            return {
                approve, chat, amount: Number(p.grossAmount) / 100,
                label: dueLabel(p.type, p.installmentIndex), firstPaid: false, clientId: String(p.clientId || ''), chatId: String(p.chatId),
            };
        });

        const chatId = outcome.chatId;
        if (outcome.approve) {
            await postPaidEffects(db, chatId, outcome, 'platform');
        } else {
            const ts = admin.firestore.FieldValue.serverTimestamp();
            await db.collection('chats').doc(chatId).collection('messages').add({
                chatId,
                text: `⚠️ สลิป${outcome.label} ฿${outcome.amount.toLocaleString()} ตรวจไม่ผ่าน${reviewNote ? ` — ${reviewNote}` : ''}\nกรุณาตรวจสอบการโอนแล้วแนบสลิปใหม่ หรือติดต่อทีมงาน Lawslane`,
                senderId: 'system',
                senderName: 'ระบบแจ้งเตือน',
                timestamp: ts,
                type: 'payment_notice',
            }).catch(err => console.error('reject message failed:', err));
            if (outcome.clientId) {
                await db.collection('notifications').add({
                    type: 'payment',
                    title: 'สลิปค่าบริการตรวจไม่ผ่าน',
                    message: reviewNote || `${outcome.label} ฿${outcome.amount.toLocaleString()} — กรุณาแนบสลิปใหม่`,
                    createdAt: ts,
                    read: false,
                    recipient: outcome.clientId,
                    link: `/chat/${chatId}`,
                    relatedId: chatId,
                }).catch(err => console.error('reject notification failed:', err));
            }
        }
        return { ok: true };
    } catch (e) {
        return fail(e, 'บันทึกผลตรวจสลิปไม่สำเร็จ');
    }
}

/** โอนเงินคืนลูกความแล้ว (เคสยกเลิกก่อนปิด) — กรอกเลขอ้างอิงการโอน */
export async function markLawyerPaymentRefundedAction(id: string, reference: string): Promise<Result> {
    try {
        const { uid, adminApp } = await requireAdmin(PERM_PAYOUTS);
        const db = adminApp.firestore();
        const ref = db.collection(LAWYER_PAYMENTS).doc(safeId(id));
        const ref2 = str(reference, 200);
        if (!ref2) throw new ActionError('กรุณาระบุเลขอ้างอิงการโอนคืน');
        const p = await db.runTransaction(async tx => {
            const snap = await tx.get(ref);
            const x = snap.data();
            if (!snap.exists || !x) throw new ActionError('ไม่พบรายการ');
            if (x.status !== 'refund_pending') throw new ActionError('รายการนี้ไม่อยู่ในสถานะรอคืนเงิน');
            const ts = admin.firestore.FieldValue.serverTimestamp();
            tx.update(ref, { status: 'refunded', refundReference: ref2, refundedBy: uid, refundedAt: ts, updatedAt: ts });
            return x;
        });
        if (p.clientId) {
            await db.collection('notifications').add({
                type: 'payment',
                title: 'คืนเงินค่าบริการแล้ว',
                message: `฿${(Number(p.grossAmount) / 100).toLocaleString()} · อ้างอิง ${ref2}`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                read: false,
                recipient: p.clientId,
                link: `/chat/${p.chatId}`,
                relatedId: p.chatId,
            }).catch(err => console.error('refund notification failed:', err));
        }
        return { ok: true };
    } catch (e) {
        return fail(e, 'บันทึกการคืนเงินไม่สำเร็จ');
    }
}

export interface LawyerPayoutGroup {
    lawyerProfileId: string;
    lawyerName: string;
    paymentIds: string[];
    totalGross: number;
    totalGp: number;
    totalNet: number;
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
}

/** ยอดที่ต้องโอนให้ทนาย (ปิดเคสแล้ว payoutStatus = due) รวมตามทนาย */
export async function listDueLawyerPayoutsAction(): Promise<LawyerPayoutGroup[]> {
    const { adminApp } = await requireAdmin(PERM_PAYOUTS);
    const db = adminApp.firestore();
    const snap = await db.collection(LAWYER_PAYMENTS).where('payoutStatus', '==', 'due').limit(500).get();
    const groups = new Map<string, LawyerPayoutGroup>();
    for (const d of snap.docs) {
        const p = d.data();
        if (p.status !== 'paid') continue;
        const g = groups.get(p.lawyerProfileId) || {
            lawyerProfileId: p.lawyerProfileId,
            lawyerName: p.lawyerName || '',
            paymentIds: [] as string[],
            totalGross: 0, totalGp: 0, totalNet: 0,
            bankName: '', bankAccountNumber: '', bankAccountName: '',
        };
        g.paymentIds.push(d.id);
        g.totalGross += Number(p.grossAmount) || 0;
        g.totalGp += Number(p.gpAmount) || 0;
        g.totalNet += Number(p.netToLawyer) || 0;
        groups.set(p.lawyerProfileId, g);
    }
    await Promise.all([...groups.values()].map(async g => {
        const lp = g.lawyerProfileId ? (await db.collection('lawyerProfiles').doc(g.lawyerProfileId).get()).data() || {} : {};
        g.lawyerName = lp.name || g.lawyerName;
        g.bankName = lp.bankName || '';
        g.bankAccountNumber = lp.bankAccountNumber || '';
        g.bankAccountName = lp.bankAccountName || '';
    }));
    return [...groups.values()].sort((a, b) => b.totalNet - a.totalNet);
}

/**
 * บันทึกว่าโอนให้ทนายแล้ว — ยอดคิดใหม่จากเอกสารใน transaction ไม่เชื่อตัวเลขจากหน้าเว็บ
 * มีรายการไหนไม่ใช่ due แล้ว ทั้งก้อนล้ม
 */
export async function markLawyerPayoutPaidAction(input: { lawyerProfileId: string; paymentIds: string[]; reference: string }): Promise<Result<{ payoutId: string }>> {
    try {
        const { uid: adminUid, adminApp } = await requireAdmin(PERM_PAYOUTS);
        const db = adminApp.firestore();
        const lawyerProfileId = safeId(input.lawyerProfileId);
        const reference = str(input.reference, 200);
        if (!reference) throw new ActionError('กรุณาระบุเลขอ้างอิงการโอน');
        const ids = [...new Set((input.paymentIds || []).map(safeId))];
        if (ids.length === 0 || ids.length > 400) throw new ActionError('ไม่มีรายการที่จะโอน');

        const payoutRef = db.collection('lawyerPayouts').doc();
        const totals = await db.runTransaction(async tx => {
            const snaps = await Promise.all(ids.map(pid => tx.get(db.collection(LAWYER_PAYMENTS).doc(pid))));
            let totalGross = 0, totalGp = 0, totalNet = 0;
            for (const s of snaps) {
                const p = s.data();
                if (!s.exists || !p || p.lawyerProfileId !== lawyerProfileId || p.payoutStatus !== 'due' || p.status !== 'paid') {
                    throw new ActionError('มีรายการที่โอนไปแล้วหรือยังไม่ถึงกำหนด กรุณาโหลดหน้าใหม่');
                }
                totalGross += Number(p.grossAmount) || 0;
                totalGp += Number(p.gpAmount) || 0;
                totalNet += Number(p.netToLawyer) || 0;
            }
            const ts = admin.firestore.FieldValue.serverTimestamp();
            tx.create(payoutRef, {
                lawyerProfileId, paymentIds: ids, totalGross, totalGp, totalNet,
                reference, status: 'paid', paidAt: ts, paidBy: adminUid,
            });
            for (const s of snaps) tx.update(s.ref, { payoutStatus: 'paid', payoutId: payoutRef.id, payoutAt: ts, updatedAt: ts });
            return { totalNet };
        });
        const lp = (await db.collection('lawyerProfiles').doc(lawyerProfileId).get()).data();
        if (lp?.userId) {
            await db.collection('notifications').add({
                type: 'payment',
                title: 'Lawslane โอนค่าบริการให้คุณแล้ว',
                message: `฿${(totals.totalNet / 100).toLocaleString('th-TH')} · อ้างอิง ${reference}`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                read: false,
                recipient: lp.userId,
                link: '/lawyer-dashboard/financials',
                relatedId: payoutRef.id,
            }).catch(err => console.error('payout notification failed:', err));
        }
        return { ok: true, payoutId: payoutRef.id };
    } catch (e) {
        return fail(e, 'บันทึกการโอนไม่สำเร็จ');
    }
}

export async function getLawyerGpSettingAction(): Promise<{ gpPercent: number | null; effective: number; updatedAt: string | null }> {
    const { adminApp } = await requireAdmin(PERM_PAYOUTS);
    const db = adminApp.firestore();
    const d = (await db.collection('settings').doc('lawyerFees').get()).data();
    return {
        gpPercent: typeof d?.gpPercent === 'number' ? d.gpPercent : null,
        effective: await readLawyerGpPercent(db),
        updatedAt: iso(d?.updatedAt),
    };
}

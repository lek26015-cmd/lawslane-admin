'use server';

/**
 * หลังบ้านบริการล่ามทนาย — อนุมัติล่าม / ตรวจสลิป / คืนเงิน / โอนเงินให้ล่าม / ตั้ง GP
 *
 * ทุก action อ่าน-เขียนผ่าน Admin SDK หลัง requireAdmin(สิทธิ์) — ไม่มีการเขียน Firestore
 * จากหน้าเว็บตรงๆ เพราะงานเหล่านี้คือ "เงิน" ทั้งหมด (สถานะชำระเงิน, ยอดที่ต้องโอนให้ล่าม)
 *
 * รูปร่างข้อมูลตั้งจากเว็บหลัก (Lawslane/src/lib/interpreter-types.ts และ
 * Lawslane/src/app/actions/interpreter-booking-actions.ts) — แก้ฝั่งใดต้องแก้อีกฝั่งด้วย
 * เงินทุกตัวเป็นสตางค์ (integer)
 */

import * as admin from 'firebase-admin';
import { Resend } from 'resend';
import { requireAdmin, AuthError } from '@/lib/auth-guard';
import type {
    AdminChatMessage,
    AdminInterpreterBooking,
    AdminInterpreterDetail,
    AdminInterpreterRow,
    InterpreterPayoutGroup,
} from '@/lib/interpreter-admin-types';

type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: string };

class ActionError extends Error {}

const PERM_USERS = 'users.interpreters';
const PERM_REQUESTS = 'requests.interpreters';
const PERM_PAYOUTS = 'financials.interpreterPayouts';

const SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://lawslane.com';

function fail(e: unknown, fallback: string): { ok: false; error: string } {
    if (e instanceof ActionError) return { ok: false, error: e.message };
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
const escapeHtml = (v: string) =>
    String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** อีเมลภายใน — ไม่ export (server action ที่ export = endpoint สาธารณะ) */
async function sendEmail(to: string, subject: string, html: string) {
    if (!process.env.RESEND_API_KEY || !to) return;
    try {
        await new Resend(process.env.RESEND_API_KEY).emails.send({ from: 'Lawslane <noreply@lawslane.com>', to: [to], subject, html });
    } catch (err) {
        console.error('interpreter admin email failed:', err);
    }
}

async function notify(db: FirebaseFirestore.Firestore, recipient: string, title: string, message: string, link: string, relatedId: string) {
    if (!recipient) return;
    await db.collection('notifications').add({
        type: 'interpreter',
        title,
        message,
        link,
        relatedId,
        recipient,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(err => console.error('notify failed:', err));
}

async function signedUrl(adminApp: admin.app.App, path: string): Promise<string | null> {
    if (!path) return null;
    try {
        const bucketName = (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '').replace(/"/g, '').trim();
        const bucket = bucketName ? adminApp.storage().bucket(bucketName) : adminApp.storage().bucket();
        const [url] = await bucket.file(path).getSignedUrl({ action: 'read', expires: Date.now() + 15 * 60 * 1000 });
        return url;
    } catch (err) {
        console.error('signedUrl failed:', err);
        return null;
    }
}

// ===========================================================================
// ล่าม
// ===========================================================================

export async function listInterpretersAction(status: string): Promise<AdminInterpreterRow[]> {
    const { adminApp } = await requireAdmin(PERM_USERS);
    let q: FirebaseFirestore.Query = adminApp.firestore().collection('interpreterProfiles');
    if (['pending', 'approved', 'rejected', 'suspended'].includes(status)) q = q.where('status', '==', status);
    const snap = await q.limit(300).get();
    return snap.docs
        .map(d => {
            const p = d.data();
            return {
                id: d.id,
                name: p.name || '',
                imageUrl: p.imageUrl || '',
                status: p.status || 'pending',
                languageCodes: Array.isArray(p.languageCodes) ? p.languageCodes : [],
                services: Array.isArray(p.services) ? p.services : [],
                minPrice: Array.isArray(p.rateCard) && p.rateCard.length ? Math.min(...p.rateCard.map((r: any) => Number(r.price) || 0)) : null,
                verified: Array.isArray(p.verifiedCredentials) && p.verifiedCredentials.length > 0,
                createdAt: iso(p.createdAt),
            };
        })
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function getInterpreterDetailAction(id: string): Promise<AdminInterpreterDetail | null> {
    const { adminApp } = await requireAdmin(PERM_USERS);
    const ref = adminApp.firestore().collection('interpreterProfiles').doc(safeId(id));
    const [snap, privSnap] = await Promise.all([ref.get(), ref.collection('private').doc('details').get()]);
    if (!snap.exists) return null;
    const p = snap.data()!;
    const priv = privSnap.data() || {};
    const certificatePaths: string[] = Array.isArray(priv.certificatePaths) ? priv.certificatePaths : [];
    const [idCardUrl, ...certificateUrls] = await Promise.all([
        signedUrl(adminApp, priv.idCardPath || ''),
        ...certificatePaths.map(path => signedUrl(adminApp, path)),
    ]);
    return JSON.parse(JSON.stringify({
        id: snap.id,
        name: p.name || '',
        imageUrl: p.imageUrl || '',
        status: p.status || 'pending',
        description: p.description || '',
        languages: p.languages || [],
        services: p.services || [],
        specialties: p.specialties || [],
        serviceProvinces: p.serviceProvinces || [],
        remoteAvailable: p.remoteAvailable === true,
        rateCard: Array.isArray(p.rateCard) ? p.rateCard : [],
        verifiedCredentials: p.verifiedCredentials || [],
        rejectionReason: p.rejectionReason || '',
        createdAt: iso(p.createdAt),
        approvedAt: iso(p.approvedAt),
        phone: priv.phone || '',
        email: priv.email || '',
        lineId: priv.lineId || '',
        bankName: priv.bankName || '',
        bankAccountNumber: priv.bankAccountNumber || '',
        bankAccountName: priv.bankAccountName || '',
        idCardUrl,
        certificateUrls: certificateUrls.filter(Boolean),
    }));
}

/**
 * อนุมัติ / ปฏิเสธ / ระงับ / คืนสถานะล่าม
 * อนุมัติ = ตั้ง claim `interpreter: true` (merge กับ claim เดิม — setCustomUserClaims เขียนทับทั้งก้อน)
 * verifiedCredentials คือสิ่งที่แอดมินตรวจเอกสารแล้วจริง → เป็นที่มาของป้าย "ตรวจสอบเอกสารแล้ว"
 */
export async function setInterpreterStatusAction(input: {
    id: string;
    status: 'approved' | 'rejected' | 'suspended';
    reason?: string;
    verifiedCredentials?: string[];
}): Promise<Result> {
    try {
        const { uid: adminUid, adminApp } = await requireAdmin(PERM_USERS);
        const db = adminApp.firestore();
        const id = safeId(input.id);
        if (!['approved', 'rejected', 'suspended'].includes(input.status)) throw new ActionError('สถานะไม่ถูกต้อง');
        const reason = str(input.reason, 500);
        if (input.status !== 'approved' && !reason) throw new ActionError('กรุณาระบุเหตุผล');

        const ref = db.collection('interpreterProfiles').doc(id);
        const snap = await ref.get();
        if (!snap.exists) throw new ActionError('ไม่พบล่าม');
        const profile = snap.data()!;
        const ts = admin.firestore.FieldValue.serverTimestamp();

        const update: Record<string, unknown> = { status: input.status, updatedAt: ts };
        if (input.status === 'approved') {
            update.approvedAt = ts;
            update.approvedBy = adminUid;
            update.rejectionReason = admin.firestore.FieldValue.delete();
            if (!profile.joinedAt) update.joinedAt = ts;
        } else {
            update.rejectionReason = reason;
        }
        if (input.verifiedCredentials) {
            update.verifiedCredentials = [...new Set(input.verifiedCredentials.map(c => str(c, 100)).filter(Boolean))].slice(0, 10);
        }
        await ref.update(update);

        // claim เป็นแค่ตัวช่วยเร็ว — requireInterpreter() ฝั่งเว็บหลักอ่านสถานะจากโปรไฟล์ทุกครั้งอยู่แล้ว
        try {
            const user = await adminApp.auth().getUser(profile.userId || id);
            const claims = { ...(user.customClaims || {}) } as Record<string, unknown>;
            if (input.status === 'approved') claims.interpreter = true; else delete claims.interpreter;
            await adminApp.auth().setCustomUserClaims(user.uid, claims);
        } catch (err) {
            console.error('set interpreter claim failed:', err);
        }

        const priv = (await ref.collection('private').doc('details').get()).data() || {};
        const name = escapeHtml(profile.name || '');
        if (input.status === 'approved') {
            await notify(db, profile.userId || id, 'ใบสมัครล่ามผ่านการอนุมัติ', 'โปรไฟล์ของคุณแสดงในรายชื่อล่ามแล้ว', '/interpreter-dashboard', id);
            await sendEmail(priv.email, '[Lawslane] ใบสมัครล่ามของคุณผ่านการอนุมัติ',
                `<p>เรียนคุณ ${name}</p><p>โปรไฟล์ล่ามของคุณแสดงบน Lawslane แล้ว กรุณาตั้งตารางเวลาและบัญชีรับเงินที่ <a href="${SITE_URL}/interpreter-dashboard">แดชบอร์ดล่าม</a></p>`);
        } else if (input.status === 'rejected') {
            await notify(db, profile.userId || id, 'ใบสมัครล่ามไม่ผ่าน', reason, '/interpreter-dashboard', id);
            await sendEmail(priv.email, '[Lawslane] ผลการสมัครเป็นล่าม',
                `<p>เรียนคุณ ${name}</p><p>ใบสมัครของคุณยังไม่ผ่าน: ${escapeHtml(reason)}</p>`);
        } else {
            await notify(db, profile.userId || id, 'บัญชีล่ามถูกระงับ', reason, '/interpreter-dashboard', id);
        }
        return { ok: true };
    } catch (e) {
        return fail(e, 'บันทึกสถานะไม่สำเร็จ');
    }
}

// ===========================================================================
// งานล่าม
// ===========================================================================

function toBooking(id: string, b: FirebaseFirestore.DocumentData): AdminInterpreterBooking {
    return {
        id,
        customerId: b.customerId,
        interpreterId: b.interpreterId,
        interpreterName: b.interpreterName || '',
        kind: b.kind,
        serviceType: b.serviceType,
        languagePair: b.languagePair || { from: '', to: '' },
        startAt: iso(b.startAt),
        endAt: iso(b.endAt),
        durationHours: b.durationHours ?? null,
        days: b.days ?? null,
        mode: b.mode ?? null,
        province: b.province ?? null,
        address: b.address ?? null,
        pageCount: b.pageCount ?? null,
        dueDate: b.dueDate ?? null,
        notes: b.notes ?? null,
        lawyerId: b.lawyerId ?? null,
        quote: b.quote,
        status: b.status,
        payoutStatus: b.payoutStatus || 'not_due',
        payoutId: b.payoutId ?? null,
        slipUrl: b.slipUrl ?? null,
        slipVerified: b.slipVerified === true,
        hasNewPayment: b.hasNewPayment === true,
        cancelledBy: b.cancelledBy ?? null,
        cancelReason: b.cancelReason ?? b.declineReason ?? null,
        documentPaths: Array.isArray(b.documentPaths) ? b.documentPaths : [],
        createdAt: iso(b.createdAt),
    };
}

export async function listInterpreterBookingsAction(filter: string): Promise<AdminInterpreterBooking[]> {
    const { adminApp } = await requireAdmin(PERM_REQUESTS);
    const col = adminApp.firestore().collection('interpreterBookings');
    let q: FirebaseFirestore.Query;
    if (filter === 'slip') q = col.where('hasNewPayment', '==', true);
    else if (filter === 'refund') q = col.where('status', '==', 'refund_pending');
    else if (filter && filter !== 'all') q = col.where('status', '==', filter);
    else q = col.orderBy('createdAt', 'desc');
    const snap = await q.limit(200).get();
    return JSON.parse(JSON.stringify(
        snap.docs.map(d => toBooking(d.id, d.data())).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    ));
}

export async function getInterpreterBookingDetailAction(id: string): Promise<{
    booking: AdminInterpreterBooking;
    slipImage: string | null;
    documentUrls: { path: string; url: string | null }[];
    customer: { name: string; email: string; phone: string };
    /** เบอร์/LINE ที่ลูกค้ากรอกตอนจอง (ล่ามเห็นหลังจ่ายเงินแล้ว) */
    bookingContact: { name: string; phone: string; lineId: string } | null;
    chat: AdminChatMessage[];
} | null> {
    const { adminApp } = await requireAdmin(PERM_REQUESTS);
    const db = adminApp.firestore();
    const snap = await db.collection('interpreterBookings').doc(safeId(id)).get();
    if (!snap.exists) return null;
    const booking = toBooking(snap.id, snap.data()!);

    let slipImage: string | null = null;
    if (booking.slipUrl?.startsWith('base64_slip_')) {
        const s = await db.collection('slipImages').doc(booking.slipUrl.replace('base64_slip_', '')).get();
        slipImage = s.data()?.base64Data ?? null;
    }
    const userSnap = await db.collection('users').doc(booking.customerId).get();
    const u = userSnap.data() || {};
    const documentUrls = await Promise.all(booking.documentPaths.map(async path => ({ path, url: await signedUrl(adminApp, path) })));
    // ห้องแชท 1 ห้องต่อคู่ลูกค้า-ล่าม (id = {customerId}_{interpreterId} ตรงกับเว็บหลัก)
    const [contactSnap, chatSnap] = await Promise.all([
        snap.ref.collection('private').doc('contact').get(),
        db.collection('interpreterConversations').doc(`${booking.customerId}_${booking.interpreterId}`)
            .collection('messages').orderBy('createdAt', 'desc').limit(200).get(),
    ]);
    const c = contactSnap.data();
    const chat: AdminChatMessage[] = chatSnap.docs.reverse().map(m => {
        const x = m.data();
        return { id: m.id, senderRole: x.senderRole, text: x.text, originalText: x.originalText ?? null, offerId: x.offerId ?? null, createdAt: iso(x.createdAt) };
    });
    return JSON.parse(JSON.stringify({
        booking,
        slipImage,
        documentUrls,
        customer: { name: u.name || '', email: u.email || '', phone: u.phone || '' },
        bookingContact: c ? { name: c.name || '', phone: c.phone || '', lineId: c.lineId || '' } : null,
        chat,
    }));
}

async function slotSnapsFor(tx: FirebaseFirestore.Transaction, db: FirebaseFirestore.Firestore, b: FirebaseFirestore.DocumentData) {
    const ids: string[] = Array.isArray(b.slotIds) ? b.slotIds : [];
    return Promise.all(ids.map(sid => tx.get(db.collection('interpreterSlots').doc(sid))));
}

/**
 * ผลตรวจสลิปด้วยมือ (กรณี SlipOK ตรวจไม่ผ่าน)
 * - approve: ยอดตรง → 'paid' · ถือ slot ถาวร (holdUntil = null) · แจ้งล่าม
 *   ถ้า slot ถูกคนอื่นจองทับไปแล้วเพราะ hold หมดอายุ → ไม่ให้อนุมัติ ต้องคืนเงินแทน
 * - reject: สลิปไม่จริง/ยอดไม่ตรง → 'cancelled' · คืน slot
 */
export async function reviewInterpreterSlipAction(id: string, approve: boolean, note?: string): Promise<Result> {
    try {
        const { uid: adminUid, adminApp } = await requireAdmin(PERM_REQUESTS);
        const db = adminApp.firestore();
        const ref = db.collection('interpreterBookings').doc(safeId(id));
        const booking = await db.runTransaction(async tx => {
            const snap = await tx.get(ref);
            const b = snap.data();
            if (!snap.exists || !b) throw new ActionError('ไม่พบรายการ');
            if (b.status !== 'pending_payment' && b.status !== 'expired') throw new ActionError('รายการนี้ไม่อยู่ในสถานะรอตรวจสลิป');
            const slots = await slotSnapsFor(tx, db, b);
            const ts = admin.firestore.FieldValue.serverTimestamp();
            if (approve) {
                if (slots.some(s => s.exists && s.data()!.bookingId !== ref.id)) {
                    throw new ActionError('ช่วงเวลานี้ถูกจองโดยงานอื่นแล้ว — ให้ปฏิเสธและคืนเงินลูกค้าแทน');
                }
                for (const s of slots) {
                    tx.set(s.ref, { interpreterId: b.interpreterId, bookingId: ref.id, holdUntil: null });
                }
                tx.update(ref, {
                    status: 'paid', hasNewPayment: false, holdUntil: null,
                    slipReviewedBy: adminUid, slipReviewedAt: ts, slipReviewNote: str(note, 500) || null, updatedAt: ts,
                });
            } else {
                for (const s of slots) if (s.exists && s.data()!.bookingId === ref.id) tx.delete(s.ref);
                tx.update(ref, {
                    status: 'cancelled', hasNewPayment: false,
                    slipReviewedBy: adminUid, slipReviewedAt: ts, slipReviewNote: str(note, 500) || null,
                    cancelledBy: 'admin', cancelReason: str(note, 500) || 'สลิปไม่ถูกต้อง', updatedAt: ts,
                });
            }
            return b;
        });
        if (approve) {
            await notify(db, booking.interpreterUserId, 'งานล่ามใหม่', 'ลูกค้าชำระเงินแล้ว กรุณารับงานหรือปฏิเสธ', '/interpreter-dashboard', ref.id);
            await notify(db, booking.customerId, 'ยืนยันการชำระเงินแล้ว', 'รอล่ามยืนยันรับงาน', '/dashboard', ref.id);
        } else {
            await notify(db, booking.customerId, 'การชำระเงินไม่ผ่าน', str(note, 200) || 'สลิปไม่ถูกต้อง กรุณาติดต่อทีมงาน', '/dashboard', ref.id);
        }
        return { ok: true };
    } catch (e) {
        return fail(e, 'บันทึกผลตรวจสลิปไม่สำเร็จ');
    }
}

/** แอดมินยกเลิกงาน (เช่น ลูกค้าติดต่อมา หรือล่ามไม่มา) → รอคืนเงิน · คืน slot */
export async function adminCancelInterpreterBookingAction(id: string, reason: string): Promise<Result> {
    try {
        const { adminApp } = await requireAdmin(PERM_REQUESTS);
        const db = adminApp.firestore();
        const r = str(reason, 500);
        if (!r) throw new ActionError('กรุณาระบุเหตุผล');
        const ref = db.collection('interpreterBookings').doc(safeId(id));
        await db.runTransaction(async tx => {
            const snap = await tx.get(ref);
            const b = snap.data();
            if (!snap.exists || !b) throw new ActionError('ไม่พบรายการ');
            if (!['pending_payment', 'paid', 'accepted'].includes(b.status)) throw new ActionError('ยกเลิกรายการนี้ไม่ได้');
            const slots = await slotSnapsFor(tx, db, b);
            for (const s of slots) if (s.exists && s.data()!.bookingId === ref.id) tx.delete(s.ref);
            const ts = admin.firestore.FieldValue.serverTimestamp();
            tx.update(ref, { status: 'refund_pending', hasNewPayment: false, cancelledBy: 'admin', cancelReason: r, cancelledAt: ts, updatedAt: ts });
        });
        return { ok: true };
    } catch (e) {
        return fail(e, 'ยกเลิกไม่สำเร็จ');
    }
}

/** บันทึกว่าโอนคืนลูกค้าแล้ว (โอนนอกระบบ) — ใช้สิทธิ์การเงิน */
export async function markInterpreterRefundedAction(id: string, reference: string): Promise<Result> {
    try {
        const { uid: adminUid, adminApp } = await requireAdmin(PERM_PAYOUTS);
        const db = adminApp.firestore();
        const ref = db.collection('interpreterBookings').doc(safeId(id));
        const refText = str(reference, 200);
        if (!refText) throw new ActionError('กรุณาระบุเลขอ้างอิงการโอนคืน');
        const b = await db.runTransaction(async tx => {
            const snap = await tx.get(ref);
            const d = snap.data();
            if (!snap.exists || !d) throw new ActionError('ไม่พบรายการ');
            if (d.status !== 'refund_pending') throw new ActionError('รายการนี้ไม่อยู่ในสถานะรอคืนเงิน');
            const ts = admin.firestore.FieldValue.serverTimestamp();
            tx.update(ref, { status: 'refunded', refundReference: refText, refundedBy: adminUid, refundedAt: ts, updatedAt: ts });
            return d;
        });
        await notify(db, b.customerId, 'คืนเงินแล้ว', `เลขอ้างอิง ${refText}`, '/dashboard', ref.id);
        return { ok: true };
    } catch (e) {
        return fail(e, 'บันทึกการคืนเงินไม่สำเร็จ');
    }
}

// ===========================================================================
// จ่ายเงินล่าม + GP
// ===========================================================================

/** ยอดที่ต้องโอนให้ล่าม (งาน completed ที่ payoutStatus = due) รวมตามล่าม */
export async function listDueInterpreterPayoutsAction(): Promise<InterpreterPayoutGroup[]> {
    const { adminApp } = await requireAdmin(PERM_PAYOUTS);
    const db = adminApp.firestore();
    const snap = await db.collection('interpreterBookings').where('payoutStatus', '==', 'due').limit(500).get();
    const groups = new Map<string, InterpreterPayoutGroup>();
    for (const d of snap.docs) {
        const b = d.data();
        const g: InterpreterPayoutGroup = groups.get(b.interpreterId) || {
            interpreterId: b.interpreterId,
            interpreterName: b.interpreterName || '',
            bookingIds: [] as string[],
            totalGross: 0,
            totalGp: 0,
            totalNet: 0,
            bankName: '',
            bankAccountNumber: '',
            bankAccountName: '',
        };
        g.bookingIds.push(d.id);
        g.totalGross += b.quote?.grossAmount || 0;
        g.totalGp += b.quote?.gpAmount || 0;
        g.totalNet += b.quote?.netToInterpreter || 0;
        groups.set(b.interpreterId, g);
    }
    await Promise.all([...groups.values()].map(async g => {
        const priv = (await db.collection('interpreterProfiles').doc(g.interpreterId).collection('private').doc('details').get()).data() || {};
        g.bankName = priv.bankName || '';
        g.bankAccountNumber = priv.bankAccountNumber || '';
        g.bankAccountName = priv.bankAccountName || '';
    }));
    return [...groups.values()].sort((a, b) => b.totalNet - a.totalNet);
}

/**
 * บันทึกว่าโอนเงินให้ล่ามแล้ว (แอดมินโอนนอกระบบ แล้วกรอกเลขอ้างอิง)
 * ยอดคิดใหม่จาก booking ใน transaction — ไม่เชื่อตัวเลขจากหน้าเว็บ · booking ที่ไม่ใช่ due แล้วทำให้ทั้งก้อนล้ม
 */
export async function markInterpreterPayoutPaidAction(input: { interpreterId: string; bookingIds: string[]; reference: string }): Promise<Result<{ payoutId: string }>> {
    try {
        const { uid: adminUid, adminApp } = await requireAdmin(PERM_PAYOUTS);
        const db = adminApp.firestore();
        const interpreterId = safeId(input.interpreterId);
        const reference = str(input.reference, 200);
        if (!reference) throw new ActionError('กรุณาระบุเลขอ้างอิงการโอน');
        const ids = [...new Set((input.bookingIds || []).map(safeId))];
        if (ids.length === 0 || ids.length > 400) throw new ActionError('ไม่มีงานที่จะจ่าย');

        const payoutRef = db.collection('interpreterPayouts').doc();
        const totals = await db.runTransaction(async tx => {
            const snaps = await Promise.all(ids.map(bid => tx.get(db.collection('interpreterBookings').doc(bid))));
            let totalGross = 0, totalGp = 0, totalNet = 0;
            for (const s of snaps) {
                const b = s.data();
                if (!s.exists || !b || b.interpreterId !== interpreterId || b.payoutStatus !== 'due' || b.status !== 'completed') {
                    throw new ActionError('มีงานที่จ่ายไปแล้วหรือยังไม่ถึงกำหนด กรุณาโหลดหน้าใหม่');
                }
                totalGross += b.quote?.grossAmount || 0;
                totalGp += b.quote?.gpAmount || 0;
                totalNet += b.quote?.netToInterpreter || 0;
            }
            const ts = admin.firestore.FieldValue.serverTimestamp();
            tx.create(payoutRef, {
                interpreterId, bookingIds: ids, totalGross, totalGp, totalNet,
                reference, status: 'paid', paidAt: ts, paidBy: adminUid,
            });
            for (const s of snaps) tx.update(s.ref, { payoutStatus: 'paid', payoutId: payoutRef.id, updatedAt: ts });
            return { totalNet };
        });
        const profile = (await db.collection('interpreterProfiles').doc(interpreterId).get()).data() || {};
        await notify(db, profile.userId || interpreterId, 'โอนค่าจ้างแล้ว', `฿${(totals.totalNet / 100).toLocaleString('th-TH')} · อ้างอิง ${reference}`, '/interpreter-dashboard', payoutRef.id);
        return { ok: true, payoutId: payoutRef.id };
    } catch (e) {
        return fail(e, 'บันทึกการโอนไม่สำเร็จ');
    }
}

export async function getInterpreterGpSettingAction(): Promise<{ gpPercent: number | null; updatedAt: string | null }> {
    const { adminApp } = await requireAdmin(PERM_PAYOUTS);
    const d = (await adminApp.firestore().collection('settings').doc('interpreterFees').get()).data();
    return { gpPercent: typeof d?.gpPercent === 'number' ? d.gpPercent : null, updatedAt: iso(d?.updatedAt) };
}

/** มีผลกับ booking ใหม่เท่านั้น — booking เดิมเก็บ gpPercent ไว้ใน quote แล้ว */
export async function setInterpreterGpPercentAction(gpPercent: number): Promise<Result> {
    try {
        const { uid, adminApp } = await requireAdmin(PERM_PAYOUTS);
        const v = Number(gpPercent);
        if (!Number.isFinite(v) || v < 0 || v > 50) throw new ActionError('GP ต้องอยู่ระหว่าง 0-50%');
        const rounded = Math.round(v * 100) / 100;
        await adminApp.firestore().collection('settings').doc('interpreterFees').set({
            gpPercent: rounded,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: uid,
        }, { merge: true });
        return { ok: true };
    } catch (e) {
        return fail(e, 'บันทึก GP ไม่สำเร็จ');
    }
}

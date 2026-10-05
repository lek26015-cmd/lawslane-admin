'use server';

/**
 * ลิงก์ชำระเงินงานล่าม — แอดมินสร้างจากตั๋ว "ขอใช้บริการล่าม" แล้วส่งให้ลูกค้าในแชท
 *
 * ลูกค้าจ่ายที่ www.lawslane.com/{locale}/interpreter-payment/{id} (โค้ดฝั่ง Lawslane:
 * src/app/actions/interpreter-payment-link-actions.ts) → สร้าง interpreterBookings ตามโมเดลเดิม
 * แล้วตรวจสลิป/จ่ายล่ามผ่านหน้า /interpreter-bookings และ payout เดิม
 *
 * interpreterPaymentLinks อ่าน/เขียนผ่าน Admin SDK เท่านั้น
 */

import * as admin from 'firebase-admin';
import { requireAdmin } from '@/lib/auth-guard';
import { getMainLink } from '@/lib/domain-utils';

const PERM_REQUESTS = 'requests.interpreters';
const LINKS = 'interpreterPaymentLinks';
const AMOUNT = { min: 100, max: 2_000_000 }; // ตรงกับ OFFER_LIMITS ฝั่ง Lawslane
const VALID_DAYS = 7;
const SERVICES = ['court', 'police', 'lawyer_meeting', 'business_meeting', 'doc_translation', 'certified_translation'];
const LANGS = ['th', 'en', 'zh', 'ja', 'ko', 'fr', 'de', 'ru', 'ar', 'my', 'km', 'lo', 'vi', 'hi'];

type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: string };

export interface ApprovedInterpreterOption {
    id: string;
    name: string;
    languageCodes: string[];
    services: string[];
}

export interface PaymentLinkRow {
    id: string;
    title: string;
    amountBaht: number;
    interpreterName: string;
    status: string;
    bookingId: string | null;
    url: string;
    createdAt: string | null;
    expiresAt: string | null;
}

function str(v: unknown, max: number): string {
    return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function iso(v: any): string | null {
    return v?.toDate ? v.toDate().toISOString() : null;
}

function paymentUrl(id: string): string {
    return getMainLink(`/th/interpreter-payment/${id}`, 'admin', true);
}

export async function listApprovedInterpreterOptionsAction(): Promise<ApprovedInterpreterOption[]> {
    const { adminApp } = await requireAdmin(PERM_REQUESTS);
    const snap = await adminApp.firestore().collection('interpreterProfiles').where('status', '==', 'approved').limit(300).get();
    return snap.docs
        .map((d) => {
            const p = d.data();
            return {
                id: d.id,
                name: String(p.name || ''),
                languageCodes: Array.isArray(p.languageCodes) ? p.languageCodes : [],
                services: Array.isArray(p.services) ? p.services : [],
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'th'));
}

export async function listTicketPaymentLinksAction(ticketId: string): Promise<PaymentLinkRow[]> {
    const { adminApp } = await requireAdmin(PERM_REQUESTS);
    const snap = await adminApp.firestore().collection(LINKS).where('ticketId', '==', str(ticketId, 64)).get();
    return snap.docs
        .map((d) => {
            const x = d.data();
            const expired = x.status === 'open' && x.expiresAt?.toMillis?.() < Date.now();
            return {
                id: d.id,
                title: String(x.title || ''),
                amountBaht: Number(x.amountBaht) || 0,
                interpreterName: String(x.interpreterName || ''),
                status: expired ? 'expired' : String(x.status),
                bookingId: x.bookingId || null,
                url: paymentUrl(d.id),
                createdAt: iso(x.createdAt),
                expiresAt: iso(x.expiresAt),
            };
        })
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function createInterpreterPaymentLinkAction(input: {
    ticketId: string;
    interpreterId: string;
    title: string;
    amountBaht: number;
    service: string;
    languageFrom: string;
    languageTo: string;
    date?: string;
    notes?: string;
}): Promise<Result<{ id: string; url: string }>> {
    try {
        const { uid, adminApp } = await requireAdmin(PERM_REQUESTS);
        const db = adminApp.firestore();

        const ticketId = str(input.ticketId, 64);
        const ticket = ticketId && !ticketId.includes('/') ? (await db.collection('tickets').doc(ticketId).get()).data() : null;
        if (!ticket?.userId) return { ok: false, error: 'ไม่พบตั๋วนี้' };

        const interpreterId = str(input.interpreterId, 128);
        const interp = interpreterId && !interpreterId.includes('/') ? (await db.collection('interpreterProfiles').doc(interpreterId).get()).data() : null;
        if (!interp || interp.status !== 'approved') return { ok: false, error: 'กรุณาเลือกล่ามที่อนุมัติแล้ว' };

        const title = str(input.title, 120);
        const amountBaht = Math.round(Number(input.amountBaht) * 100) / 100;
        if (!title) return { ok: false, error: 'กรุณาใส่ชื่อรายการ' };
        if (!(amountBaht >= AMOUNT.min && amountBaht <= AMOUNT.max)) {
            return { ok: false, error: `ยอดต้องอยู่ระหว่าง ${AMOUNT.min.toLocaleString()}-${AMOUNT.max.toLocaleString()} บาท` };
        }
        const service = SERVICES.includes(input.service) ? input.service : '';
        const languageFrom = LANGS.includes(input.languageFrom) ? input.languageFrom : '';
        const languageTo = LANGS.includes(input.languageTo) ? input.languageTo : '';
        if (!service || !languageFrom || !languageTo) return { ok: false, error: 'กรุณาเลือกบริการและภาษา' };
        if (languageFrom === languageTo) return { ok: false, error: 'ภาษาต้นทางและปลายทางต้องต่างกัน' };

        const ref = db.collection(LINKS).doc();
        const url = paymentUrl(ref.id);
        const now = admin.firestore.FieldValue.serverTimestamp();
        const batch = db.batch();
        batch.set(ref, {
            ticketId,
            customerId: ticket.userId,
            interpreterId,
            interpreterUserId: interp.userId || interpreterId,
            interpreterName: String(interp.name || ''),
            title,
            amountBaht,
            service,
            languageFrom,
            languageTo,
            date: str(input.date, 40),
            notes: str(input.notes, 1000),
            lawyerId: ticket.interpreterRequest?.lawyerId || null,
            status: 'open',
            createdBy: uid,
            createdAt: now,
            expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + VALID_DAYS * 24 * 60 * 60 * 1000),
            bookingId: null,
        });
        // ส่งลิงก์ในแชทซัพพอร์ตในนามทีมงาน
        batch.set(db.collection('tickets').doc(ticketId).collection('messages').doc(), {
            text: `ลิงก์ชำระเงินค่าบริการล่าม: ${title}\nยอด ${amountBaht.toLocaleString('th-TH')} บาท (ใช้ได้ ${VALID_DAYS} วัน)\n${url}`,
            senderId: uid,
            senderName: 'ทีมงาน Lawslane',
            role: 'admin',
            createdAt: now,
            avatarUrl: null,
        });
        batch.set(db.collection('notifications').doc(), {
            type: 'interpreter_payment_link',
            title: 'ลิงก์ชำระเงินค่าบริการล่าม',
            message: `${title} — ${amountBaht.toLocaleString('th-TH')} บาท`,
            createdAt: now,
            read: false,
            recipient: ticket.userId,
            link: `/interpreter-payment/${ref.id}`,
            relatedId: ref.id,
        });
        await batch.commit();
        return { ok: true, id: ref.id, url };
    } catch (e: any) {
        console.error('createInterpreterPaymentLinkAction failed', e?.message);
        return { ok: false, error: 'สร้างลิงก์ไม่สำเร็จ' };
    }
}

export async function cancelInterpreterPaymentLinkAction(id: string): Promise<Result> {
    const { adminApp } = await requireAdmin(PERM_REQUESTS);
    const ref = adminApp.firestore().collection(LINKS).doc(str(id, 64));
    return adminApp.firestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return { ok: false as const, error: 'ไม่พบลิงก์' };
        if (snap.data()!.status !== 'open') return { ok: false as const, error: 'ลิงก์นี้ชำระแล้วหรือถูกยกเลิกแล้ว' };
        tx.update(ref, { status: 'cancelled', cancelledAt: admin.firestore.FieldValue.serverTimestamp() });
        return { ok: true as const };
    });
}

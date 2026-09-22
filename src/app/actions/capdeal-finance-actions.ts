'use server';

import * as admin from 'firebase-admin';
import { requireAdmin, AuthError } from '@/lib/auth-guard';
import { initAdmin } from '@/lib/firebase-admin';

/**
 * อนุมัติ / ปฏิเสธสลิปการชำระเงินของดีล
 *
 * เดิมหน้า admin/finance ยิง updateDoc ตรงจากเบราว์เซอร์ ซึ่งมีปัญหาสองชั้น:
 *   1. firestore.rules บน production ไม่มีกฎของ `cap-deals` เลย → ตกไป default
 *      deny การกดอนุมัติจึงไม่เคยมีผลจริง
 *   2. ต่อให้เพิ่มกฎ การให้เบราว์เซอร์เขียน status การเงินได้เองแปลว่าเจ้าของดีล
 *      ก็เขียนได้ด้วย (กฎแยกแอดมินกับเจ้าของที่ระดับ document ไม่ได้ถ้าจะให้
 *      เจ้าของแก้ field อื่น) → ย้ายมาเป็น server action ที่ผ่าน requireAdmin()
 *      แล้วล็อกกฎให้ `cap-deals` เขียนได้เฉพาะแอดมิน
 */

type ActionResult = { ok: true } | { ok: false; error: string };

function toResult(e: unknown): ActionResult {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    console.error('FINANCE_ACTION_ERROR', e);
    return { ok: false, error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' };
}

export async function approveDealPayment(dealId: string): Promise<ActionResult> {
    try {
        await requireAdmin('capdeal.finance');
        const adminApp = await initAdmin();
        if (!adminApp) return { ok: false, error: 'Firebase Admin ยังไม่พร้อม' };
        const db = adminApp.firestore();

        const dealRef = db.collection('cap-deals').doc(dealId);
        const snap = await dealRef.get();
        if (!snap.exists) return { ok: false, error: 'ไม่พบดีลนี้' };

        const deal = snap.data()!;
        const now = admin.firestore.FieldValue.serverTimestamp();

        await dealRef.update({
            status: 'active',
            paymentApprovedAt: now,
            hasNewPayment: false,
        });

        await db.collection('notifications').add({
            type: 'payment_approved',
            title: 'ยืนยันการชำระเงินสำเร็จ',
            message: `ดีล "${deal.title ?? ''}" ของคุณได้รับการตรวจสอบแล้ว`,
            createdAt: now,
            read: false,
            recipient: deal.ownerId ?? deal.userId ?? null,
            link: `/contract/${dealId}`,
        });

        return { ok: true };
    } catch (e) {
        return toResult(e);
    }
}

export async function rejectDealPayment(dealId: string, reason: string): Promise<ActionResult> {
    try {
        await requireAdmin('capdeal.finance');
        const adminApp = await initAdmin();
        if (!adminApp) return { ok: false, error: 'Firebase Admin ยังไม่พร้อม' };

        const trimmed = reason.trim();
        if (!trimmed) return { ok: false, error: 'ต้องระบุเหตุผลที่ปฏิเสธ' };

        const db = adminApp.firestore();
        const dealRef = db.collection('cap-deals').doc(dealId);
        const snap = await dealRef.get();
        if (!snap.exists) return { ok: false, error: 'ไม่พบดีลนี้' };

        const deal = snap.data()!;
        const now = admin.firestore.FieldValue.serverTimestamp();

        await dealRef.update({
            status: 'pending_payment',
            rejectReason: trimmed,
            hasNewPayment: false,
        });

        await db.collection('notifications').add({
            type: 'payment_rejected',
            title: 'การชำระเงินถูกปฏิเสธ',
            message: `สลิปสำหรับดีล "${deal.title ?? ''}" ถูกปฏิเสธ: ${trimmed}`,
            createdAt: now,
            read: false,
            recipient: deal.ownerId ?? deal.userId ?? null,
            link: `/payment?chatId=${dealId}&type=additional`,
        });

        return { ok: true };
    } catch (e) {
        return toResult(e);
    }
}

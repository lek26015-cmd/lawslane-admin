'use server';

/**
 * ตรวจเลขใบอนุญาตที่ติด needsReview ใน verifiedLawyers
 *
 * ที่มา: 2026-09-28 ล้างข้อมูลที่นำเข้าจากรูปเมื่อ 14 ก.ค. 2026 — เลขผิดรูปแบบ (AI แต่ง เช่น ลำดับที่
 * 1345, 1346… หรือ 9999/XXXX) ถูกล้างเป็น '' แล้ว ที่เหลือ 104 รายการรูปแบบถูก แต่ยังไม่มีใครเทียบกับ
 * แหล่งจริง จึงติด needsReview: true ไว้ให้แอดมินตรวจทีละรายการ
 *
 * กฎ: ห้ามเดาเลข — ถ้ายืนยันกับแหล่งทางการไม่ได้ ให้ "ลบเลข" (ชื่อยังค้นเจอได้ แต่ไม่มีเลข)
 */

import * as admin from 'firebase-admin';
import { initAdmin } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/auth-guard';

const LICENSE_RE = /^\d{1,6}\/\d{4}$/;

export interface ReviewRow {
    id: string;
    prefix: string;
    firstName: string;
    lastName: string;
    licenseNumber: string;
    licenseType: string;
    status: string;
}

type Result = { ok: true } | { ok: false; error: string };

async function db() {
    const { uid } = await requireAdmin('users.registry');
    const app = await initAdmin();
    if (!app) throw new Error('Server error: Admin SDK not initialized');
    return { uid, db: app.firestore() };
}

export async function listNeedsReviewAction(): Promise<ReviewRow[]> {
    const { db: firestore } = await db();
    const snap = await firestore.collection('verifiedLawyers').where('needsReview', '==', true).limit(500).get();
    return snap.docs
        .map((d) => {
            const x = d.data();
            return {
                id: d.id,
                prefix: String(x.prefix || ''),
                firstName: String(x.firstName || ''),
                lastName: String(x.lastName || ''),
                licenseNumber: String(x.licenseNumber || ''),
                licenseType: String(x.licenseType || ''),
                status: String(x.status || ''),
            };
        })
        .sort((a, b) => a.licenseNumber.localeCompare(b.licenseNumber, 'th', { numeric: true }));
}

/**
 * ผลตรวจของแอดมิน:
 *   confirm — เทียบกับแหล่งทางการแล้วเลขถูกต้อง
 *   correct — เลขผิด แก้เป็นเลขที่ถูก (ต้องตรงรูปแบบ และต้องไม่ซ้ำกับรายชื่ออื่น)
 *   remove  — ยืนยันไม่ได้ → ลบเลขออก สถานะเป็น announced (ยังค้นด้วยชื่อได้)
 */
export async function resolveReviewAction(
    id: string,
    decision: 'confirm' | 'correct' | 'remove',
    correctedLicense?: string,
): Promise<Result> {
    try {
        const { uid, db: firestore } = await db();
        const ref = firestore.collection('verifiedLawyers').doc(String(id).slice(0, 128));
        const snap = await ref.get();
        if (!snap.exists || snap.get('needsReview') !== true) return { ok: false, error: 'รายการนี้ตรวจแล้วหรือไม่มีอยู่' };

        const audit = {
            needsReview: false,
            reviewedBy: uid,
            reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
            reviewDecision: decision,
        };

        if (decision === 'confirm') {
            await ref.update(audit);
        } else if (decision === 'remove') {
            await ref.update({ ...audit, licenseNumber: '', status: 'announced', licenseRemovedFromReview: snap.get('licenseNumber') || '' });
        } else {
            const ln = String(correctedLicense || '').replace(/\s+/g, '');
            if (!LICENSE_RE.test(ln)) return { ok: false, error: 'เลขใบอนุญาตต้องเป็นรูปแบบ เลข/ปี พ.ศ. เช่น 12345/2550' };
            const dup = await firestore.collection('verifiedLawyers').where('licenseNumber', '==', ln).limit(2).get();
            if (dup.docs.some((d) => d.id !== ref.id)) return { ok: false, error: 'มีรายชื่ออื่นใช้เลขนี้อยู่แล้ว' };
            await ref.update({ ...audit, licenseNumber: ln, status: 'active', licenseBeforeReview: snap.get('licenseNumber') || '' });
        }
        return { ok: true };
    } catch (e: any) {
        console.error('resolveReviewAction failed', e?.message);
        return { ok: false, error: 'บันทึกไม่สำเร็จ' };
    }
}

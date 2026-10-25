'use server';

/**
 * ทนายลงทะเบียนชื่อเองจากหน้า /verify-lawyer/register ของเว็บหลัก
 * (verifiedLawyers · status 'pending' · source 'self_registration')
 *
 * แอดมินเทียบชื่อ + เลขใบอนุญาตกับสภาทนายความก่อน แล้ว:
 *   approve — status 'active' → ค้นเจอบนหน้าตรวจสอบทนาย (แก้ชื่อ/เลขให้ตรงทะเบียนก่อนอนุมัติได้)
 *   reject  — ลบระเบียนทิ้ง (ไม่ตั้งสถานะอื่น เพราะตารางหลักแสดงสถานะที่ไม่รู้จักเป็น "ลบชื่อออก")
 *
 * เบอร์/อีเมลใน selfRegistration มีไว้ติดต่อกลับระหว่างตรวจเท่านั้น — อนุมัติแล้วลบทิ้ง
 */

import * as admin from 'firebase-admin';
import { initAdmin } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/auth-guard';

const LICENSE_RE = /^\d{1,6}\/\d{4}$/;

export interface SelfRegistrationRow {
    id: string;
    prefix: string;
    firstName: string;
    lastName: string;
    licenseNumber: string;
    province: string;
    phone: string;
    email: string;
    createdAt: string | null;
}

export interface ApproveEdits {
    prefix: string;
    firstName: string;
    lastName: string;
    licenseNumber: string;
}

type Result = { ok: true } | { ok: false; error: string };

async function db() {
    const { uid } = await requireAdmin('users.registry');
    const app = await initAdmin();
    if (!app) throw new Error('Server error: Admin SDK not initialized');
    return { uid, db: app.firestore() };
}

function str(v: unknown, max: number) {
    return typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}

export async function listSelfRegistrationsAction(): Promise<SelfRegistrationRow[]> {
    const { db: firestore } = await db();
    const snap = await firestore.collection('verifiedLawyers')
        .where('source', '==', 'self_registration')
        .where('status', '==', 'pending')
        .limit(500)
        .get();
    return snap.docs
        .map((d) => {
            const x = d.data();
            const created = x.createdAt?.toDate ? x.createdAt.toDate() : null;
            return {
                id: d.id,
                prefix: String(x.prefix || ''),
                firstName: String(x.firstName || ''),
                lastName: String(x.lastName || ''),
                licenseNumber: String(x.licenseNumber || ''),
                province: String(x.province || ''),
                phone: String(x.selfRegistration?.phone || ''),
                email: String(x.selfRegistration?.email || ''),
                createdAt: created ? created.toISOString() : null,
            };
        })
        .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
}

export async function approveSelfRegistrationAction(id: string, edits: ApproveEdits): Promise<Result> {
    try {
        const { uid, db: firestore } = await db();
        const ref = firestore.collection('verifiedLawyers').doc(String(id).slice(0, 128));
        const snap = await ref.get();
        if (!snap.exists || snap.get('status') !== 'pending' || snap.get('source') !== 'self_registration') {
            return { ok: false, error: 'รายการนี้ตรวจแล้วหรือไม่มีอยู่' };
        }

        const firstName = str(edits.firstName, 100);
        const lastName = str(edits.lastName, 100);
        const licenseNumber = str(edits.licenseNumber, 30).replace(/\s+/g, '');
        if (!firstName || !lastName) return { ok: false, error: 'ต้องมีชื่อและนามสกุล' };
        if (!LICENSE_RE.test(licenseNumber)) return { ok: false, error: 'เลขใบอนุญาตต้องเป็นรูปแบบ เลข/ปี พ.ศ. เช่น 12345/2550' };

        const dup = await firestore.collection('verifiedLawyers').where('licenseNumber', '==', licenseNumber).limit(5).get();
        if (dup.docs.some((d) => d.id !== ref.id && d.get('status') === 'active')) {
            return { ok: false, error: 'มีรายชื่ออื่นใช้เลขนี้อยู่แล้ว (สถานะปกติ) — ปฏิเสธรายการนี้แทน' };
        }

        const submitted = {
            prefix: snap.get('prefix') || '',
            firstName: snap.get('firstName') || '',
            lastName: snap.get('lastName') || '',
            licenseNumber: snap.get('licenseNumber') || '',
        };
        const changed = submitted.firstName !== firstName || submitted.lastName !== lastName || submitted.licenseNumber !== licenseNumber;

        await ref.update({
            prefix: str(edits.prefix, 30),
            firstName,
            lastName,
            licenseNumber,
            status: 'active',
            ...(changed ? { selfRegistrationSubmitted: submitted } : {}),
            'selfRegistration.phone': admin.firestore.FieldValue.delete(),
            'selfRegistration.email': admin.firestore.FieldValue.delete(),
            'selfRegistration.ipAddress': admin.firestore.FieldValue.delete(),
            reviewedBy: uid,
            reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ok: true };
    } catch (e: any) {
        console.error('approveSelfRegistrationAction failed', e?.message);
        return { ok: false, error: 'บันทึกไม่สำเร็จ' };
    }
}

export async function rejectSelfRegistrationAction(id: string): Promise<Result> {
    try {
        const { db: firestore } = await db();
        const ref = firestore.collection('verifiedLawyers').doc(String(id).slice(0, 128));
        const snap = await ref.get();
        if (!snap.exists || snap.get('status') !== 'pending' || snap.get('source') !== 'self_registration') {
            return { ok: false, error: 'รายการนี้ตรวจแล้วหรือไม่มีอยู่' };
        }
        await ref.delete();
        return { ok: true };
    } catch (e: any) {
        console.error('rejectSelfRegistrationAction failed', e?.message);
        return { ok: false, error: 'ลบไม่สำเร็จ' };
    }
}

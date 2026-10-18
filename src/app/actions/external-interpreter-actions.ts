'use server';

/**
 * ล่ามนอกระบบ — ล่ามที่ไม่ได้สมัครในเว็บ แอดมินจ้างเองแล้วส่งงานผ่านลิงก์ชำระเงินในแชท
 *
 * ลูกค้าต้องไม่รู้ว่าเป็นล่ามนอก: งาน (interpreterBookings) ที่ลูกค้าอ่านได้ตาม rules มีรูปร่าง
 * เหมือนงานล่ามในระบบทุกอย่าง (interpreterId = id ของเอกสารนี้, interpreterName = ชื่อที่ลูกค้าเห็น)
 * ไม่มีฟิลด์บอกว่าเป็นล่ามนอก — โค้ดฝั่งเซิร์ฟเวอร์ทั้งสองเว็บดูจากว่ามี externalInterpreters/{interpreterId} หรือไม่
 *
 * externalInterpreters อ่าน/เขียนผ่าน Admin SDK เท่านั้น (rules catch-all ปิดไว้)
 * เว็บหลักอ่าน name/phone/lineId ไปแสดงเป็นข้อมูลติดต่อหลังลูกค้าจ่ายเงิน (lib/interpreter-public.ts)
 */

import * as admin from 'firebase-admin';
import { requireAdmin, AuthError } from '@/lib/auth-guard';

const PERM_REQUESTS = 'requests.interpreters';
const COL = 'externalInterpreters';
const LANGS = ['th', 'en', 'zh', 'ja', 'ko', 'fr', 'de', 'ru', 'ar', 'my', 'km', 'lo', 'vi', 'hi'];

type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: string };

export interface ExternalInterpreter {
    id: string;
    /** ชื่อที่ลูกค้าเห็น */
    name: string;
    /** ชื่อจริง/บริษัท — แอดมินเห็นเท่านั้น */
    realName: string;
    /** เบอร์/LINE ลูกค้าเห็นหลังชำระเงิน เหมือนล่ามในระบบ */
    phone: string;
    lineId: string;
    languageCodes: string[];
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
    note: string;
}

export type ExternalInterpreterInput = Omit<ExternalInterpreter, 'id'> & { id?: string };

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function toRow(id: string, x: FirebaseFirestore.DocumentData): ExternalInterpreter {
    return {
        id,
        name: String(x.name || ''),
        realName: String(x.realName || ''),
        phone: String(x.phone || ''),
        lineId: String(x.lineId || ''),
        languageCodes: Array.isArray(x.languageCodes) ? x.languageCodes : [],
        bankName: String(x.bankName || ''),
        bankAccountNumber: String(x.bankAccountNumber || ''),
        bankAccountName: String(x.bankAccountName || ''),
        note: String(x.note || ''),
    };
}

export async function listExternalInterpretersAction(): Promise<ExternalInterpreter[]> {
    const { adminApp } = await requireAdmin(PERM_REQUESTS);
    const snap = await adminApp.firestore().collection(COL).limit(300).get();
    return snap.docs.map((d) => toRow(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name, 'th'));
}

/** เพิ่ม (ไม่มี id) หรือแก้ไข (มี id) */
export async function saveExternalInterpreterAction(input: ExternalInterpreterInput): Promise<Result<{ id: string }>> {
    try {
        const { uid, adminApp } = await requireAdmin(PERM_REQUESTS);
        const db = adminApp.firestore();
        const name = str(input.name, 100);
        if (!name) return { ok: false, error: 'กรุณากรอกชื่อที่ลูกค้าเห็น' };
        const phone = str(input.phone, 30);
        if (phone && !/^[0-9+\-\s()]{8,30}$/.test(phone)) return { ok: false, error: 'เบอร์โทรไม่ถูกต้อง' };
        const data = {
            name,
            realName: str(input.realName, 150),
            phone,
            lineId: str(input.lineId, 60),
            languageCodes: Array.isArray(input.languageCodes) ? input.languageCodes.filter((c) => LANGS.includes(c)) : [],
            bankName: str(input.bankName, 100),
            bankAccountNumber: str(input.bankAccountNumber, 40),
            bankAccountName: str(input.bankAccountName, 150),
            note: str(input.note, 1000),
            updatedBy: uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        const id = str(input.id, 128);
        if (id) {
            if (id.includes('/')) return { ok: false, error: 'ไม่พบล่าม' };
            const ref = db.collection(COL).doc(id);
            if (!(await ref.get()).exists) return { ok: false, error: 'ไม่พบล่าม' };
            await ref.update(data);
            return { ok: true, id };
        }
        // id สุ่มของ Firestore ใช้เป็น interpreterId ในงาน — ห้ามใส่คำนำหน้าที่บอกว่าเป็นล่ามนอก
        const ref = await db.collection(COL).add({ ...data, createdBy: uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        return { ok: true, id: ref.id };
    } catch (e) {
        if (e instanceof AuthError) return { ok: false, error: 'ไม่มีสิทธิ์ทำรายการนี้' };
        console.error('saveExternalInterpreterAction failed:', e);
        return { ok: false, error: 'บันทึกล่ามนอกไม่สำเร็จ' };
    }
}

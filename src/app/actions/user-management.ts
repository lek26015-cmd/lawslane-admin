'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, requireSuperAdmin, AuthError } from '@/lib/auth-guard';
import { isDesignatedSuperAdminUid } from '@/lib/super-admin';

/**
 * เปลี่ยน role / ลบผู้ใช้ — ยกมาจาก lawslane-capdeal api/admin/users (Module 7)
 *
 * ของเดิมมีบั๊กร้ายแรง: เรียก setCustomUserClaims(uid, { role }) ซึ่ง **เขียนทับ
 * claim ทั้งก้อน** — claim อื่นที่มีอยู่ (admin, su, p, lawyer) จะหายเกลี้ยง
 * ใช้กับบัญชีแอดมินครั้งเดียวก็ทำให้สิทธิ์ที่ migrate ไว้หายทั้งหมด
 * ตัวนี้ merge ของเดิมเสมอ
 */

type Result = { ok: true } | { ok: false; error: string };

function toResult(e: unknown): Result {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    console.error('USER_MANAGEMENT_ERROR', e);
    return { ok: false, error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' };
}

export async function setUserRoleAction(uid: string, role: string): Promise<Result> {
    try {
        // การเปลี่ยน role กระทบสิทธิ์ จึงต้องเป็น super admin เหมือนหน้าจัดการแอดมิน
        const { adminApp } = await requireSuperAdmin();

        if (!uid || !role) return { ok: false, error: 'ต้องระบุ uid และ role' };

        const auth = adminApp.auth();
        const user = await auth.getUser(uid);

        // merge ไม่ใช่เขียนทับ — กัน claim สิทธิ์ของบัญชีอื่นหาย
        await auth.setCustomUserClaims(uid, { ...(user.customClaims ?? {}), role });

        await adminApp.firestore().collection('users').doc(uid).update({
            role,
            updatedAt: new Date(),
        });

        revalidatePath('/customers');
        return { ok: true };
    } catch (e) {
        return toResult(e);
    }
}

export async function deleteUserAction(uid: string): Promise<Result> {
    try {
        const { adminApp, uid: callerUid } = await requireSuperAdmin();

        if (!uid) return { ok: false, error: 'ต้องระบุ uid' };
        if (uid === callerUid) return { ok: false, error: 'ลบบัญชีตัวเองไม่ได้' };
        if (isDesignatedSuperAdminUid(uid)) {
            return { ok: false, error: 'ลบบัญชี super admin หลักไม่ได้' };
        }

        await adminApp.firestore().collection('users').doc(uid).delete();
        await adminApp.auth().deleteUser(uid);

        revalidatePath('/customers');
        return { ok: true };
    } catch (e) {
        return toResult(e);
    }
}

/** ใช้ซ่อน/แสดงปุ่มจัดการผู้ใช้บนหน้า /customers */
export async function canManageUsersAction(): Promise<boolean> {
    try {
        await requireSuperAdmin();
        return true;
    } catch {
        // แอดมินธรรมดายังเข้าหน้า /customers ได้ แค่ไม่เห็นปุ่มเปลี่ยน role/ลบ
        try {
            await requireAdmin('users.customers');
        } catch { /* ไม่ใช่แอดมินเลย */ }
        return false;
    }
}

/**
 * รูปโปรไฟล์จาก Firebase Auth (Google/LINE) ของลูกค้าที่ไม่ได้อัปโหลด `users.avatar` เอง
 * — ผู้ใช้ส่วนใหญ่ไม่มี avatar ใน Firestore แต่มี photoURL จากการล็อกอิน
 * คืนเฉพาะ URL https · สูงสุด 100 uid ต่อครั้ง (ขีดจำกัดของ getUsers)
 */
export async function getAuthPhotoUrlsAction(uids: string[]): Promise<Record<string, string>> {
    try {
        const { adminApp } = await requireAdmin('users.customers');
        const ids = [...new Set((Array.isArray(uids) ? uids : []).filter(u => typeof u === 'string' && u && !u.includes('/')))].slice(0, 100);
        if (ids.length === 0) return {};
        const res = await adminApp.auth().getUsers(ids.map(uid => ({ uid })));
        const out: Record<string, string> = {};
        for (const u of res.users) {
            if (u.photoURL?.startsWith('https://')) out[u.uid] = u.photoURL;
        }
        return out;
    } catch {
        return {};
    }
}

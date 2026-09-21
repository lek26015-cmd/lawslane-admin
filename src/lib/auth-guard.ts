import 'server-only';
import { cookies, headers } from 'next/headers';
import { initAdmin } from './firebase-admin';
import { hasPermission } from './permissions';
import { isDesignatedSuperAdminUid } from './super-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

/**
 * ด่านตรวจสิทธิ์แอดมินฝั่ง server สำหรับ lawslane-admin
 *
 * ทุก API route และ server action ที่แตะข้อมูลผู้ใช้ต้องเรียกตัวนี้
 * middleware.ts เช็คแค่ว่า "มี cookie ชื่อ session ไหม" ซึ่งปลอมได้ และ matcher
 * ก็ไม่ครอบ /api — จึงห้ามใช้ middleware เป็นด่านความปลอดภัย
 *
 * ⚠️ จงใจ "ไม่" อ่าน users/{uid}.role จาก Firestore:
 *    firestore.rules ปัจจุบันให้ผู้ใช้เขียน document ตัวเองได้ทุกฟิลด์
 *    (allow write: if isOwner(userId)) → ถ้าเชื่อ role จาก Firestore
 *    ใครก็ยกสิทธิ์ตัวเองเป็นแอดมินได้ ดู LAWSLANE แผนความปลอดภัย §2 ข้อ 2.1
 *    แหล่งความจริงคือ custom claim เท่านั้น (ตั้งด้วย scripts/set-admin-claim.js)
 */

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

function tokenGrantsAdmin(token: DecodedIdToken): boolean {
  return (
    token.admin === true ||
    token.role === 'admin' ||
    isDesignatedSuperAdminUid(token.uid)
  );
}

/**
 * ตรวจว่า token นี้เป็น super admin ไหม — ใช้ทั้งเป็น permission gate (requireSuperAdmin)
 * และเป็นตัวเช็คแสดงผล (เช่น การ์ด "รายได้รวม" ที่โชว์เฉพาะ super admin บน dashboard)
 *
 * รวม LEGACY_SUPER_ADMIN_UIDS ไว้ด้วยเพราะบัญชีที่ยังไม่ได้ตั้ง `su` claim (ระหว่างย้าย
 * ระบบ) ต้องยังนับเป็น super admin ต่อไป — ดู grantedPermissions ด้านบน
 */
export function isSuperAdminToken(token: DecodedIdToken): boolean {
  return token.su === true || token.superAdmin === true || isDesignatedSuperAdminUid(token.uid);
}

/**
 * ดึงรายการสิทธิ์ย่อยออกจาก claim
 *
 * คืน `null` = ไม่จำกัดสิทธิ์ ซึ่งเกิดได้ 2 กรณี
 *   1. super admin (`su: true` หรือ claim เก่า `superAdmin: true`)
 *   2. บัญชีที่ยังไม่ได้ย้ายสิทธิ์ (ไม่มี `p` ใน claim)
 *
 * ⚠️ กรณีที่ 2 เป็น "ตาข่ายกันล็อกตัวเองออก" ระหว่างย้ายระบบเท่านั้น
 *    เมื่อรัน scripts/set-admin-claim.ts ครบทุกบัญชีแล้ว ให้เปลี่ยนบรรทัดสุดท้าย
 *    เป็น `return []` เพื่อให้ค่าเริ่มต้นคือ "ไม่มีสิทธิ์อะไรเลย"
 */
function grantedPermissions(token: DecodedIdToken): string[] | null {
  if (token.su === true || token.superAdmin === true) return null;
  if (Array.isArray(token.p)) return token.p as string[];
  return null;
}

/**
 * ตรวจว่าผู้เรียกล็อกอินอยู่จริง แล้วคืน uid ที่ผ่านการตรวจลายเซ็นแล้ว
 * รับได้ทั้ง session cookie (server action / หน้าเว็บ) และ Bearer token (fetch จาก client)
 * ห้ามรับ uid เป็น argument จากผู้เรียกเด็ดขาด
 */
export async function requireUser(): Promise<{ uid: string; token: DecodedIdToken; adminApp: NonNullable<Awaited<ReturnType<typeof initAdmin>>> }> {
  const adminApp = await initAdmin();
  if (!adminApp) {
    throw new AuthError('Server misconfigured: Firebase Admin not initialized', 500);
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;

  if (sessionCookie) {
    try {
      // checkRevoked: true → บัญชีที่ถูกระงับใช้ต่อไม่ได้ทันที ไม่ต้องรอ cookie หมดอายุ 5 วัน
      const token = await adminApp.auth().verifySessionCookie(sessionCookie, true);
      return { uid: token.uid, token, adminApp };
    } catch {
      // ตกไปลองทาง Bearer ต่อ
    }
  }

  const headersList = await headers();
  const authHeader = headersList.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = await adminApp.auth().verifyIdToken(authHeader.slice('Bearer '.length), true);
      return { uid: token.uid, token, adminApp };
    } catch {
      throw new AuthError('Unauthorized: invalid token', 401);
    }
  }

  throw new AuthError('Unauthorized: no valid session', 401);
}

/**
 * ตรวจว่าผู้เรียกเป็นแอดมินจริง — ใช้กับทุก API route และ server action ในแอปนี้
 *
 * @param permission รหัสสิทธิ์ย่อยจาก src/lib/permissions.ts เช่น 'education.exams'
 *                   ไม่ใส่ = ขอแค่เป็นแอดมิน (พฤติกรรมเดิม)
 *
 * ตัวอย่าง:
 *   const { adminApp } = await requireAdmin('financials.withdrawals');
 */
export async function requireAdmin(permission?: string) {
  const result = await requireUser();
  if (!tokenGrantsAdmin(result.token)) {
    throw new AuthError('Forbidden: admin access required', 403);
  }
  if (!hasPermission(grantedPermissions(result.token), permission)) {
    throw new AuthError(`Forbidden: missing permission "${permission}"`, 403);
  }
  return result;
}

/**
 * ตรวจว่าผู้เรียกเป็น super admin จริง — ใช้กับ action ที่แก้สิทธิ์แอดมินคนอื่น
 * (สร้าง/แก้/ถอนสิทธิ์แอดมิน) ซึ่งต้องเข้มกว่า requireAdmin ธรรมดา
 */
export async function requireSuperAdmin() {
  const result = await requireUser();
  if (!isSuperAdminToken(result.token)) {
    throw new AuthError('Forbidden: super admin access required', 403);
  }
  return result;
}

/** ตัวช่วยสำหรับ API route: แปลง AuthError เป็น NextResponse ที่ถูกต้อง */
export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error('AUTH_GUARD_UNEXPECTED_ERROR', error);
  return Response.json({ error: 'Internal Server Error' }, { status: 500 });
}

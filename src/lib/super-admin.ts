/**
 * บัญชี super-admin ที่ hardcode ไว้เป็น "ตาข่ายกันล็อกตัวเองออก" ระหว่างที่ระบบ
 * custom claim ยังตั้งไม่ครบทุกบัญชี (ดู LEGACY_SUPER_ADMIN_UIDS ใน src/lib/auth-guard.ts
 * และ scripts/set-admin-claim.ts / scripts/audit-admin-claims.ts)
 *
 * เดิม literal ชุดนี้กระจายพิมพ์ซ้ำอยู่ ~14 จุดทั่ว repo — พิมพ์ผิด/ลืมจุดใดจุดหนึ่งเสี่ยง
 * ทำให้เช็คไม่ตรงกันระหว่างหน้า รวมไว้ที่เดียวให้แก้ทีเดียวครบ
 *
 * ไม่ใช่ secret: ค่าพวกนี้อยู่ใน client bundle อยู่แล้วในหลายจุดของโค้ดเดิม จึงไม่ใส่
 * 'server-only' — ไฟล์นี้ import ได้ทั้งจาก client component และ server action
 */

// พิมพ์เป็น readonly string[] (ไม่ใช้ as const) เพื่อให้ .includes(someDynamicString)
// เรียกได้ตรงๆ ทุกจุดที่ใช้ โดยไม่ต้อง cast ซ้ำที่ปลายทาง
export const LEGACY_SUPER_ADMIN_UIDS: readonly string[] = [
  'wS9w7ysNYUajNsBYZ6C7n2Afe9H3',
  'N5ehLbkYXbQQLX5KEuwJbeL3cXO2',
];

export const DESIGNATED_SUPER_ADMIN_EMAILS: readonly string[] = [
  'lek.26015@gmail.com',
  'lek26015@gmail.com',
];

export function isDesignatedSuperAdminUid(uid?: string | null): boolean {
  return !!uid && LEGACY_SUPER_ADMIN_UIDS.includes(uid);
}

export function isDesignatedSuperAdminEmail(email?: string | null): boolean {
  return !!email && DESIGNATED_SUPER_ADMIN_EMAILS.includes(email);
}

/** เช็คทั้ง uid และ email พร้อมกัน — ใช้ตอนมีทั้งสองอย่างในมือ (เช่นจาก Firebase Auth user) */
export function isDesignatedSuperAdmin(u: { uid?: string | null; email?: string | null }): boolean {
  return isDesignatedSuperAdminUid(u.uid) || isDesignatedSuperAdminEmail(u.email);
}

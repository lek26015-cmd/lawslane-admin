/**
 * รหัสสิทธิ์ของหลังบ้านรวม — แหล่งความจริงเดียว
 *
 * ใช้ร่วมกัน 3 ที่:
 *   1. `src/lib/auth-guard.ts`  → บังคับจริงฝั่ง server (requireAdmin(perm))
 *   2. `src/config/nav.tsx`     → ซ่อน/แสดงเมนู
 *   3. `src/app/settings/administrators/*` → หน้าติ๊กสิทธิ์ตอนสร้าง/แก้แอดมิน
 *
 * รหัสเป็นลำดับชั้นด้วยจุด: ให้สิทธิ์ `financials` = ได้ `financials.*` ทั้งหมด
 * (ดู hasPermission ด้านล่าง)
 *
 * ⚠️ custom claim จำกัด 1000 bytes — super admin จึงใช้ `su: true` แล้ว "ไม่" ต้องแบก
 * array `p` เลย ส่วนพนักงานรายแผนกถือเฉพาะรหัสของตัวเอง ขนาดจึงไม่ชนเพดาน
 */

export const PERMISSIONS = {
    'users.customers': 'ลูกค้า',
    'users.lawyers': 'ทนายความ',
    'users.registry': 'ฐานข้อมูลทนาย',
    'chat': 'แชททั้งหมด',
    'requests': 'คำขอใช้บริการ',
    'surveys': 'แบบสำรวจ',
    'content': 'เนื้อหาและการตลาด',
    // 4 รหัสนี้มีใช้อยู่แล้วใน adminPermissions ของเดิม — ห้ามเปลี่ยนชื่อ
    'financials.overview': 'ภาพรวมการเงิน',
    'financials.verification': 'ตรวจสอบสลิป',
    'financials.transactions': 'รายการธุรกรรม',
    'financials.withdrawals': 'คำร้องถอนเงิน',
    'coupons': 'คูปองส่วนลด',
    'gp_coupons': 'คูปอง GP ทนาย',
    'support': 'Ticket และอีเมล',
    'store.books': 'คลังหนังสือ',
    'store.orders': 'รายการสั่งซื้อ',
    'rag': 'คลังความรู้ AI และ RAG',
    // ใหม่ — ยกมาจาก lawlanes-education
    'education.courses': 'คอร์สเรียน',
    'education.exams': 'ข้อสอบ',
    'education.settings': 'ตั้งค่า Education',
    // ใหม่ — ยกมาจาก lawslane-capdeal
    'capdeal.contracts': 'สัญญา CapDeal',
    'capdeal.finance': 'การเงิน CapDeal',
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

/**
 * เช็คว่าชุดสิทธิ์ที่ถืออยู่ ครอบคลุมสิทธิ์ที่ต้องการไหม
 *
 * @param granted  รายการรหัสที่ถืออยู่ — `null`/`undefined` = ไม่จำกัด (super admin
 *                 หรือบัญชีเก่าที่ยังไม่ได้ย้ายสิทธิ์ ดูหมายเหตุใน auth-guard)
 * @param required รหัสที่หน้านั้น/action นั้นต้องการ — ไม่ใส่ = ใครเป็นแอดมินก็เข้าได้
 */
export function hasPermission(
    granted: readonly string[] | null | undefined,
    required?: string
): boolean {
    if (!required) return true;
    if (granted === null || granted === undefined) return true;
    if (granted.includes(required)) return true;
    // ให้สิทธิ์แม่ครอบสิทธิ์ลูก: ถือ 'financials' = เข้า 'financials.withdrawals' ได้
    const parts = required.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
        if (granted.includes(parts.slice(0, i).join('.'))) return true;
    }
    return false;
}

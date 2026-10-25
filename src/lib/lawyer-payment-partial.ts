/**
 * แบ่งจ่ายค่าทนาย — ลูกความจ่ายงวด/ค่าเคส/ค่าเพิ่มเติมรายการเดียวได้หลายครั้ง
 * ไม่มี server-only: หน้า /payment และการ์ดในแชทใช้คำนวณยอดคงเหลือเหมือน server
 *
 * สถานะเก็บที่ chats/{id}.partialPayments[key] (key = 'case' | 'additional' | 'installment_{i}')
 *   paid    = ยอดที่ยืนยันแล้ว (SlipOK/แอดมิน) ของรายการนั้น (บาท)
 *   pending = { [lawyerPaymentId]: บาท } สลิปที่รอแอดมินตรวจ — กันยอดไว้ไม่ให้จ่ายเกิน
 * จ่ายครบ → ลบ key ทิ้ง แล้วรายการเป็น "จ่ายแล้ว" ตามฟิลด์เดิม (installments[i].status = 'paid' ฯลฯ)
 *
 * สำเนาของ Lawslane/src/lib/lawyer-payment-partial.ts — แก้ที่นี่ต้องแก้ที่นั่นด้วย (และกลับกัน)
 */

/** จ่ายครั้งละอย่างน้อยเท่านี้ (บาท) — ยอดคงเหลือน้อยกว่านี้ต้องจ่ายที่เหลือทั้งหมด */
export const MIN_PARTIAL_PAYMENT = 1000;

export type PartialState = { paid: number; pending: Record<string, number> };

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function partialKey(type: string, installmentIndex?: number | null): string {
    return type === 'installment' ? `installment_${Number(installmentIndex)}` : type;
}

function num(v: unknown): number {
    const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
}

export function readPartial(chat: Record<string, any> | null | undefined, key: string): PartialState {
    const raw = chat?.partialPayments?.[key];
    const pending: Record<string, number> = {};
    if (raw?.pending && typeof raw.pending === 'object') {
        for (const [id, v] of Object.entries(raw.pending)) {
            const n = num(v);
            if (n > 0) pending[id] = n;
        }
    }
    return { paid: num(raw?.paid), pending };
}

export const pendingTotal = (s: PartialState) => round2(Object.values(s.pending).reduce((a, b) => a + b, 0));

/** ยอดที่ยังจ่ายได้ = ยอดรายการ − จ่ายแล้ว − รอตรวจ */
export function remainingOf(itemAmount: number, s: PartialState): number {
    return Math.max(0, round2(itemAmount - s.paid - pendingTotal(s)));
}

/** ยอดขั้นต่ำของครั้งนี้ */
export function minPaymentFor(remaining: number): number {
    return remaining < MIN_PARTIAL_PAYMENT ? remaining : MIN_PARTIAL_PAYMENT;
}

/** ตรวจยอดที่ลูกความกรอก — คืนข้อความผิดพลาด หรือ null ถ้าใช้ได้ */
export function partialAmountError(amount: number, remaining: number): string | null {
    if (!Number.isFinite(amount) || amount <= 0) return 'กรุณากรอกยอดที่จะชำระ';
    if (round2(amount) !== amount) return 'ยอดชำระทศนิยมได้ไม่เกิน 2 ตำแหน่ง';
    if (remaining <= 0) return 'ยอดที่เหลือของรายการนี้รอทีมงานตรวจสลิปอยู่';
    if (amount > remaining + 0.005) return `ชำระได้ไม่เกินยอดคงเหลือ ฿${remaining.toLocaleString()}`;
    const min = minPaymentFor(remaining);
    if (amount < min - 0.005) {
        return remaining < MIN_PARTIAL_PAYMENT
            ? `ยอดคงเหลือต่ำกว่า ฿${MIN_PARTIAL_PAYMENT.toLocaleString()} กรุณาชำระทั้งหมด ฿${remaining.toLocaleString()}`
            : `ชำระครั้งละอย่างน้อย ฿${MIN_PARTIAL_PAYMENT.toLocaleString()}`;
    }
    return null;
}

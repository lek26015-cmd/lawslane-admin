import 'server-only';

/**
 * คำขอค่าบริการเพิ่มเติมที่ยังค้างชำระของห้องแชท — สำเนาของ
 * Lawslane/src/lib/additional-fee.ts
 *
 * ⚠️ สองไฟล์นี้ต้องตรงกันเสมอ: เว็บหลักใช้ตัวนี้ตัดสินว่า "ลูกความต้องจ่ายค่าบริการ
 *    เพิ่มเติมเท่าไร" ส่วนหลังบ้านใช้ตัดสินว่า "อนุมัติสลิปแล้วต้องปิดคำขอตัวไหน"
 *    ถ้าสองฝั่งเลือกคนละ field คำขอที่จ่ายแล้วจะค้างอยู่ให้จ่ายซ้ำ
 *
 * ในฐานข้อมูลมีสองที่มา:
 *   - `pendingFeeRequest` จาก requestFeeAction() (lawslane-capdeal ก็ใช้ตัวนี้)
 *   - `additionalFeeRequest` (status 'pending') จากการปิดเคสที่ทนายขอยอดเพิ่ม
 * ถ้ามีทั้งคู่ถือ pendingFeeRequest ก่อน ให้ตรงกับเว็บหลักและ capdeal
 */
export type PendingAdditionalFee = {
    source: 'pendingFeeRequest' | 'additionalFeeRequest';
    amount: number;
};

export function getPendingAdditionalFee(
    chat: FirebaseFirestore.DocumentData
): PendingAdditionalFee | null {
    const pending = Number(chat.pendingFeeRequest?.amount);
    if (chat.pendingFeeRequest && Number.isFinite(pending) && pending > 0) {
        return { source: 'pendingFeeRequest', amount: pending };
    }
    const extra = chat.additionalFeeRequest;
    const extraAmount = Number(extra?.amount);
    if (extra && (extra.status ?? 'pending') === 'pending' && Number.isFinite(extraAmount) && extraAmount > 0) {
        return { source: 'additionalFeeRequest', amount: extraAmount };
    }
    return null;
}

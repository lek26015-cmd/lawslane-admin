/**
 * ประมาณค่าธรรมเนียม Stripe ต่อการเรียกเก็บ 1 ครั้ง (subscription, บัตรในประเทศ)
 *
 * สูตรตามแผน PLAN-08 เฟส 3 (อัตรา stripe.com/en-th/pricing ตรวจ 2026-10-11):
 *   ค่าธรรมเนียม = (ราคา × 3.65% + ฿10 + ราคา × 0.7% [Stripe Billing]) × (1 + VAT 7%)
 *
 * ตัวเลขนี้เป็นค่าประมาณสำหรับแสดงในหน้า "ราคาแพ็กเกจ" เท่านั้น ไม่ใช้คิดเงินจริง
 * (VAT บนค่าธรรมเนียมต้องเทียบกับใบแจ้งหนี้ Stripe ใบแรก)
 *
 * ไฟล์นี้เป็น pure function ไม่มี 'server-only' — ใช้ได้ทั้ง client component และเทสต์
 */

export const STRIPE_FEE_DEFAULTS = {
    /** บัตรในประเทศ */
    cardRate: 0.0365,
    /** ค่าคงที่ต่อรายการ (บาท) */
    fixedFee: 10,
    /** Stripe Billing ทุก subscription */
    billingRate: 0.007,
    /** VAT บนค่าธรรมเนียม */
    vatRate: 0.07,
} as const;

export type StripeFeeEstimate = {
    /** ค่าธรรมเนียมรวม VAT (บาท ปัดทศนิยม 2 ตำแหน่ง) */
    fee: number;
    /** เงินที่เหลือหลังหักค่าธรรมเนียม (บาท ปัดทศนิยม 2 ตำแหน่ง) */
    net: number;
};

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

/** @param amountBaht ราคาต่อการเรียกเก็บหนึ่งครั้ง (รายเดือน = ต่อเดือน, รายปี = ต่อปี) */
export function estimateStripeFee(amountBaht: number): StripeFeeEstimate {
    if (!Number.isFinite(amountBaht) || amountBaht <= 0) return { fee: 0, net: 0 };
    const { cardRate, fixedFee, billingRate, vatRate } = STRIPE_FEE_DEFAULTS;
    const fee = (amountBaht * cardRate + fixedFee + amountBaht * billingRate) * (1 + vatRate);
    return { fee: round2(fee), net: round2(amountBaht - fee) };
}

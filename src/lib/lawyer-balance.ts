import 'server-only';

/**
 * สูตรยอดคงเหลือของทนาย — สำเนาของ Lawslane/src/lib/lawyer-balance.ts
 *
 * ⚠️ สองไฟล์นี้ต้องเหมือนกันเสมอ แก้ที่ไหนต้องแก้อีกที่ด้วย — หน้าอนุมัติของแอดมิน
 *    ต้องคิดยอดด้วยสูตรเดียวกับที่ทนายเห็นและกับด่านตอนยื่นคำร้อง
 *
 * เดิมสูตรนี้อยู่ใน getLawyerFinancialsAction() ที่เดียว และหน้าขอถอนเงินเชื่อ
 * ตัวเลขที่ action ส่งกลับไปแล้วตรวจ `amount > availableBalance` ในเบราว์เซอร์
 * เท่านั้น → ทนายที่มีรายได้ ฿0 เปิด console ยิง SDK ขอถอนเท่าไรก็ได้
 *
 * ย้ายมาไว้ตรงนี้เพื่อให้ "หน้าแสดงยอด" กับ "ด่านตรวจตอนขอถอน/อนุมัติ" ใช้สูตร
 * เดียวกันจริงๆ ห้าม copy สูตรไปเขียนซ้ำที่อื่น ถ้าสองที่คิดไม่เหมือนกันเมื่อไร
 * เงินจะไหลออกเกินสิทธิ์ทันที
 */

/** ยอดขอถอนขั้นต่ำต่อครั้ง (บาท) */
export const MIN_WITHDRAWAL_AMOUNT = 1000;

export type LawyerBalance = {
    /** รายได้สุทธิที่ตัดยอดแล้ว (transactions.status = 'completed') */
    totalIncome: number;
    /** รายได้ที่ยังไม่ตัดยอด — ยังถอนไม่ได้ */
    pendingIncome: number;
    /** ถอนออกไปแล้วจริง (withdrawals.status = 'approved') */
    withdrawnAmount: number;
    /** คำร้องที่ยังค้างอยู่ — กันยอดไว้ก่อน ไม่ให้ขอซ้ำจนเกินตัว */
    pendingWithdrawal: number;
    /** ยอดที่ขอถอนได้จริง ณ ขณะนี้ */
    availableBalance: number;
    /** มีคำร้องค้างอยู่ไหม — ใช้กันการยิงซ้ำหลายใบพร้อมกัน */
    hasPendingWithdrawal: boolean;
};

type DocLike = { data(): FirebaseFirestore.DocumentData | undefined };

/** คิดยอดจาก snapshot ที่อ่านมาแล้ว — ใช้ได้ทั้งใน transaction และนอก transaction */
export function reduceLawyerBalance(
    transactionDocs: DocLike[],
    withdrawalDocs: DocLike[]
): LawyerBalance {
    let totalIncome = 0;
    let pendingIncome = 0;

    for (const d of transactionDocs) {
        const data = d.data() ?? {};
        const netAmount = Number(data.netAmount) || 0;
        if (data.status === 'completed') totalIncome += netAmount;
        else pendingIncome += netAmount;
    }

    let withdrawnAmount = 0;
    let pendingWithdrawal = 0;
    let hasPendingWithdrawal = false;

    for (const d of withdrawalDocs) {
        const data = d.data() ?? {};
        // ยอดติดลบ/ไม่ใช่ตัวเลขให้เป็น 0 — ใบ approved ที่ amount < 0 จะทำให้
        // withdrawnAmount ติดลบแล้วยอดคงเหลือพองขึ้น
        const amount = Math.max(0, Number(data.amount) || 0);
        // หน้าเก่าบางหน้าเขียนคำร้องโดยไม่ใส่ status — นับเป็น pending เสมอ
        // (ฝั่งอนุมัติถือ `status || 'pending'` เหมือนกัน ถ้าสองฝั่งนับไม่ตรงกัน
        // ฝั่งอนุมัติจะบวกยอดใบนั้นคืนทั้งที่ไม่เคยถูกหัก → อนุมัติเกินยอดได้)
        const status = data.status || 'pending';
        if (status === 'approved') {
            withdrawnAmount += amount;
        } else if (status === 'pending') {
            pendingWithdrawal += amount;
            hasPendingWithdrawal = true;
        }
    }

    return {
        totalIncome,
        pendingIncome,
        withdrawnAmount,
        pendingWithdrawal,
        availableBalance: totalIncome - withdrawnAmount - pendingWithdrawal,
        hasPendingWithdrawal,
    };
}

/** อ่าน transactions + withdrawals ของทนายคนหนึ่งแล้วคิดยอดให้เลย */
export async function loadLawyerBalance(
    db: FirebaseFirestore.Firestore,
    lawyerId: string
): Promise<LawyerBalance> {
    const [txSnap, wdSnap] = await Promise.all([
        db.collection('transactions').where('lawyerId', '==', lawyerId).get(),
        db.collection('withdrawals').where('lawyerId', '==', lawyerId).get(),
    ]);
    return reduceLawyerBalance(txSnap.docs, wdSnap.docs);
}

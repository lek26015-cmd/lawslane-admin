'use server';

import * as admin from 'firebase-admin';
import { initAdmin } from '@/lib/firebase-admin';
import { requireAdmin, AuthError } from '@/lib/auth-guard';
import { reduceLawyerBalance } from '@/lib/lawyer-balance';

/**
 * คำร้องถอนเงินฝั่งแอดมิน — ต้องเห็นยอดจริงและต้องคิดซ้ำก่อนอนุมัติ
 *
 * ของเดิม: หน้า /financials ยิง window.confirm(`...฿${item.amount}...`) แล้ว
 * updateDoc(withdrawals/{id}, { status:'approved' }) จากเบราว์เซอร์ตรงๆ โดยที่
 * **หน้าจอไม่เคยแสดงยอดคงเหลือจริงของทนายคนนั้นเลย** ด่านมนุษย์ที่มีอยู่จึงตาบอด —
 * แอดมินไม่มีทางรู้ว่า ฿45,000 ที่ขอมานั้นเกินสิทธิ์อยู่ 10 เท่า
 *
 * ตัวนี้จึงคิดยอดใหม่ฝั่ง server ทั้งตอนแสดงผลและตอนกดอนุมัติ (คิดซ้ำใน
 * transaction อีกรอบ กันกรณีสถานะเปลี่ยนไประหว่างที่แอดมินนั่งดูหน้าจอ)
 */

export type WithdrawalRow = {
    id: string;
    lawyerId: string;
    lawyerName: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: string | null;
    processedAt: string | null;
    bankName: string;
    accountNumber: string;
    accountName: string;
    /** ยอดที่ทนายคนนี้ถอนได้จริง "สำหรับคำร้องใบนี้" (ไม่นับยอดที่ใบนี้จองไว้เอง) */
    availableBalance: number;
    /** ยอดขอเกินสิทธิ์ — หน้าเว็บต้องขึ้นป้ายแดงและห้ามอนุมัติ */
    exceedsBalance: boolean;
    /** ยอดคงเหลือ ณ วินาทีที่ยื่นคำร้อง (ทนายเห็นตัวเลขอะไรตอนกดขอ) */
    balanceAtRequest: number | null;
};

type ListResult = { ok: true; rows: WithdrawalRow[] } | { ok: false; error: string };
type ProcessResult = { ok: true } | { ok: false; error: string };

class Rejected extends Error {}

function fail(e: unknown): { ok: false; error: string } {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    if (e instanceof Rejected) return { ok: false, error: e.message };
    console.error('ADMIN_WITHDRAWAL_ACTION_ERROR', e);
    return { ok: false, error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' };
}

function toIso(v: any): string | null {
    if (!v) return null;
    if (typeof v?.toDate === 'function') return v.toDate().toISOString();
    if (v instanceof Date) return v.toISOString();
    return null;
}

/**
 * ยอดที่ใช้ได้จริงสำหรับคำร้องใบหนึ่ง
 *
 * คำร้องที่ยัง pending กันยอดตัวเองไว้ใน pendingWithdrawal อยู่แล้ว ถ้าเอา
 * availableBalance ไปเทียบตรงๆ จะกลายเป็นหักซ้ำ — ต้องบวกยอดของใบนี้กลับเข้าไป
 */
function availableFor(balanceParts: ReturnType<typeof reduceLawyerBalance>, row: { amount: number; status: string }) {
    return balanceParts.availableBalance + (row.status === 'pending' ? row.amount : 0);
}

export async function listWithdrawalRequests(): Promise<ListResult> {
    try {
        await requireAdmin('financials.withdrawals');
        const app = await initAdmin();
        if (!app) return { ok: false, error: 'Firebase Admin ยังไม่พร้อม' };
        const db = app.firestore();

        const snap = await db.collection('withdrawals').orderBy('requestedAt', 'desc').limit(200).get();
        if (snap.empty) return { ok: true, rows: [] };

        const lawyerIds = Array.from(
            new Set(snap.docs.map(d => d.get('lawyerId')).filter((v): v is string => typeof v === 'string' && !!v))
        );

        // ยอดคงเหลือของทนายแต่ละคน — อ่านครั้งเดียวต่อคน แล้วใช้กับทุกใบของคนนั้น
        const balances = new Map<string, ReturnType<typeof reduceLawyerBalance>>();
        const names = new Map<string, string>();

        await Promise.all(
            lawyerIds.map(async (lawyerId) => {
                const [txSnap, wdSnap, profileSnap] = await Promise.all([
                    db.collection('transactions').where('lawyerId', '==', lawyerId).get(),
                    db.collection('withdrawals').where('lawyerId', '==', lawyerId).get(),
                    db.collection('lawyerProfiles').doc(lawyerId).get(),
                ]);
                balances.set(lawyerId, reduceLawyerBalance(txSnap.docs, wdSnap.docs));
                names.set(lawyerId, profileSnap.data()?.name || 'ไม่ทราบชื่อ');
            })
        );

        const rows: WithdrawalRow[] = snap.docs.map((d) => {
            const data = d.data();
            const lawyerId: string = data.lawyerId || '';
            const amount = Number(data.amount) || 0;
            const status = (data.status || 'pending') as WithdrawalRow['status'];
            const parts = balances.get(lawyerId);
            const available = parts ? availableFor(parts, { amount, status }) : 0;

            return {
                id: d.id,
                lawyerId,
                lawyerName: names.get(lawyerId) || 'ไม่ทราบชื่อ',
                amount,
                status,
                requestedAt: toIso(data.requestedAt),
                processedAt: toIso(data.processedAt),
                bankName: data.bankName || '',
                accountNumber: data.accountNumber || '',
                accountName: data.accountName || '',
                availableBalance: available,
                exceedsBalance: status === 'pending' && amount > available,
                balanceAtRequest:
                    typeof data.balanceAtRequest?.availableBalance === 'number'
                        ? data.balanceAtRequest.availableBalance
                        : null,
            };
        });

        return { ok: true, rows };
    } catch (e) {
        return fail(e);
    }
}

export async function processWithdrawal(input: {
    withdrawalId: string;
    decision: 'approved' | 'rejected';
}): Promise<ProcessResult> {
    try {
        const { uid: adminUid } = await requireAdmin('financials.withdrawals');
        const app = await initAdmin();
        if (!app) return { ok: false, error: 'Firebase Admin ยังไม่พร้อม' };
        const db = app.firestore();

        if (input.decision !== 'approved' && input.decision !== 'rejected') {
            return { ok: false, error: 'คำสั่งไม่ถูกต้อง' };
        }

        const ref = db.collection('withdrawals').doc(input.withdrawalId);

        await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists) throw new Rejected('ไม่พบคำร้องนี้');

            const data = snap.data()!;
            if ((data.status || 'pending') !== 'pending') {
                throw new Rejected('คำร้องนี้ถูกดำเนินการไปแล้ว');
            }

            const lawyerId: string = data.lawyerId || '';
            const amount = Number(data.amount) || 0;

            if (input.decision === 'approved') {
                // คิดยอดใหม่ ณ วินาทีที่กดอนุมัติ — ระหว่างที่แอดมินนั่งดูหน้าจอ อาจมี
                // คำร้องอื่นถูกอนุมัติไปแล้ว หรือรายได้ถูกยกเลิก
                const [txSnap, wdSnap] = await Promise.all([
                    tx.get(db.collection('transactions').where('lawyerId', '==', lawyerId)),
                    tx.get(db.collection('withdrawals').where('lawyerId', '==', lawyerId)),
                ]);
                const parts = reduceLawyerBalance(txSnap.docs, wdSnap.docs);
                const available = availableFor(parts, { amount, status: 'pending' });

                if (amount > available) {
                    throw new Rejected(
                        `อนุมัติไม่ได้: ยอดขอ ฿${amount.toLocaleString()} เกินยอดที่ถอนได้จริง ฿${available.toLocaleString()}`
                    );
                }
            }

            tx.update(ref, {
                status: input.decision,
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
                processedBy: adminUid,
            });
        });

        return { ok: true };
    } catch (e) {
        return fail(e);
    }
}

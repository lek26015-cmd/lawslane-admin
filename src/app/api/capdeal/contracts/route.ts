import { NextResponse } from 'next/server';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';
import { initAdmin } from '@/lib/firebase-admin';
import { toContractSummary } from '@/lib/capdeal-contract-view';

export async function GET() {
    try {
        // ด่านเดิมของ capdeal อ่านเฉพาะ header Authorization — repo นี้ใช้
        // requireAdmin() ที่ยึด session cookie ของหลังบ้านรวม
        let adminApp;
        try {
            await requireAdmin('capdeal.contracts');
            adminApp = await initAdmin();
        } catch (e) {
            return authErrorResponse(e);
        }
        if (!adminApp) return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });

        const db = adminApp!.firestore();
        const contractsSnap = await db.collection('contracts')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();

        // ส่งเฉพาะฟิลด์ที่ตารางใช้ — เดิม `...data` ส่งเลขบัตร/ลายเซ็น/shareToken/sharePin ไปทั้งก้อน
        const contracts = contractsSnap.docs.map(doc => toContractSummary(doc.id, doc.data()));

        return NextResponse.json({ contracts });
    } catch (error: any) {
        console.error('ADMIN_CONTRACTS_ERROR', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

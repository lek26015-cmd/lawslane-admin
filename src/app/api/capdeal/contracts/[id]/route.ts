import { NextResponse } from 'next/server';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';
import { initAdmin } from '@/lib/firebase-admin';
import { toContractDetail } from '@/lib/capdeal-contract-view';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

// GET — รายละเอียดสัญญา 1 ฉบับสำหรับหน้า /capdeal/contracts/[id] (ข้อมูลส่วนบุคคลถูกปิดบังใน toContractDetail)
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        let adminApp;
        try {
            await requireAdmin('capdeal.contracts');
            adminApp = await initAdmin();
        } catch (e) {
            return authErrorResponse(e);
        }
        if (!adminApp) return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });

        const { id } = await params;
        if (!id || id.length > 200 || id.includes('/')) {
            return NextResponse.json({ error: 'Invalid contract id' }, { status: 400 });
        }

        const snap = await adminApp.firestore().collection('contracts').doc(id).get();
        if (!snap.exists) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

        return NextResponse.json({ contract: toContractDetail(snap.id, snap.data()) }, { headers: NO_STORE });
    } catch (error) {
        console.error('ADMIN_CONTRACT_DETAIL_ERROR', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

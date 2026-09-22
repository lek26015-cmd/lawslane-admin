import { NextResponse } from 'next/server';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';
import { initAdmin } from '@/lib/firebase-admin';

export async function GET() {
    try {
        // ด่านเดิมของ capdeal อ่านเฉพาะ header Authorization — repo นี้ใช้
        // requireAdmin() ที่ยึด session cookie ของหลังบ้านรวม
        let adminApp;
        try {
            await requireAdmin('capdeal.finance');
            adminApp = await initAdmin();
        } catch (e) {
            return authErrorResponse(e);
        }
        if (!adminApp) return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });

        const db = adminApp!.firestore();

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        // Fetch succeeded contracts (as transactions)
        const contractsSnap = await db.collection('cap-deals')
            .where('status', '==', 'succeeded')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();

        let totalRevenue = 0;
        let recentRevenue = 0;
        let prevRevenue = 0;

        const transactions = contractsSnap.docs.map(doc => {
            const data = doc.data();
            const amount = data.price || 0;
            const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt || 0);

            totalRevenue += amount;
            if (createdAt >= thirtyDaysAgo) {
                recentRevenue += amount;
            } else if (createdAt >= sixtyDaysAgo) {
                prevRevenue += amount;
            }

            return {
                id: doc.id,
                type: 'contract',
                amount: amount,
                status: data.status,
                customer: data.ownerId,
                title: data.title || 'Untitled Contract',
                date: createdAt.toISOString(),
            };
        });

        // Simplified revenue aggregation for charts (Last 30 days)
        const revenueByDate: Record<string, number> = {};
        transactions.forEach(tx => {
            const date = tx.date.split('T')[0];
            revenueByDate[date] = (revenueByDate[date] || 0) + tx.amount;
        });

        const chartData = Object.entries(revenueByDate)
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-30);

        const calculateTrend = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? '+100%' : '0%';
            const change = ((current - previous) / previous) * 100;
            return (change >= 0 ? '+' : '') + change.toFixed(0) + '%';
        };

        return NextResponse.json({
            transactions,
            chartData,
            summary: {
                totalRevenue,
                transactionCount: transactions.length,
                revenueTrend: calculateTrend(recentRevenue, prevRevenue)
            }
        });
    } catch (error: any) {
        console.error('ADMIN_FINANCE_ERROR', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

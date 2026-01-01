import { NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { notifyAdmins } from '@/app/actions/admin-notifications';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { data } = body;

        if (!data) {
            return NextResponse.json(
                { success: false, message: 'No QR data provided' },
                { status: 400 }
            );
        }

        const response = await fetch('https://api.slipok.com/api/check/slip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-authorization': 'SLIPOKAKIAD90', // Using the key provided by user
            },
            body: JSON.stringify({ data: data }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('SlipOK API Error:', result);
            return NextResponse.json(
                { success: false, message: result.message || 'Verification failed' },
                { status: response.status }
            );
        }

        // Track Usage
        try {
            await initAdmin();
            const db = getFirestore();
            const now = new Date();
            const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const statsRef = db.collection('system_stats').doc('slipok_usage');

            // Transaction to ensure atomic increment
            await db.runTransaction(async (t) => {
                const doc = await t.get(statsRef);
                let currentCount = 0;
                let data = doc.data() || {};

                // Reset if new month (simple check, or just use monthKey as field)
                // Better structure: { '2025-12': 10, '2026-01': 5 }
                currentCount = (data[monthKey] || 0) + 1;

                t.set(statsRef, { [monthKey]: currentCount }, { merge: true });

                // Check thresholds
                if ([90, 95, 99, 100].includes(currentCount)) {
                    // Trigger notification (fire and forget to not block response)
                    notifyAdmins('slip_limit_warning', {
                        count: currentCount,
                        month: monthKey
                    }).catch(err => console.error("Failed to send slip warning:", err));
                }
            });

        } catch (dbError) {
            console.error("Failed to track SlipOK usage:", dbError);
            // Don't fail the request just because tracking failed
        }

        return NextResponse.json({ success: true, data: result.data });
    } catch (error) {
        console.error('Slip Verification Error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}

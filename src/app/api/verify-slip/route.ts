import { NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { sendAdminNotification } from '@/lib/admin-notify';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';

export async function POST(request: Request) {
    // ต้องเป็นแอดมินที่ล็อกอินอยู่จริง — middleware ของแอปนี้เช็คแค่ว่ามี cookie
    // ชื่อ session ไหม (ปลอมได้) และ matcher ก็ไม่ครอบ /api จึงต้องกันที่ route เอง
    try {
        await requireAdmin();
    } catch (e) {
        return authErrorResponse(e);
    }

    try {
        const body = await request.json();
        const { data } = body;

        if (!data) {
            return NextResponse.json(
                { success: false, message: 'No QR data provided' },
                { status: 400 }
            );
        }

        // คีย์ SlipOK ต้องมาจาก env เท่านั้น — เดิม hardcode ไว้ในซอร์สของ repo ที่เป็น public
        const slipOkKey = process.env.SLIPOK_API_KEY;
        if (!slipOkKey) {
            console.error('SLIPOK_API_KEY is not configured');
            return NextResponse.json(
                { success: false, message: 'Slip verification is not configured' },
                { status: 503 }
            );
        }

        const response = await fetch('https://api.slipok.com/api/check/slip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-authorization': slipOkKey,
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
                    sendAdminNotification('slip_limit_warning', {
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

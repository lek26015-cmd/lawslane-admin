import { NextResponse } from 'next/server';
import { statusStore, systemPaused } from '@/lib/ingestion-store';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';

export async function GET() {
    // สถานะ ingestion เป็นข้อมูลภายใน — ต้องเป็นแอดมินเท่านั้น
    try {
        await requireAdmin();
    } catch (e) {
        return authErrorResponse(e);
    }

    return NextResponse.json({
        tasks: statusStore,
        systemPaused
    });
}

export async function POST(request: Request) {
    // POST ถูกเรียกจากสคริปต์ ingestion (scripts/ingest-*.py, ingest-to-cloudflare.ts)
    // ซึ่งยิงมาที่ localhost ไม่ได้ล็อกอิน จึงใช้ shared secret แทน session
    // ต้องตั้ง INGESTION_STATUS_SECRET ทั้งฝั่ง server และฝั่งสคริปต์ — ไม่ตั้ง = ปิด (fail closed)
    const expectedSecret = process.env.INGESTION_STATUS_SECRET;
    if (!expectedSecret) {
        console.error('INGESTION_STATUS_SECRET is not configured — rejecting status update');
        return NextResponse.json({ error: 'Not configured' }, { status: 503 });
    }
    const provided = request.headers.get('x-ingestion-secret') ?? '';
    const a = Buffer.from(provided);
    const b = Buffer.from(expectedSecret);
    const { timingSafeEqual } = await import('crypto');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { task, status, message, nextRetry } = body;

        if (systemPaused) {
            return NextResponse.json({ success: true, paused: true });
        }

        if (!task || !statusStore[task]) {
            return NextResponse.json({ error: 'Invalid task' }, { status: 400 });
        }

        statusStore[task] = {
            status,
            message,
            nextRetry,
            lastUpdate: new Date().toISOString()
        };

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

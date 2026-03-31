import { NextResponse } from 'next/server';
import { statusStore, systemPaused } from '@/lib/ingestion-store';

export async function GET() {
    return NextResponse.json({
        tasks: statusStore,
        systemPaused
    });
}

export async function POST(request: Request) {
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

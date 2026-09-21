import { NextResponse } from 'next/server';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';

// Server-side cache to prevent rate limiting Workers during concurrent dashboard access
let cachedData: any = { vectorCount: 188053, dimensions: 1024, lastChecked: new Date().toISOString() };
let lastCacheTime = Date.now();
const CACHE_DURATION = 30000; // 30 seconds

export async function GET() {
    // ต้องเป็นแอดมินที่ล็อกอินอยู่จริง — middleware ของแอปนี้เช็คแค่ว่ามี cookie
    // ชื่อ session ไหม (ปลอมได้) และ matcher ก็ไม่ครอบ /api จึงต้องกันที่ route เอง
    try {
        await requireAdmin();
    } catch (e) {
        return authErrorResponse(e);
    }
    try {
        const now = Date.now();
        if (cachedData && (now - lastCacheTime < CACHE_DURATION)) {
            return NextResponse.json(cachedData);
        }

        const workerUrl = process.env.NEXT_PUBLIC_RAG_WORKER_URL || 'https://lawslane-rag-api.lawlanes-app.workers.dev';
        const response = await fetch(`${workerUrl}/stats`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store'
        });

        if (!response.ok) {
            if (cachedData) return NextResponse.json(cachedData);
            return NextResponse.json({ error: 'Failed to fetch stats from Worker' }, { status: response.status });
        }

        const data = await response.json();
        cachedData = data;
        lastCacheTime = now;
        
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[Admin API RAG Stats Error]', error);
        if (cachedData) return NextResponse.json(cachedData);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    const admin = await initAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    try {
        const { idToken } = await request.json();
        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

        const sessionCookie = await admin
            .auth()
            .createSessionCookie(idToken, { expiresIn });

        const cookieStore = await cookies();
        cookieStore.set('session', sessionCookie, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            sameSite: 'lax',
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Session creation error:', error);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}

import { cookies, headers } from 'next/headers';
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
        const host = request.headers.get('host')?.split(':')[0] || '';

        let cookieDomain: string | undefined = undefined;
        if (process.env.NODE_ENV === 'production') {
            const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'lawslane.com';
            cookieDomain = `.${rootDomain}`;
        } else if (host.includes('localhost')) {
            // For local development, host-only cookies (no domain) are most reliable.
            // When on business.localhost, omitting the domain will set it to business.localhost specifically.
            cookieDomain = undefined;
        }

        const cookieOptions: any = {
            maxAge: expiresIn,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            sameSite: 'lax',
        };

        if (cookieDomain) {
            cookieOptions.domain = cookieDomain;
        }

        const sessionHint = JSON.stringify({ uid: (await admin.auth().verifySessionCookie(sessionCookie)).uid });

        cookieStore.set('session', sessionCookie, cookieOptions);

        // Add a non-httpOnly hint for the client to know it has a session
        cookieStore.set('session_hint', sessionHint, {
            ...cookieOptions,
            httpOnly: false, // Accessible to JS
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Session creation error:', error);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}

export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session')?.value;

        if (!sessionCookie) {
            return NextResponse.json({ authenticated: false }, { status: 401 });
        }

        const admin = await initAdmin();
        if (!admin) throw new Error('Admin not initialized');

        const decodedToken = await admin.auth().verifySessionCookie(sessionCookie, true);
        return NextResponse.json({
            authenticated: true,
            uid: decodedToken.uid,
            email: decodedToken.email,
        });
    } catch (error) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }
}

export async function DELETE() {
    try {
        const cookieStore = await cookies();
        const host = (await headers()).get('host')?.split(':')[0] || '';
        let cookieDomain: string | undefined = undefined;

        if (process.env.NODE_ENV === 'production') {
            cookieDomain = `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'lawslane.com'}`;
        } else if (host.includes('localhost')) {
            cookieDomain = undefined;
        }

        const cookieOptions: any = {
            path: '/',
        };
        if (cookieDomain) {
            cookieOptions.domain = cookieDomain;
        }

        cookieStore.delete({
            name: 'session',
            ...cookieOptions,
        });

        cookieStore.delete({
            name: 'session_hint',
            ...cookieOptions,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

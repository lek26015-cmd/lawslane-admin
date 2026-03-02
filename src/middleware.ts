import { NextRequest, NextResponse } from 'next/server';

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Admin Auth Check - everything in here is theoretically an admin route now
    // By default all routes need session except login
    if (pathname !== '/login' && !pathname.startsWith('/_next') && !pathname.includes('.')) {
        const session = request.cookies.get('session');
        if (!session) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    const response = NextResponse.next();
    response.headers.set('Cross-Origin-Opener-Policy', 'unsafe-none');
    return response;
}

export const config = {
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/']
};

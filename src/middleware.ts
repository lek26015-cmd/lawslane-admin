import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';

const intlMiddleware = createMiddleware({
    // A list of all locales that are supported
    locales: ['th', 'en', 'zh'],

    // Used when no locale matches
    defaultLocale: 'th'
});

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Admin Route Protection
    if (pathname.startsWith('/admin')) {
        // Allow access to login page
        if (pathname === '/admin/login') {
            return NextResponse.next();
        }

        // Check for session cookie
        const session = request.cookies.get('session');
        if (!session) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }
    }

    // 2. Internationalization Middleware
    return intlMiddleware(request);
}

export const config = {
    // Match all pathnames except for:
    // - /api, /_next, /_vercel (system routes)
    // - Files with extensions (e.g. favicon.ico)
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/']
};

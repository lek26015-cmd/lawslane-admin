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
    const hostname = request.headers.get('host');

    // 0. Subdomain Routing (admin.lawslane.com -> /admin)
    if (hostname && hostname.startsWith('admin.')) {
        // If the path doesn't already start with /admin, rewrite it
        // We also need to handle the locale part if present
        const hasLocale = ['/th', '/en', '/zh'].some(locale => pathname.startsWith(locale));

        if (!pathname.includes('/admin')) {
            // Admin pages are NOT localized (they are at root /admin, not /[locale]/admin)
            // So we must rewrite to /admin, stripping any locale prefix if present
            const newPath = `/admin${pathname.replace(/^\/[a-z]{2}/, '')}`;

            return NextResponse.rewrite(new URL(newPath, request.url));
        }
    }

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
    const response = intlMiddleware(request);

    // Add Security Headers
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

    return response;
}

export const config = {
    // Match all pathnames except for:
    // - /api, /_next, /_vercel (system routes)
    // - Files with extensions (e.g. favicon.ico)
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/']
};

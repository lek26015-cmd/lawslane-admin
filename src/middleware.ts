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
    } else {
        // Redirect /admin on main domain to admin subdomain
        if (pathname.startsWith('/admin')) {
            const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'lawslane.com';
            const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
            // Strip /admin from the path since the subdomain handles it
            const newPath = pathname.replace(/^\/admin/, '') || '/';
            return NextResponse.redirect(`${protocol}://admin.${rootDomain}${newPath}`);
        }
    }

    // 0.5 Redirect localized lawyer routes to root (e.g. /th/lawyer-login -> /lawyer-login)
    const localizedLawyerRegex = /^\/[a-z]{2}\/(lawyer-|verify-lawyer)(.*)/;
    if (localizedLawyerRegex.test(pathname)) {
        const newPath = pathname.replace(/^\/[a-z]{2}/, '');
        return NextResponse.redirect(new URL(newPath, request.url));
    }

    // 1. Admin & Lawyer System Exclusion (No i18n)
    if (pathname.startsWith('/admin') || pathname.startsWith('/lawyer-') || pathname.startsWith('/verify-lawyer')) {
        // Admin Auth Check
        if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
            const session = request.cookies.get('session');
            if (!session) {
                return NextResponse.redirect(new URL('/admin/login', request.url));
            }
        }

        // For these systems, simply proceed without i18n
        const response = NextResponse.next();
        response.headers.set('Cross-Origin-Opener-Policy', 'unsafe-none');
        return response;
    }

    // 2. Internationalization Middleware (Only for non-admin routes)
    const response = intlMiddleware(request);

    // Add Security Headers
    response.headers.set('Cross-Origin-Opener-Policy', 'unsafe-none');

    return response;
}

export const config = {
    // Match all pathnames except for:
    // - /api, /_next, /_vercel (system routes)
    // - Files with extensions (e.g. favicon.ico)
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/']
};

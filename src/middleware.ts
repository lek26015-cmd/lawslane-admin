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

    // 0. Subdomain Routing (admin.lawslane.com -> /admin, business.lawslane.com -> /dashboard/b2b)
    if (hostname) {
        if (hostname.startsWith('admin.')) {
            if (!pathname.includes('/admin')) {
                const newPath = `/admin${pathname.replace(/^\/(th|en|zh)/, '')}`;
                return NextResponse.rewrite(new URL(newPath, request.url));
            }
        }
        else if (hostname.startsWith('business.')) {
            // Check for both session and session_hint for extra robustness in dev
            // session_hint from Client helps skip redirects during auto-sync
            const hasSession = request.cookies.has('session') ||
                (process.env.NODE_ENV !== 'production' && request.cookies.has('session_hint'));

            const isDashboardRoute = (pathname.includes('/dashboard') || pathname.includes('/clm')) &&
                !pathname.includes('/login') &&
                !pathname.includes('/signup');

            if (process.env.NODE_ENV !== 'production') {
                console.log(`[Middleware B2B] hostname: ${hostname}, pathname: ${pathname}, hasSession: ${hasSession}, isDashboardRoute: ${isDashboardRoute}`);
            }

            if (isDashboardRoute && !hasSession) {
                const isLocal = hostname.includes('localhost') || hostname.includes('127.0.0.1');

                // DIAGNOSTIC: In development, let it pass to see if client-side auth works
                if (process.env.NODE_ENV !== 'production' && isLocal) {
                    console.log('--- B2B AUTH BYPASS (DEV) ACTIVATED ---');
                } else {
                    const localeMatch = pathname.match(/^\/(th|en|zh)(\/|$)/);
                    const locale = localeMatch ? localeMatch[1] : 'th';

                    const searchParams = new URLSearchParams();
                    searchParams.set('redirect', request.url);

                    return NextResponse.redirect(new URL(`/${locale}/login?${searchParams.toString()}`, request.url));
                }
            }

            // Business subdomain maps to B2B landing and ELM dashboard
            const localeMatch = pathname.match(/^\/(th|en|zh)(\/|$)/);
            const locale = localeMatch ? localeMatch[1] : 'th';
            const pathWithoutLocale = localeMatch ? pathname.replace(/^\/(th|en|zh)/, '') : pathname;

            // 1. Root on subdomain -> B2B Landing Page
            if (pathWithoutLocale === '/' || pathWithoutLocale === '') {
                const newPath = `/${locale}/b2b`.replace(/\/+$/, '') || '/th/b2b';
                return NextResponse.rewrite(new URL(newPath, request.url));
            }

            // 2. /dashboard etc on subdomain -> B2B Dashboard (/dashboard/b2b)
            if (pathWithoutLocale.startsWith('/dashboard') ||
                pathWithoutLocale.startsWith('/billing') ||
                pathWithoutLocale.startsWith('/team') ||
                pathWithoutLocale.startsWith('/vault') ||
                pathWithoutLocale.startsWith('/calendar') ||
                pathWithoutLocale.startsWith('/settings') ||
                pathWithoutLocale.startsWith('/admin')) {

                let subPath = pathWithoutLocale;
                if (pathWithoutLocale.startsWith('/dashboard')) {
                    subPath = pathWithoutLocale.replace(/^\/dashboard/, '');
                }

                // Clean up /b2b if it is already present to prevent duplicate /b2b/b2b paths
                if (subPath.startsWith('/b2b')) {
                    subPath = subPath.replace(/^\/b2b/, '');
                }

                // If subPath is empty (root of dashboard), just go to /dashboard/b2b
                const targetPath = !subPath || subPath === '/'
                    ? '/dashboard/b2b'
                    : `/dashboard/b2b${subPath.startsWith('/') ? subPath : '/' + subPath}`;

                const newPath = `/${locale}${targetPath}`.replace(/\/\//g, '/');
                return NextResponse.rewrite(new URL(newPath, request.url));
            }

            // 3. /login on subdomain -> B2B Login Page
            if (pathWithoutLocale === '/login') {
                const newPath = `/${locale}/dashboard/b2b/login`;
                return NextResponse.rewrite(new URL(newPath, request.url));
            }

            // 4. /clm on subdomain -> /dashboard/clm
            if (pathWithoutLocale.startsWith('/clm')) {
                const newPath = `/${locale}/dashboard${pathWithoutLocale}`.replace(/\/\//g, '/');
                return NextResponse.rewrite(new URL(newPath, request.url));
            }

            // For other paths, try to serve them directly or default to dashboard
            // But we already handled the main ones.
        }
    }

    // Redirect /admin or /dashboard/b2b or /b2b on main domain to subdomains
    if (hostname && !hostname.startsWith('admin.') && !hostname.startsWith('business.')) {
        const isLocalhost = hostname.includes('localhost');
        const [hostOnly, port] = hostname.split(':');
        const rootDomain = isLocalhost ? hostOnly : (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'lawslane.com');
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const portSuffix = port ? `:${port}` : '';

        if (pathname.includes('/admin')) {
            const newPath = pathname.replace(/^\/(th|en|zh)?\/admin/, '') || '/';
            const targetHost = `admin.${rootDomain}${portSuffix}`;
            return NextResponse.redirect(`${protocol}://${targetHost}${newPath}`);
        }

        if (pathname.includes('/dashboard/b2b')) {
            const newPath = pathname.replace(/^\/(th|en|zh)?\/dashboard\/b2b/, '') || '/dashboard';
            const targetHost = `business.${rootDomain}${portSuffix}`;
            return NextResponse.redirect(`${protocol}://${targetHost}${newPath}`);
        }

        if (pathname.match(/^\/(th|en|zh)?\/b2b/)) {
            const newPath = pathname.replace(/^\/(th|en|zh)?\/b2b/, '') || '/';
            const targetHost = `business.${rootDomain}${portSuffix}`;
            return NextResponse.redirect(`${protocol}://${targetHost}${newPath}`);
        }
    }

    // 0.5 Redirect localized lawyer/admin routes to root (e.g. /th/admin -> /admin)
    const localizedSystemRegex = /^\/[a-z]{2}\/(admin|lawyer-)(.*)/;
    if (localizedSystemRegex.test(pathname)) {
        const newPath = pathname.replace(/^\/[a-z]{2}/, '');
        return NextResponse.redirect(new URL(newPath, request.url));
    }

    // 1. Admin & Lawyer System Exclusion (No i18n)
    if (pathname.startsWith('/admin') || pathname.startsWith('/lawyer-')) {
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

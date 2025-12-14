import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const url = request.nextUrl;
    const hostname = request.headers.get('host') || '';
    const pathname = url.pathname;

    // Optimised to skip static files and API requests matching certain patterns early
    if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) {
        return NextResponse.next();
    }

    // Check if it's the admin subdomain
    // Matches admin.lawslane.com, admin.localhost:3000, etc.
    if (hostname.startsWith('admin.')) {
        // If the path is just '/', rewrite to '/admin' to show the dashboard
        if (pathname === '/') {
            url.pathname = '/admin';
            return NextResponse.rewrite(url);
        }

        // If the path is '/login', rewrite to '/admin/login' (optional convenience)
        if (pathname === '/login') {
            url.pathname = '/admin/login';
            return NextResponse.rewrite(url);
        }

        // Capture generic cases where user might type 'admin.lawslane.com/customers'
        // but the actual page is at 'src/app/admin/customers' (route: /admin/customers)
        // We only rewrite if it DOESN'T already start with /admin
        if (!pathname.startsWith('/admin')) {
            url.pathname = `/admin${pathname}`;
            return NextResponse.rewrite(url);
        }

        // If it already starts with /admin, we let it pass.
        // e.g. admin.lawslane.com/admin/customers -> reads /admin/customers (correct)
    } else {
        // Logic for Main Domain (www.lawslane.com or lawslane.com)

        // If user tries to access /admin path on main domain, redirect to admin subdomain
        if (pathname.startsWith('/admin')) {
            // Construct the new URL: protocol + // + admin. + domain + path
            // Note: In local dev, this might be tricky if not set up, so we check for 'localhost'

            let newHost = '';
            if (hostname.includes('localhost')) {
                newHost = 'admin.localhost:3000'; // For local testing
            } else {
                // Assumes the current host is 'lawslane.com' or 'www.lawslane.com'
                // We want 'admin.lawslane.com'
                // Simple replacement for now:
                const domainParts = hostname.split('.');
                // if www.lawslane.com -> remove www -> lawslane.com
                const rootDomain = domainParts.length > 2 && domainParts[0] === 'www'
                    ? domainParts.slice(1).join('.')
                    : hostname;

                newHost = `admin.${rootDomain}`;
            }

            const newUrl = new URL(url);
            newUrl.host = newHost;
            newUrl.pathname = pathname.replace(/^\/admin/, ''); // Remove /admin prefix because subdomain handles rewrites
            if (newUrl.pathname === '') newUrl.pathname = '/'; // Ensure at least /

            return NextResponse.redirect(newUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};

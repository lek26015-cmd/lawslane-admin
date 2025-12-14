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

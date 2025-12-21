import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const url = request.nextUrl;
    const hostname = request.headers.get('host') || '';
    const pathname = url.pathname;

    // 1. Skip static assets and API routes
    if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) {
        return NextResponse.next();
    }

    // 2. Admin Subdomain (admin.lawslane.com)
    if (hostname.startsWith('admin.')) {
        // If the path is just '/', rewrite to '/admin' to show the dashboard
        if (pathname === '/') {
            return NextResponse.rewrite(new URL('/admin', request.url));
        }

        // Convenience: /login -> /admin/login
        if (pathname === '/login') {
            return NextResponse.rewrite(new URL('/admin/login', request.url));
        }

        // Generic rewrite: /some-page -> /admin/some-page
        // But only if it doesn't already start with /admin
        if (!pathname.startsWith('/admin')) {
            // Allow /lawyer-dashboard to pass through without /admin prefix
            if (pathname.startsWith('/lawyer-dashboard')) {
                return NextResponse.rewrite(new URL(pathname, request.url));
            }
            return NextResponse.rewrite(new URL(`/admin${pathname}`, request.url));
        }

        return NextResponse.next();
    }

    // 3. Lawyer Subdomain (lawyer.lawslane.com)
    if (hostname.startsWith('lawyer.')) {
        // Special mappings
        if (pathname === '/schedule') {
            return NextResponse.rewrite(new URL('/lawyer-schedule', request.url));
        }

        // Login mappings
        // /login -> /lawyer-login
        if (pathname === '/login') {
            return NextResponse.rewrite(new URL('/lawyer-login', request.url));
        }
        // Allow /lawyer-login to pass through without being prefixed by /lawyer-dashboard
        if (pathname.startsWith('/lawyer-login')) {
            return NextResponse.rewrite(new URL(pathname, request.url));
        }

        // Default mapping: / -> /lawyer-dashboard
        if (pathname === '/') {
            return NextResponse.rewrite(new URL('/lawyer-dashboard', request.url));
        }

        // Generic rewrite: /request/123 -> /lawyer-dashboard/request/123
        // Only if it doesn't match other known roots like /lawyer-schedule and isn't already prefixed
        if (!pathname.startsWith('/lawyer-dashboard') && !pathname.startsWith('/lawyer-schedule') && !pathname.startsWith('/lawyer-login')) {
            return NextResponse.rewrite(new URL(`/lawyer-dashboard${pathname}`, request.url));
        }

        return NextResponse.next();
    }

    // 4. Main Domain Redirects (Force traffic to subdomains)
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'lawslane.com';

    // Redirect /admin/* -> admin.lawslane.com/*
    if (pathname.startsWith('/admin')) {
        const newUrl = new URL(request.url);
        let newHost = '';
        if (hostname.includes('localhost')) {
            // Preserve the current localhost port (e.g. localhost:9002)
            newHost = `admin.${hostname}`;
        } else {
            newHost = `admin.${rootDomain}`;
        }
        newUrl.host = newHost;
        newUrl.pathname = pathname.replace(/^\/admin/, '');
        if (newUrl.pathname === '') newUrl.pathname = '/'; // Ensure at least /
        return NextResponse.redirect(newUrl);
    }

    // Redirect /lawyer-dashboard -> lawyer.lawslane.com
    if (pathname.startsWith('/lawyer-dashboard')) {
        // Skip redirect if view=admin (for admin access on main domain/localhost)
        if (request.nextUrl.searchParams.get('view') === 'admin') {
            return NextResponse.next();
        }

        const newUrl = new URL(request.url);
        let newHost = '';
        if (hostname.includes('localhost')) {
            // Preserve the current localhost port (e.g. localhost:9002)
            newHost = `lawyer.${hostname}`;
        } else {
            newHost = `lawyer.${rootDomain}`;
        }
        newUrl.host = newHost;
        newUrl.pathname = pathname.replace(/^\/lawyer-dashboard/, '');
        if (newUrl.pathname === '') newUrl.pathname = '/'; // Ensure at least /
        return NextResponse.redirect(newUrl);
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

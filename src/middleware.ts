import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sadbhawana-secret-key-production-2026';
const TOKEN_NAME = 'sadbhawana_session';

export function middleware(req: NextRequest) {
  const token = req.cookies.get(TOKEN_NAME)?.value;
  const { pathname } = req.nextUrl;

  // Protect Admin routes
  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || decoded.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/author', req.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  // Protect Author routes
  if (pathname.startsWith('/author')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded) {
        return NextResponse.redirect(new URL('/login', req.url));
      }
      if (decoded.role === 'ADMIN' && !pathname.startsWith('/admin')) {
        // Admin can view author view if desired or stay in admin
      }
    } catch {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  // Redirect from login if already authenticated
  if (pathname === '/login' && token) {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded?.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', req.url));
      } else if (decoded?.role === 'AUTHOR') {
        return NextResponse.redirect(new URL('/author', req.url));
      }
    } catch {}
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/author/:path*', '/login'],
};

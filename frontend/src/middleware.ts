import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isProtected =
    pathname.startsWith('/profile') ||
    pathname.startsWith('/upload') ||
    pathname.startsWith('/recommend');

  if (isProtected && !isLoggedIn) {
    const url = new URL('/login', req.nextUrl.origin);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next|favicon.ico|.*\\..*).*)'],
};

import NextAuth from 'next-auth';
import authConfig from '@/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAdminPageRoute =
    pathname === '/pages' ||
    pathname === '/pages/new' ||
    pathname.startsWith('/pages/edit/');
  const isPublicPageRender = pathname.startsWith('/pages/') && !isAdminPageRoute;

  const isPublic =
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/api/') ||
    isPublicPageRender;
  if (!req.auth && !isPublic) {
    const url = new URL('/sign-in', req.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)']
};

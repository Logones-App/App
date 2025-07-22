import createMiddleware from 'next-intl/middleware';
import {routing} from '../i18n/routing';
import { authMiddleware } from './middleware/auth-middleware';
import { NextRequest, NextResponse } from 'next/server';

// Middleware combiné : internationalisation + authentification
export default async function middleware(req: NextRequest) {
  // D'abord appliquer le middleware d'authentification
  const authResult = await authMiddleware(req);
  if (authResult) {
    return authResult;
  }

  // Ensuite appliquer le middleware d'internationalisation
  const intlMiddleware = createMiddleware(routing);
  return intlMiddleware(req);
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/trpc`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)'
};

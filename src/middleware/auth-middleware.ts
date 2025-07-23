import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

// ============================================================================
// CONSTANTES
// ============================================================================

// Routes techniques (exclues du middleware)
const EXCLUDED_ROUTES = [
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
  '/api',
  '/_next',
  '/_vercel',
  '/trpc'
];

// Routes publiques (pas d'authentification requise)
const PUBLIC_ROUTES = [
  '/',                    // Page d'accueil
  '/auth/login',
  '/auth/register', 
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/logout'          // Page de déconnexion
];

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Vérifie si une route est exclue du middleware
 */
function isExcludedRoute(pathname: string): boolean {
  return EXCLUDED_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
}

/**
 * Vérifie si une route est publique
 */
function isPublicRoute(pathname: string): boolean {
  // Extraire la route sans la locale
  const routeWithoutLocale = pathname.replace(/^\/[a-z]{2}\//, '/').replace(/^\/[a-z]{2}$/, '/');
  
  return PUBLIC_ROUTES.some(route => {
    // Vérifier si la route correspond exactement ou commence par la route publique
    return routeWithoutLocale === route || routeWithoutLocale.startsWith(route + '/');
  });
}

/**
 * Vérifie si une route contient une locale
 */
function hasLocale(pathname: string): boolean {
  return routing.locales.some(locale => 
    pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
}

/**
 * Détermine la route autorisée selon le rôle
 */
function getAuthorizedRoute(userRole: string): string {
  switch (userRole) {
    case 'system_admin':
      return '/admin';
    case 'org_admin':
      return '/dashboard';
    default:
      return '/auth/login';
  }
}

// Fonction utilitaire pour TS : vérifie et type la locale
function isSupportedLocale(l: string): l is "fr" | "en" | "es" {
  return routing.locales.includes(l as any);
}

// ============================================================================
// MIDDLEWARE PRINCIPAL
// ============================================================================

export async function authMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // 1. Routes techniques - passer directement
  if (isExcludedRoute(pathname)) {
    return NextResponse.next();
  }
  
  // 2. Ajouter la locale si manquante
  if (!hasLocale(pathname)) {
    // Vérifier le cookie NEXT_LOCALE
    const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value;
    const supportedLocale = (cookieLocale && isSupportedLocale(cookieLocale)) ? cookieLocale : routing.defaultLocale;
    return NextResponse.redirect(new URL(`/${String(supportedLocale)}${pathname}`, req.url));
  }
  
  // 3. Utiliser next-intl pour extraire la locale
  let locale: string;
  try {
    locale = await req.nextUrl.pathname.split('/')[1]; // Extract locale from pathname
  } catch (error) {
    locale = routing.defaultLocale;
  }
  
  // 4. Routes publiques - passer directement
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }
  
  // 5. Vérifier l'authentification et le rôle
  try {
    const response = await fetch(`${req.nextUrl.origin}/api/auth/roles`, {
      method: 'GET',
      headers: {
        'Cookie': req.headers.get('cookie') || '',
      },
    });

    if (!response.ok) {
      return NextResponse.redirect(new URL(`/${locale}/auth/login`, req.url));
    }

    const roleData = await response.json();

    // 6. Si pas de rôle - rediriger vers login
    if (!roleData.role) {
      return NextResponse.redirect(new URL(`/${locale}/auth/login`, req.url));
    }

    // 7. Déterminer la route autorisée
    const authorizedRoute = getAuthorizedRoute(roleData.role);

    // 8. Vérifier si l'utilisateur accède à sa route autorisée
    if (pathname.includes(authorizedRoute)) {
      return NextResponse.next();
    }

    // 9. Rediriger vers la route autorisée
    return NextResponse.redirect(new URL(`/${locale}${authorizedRoute}`, req.url));

  } catch (error) {
    return NextResponse.redirect(new URL(`/${locale}/auth/login`, req.url));
  }
}

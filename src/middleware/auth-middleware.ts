import { NextRequest, NextResponse } from "next/server";

// Configuration
const DEFAULT_LOCALE = "fr";
const SUPPORTED_LOCALES = ["fr", "en", "es"];
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname : "logones.fr";

// Routes techniques (passage direct)
const TECHNICAL_ROUTES = ["/api", "/_next", "/favicon.ico", "/robots.txt", "/sitemap.xml"];

// Routes publiques (pas d'authentification)
const PUBLIC_ROUTES = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/unauthorized",
];

// Domaines exclus (pas de redirection)
const EXCLUDED_DOMAINS = ["localhost", "127.0.0.1", "0.0.0.0", MAIN_DOMAIN];

/**
 * Vérifie si c'est une route technique
 */
function isTechnicalRoute(pathname: string): boolean {
  return TECHNICAL_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Vérifie si c'est un domaine exclu
 */
function isExcludedDomain(hostname: string): boolean {
  const cleanHostname = hostname.split(":")[0];
  return EXCLUDED_DOMAINS.some((domain) => cleanHostname === domain);
}

/**
 * Vérifie si c'est une route publique
 */
function isPublicRoute(pathname: string): boolean {
  const cleanPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  return PUBLIC_ROUTES.some((route) => cleanPath === route);
}

/**
 * Vérifie si c'est une route protégée
 */
function isProtectedRoute(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/dashboard");
}

/**
 * Vérifie si c'est une route restaurant public
 */
function isRestaurantPublicRoute(pathname: string): boolean {
  const routeWithoutLocale = pathname.replace(/^\/[a-z]{2}\//, "/");

  // ✅ CORRECTION : Sans slash final
  if (
    routeWithoutLocale.startsWith("/admin") || // "/admin" match
    routeWithoutLocale.startsWith("/dashboard") || // "/dashboard" match
    routeWithoutLocale.startsWith("/auth")
  ) {
    return false;
  }

  // Format : /[slug] ou /[slug]/[page]
  return /^\/[^/]+$/.test(routeWithoutLocale) || /^\/[^/]+\//.test(routeWithoutLocale);
}

/**
 * Extrait la locale du pathname
 */
function extractLocale(pathname: string): string {
  const segments = pathname.split("/");
  const potentialLocale = segments[1];

  if (SUPPORTED_LOCALES.includes(potentialLocale)) {
    return potentialLocale;
  }

  return DEFAULT_LOCALE;
}

/**
 * Gère la locale manquante
 */
function handleLocale(request: NextRequest, pathname: string): NextResponse | null {
  const hasLocale = SUPPORTED_LOCALES.some((locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`);

  if (!hasLocale) {
    const newUrl = new URL(`/${DEFAULT_LOCALE}${pathname}`, request.url);
    return NextResponse.redirect(newUrl);
  }

  return null;
}

/**
 * Gère les domaines personnalisés
 */
async function handleCustomDomain(request: NextRequest, hostname: string, pathname: string): Promise<NextResponse> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "https://logones.fr"}/api/domains/${hostname}`, {
      method: "GET",
    });

    if (!response.ok) {
      console.log("❌ [Middleware] Domaine personnalisé non trouvé");
      return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}/404`, request.url));
    }

    const data = await response.json();
    const establishment = data.establishment;

    if (!establishment) {
      console.log("❌ [Middleware] Établissement non trouvé");
      return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}/404`, request.url));
    }

    // Déterminer la locale
    const locale = pathname.startsWith("/en/") ? "en" : pathname.startsWith("/es/") ? "es" : "fr";

    // Si on est déjà sur le bon slug, ne pas rediriger
    const currentPath = pathname.replace(`/${locale}`, "");
    if (currentPath === `/${establishment.slug}` || currentPath.startsWith(`/${establishment.slug}/`)) {
      console.log("✅ [Middleware] Déjà sur le bon slug");
      return NextResponse.next();
    }

    // Construire la nouvelle URL
    const newPath = `/${locale}/${establishment.slug}${pathname.replace(/^\/[a-z]{2}/, "")}`;
    const newUrl = new URL(newPath, `https://logones.fr`);

    console.log(`🔄 [Middleware] Redirection vers: ${newUrl.toString()}`);
    return NextResponse.redirect(newUrl);
  } catch (error) {
    console.error("❌ [Middleware] Erreur domaine personnalisé:", error);
    return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}/404`, request.url));
  }
}

/**
 * Gère les routes protégées
 */
async function handleProtectedRoute(request: NextRequest, locale: string): Promise<NextResponse> {
  try {
    // Vérifier l'authentification via l'API
    const response = await fetch(`${request.nextUrl.origin}/api/auth/roles`, {
      method: "GET",
      headers: {
        Cookie: request.headers.get("cookie") ?? "",
      },
    });

    if (!response.ok) {
      console.log("❌ [Middleware] API auth non accessible");
      return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));
    }

    const roleData = await response.json();
    console.log(`🔍 [Middleware] Rôle détecté: ${roleData.role}`);

    if (!roleData.role) {
      console.log("❌ [Middleware] Aucun rôle détecté");
      return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));
    }

    // Déterminer la route autorisée selon le rôle
    const authorizedRoute = getAuthorizedRoute(roleData.role);
    const currentPath = request.nextUrl.pathname.replace(`/${locale}`, "");

    console.log(`🔍 [Middleware] Route autorisée pour ${roleData.role}: ${authorizedRoute}`);
    console.log(`🔍 [Middleware] Chemin actuel: ${currentPath}`);

    // Vérifier si l'utilisateur accède à sa route autorisée
    if (currentPath.startsWith(authorizedRoute)) {
      console.log("✅ [Middleware] Accès autorisé");
      return NextResponse.next();
    }

    // Rediriger vers la route autorisée
    console.log(`🔄 [Middleware] Redirection vers: /${locale}${authorizedRoute}`);
    return NextResponse.redirect(new URL(`/${locale}${authorizedRoute}`, request.url));
  } catch (error) {
    console.error("❌ [Middleware] Erreur auth:", error);
    return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));
  }
}

/**
 * Détermine la route autorisée selon le rôle
 */
function getAuthorizedRoute(userRole: string): string {
  switch (userRole) {
    case "system_admin":
      return "/admin";
    case "org_admin":
      return "/dashboard";
    default:
      return "/auth/login";
  }
}

/**
 * Middleware d'authentification principal - CORRIGÉ
 */
export async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") ?? "";

  console.log(`🔍 [Middleware] ${request.method} ${pathname} (${hostname})`);

  // 1. Routes techniques - PASSAGE DIRECT
  if (isTechnicalRoute(pathname)) {
    console.log("✅ [Middleware] Route technique - passage direct");
    return NextResponse.next();
  }

  // 2. Domaines personnalisés - REDIRECTION
  if (!isExcludedDomain(hostname)) {
    console.log("🌐 [Middleware] Domaine personnalisé détecté");
    return handleCustomDomain(request, hostname, pathname);
  }

  // 3. Locale manquante - AJOUT
  const localeRedirect = handleLocale(request, pathname);
  if (localeRedirect) {
    console.log("🌍 [Middleware] Locale ajoutée");
    return localeRedirect;
  }

  // 4. Extraction de la locale
  const locale = extractLocale(pathname);
  const routeWithoutLocale = pathname.replace(`/${locale}`, "");

  // 5. Routes publiques - PASSAGE DIRECT
  if (isPublicRoute(routeWithoutLocale)) {
    console.log("✅ [Middleware] Route publique - passage direct");
    return NextResponse.next();
  }

  // 6. Routes protégées - VÉRIFICATION AUTH + RÔLES ⭐ CRITIQUE
  if (isProtectedRoute(routeWithoutLocale)) {
    console.log("🔒 [Middleware] Route protégée - vérification auth");
    return handleProtectedRoute(request, locale);
  }

  // 7. Routes restaurants publics - PASSAGE DIRECT
  if (isRestaurantPublicRoute(pathname)) {
    console.log("🍽️ [Middleware] Route restaurant public - passage direct");
    return NextResponse.next();
  }

  // 8. Route non reconnue - REDIRECTION LOGIN
  console.log("❌ [Middleware] Route non reconnue - redirection login");
  return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));
}

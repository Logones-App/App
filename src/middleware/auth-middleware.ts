import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

// Domaines exclus (domaine principal et développement)
const EXCLUDED_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "logones.fr", // Domaine principal
];

// Routes techniques à exclure
const EXCLUDED_ROUTES = [
  "/api",
  "/_next",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
];

// Routes publiques (pas besoin d'authentification)
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/unauthorized",
];

/**
 * Vérifie si une route est exclue
 */
function isExcludedRoute(pathname: string): boolean {
  return EXCLUDED_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Vérifie si une route est publique
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname === route);
}

/**
 * Vérifie si un domaine est exclu
 */
function isExcludedDomain(hostname: string): boolean {
  return EXCLUDED_DOMAINS.some(domain => hostname.includes(domain));
}

/**
 * Récupère l'établissement par domaine personnalisé
 */
async function getEstablishmentByDomain(domain: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://logones.fr'}/api/domains/${domain}`, {
      method: "GET",
    });

    if (!response.ok) return null;
    
    const data = await response.json();
    return data.establishment;
  } catch (error) {
    console.error("Erreur lors de la récupération du domaine:", error);
    return null;
  }
}

/**
 * Gère les domaines personnalisés
 */
async function handleCustomDomain(req: NextRequest, hostname: string, pathname: string) {
  console.log("🌐 Middleware - Domaine personnalisé détecté:", hostname);
  const establishment = await getEstablishmentByDomain(hostname);

  if (establishment) {
    console.log(" Middleware - Établissement trouvé:", establishment.slug);
    
    // Déterminer la locale
    const locale = pathname.startsWith("/en/") ? "en" : pathname.startsWith("/es/") ? "es" : "fr";
    
    // Construire la nouvelle URL
    const newPath = `/${locale}/${establishment.slug}${pathname.replace(/^\/[a-z]{2}/, "")}`;
    const newUrl = new URL(newPath, `https://logones.fr`);
    
    console.log("🔄 Middleware - Redirection vers:", newUrl.toString());
    return NextResponse.redirect(newUrl);
  } else {
    console.log("❌ Middleware - Domaine personnalisé non trouvé ou inactif.");
    return NextResponse.redirect(new URL(`/${routing.defaultLocale}/404`, req.url));
  }
}

/**
 * Gère la locale
 */
function handleLocale(req: NextRequest, pathname: string) {
  const pathnameHasLocale = routing.locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (!pathnameHasLocale) {
    const locale = routing.defaultLocale;
    const newUrl = new URL(`/${locale}${pathname}`, req.url);
    console.log("🌍 Middleware - Redirection vers locale:", newUrl.toString());
    return NextResponse.redirect(newUrl);
  }

  return null; // Pas de redirection nécessaire
}

/**
 * Vérifie l'authentification
 */
async function checkAuthentication(req: NextRequest, locale: string) {
  const token = req.cookies.get("auth-token")?.value;
  
  if (!token) {
    console.log("❌ Middleware - Pas de token, redirection vers login");
    return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
  }

  // Vérification du token côté serveur
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://logones.fr'}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    console.log("❌ Middleware - Token invalide, redirection vers login");
    return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
  }

  console.log("✅ Middleware - Authentification OK, passage direct");
  return NextResponse.next();
}

/**
 * Middleware d'authentification et de gestion des domaines personnalisés
 */
export async function authMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get("host") ?? "";

  console.log("🔍 Middleware - Pathname:", pathname, "Hostname:", hostname);

  // 1. Routes techniques - passer directement
  if (isExcludedRoute(pathname)) {
    console.log("✅ Middleware - Route technique, passage direct");
    return NextResponse.next();
  }

  // 2. Gestion des domaines personnalisés (avant la locale)
  if (!isExcludedDomain(hostname)) {
    return handleCustomDomain(req, hostname, pathname);
  }

  // 3. Gestion de la locale
  const localeRedirect = handleLocale(req, pathname);
  if (localeRedirect) return localeRedirect;

  // 4. Extraction de la locale et vérification des routes
  const locale = pathname.split("/")[1] ?? routing.defaultLocale;
  console.log("🌍 Middleware - Locale:", locale);

  // 5. Routes publiques et restaurants - passage direct
  const publicPath = pathname.replace(`/${locale}`, "");
  if (isPublicRoute(publicPath) || (publicPath.includes("/") && !publicPath.startsWith("/admin") && !publicPath.startsWith("/dashboard"))) {
    console.log("✅ Middleware - Route publique/restaurant, passage direct");
    return NextResponse.next();
  }

  // 6. Vérification de l'authentification pour les routes protégées
  try {
    return await checkAuthentication(req, locale);
  } catch (error) {
    console.error("❌ Middleware - Erreur d'authentification:", error);
    return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
  }
}

import { NextRequest, NextResponse } from "next/server";

// Configuration
const DEFAULT_LOCALE = "fr";
const SUPPORTED_LOCALES = ["fr", "en", "es"];
const MAIN_DOMAIN = "logones.fr";

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
 * Récupère les informations d'un domaine personnalisé
 */
async function getDomainInfo(hostname: string): Promise<{ establishment: { slug: string } } | null> {
  try {
    const response = await fetch(`https://${MAIN_DOMAIN}/api/domains/${hostname}`, {
      headers: {
        Cookie: "",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // L'API retourne establishment.slug ET domain.establishment_slug
    const establishmentSlug = data.establishment?.slug ?? data.domain?.establishment_slug;

    if (!establishmentSlug) {
      return null;
    }

    return {
      establishment: { slug: establishmentSlug },
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des infos du domaine:", error);
    return null;
  }
}

/**
 * Effectue le fetch proxy vers logones.fr
 */
async function fetchProxyContent(targetUrl: string, request: NextRequest): Promise<Response | null> {
  try {
    console.log(`🌐 [DEBUG] Fetching: ${targetUrl}`);

    // Fetch externe direct avec User-Agent spécifique pour éviter la boucle
    const proxyResponse = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": "CustomDomainProxy/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        "X-Proxy-Request": "true", // Header pour identifier les requêtes proxy
      },
    });

    console.log(`🌐 [DEBUG] Response status: ${proxyResponse.status}`);

    if (!proxyResponse.ok) {
      console.log(`🌐 [DEBUG] Response not ok: ${proxyResponse.status}`);
      return null;
    }

    console.log(`🌐 [DEBUG] Fetch successful`);
    return proxyResponse;
  } catch (error) {
    console.log(`🌐 [DEBUG] Fetch error:`, error);
    return null;
  }
}

/**
 * Modifie le HTML pour corriger les URLs (Solution 2 : liens en dur vers logones.fr)
 */
function modifyHtmlUrls(html: string, hostname: string, locale: string, establishmentSlug: string): string {
  // Échapper les caractères spéciaux pour éviter les RegExp non-littéraux
  const escapedMainDomain = MAIN_DOMAIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // eslint-disable-next-line security/detect-non-literal-regexp
  const httpsPattern = new RegExp(`https://${escapedMainDomain}`, "g");
  // eslint-disable-next-line security/detect-non-literal-regexp
  const httpPattern = new RegExp(`http://${escapedMainDomain}`, "g");

  return (
    html
      // ✅ SOLUTION 2 : Laisser les liens vers logones.fr (ils fonctionnent déjà)
      // Pas de transformation des liens href/src vers logones.fr

      // Seulement corriger les actions de formulaires si nécessaire
      .replace(/action="https:\/\/logones\.fr/g, `action="https://${hostname}`)
      .replace(/action="http:\/\/logones\.fr/g, `action="https://${hostname}`)
  );
}

/**
 * Gère les domaines personnalisés avec proxy transparent
 */
async function handleCustomDomain(request: NextRequest, hostname: string, locale: string): Promise<NextResponse> {
  try {
    // 1. Récupérer les infos du domaine
    const domainData = await getDomainInfo(hostname);

    if (!domainData) {
      return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}/404`, request.url));
    }

    // 2. Extraire le chemin demandé et valider la locale
    const pathname = request.nextUrl.pathname;
    const establishmentSlug = domainData.establishment.slug;

    // Valider la locale
    const validLocale = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;

    // Nettoyer le pathname en retirant la locale si présente
    let cleanPathname = pathname;
    if (SUPPORTED_LOCALES.some((loc) => pathname.startsWith(`/${loc}/`))) {
      cleanPathname = pathname.replace(/^\/[a-z]{2}\//, "/");
    } else if (SUPPORTED_LOCALES.some((loc) => pathname === `/${loc}`)) {
      cleanPathname = "/";
    }

    // 3. Construire l'URL cible avec la bonne locale
    let targetPath = `/${validLocale}/${establishmentSlug}`;

    // Si ce n'est pas la racine, ajouter le chemin nettoyé
    if (cleanPathname !== "/") {
      targetPath += cleanPathname;
    }

    const targetUrl = `https://${MAIN_DOMAIN}${targetPath}`;

    // 4. Faire le fetch proxy
    const proxyResponse = await fetchProxyContent(targetUrl, request);

    if (!proxyResponse) {
      // Retourner directement une page 404 au lieu de rediriger
      const notFoundHtml = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Page non trouvée</title>
        </head>
        <body>
          <h1>404</h1>
          <p>Page non trouvée</p>
          <p>Désolé, la page que vous recherchez n'existe pas ou a été déplacée.</p>
        </body>
        </html>
      `;

      return new NextResponse(notFoundHtml, {
        status: 404,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    // 5. Modifier le HTML
    const html = await proxyResponse.text();
    const modifiedHtml = modifyHtmlUrls(html, hostname, validLocale, establishmentSlug);

    // 6. Retourner la réponse
    return new NextResponse(modifiedHtml, {
      status: proxyResponse.status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("Erreur lors du proxy du domaine personnalisé:", error);
    return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}/404`, request.url));
  }
}

/**
 * Gère les routes protégées avec authentification
 */
async function handleProtectedRoute(request: NextRequest, locale: string): Promise<NextResponse> {
  try {
    // Appel à l'API d'authentification
    const response = await fetch(`${request.nextUrl.protocol}//${request.headers.get("host")}/api/auth/roles`, {
      headers: {
        Cookie: request.headers.get("cookie") ?? "",
      },
    });

    if (!response.ok) {
      return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));
    }

    const roleData = await response.json();
    // console.log(`🔍 [Middleware] Rôle détecté: ${roleData.role}`);

    if (!roleData.role) {
      // console.log("❌ [Middleware] Aucun rôle détecté");
      return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));
    }

    // Déterminer la route autorisée selon le rôle
    const authorizedRoute = getAuthorizedRoute(roleData.role);
    const currentPath = request.nextUrl.pathname.replace(`/${locale}`, "");

    // console.log(`🔍 [Middleware] Route autorisée pour ${roleData.role}: ${authorizedRoute}`);
    // console.log(`🔍 [Middleware] Chemin actuel: ${currentPath}`);

    // Vérifier si l'utilisateur accède à sa route autorisée
    if (currentPath.startsWith(authorizedRoute)) {
      // console.log("✅ [Middleware] Accès autorisé");
      return NextResponse.next();
    }

    // Rediriger vers la route autorisée
    // console.log(`🔄 [Middleware] Redirection vers: /${locale}${authorizedRoute}`);
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

  // 0. Requêtes proxy - PASSAGE DIRECT (éviter la boucle)
  if (request.headers.get("X-Proxy-Request") === "true") {
    console.log("🔄 [Middleware] Requête proxy détectée - passage direct");
    return NextResponse.next();
  }

  // 1. Routes techniques - PASSAGE DIRECT
  if (isTechnicalRoute(pathname)) {
    // console.log("✅ [Middleware] Route technique - passage direct");
    return NextResponse.next();
  }

  // 2. Détection de locale (sans redirection)
  const detectedLocale = extractLocale(pathname);

  // 3. Domaines personnalisés - PROXY TRANSPARENT (avec locale détectée)
  if (!isExcludedDomain(hostname)) {
    console.log(
      `🌐 [Middleware] Domaine personnalisé détecté: ${hostname} - Path: ${pathname} - Locale: ${detectedLocale}`,
    );
    return handleCustomDomain(request, hostname, detectedLocale);
  }

  // 4. Locale manquante - AJOUT (redirection)
  const localeRedirect = handleLocale(request, pathname);
  if (localeRedirect) {
    // console.log("🌍 [Middleware] Locale ajoutée");
    return localeRedirect;
  }

  // 5. Extraction de la locale (après redirection)
  const locale = extractLocale(pathname);
  const routeWithoutLocale = pathname.replace(`/${locale}`, "");

  // 6. Routes publiques - PASSAGE DIRECT
  if (isPublicRoute(routeWithoutLocale)) {
    // console.log("✅ [Middleware] Route publique - passage direct");
    return NextResponse.next();
  }

  // 7. Routes restaurant public - PASSAGE DIRECT
  if (isRestaurantPublicRoute(pathname)) {
    // console.log("🍽️ [Middleware] Route restaurant public - passage direct");
    return NextResponse.next();
  }

  // 8. Routes protégées - VÉRIFICATION AUTH + RÔLES
  if (isProtectedRoute(routeWithoutLocale)) {
    // console.log("🔒 [Middleware] Route protégée - vérification auth");
    return handleProtectedRoute(request, locale);
  }

  // 9. Route non reconnue - REDIRECTION LOGIN
  // console.log("❌ [Middleware] Route non reconnue - redirection login");
  return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));
}

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
export function isTechnicalRoute(pathname: string): boolean {
  return TECHNICAL_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Vérifie si c'est un domaine exclu
 */
export function isExcludedDomain(hostname: string): boolean {
  const cleanHostname = hostname.split(":")[0];
  return EXCLUDED_DOMAINS.some((domain) => cleanHostname === domain);
}

/**
 * Vérifie si c'est une route publique
 */
export function isPublicRoute(pathname: string): boolean {
  const cleanPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  return PUBLIC_ROUTES.some((route) => cleanPath === route);
}

/**
 * Vérifie si c'est une route protégée
 */
export function isProtectedRoute(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/dashboard");
}

/**
 * Vérifie si c'est une route restaurant public
 */
export function isRestaurantPublicRoute(pathname: string): boolean {
  const routeWithoutLocale = pathname.replace(/^\/[a-z]{2}\//, "/");

  if (
    routeWithoutLocale.startsWith("/admin") ||
    routeWithoutLocale.startsWith("/dashboard") ||
    routeWithoutLocale.startsWith("/auth")
  ) {
    return false;
  }

  return /^\/[^/]+$/.test(routeWithoutLocale) || /^\/[^/]+\//.test(routeWithoutLocale);
}

/**
 * Extrait la locale du pathname
 */
export function extractLocale(pathname: string): string {
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
export function handleLocale(request: NextRequest, pathname: string): NextResponse | null {
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
export async function getDomainInfo(hostname: string): Promise<{ establishment: { slug: string } } | null> {
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
export async function fetchProxyContent(targetUrl: string, request: NextRequest): Promise<Response | null> {
  try {
    console.log(`🌐 [DEBUG] Fetching: ${targetUrl}`);

    const proxyResponse = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": "CustomDomainProxy/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        "X-Proxy-Request": "true",
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
 * Modifie le HTML pour corriger les URLs
 */
export function modifyHtmlUrls(html: string, hostname: string, locale: string, establishmentSlug: string): string {
  let modifiedHtml = html;

  const patterns = [
    {
      from: `href="/${locale}/${establishmentSlug}/`,
      to: `href="/`,
    },
    {
      from: `src="/${locale}/${establishmentSlug}/`,
      to: `src="/`,
    },
    {
      from: `href="/${locale}/${establishmentSlug}"`,
      to: `href="/"`,
    },
    {
      from: `src="/${locale}/${establishmentSlug}"`,
      to: `src="/"`,
    },
    {
      from: `href="/${locale}/`,
      to: `href="/`,
    },
    {
      from: `src="/${locale}/`,
      to: `src="/`,
    },
  ];

  patterns.forEach((pattern) => {
    modifiedHtml = modifiedHtml.split(pattern.from).join(pattern.to);
  });

  modifiedHtml = modifiedHtml
    .split('action="https://logones.fr')
    .join(`action="https://${hostname}`)
    .split('action="http://logones.fr')
    .join(`action="https://${hostname}`);

  return modifiedHtml;
}

/**
 * Détermine la route autorisée selon le rôle
 */
export function getAuthorizedRoute(userRole: string): string {
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
 * Gère les redirections depuis logones.fr vers domaines personnalisés
 */
export function handleCustomDomainRedirect(
  request: NextRequest,
  hostname: string,
  pathname: string,
): NextResponse | null {
  const referer = request.headers.get("referer") ?? "";

  if (hostname === MAIN_DOMAIN && referer.includes("la-plank-des-gones.com")) {
    console.log(`🔄 [Middleware] Redirection détectée depuis ${referer} vers ${hostname}${pathname}`);

    const refererUrl = new URL(referer);
    const customDomain = refererUrl.hostname;

    const cleanPath = pathname.replace(/^\/[a-z]{2}\/[^/]+\//, "/");
    const redirectUrl = `https://${customDomain}${cleanPath}`;

    console.log(`🔄 [Middleware] Redirection vers: ${redirectUrl}`);
    return NextResponse.redirect(redirectUrl);
  }

  return null;
}

/**
 * Vérifie si une redirection est nécessaire pour nettoyer l'URL
 */
export function shouldRedirectToCleanUrl(pathname: string, validLocale: string, establishmentSlug: string): boolean {
  return (
    pathname.includes(`/${validLocale}/${establishmentSlug}/`) ||
    pathname.endsWith(`/${validLocale}/${establishmentSlug}`) ||
    pathname.includes(`/${establishmentSlug}/`) ||
    pathname.endsWith(`/${establishmentSlug}`)
  );
}

/**
 * Construit l'URL propre sans le slug
 */
export function buildCleanUrl(pathname: string, validLocale: string, establishmentSlug: string): string {
  let cleanUrl = pathname
    .replace(`/${validLocale}/${establishmentSlug}/`, `/${validLocale}/`)
    .replace(`/${validLocale}/${establishmentSlug}`, `/${validLocale}`)
    .replace(`/${establishmentSlug}/`, "/")
    .replace(`/${establishmentSlug}`, "");

  if (cleanUrl.endsWith(`/${validLocale}/`)) {
    cleanUrl = cleanUrl.replace(`/${validLocale}/`, "/");
  }

  return cleanUrl;
}

// Export des constantes
export { DEFAULT_LOCALE, SUPPORTED_LOCALES, MAIN_DOMAIN };

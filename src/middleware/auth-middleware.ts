import { NextRequest, NextResponse } from "next/server";

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  MAIN_DOMAIN,
  isTechnicalRoute,
  isExcludedDomain,
  isPublicRoute,
  isProtectedRoute,
  isRestaurantPublicRoute,
  extractLocale,
  handleLocale,
  getDomainInfo,
  fetchProxyContent,
  modifyHtmlUrls,
  getAuthorizedRoute,
  handleCustomDomainRedirect,
  shouldRedirectToCleanUrl,
  buildCleanUrl,
} from "./auth-middleware-utils";

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

    // 3. VÉRIFIER SI REDIRECTION NÉCESSAIRE (URL avec slug à nettoyer)
    if (shouldRedirectToCleanUrl(pathname, validLocale, establishmentSlug)) {
      const cleanUrl = buildCleanUrl(pathname, validLocale, establishmentSlug);
      const redirectUrl = `https://${hostname}${cleanUrl}`;
      console.log(`🔄 [Middleware] Redirection URL propre: ${pathname} → ${redirectUrl}`);
      return NextResponse.redirect(redirectUrl);
    }

    // Nettoyer le pathname en retirant la locale si présente
    let cleanPathname = pathname;
    if (SUPPORTED_LOCALES.some((loc) => pathname.startsWith(`/${loc}/`))) {
      cleanPathname = pathname.replace(/^\/[a-z]{2}\//, "/");
    } else if (SUPPORTED_LOCALES.some((loc) => pathname === `/${loc}`)) {
      cleanPathname = "/";
    }

    // 4. Construire l'URL cible avec la bonne locale
    // Pour les domaines personnalisés, on ajoute le slug de l'établissement
    let targetPath = `/${validLocale}/${establishmentSlug}`;

    // Si ce n'est pas la racine, ajouter le chemin nettoyé
    if (cleanPathname !== "/") {
      targetPath += cleanPathname;
    }

    const targetUrl = `https://${MAIN_DOMAIN}${targetPath}`;

    // 5. Faire le fetch proxy
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

    // 6. Modifier le HTML
    const html = await proxyResponse.text();
    const modifiedHtml = modifyHtmlUrls(html, hostname, validLocale, establishmentSlug);

    // 7. Retourner la réponse
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

  // 4. Gestion des redirections depuis logones.fr vers domaines personnalisés
  const customDomainRedirect = handleCustomDomainRedirect(request, hostname, pathname);
  if (customDomainRedirect) {
    return customDomainRedirect;
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

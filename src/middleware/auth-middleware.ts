import { NextRequest, NextResponse } from "next/server";

import { routing } from "@/i18n/routing";

// ============================================================================
// CONSTANTES
// ============================================================================

// Routes techniques (exclues du middleware)
const EXCLUDED_ROUTES = [
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.json",
  "/api",
  "/_next",
  "/_vercel",
  "/trpc",
];

// Routes publiques (pas d'authentification requise)
const PUBLIC_ROUTES = [
  "/", // Page d'accueil
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/logout", // Page de déconnexion
];

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Vérifie si une route est exclue du middleware
 */
function isExcludedRoute(pathname: string): boolean {
  return EXCLUDED_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

/**
 * Vérifie si une route est publique (auth, etc.)
 */
function isPublicRoute(pathname: string): boolean {
  // Extraire la route sans la locale
  const routeWithoutLocale = pathname.replace(/^\/[a-z]{2}\//, "/").replace(/^\/[a-z]{2}$/, "/");

  return PUBLIC_ROUTES.some((route) => {
    // Vérifier si la route correspond exactement ou commence par la route publique
    return routeWithoutLocale === route || routeWithoutLocale.startsWith(route + "/");
  });
}

/**
 * Vérifie si c'est une route de restaurant public (site public)
 */
function isRestaurantPublicRoute(pathname: string): boolean {
  // Extraire la route sans la locale
  const routeWithoutLocale = pathname.replace(/^\/[a-z]{2}\//, "/").replace(/^\/[a-z]{2}$/, "/");
  
  // Si c'est juste la racine, ce n'est pas un restaurant
  if (routeWithoutLocale === "/") return false;
  
  // Si ça commence par /admin, /dashboard, /auth, ce n'est pas un restaurant
  if (routeWithoutLocale.startsWith("/admin") || 
      routeWithoutLocale.startsWith("/dashboard") || 
      routeWithoutLocale.startsWith("/auth")) {
    return false;
  }
  
  // Sinon, c'est probablement un slug de restaurant
  // Format attendu : /[slug] ou /[slug]/[page]
  return /^\/[^\/]+$/.test(routeWithoutLocale) || /^\/[^\/]+\//.test(routeWithoutLocale);
}

/**
 * Vérifie si une route contient une locale
 */
function hasLocale(pathname: string): boolean {
  return routing.locales.some((locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`);
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
 * Vérifie si l'utilisateur accède à sa route autorisée
 */
function isAuthorizedRoute(pathname: string, userRole: string): boolean {
  const authorizedRoute = getAuthorizedRoute(userRole);
  
  // Pour system_admin : doit accéder à /admin/*
  if (userRole === "system_admin") {
    return pathname.includes("/admin");
  }
  
  // Pour org_admin : doit accéder à /dashboard/*
  if (userRole === "org_admin") {
    return pathname.includes("/dashboard");
  }
  
  return false;
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

  console.log("🔍 Middleware - Pathname:", pathname);

  // 1. Routes techniques - passer directement
  if (isExcludedRoute(pathname)) {
    console.log("✅ Middleware - Route technique, passage direct");
    return NextResponse.next();
  }

  // 2. Ajouter la locale si manquante
  if (!hasLocale(pathname)) {
    console.log("🌍 Middleware - Locale manquante, redirection");
    // Vérifier le cookie NEXT_LOCALE
    const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
    const supportedLocale = cookieLocale && isSupportedLocale(cookieLocale) ? cookieLocale : routing.defaultLocale;
    return NextResponse.redirect(new URL(`/${String(supportedLocale)}${pathname}`, req.url));
  }

  // 3. Extraire la locale
  let locale: string;
  try {
    locale = pathname.split("/")[1];
    if (!isSupportedLocale(locale)) {
      console.log("🌍 Middleware - Locale non supportée, redirection");
      // Si la locale n'est pas supportée, rediriger vers la locale par défaut
      return NextResponse.redirect(new URL(`/${routing.defaultLocale}${pathname.replace(`/${locale}`, "")}`, req.url));
    }
  } catch (error) {
    locale = routing.defaultLocale;
  }

  console.log("🌍 Middleware - Locale:", locale);

  // 4. Routes publiques (auth, etc.) - passer directement
  if (isPublicRoute(pathname)) {
    console.log("✅ Middleware - Route publique, passage direct");
    return NextResponse.next();
  }

  // 5. Routes de restaurants publics - passer directement (pas d'authentification requise)
  if (isRestaurantPublicRoute(pathname)) {
    console.log("✅ Middleware - Route restaurant public, passage direct");
    return NextResponse.next();
  }

  console.log("🔒 Middleware - Route protégée, vérification auth...");

  // 6. Vérifier l'authentification et le rôle (seulement pour les routes protégées)
  try {
    const response = await fetch(`${req.nextUrl.origin}/api/auth/roles`, {
      method: "GET",
      headers: {
        Cookie: req.headers.get("cookie") || "",
      },
    });

    if (!response.ok) {
      console.log("❌ Middleware - Auth échouée, redirection login");
      return NextResponse.redirect(new URL(`/${locale}/auth/login`, req.url));
    }

    const roleData = await response.json();
    console.log("👤 Middleware - Rôle détecté:", roleData.role);

    // 7. Si pas de rôle - rediriger vers login
    if (!roleData.role) {
      console.log("❌ Middleware - Pas de rôle, redirection login");
      return NextResponse.redirect(new URL(`/${locale}/auth/login`, req.url));
    }

    // 8. Déterminer la route autorisée
    const authorizedRoute = getAuthorizedRoute(roleData.role);

    // 9. Vérifier si l'utilisateur accède à sa route autorisée
    if (isAuthorizedRoute(pathname, roleData.role)) {
      console.log("✅ Middleware - Route autorisée, passage direct");
      return NextResponse.next();
    }

    // 10. Rediriger vers la route autorisée
    console.log("🔄 Middleware - Redirection vers route autorisée:", authorizedRoute);
    return NextResponse.redirect(new URL(`/${locale}${authorizedRoute}`, req.url));
  } catch (error) {
    console.error("❌ Middleware auth error:", error);
    return NextResponse.redirect(new URL(`/${locale}/auth/login`, req.url));
  }
}

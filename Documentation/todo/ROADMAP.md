# Checklist de conformité & bonnes pratiques (Stack 2025)

Ce document sert de référence rapide pour garantir que le code respecte toutes les règles et patterns de la stack :
- Next.js 15 (App Router, cookies async, SSR)
- Supabase v2 (auth SSR sécurisée)
- Legend State v3 (state management client-only)
- React 19
- next-intl v4 (i18n dynamique)
- Tailwind v4 (UI moderne, Radix UI)

## Authentification & sécurité
- Utiliser `getUser()` côté server, jamais `getSession()`
- Centraliser la logique auth dans le middleware
- Cookies d’auth : HttpOnly, SameSite=Lax, Secure (prod)
- Rate limiting sur les endpoints sensibles
- Protéger toutes les routes sensibles avec `ProtectedRoute`
- Jamais d’écriture de cookie dans un composant React/Server Component

## APIs Next.js 15
- Toujours await `cookies()`, `headers()`, `params` dans les Server Components
- Initialiser le cookieStore une seule fois par requête

## Legend State v3
- Utiliser Legend State uniquement côté client
- Placer le provider dans le layout client le plus haut possible
- Ne jamais utiliser Legend State dans un Server Component

## Internationalisation (next-intl v4)
- Toutes les routes sont préfixées par le locale (`/fr/`, `/en/`)
- Provider next-intl dans le layout racine `[locale]/layout.tsx`
- Utiliser les hooks fournis pour accéder aux messages

## UI & accessibilité
- Utiliser Radix UI pour les composants interactifs
- Styliser avec Tailwind v4, sans purge custom
- Respecter l’accessibilité (focus, aria, etc.)

## Maintenance
- Se référer aux guides spécialisés pour chaque domaine (auth, i18n, etc.)
- Utiliser cette checklist avant chaque merge ou refacto majeur

Ce fichier fait foi pour toute vérification rapide de conformité stack.

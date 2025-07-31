# 🚀 PLAN D'AMÉLIORATION - SYSTÈME DE SITE PUBLIC

## 📋 **VUE D'ENSEMBLE**

Ce plan d'amélioration transforme le système de site public actuel en une **plateforme de conversion sophistiquée** avec une architecture modulaire, des performances optimisées et une expérience utilisateur premium.

**Objectif :** Passer d'un simple site vitrine à un **outil business** qui maximise les conversions (réservations) tout en offrant une flexibilité totale aux restaurants.

---

## 🎯 **PHASE 1 : CORRECTIONS CRITIQUES (Priorité HAUTE)**

### **1.1 🔴 Correction du Système de Proxy**

#### **Problème :** Boucle de proxy et gestion d'erreurs insuffisante

**Fichiers à modifier :**

- `src/middleware/auth-middleware.ts`
- `src/middleware/auth-middleware-utils.ts`

**Actions :**

```typescript
// 1. Détection robuste des requêtes proxy
function isProxyRequest(request: NextRequest): boolean {
  const proxyHeaders = ["X-Proxy-Request", "X-Forwarded-For", "X-Real-IP", "CF-Connecting-IP"];
  return proxyHeaders.some((header) => request.headers.get(header));
}

// 2. Gestion d'erreurs 404 personnalisées
async function handleCustom404(hostname: string, domainData: any): Promise<NextResponse> {
  const custom404Html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Page non trouvée - ${domainData?.establishment?.name || "Restaurant"}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 50px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container { max-width: 600px; margin: 0 auto; }
        .logo { font-size: 2em; margin-bottom: 20px; }
        .back-link { 
          color: white; 
          text-decoration: underline; 
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🍽️ ${domainData?.establishment?.name || "Restaurant"}</div>
        <h1>Page non trouvée</h1>
        <p>Désolé, la page que vous recherchez n'existe pas.</p>
        <a href="/" class="back-link">← Retour à l'accueil</a>
      </div>
    </body>
    </html>
  `;

  return new NextResponse(custom404Html, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// 3. Gestion intelligente des assets
export function modifyHtmlUrlsIntelligently(html: string, hostname: string, locale: string, domainData: any): string {
  // Assets statiques (CSS, JS, images)
  const assetPatterns = [/href="\/_next\//g, /src="\/_next\//g, /src="\/images\//g, /href="\/favicon.ico"/g];

  assetPatterns.forEach((pattern) => {
    html = html.replace(pattern, (match) => {
      return match.replace("/", `https://${MAIN_DOMAIN}/`);
    });
  });

  // URLs de contenu
  html = html.replace(new RegExp(`https://${MAIN_DOMAIN}`, "g"), `https://${hostname}`);

  // Nettoyage des URLs doubles
  html = html.replace(/\/\//g, "/");

  return html;
}
```

**Livrable :** Système de proxy robuste et sécurisé
**Durée estimée :** 2-3 jours

### **1.2 🟡 Standardisation des États de Chargement**

#### **Problème :** Gestion incohérente des états de chargement

**Fichiers à créer :**

- `src/components/ui/loading-states.tsx`
- `src/components/ui/error-states.tsx`

**Actions :**

```typescript
// src/components/ui/loading-states.tsx
export function LoadingState({
  message = "Chargement...",
  size = "default",
  variant = "spinner"
}: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center p-8">
      {variant === "spinner" && <Spinner className="mr-2" size={size} />}
      {variant === "skeleton" && <Skeleton className="h-4 w-32" />}
      <span className="text-muted-foreground">{message}</span>
    </div>
  );
}

// src/components/ui/error-states.tsx
export function ErrorState({
  error,
  retry,
  message = "Une erreur est survenue"
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="h-8 w-8 text-destructive mb-4" />
      <h3 className="text-lg font-semibold mb-2">{message}</h3>
      {error && <p className="text-muted-foreground mb-4">{error.message}</p>}
      {retry && (
        <Button onClick={retry} variant="outline">
          Réessayer
        </Button>
      )}
    </div>
  );
}
```

**Livrable :** Composants de chargement et d'erreur standardisés
**Durée estimée :** 1 jour

### **1.3 🔒 Validation Renforcée**

#### **Problème :** Validation insuffisante côté client

**Fichiers à créer :**

- `src/lib/validation/establishment.ts`
- `src/lib/validation/public-routes.ts`

**Actions :**

```typescript
// src/lib/validation/establishment.ts
export function validateEstablishment(establishment: any): ValidationResult {
  if (!establishment) {
    return { isValid: false, error: "Établissement non trouvé" };
  }

  if (!establishment.is_public) {
    return { isValid: false, error: "Établissement non public" };
  }

  if (establishment.deleted) {
    return { isValid: false, error: "Établissement supprimé" };
  }

  if (!establishment.slug) {
    return { isValid: false, error: "Slug manquant" };
  }

  return { isValid: true };
}

// src/lib/validation/public-routes.ts
export function validatePublicRoute(pathname: string, locale: string): ValidationResult {
  const routeWithoutLocale = pathname.replace(`/${locale}`, "");

  // Vérifier que c'est une route publique valide
  if (!isValidPublicRoute(routeWithoutLocale)) {
    return { isValid: false, error: "Route non autorisée" };
  }

  return { isValid: true };
}
```

**Livrable :** Système de validation robuste
**Durée estimée :** 1 jour

---

## 🎨 **PHASE 2 : ARCHITECTURE MODULAIRE (Priorité MOYENNE)**

### **2.1 🎨 Système de Thèmes Dynamiques**

**Fichiers à créer :**

- `src/app/[locale]/(public)/_lib/themes.ts`
- `src/app/[locale]/(public)/_components/theme/ThemeProvider.tsx`
- `src/app/[locale]/(public)/_components/theme/themes/`

**Actions :**

```typescript
// src/app/[locale]/(public)/_lib/themes.ts
export interface RestaurantTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    muted: string;
  };
  typography: {
    fontFamily: string;
    headingFont: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
  };
  layout: {
    style: 'modern' | 'classic' | 'minimal';
    spacing: 'compact' | 'comfortable' | 'spacious';
    container: 'full' | 'contained' | 'narrow';
  };
  components: {
    header: 'fixed' | 'sticky' | 'static';
    navigation: 'horizontal' | 'vertical' | 'hamburger';
    hero: 'fullscreen' | 'contained' | 'minimal';
    footer: 'simple' | 'detailed' | 'minimal';
  };
}

export const defaultThemes: RestaurantTheme[] = [
  {
    id: 'modern-elegant',
    name: 'Moderne Élégant',
    colors: {
      primary: '#1f2937',
      secondary: '#6b7280',
      accent: '#f59e0b',
      background: '#ffffff',
      text: '#111827',
      muted: '#9ca3af'
    },
    typography: {
      fontFamily: 'Inter, sans-serif',
      headingFont: 'Inter, sans-serif',
      fontSize: { /* ... */ }
    },
    layout: {
      style: 'modern',
      spacing: 'comfortable',
      container: 'contained'
    },
    components: {
      header: 'sticky',
      navigation: 'horizontal',
      hero: 'contained',
      footer: 'detailed'
    }
  },
  {
    id: 'classic-warm',
    name: 'Classique Chaleureux',
    colors: {
      primary: '#92400e',
      secondary: '#a16207',
      accent: '#f97316',
      background: '#fef3c7',
      text: '#451a03',
      muted: '#d97706'
    },
    typography: {
      fontFamily: 'Georgia, serif',
      headingFont: 'Georgia, serif',
      fontSize: { /* ... */ }
    },
    layout: {
      style: 'classic',
      spacing: 'spacious',
      container: 'contained'
    },
    components: {
      header: 'static',
      navigation: 'horizontal',
      hero: 'fullscreen',
      footer: 'detailed'
    }
  },
  {
    id: 'minimal-clean',
    name: 'Minimal Propre',
    colors: {
      primary: '#000000',
      secondary: '#666666',
      accent: '#000000',
      background: '#ffffff',
      text: '#000000',
      muted: '#999999'
    },
    typography: {
      fontFamily: 'Helvetica, Arial, sans-serif',
      headingFont: 'Helvetica, Arial, sans-serif',
      fontSize: { /* ... */ }
    },
    layout: {
      style: 'minimal',
      spacing: 'compact',
      container: 'narrow'
    },
    components: {
      header: 'fixed',
      navigation: 'hamburger',
      hero: 'minimal',
      footer: 'simple'
    }
  }
];

// src/app/[locale]/(public)/_components/theme/ThemeProvider.tsx
"use client";

import { createContext, useContext, ReactNode } from 'react';
import { RestaurantTheme } from '../../_lib/themes';

interface ThemeContextType {
  theme: RestaurantTheme;
  setTheme: (theme: RestaurantTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  initialTheme
}: {
  children: ReactNode;
  initialTheme: RestaurantTheme;
}) {
  const [theme, setTheme] = useState(initialTheme);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div
        className="theme-provider"
        style={{
          '--primary-color': theme.colors.primary,
          '--secondary-color': theme.colors.secondary,
          '--accent-color': theme.colors.accent,
          '--background-color': theme.colors.background,
          '--text-color': theme.colors.text,
          '--muted-color': theme.colors.muted,
          '--font-family': theme.typography.fontFamily,
          '--heading-font': theme.typography.headingFont,
        } as React.CSSProperties}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

**Livrable :** Système de thèmes dynamiques avec 3 thèmes prédéfinis
**Durée estimée :** 3-4 jours

### **2.2 📱 PWA (Progressive Web App)**

**Fichiers à créer :**

- `src/app/[locale]/(public)/_lib/pwa.ts`
- `public/manifest.json`
- `public/sw.js`

**Actions :**

```typescript
// src/app/[locale]/(public)/_lib/pwa.ts
export function generatePWAConfig(establishment: any) {
  return {
    name: establishment.name,
    shortName: establishment.shortName || establishment.name.substring(0, 12),
    description: establishment.description,
    themeColor: establishment.theme?.colors?.primary || '#000000',
    backgroundColor: establishment.theme?.colors?.background || '#ffffff',
    display: 'standalone',
    orientation: 'portrait',
    scope: '/',
    startUrl: '/',
    icons: [
      {
        src: establishment.logo || '/default-logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: establishment.logo || '/default-logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ],
    features: [
      'Cross Platform',
      'fast',
      'simple'
    ],
    categories: ['food', 'lifestyle', 'business'],
    lang: 'fr',
    dir: 'ltr'
  };
}

// public/manifest.json (template)
{
  "name": "{{RESTAURANT_NAME}}",
  "short_name": "{{RESTAURANT_SHORT_NAME}}",
  "description": "{{RESTAURANT_DESCRIPTION}}",
  "theme_color": "{{THEME_COLOR}}",
  "background_color": "{{BACKGROUND_COLOR}}",
  "display": "standalone",
  "orientation": "portrait",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "{{LOGO_URL}}",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "{{LOGO_URL}}",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "features": ["Cross Platform", "fast", "simple"],
  "categories": ["food", "lifestyle", "business"]
}
```

**Livrable :** PWA complète avec installation sur mobile
**Durée estimée :** 2-3 jours

### **2.3 📊 Analytics et Conversion**

**Fichiers à créer :**

- `src/lib/analytics/public-analytics.ts`
- `src/lib/analytics/conversion-tracking.ts`

**Actions :**

```typescript
// src/lib/analytics/public-analytics.ts
export function trackRestaurantView(establishment: any) {
  gtag("event", "restaurant_view", {
    establishment_id: establishment.id,
    establishment_name: establishment.name,
    cuisine_type: establishment.cuisine,
    location: establishment.city,
    timestamp: new Date().toISOString(),
  });
}

export function trackMenuView(establishment: any, menuId: string) {
  gtag("event", "menu_view", {
    establishment_id: establishment.id,
    menu_id: menuId,
    timestamp: new Date().toISOString(),
  });
}

export function trackBookingAttempt(establishment: any, source: string) {
  gtag("event", "booking_attempt", {
    establishment_id: establishment.id,
    source: source,
    timestamp: new Date().toISOString(),
  });
}

export function trackBookingConversion(establishment: any, bookingData: any) {
  gtag("event", "booking_conversion", {
    establishment_id: establishment.id,
    booking_id: bookingData.id,
    value: bookingData.value,
    currency: "EUR",
    timestamp: new Date().toISOString(),
  });
}

// src/lib/analytics/conversion-tracking.ts
export function trackPageView(page: string, establishment: any) {
  gtag("config", "GA_MEASUREMENT_ID", {
    page_title: `${establishment.name} - ${page}`,
    page_location: window.location.href,
    custom_map: {
      custom_dimension1: "establishment_id",
      custom_dimension2: "establishment_name",
    },
  });
}

export function trackUserEngagement(action: string, establishment: any, data?: any) {
  gtag("event", "user_engagement", {
    event_category: "restaurant_public",
    event_label: action,
    establishment_id: establishment.id,
    establishment_name: establishment.name,
    ...data,
  });
}
```

**Livrable :** Système d'analytics complet avec tracking des conversions
**Durée estimée :** 2 jours

---

## 🚀 **PHASE 3 : PERFORMANCE ET OPTIMISATION (Priorité MOYENNE)**

### **3.1 ⚡ Cache Intelligent**

**Fichiers à créer :**

- `src/lib/cache/proxy-cache.ts`
- `src/lib/cache/establishment-cache.ts`

**Actions :**

```typescript
// src/lib/cache/proxy-cache.ts
export async function fetchProxyContentWithCache(targetUrl: string, hostname: string): Promise<Response | null> {
  const cacheKey = `proxy:${hostname}:${targetUrl}`;

  // Vérifier le cache
  const cached = await getCache(cacheKey);
  if (cached) {
    return new Response(cached, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Faire la requête
  const response = await fetchProxyContent(targetUrl);
  if (response) {
    const html = await response.text();

    // Mettre en cache (5 minutes)
    await setCache(cacheKey, html, 300);

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return null;
}

// src/lib/cache/establishment-cache.ts
export async function getEstablishmentWithCache(slug: string): Promise<any> {
  const cacheKey = `establishment:${slug}`;

  // Vérifier le cache
  const cached = await getCache(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Récupérer depuis la base
  const supabase = createClient();
  const { data: establishment, error } = await supabase
    .from("establishments")
    .select("*")
    .eq("slug", slug)
    .eq("deleted", false)
    .single();

  if (error || !establishment) {
    return null;
  }

  // Mettre en cache (1 heure)
  await setCache(cacheKey, JSON.stringify(establishment), 3600);

  return establishment;
}
```

**Livrable :** Système de cache intelligent pour les performances
**Durée estimée :** 2 jours

### **3.2 🖼️ Images Optimisées**

**Fichiers à créer :**

- `src/components/ui/OptimizedImage.tsx`
- `src/lib/optimization/image-optimization.ts`

**Actions :**

```typescript
// src/components/ui/OptimizedImage.tsx
"use client";

import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
  fallback?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  className,
  fallback = "/placeholder.jpg"
}: OptimizedImageProps) {
  const [error, setError] = useState(false);

  return (
    <Image
      src={error ? fallback : src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => setError(true)}
      quality={85}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
    />
  );
}

// src/lib/optimization/image-optimization.ts
export function generateImageUrl(src: string, options: {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
} = {}) {
  const { width, height, quality = 85, format = 'webp' } = options;

  // Si c'est une image externe, utiliser un service d'optimisation
  if (src.startsWith('http') && !src.includes('logones.fr')) {
    return `https://images.weserv.nl/?url=${encodeURIComponent(src)}&w=${width}&h=${height}&q=${quality}&output=${format}`;
  }

  // Si c'est une image locale, utiliser Next.js Image
  return src;
}
```

**Livrable :** Système d'optimisation d'images avancé
**Durée estimée :** 1-2 jours

### **3.3 📊 Métadonnées Dynamiques**

**Fichiers à modifier :**

- `src/app/[locale]/(public)/[slug]/page.tsx`

**Actions :**

```typescript
// src/app/[locale]/(public)/[slug]/page.tsx
import { Metadata } from "next";
import { getEstablishmentWithCache } from "../../_lib/cache/establishment-cache";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const establishment = await getEstablishmentWithCache(slug);

  if (!establishment) {
    return {
      title: "Restaurant non trouvé",
      description: "Le restaurant que vous recherchez n'existe pas.",
    };
  }

  return {
    title: `${establishment.name} - ${establishment.cuisine || "Restaurant"}`,
    description: establishment.description,
    keywords: [establishment.name, establishment.cuisine, establishment.city, "restaurant", "réservation", "menu"]
      .filter(Boolean)
      .join(", "),
    authors: [{ name: establishment.name }],
    openGraph: {
      title: establishment.name,
      description: establishment.description,
      url: `https://${establishment.customDomain || "logones.fr"}/${establishment.slug}`,
      siteName: establishment.name,
      images: [
        {
          url: establishment.coverImage || establishment.logo,
          width: 1200,
          height: 630,
          alt: establishment.name,
        },
      ],
      locale: locale,
      type: "restaurant.restaurant",
    },
    twitter: {
      card: "summary_large_image",
      title: establishment.name,
      description: establishment.description,
      images: [establishment.coverImage || establishment.logo],
    },
    alternates: {
      canonical: `https://${establishment.customDomain || "logones.fr"}/${establishment.slug}`,
      languages: {
        fr: `https://${establishment.customDomain || "logones.fr"}/fr/${establishment.slug}`,
        en: `https://${establishment.customDomain || "logones.fr"}/en/${establishment.slug}`,
        es: `https://${establishment.customDomain || "logones.fr"}/es/${establishment.slug}`,
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    verification: {
      google: "google-site-verification-code",
      yandex: "yandex-verification-code",
      yahoo: "yahoo-verification-code",
    },
  };
}
```

**Livrable :** Métadonnées dynamiques et SEO optimisé
**Durée estimée :** 1 jour

---

## 🎨 **PHASE 4 : FONCTIONNALITÉS AVANCÉES (Priorité BASSE)**

### **4.1 🎯 Système de Réservation Avancé**

**Fichiers à créer :**

- `src/app/[locale]/(public)/[slug]/booking/_components/BookingWidget.tsx`
- `src/app/[locale]/(public)/[slug]/booking/_components/RealTimeAvailability.tsx`

**Actions :**

```typescript
// src/app/[locale]/(public)/[slug]/booking/_components/BookingWidget.tsx
"use client";

interface BookingWidgetProps {
  establishment: any;
  features: {
    realTimeAvailability: boolean;
    groupBooking: boolean;
    specialRequests: boolean;
    prepayment: boolean;
    reminders: boolean;
  };
  analytics: {
    trackViews: boolean;
    trackAttempts: boolean;
    trackConversions: boolean;
  };
}

export function BookingWidget({ establishment, features, analytics }: BookingWidgetProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [guests, setGuests] = useState(2);
  const [specialRequests, setSpecialRequests] = useState('');

  // Tracking des vues
  useEffect(() => {
    if (analytics.trackViews) {
      trackBookingView(establishment);
    }
  }, [establishment, analytics.trackViews]);

  const handleBookingAttempt = () => {
    if (analytics.trackAttempts) {
      trackBookingAttempt(establishment, 'booking_widget');
    }
    // Logique de réservation
  };

  return (
    <div className="booking-widget">
      <h2>Réserver une table</h2>

      {features.realTimeAvailability && (
        <RealTimeAvailability
          establishment={establishment}
          selectedDate={selectedDate}
          onTimeSelect={setSelectedTime}
        />
      )}

      <div className="booking-form">
        <DatePicker
          value={selectedDate}
          onChange={setSelectedDate}
          minDate={new Date()}
        />

        <TimePicker
          value={selectedTime}
          onChange={setSelectedTime}
          availableTimes={availableTimes}
        />

        <GuestSelector
          value={guests}
          onChange={setGuests}
          maxGuests={features.groupBooking ? 20 : 8}
        />

        {features.specialRequests && (
          <SpecialRequests
            value={specialRequests}
            onChange={setSpecialRequests}
          />
        )}

        <Button onClick={handleBookingAttempt}>
          Réserver maintenant
        </Button>
      </div>
    </div>
  );
}
```

**Livrable :** Système de réservation avancé avec fonctionnalités premium
**Durée estimée :** 4-5 jours

### **4.2 📱 PWA avec Fonctionnalités Offline**

**Fichiers à créer :**

- `public/sw.js`
- `src/lib/pwa/offline-cache.ts`

**Actions :**

```javascript
// public/sw.js
const CACHE_NAME = "restaurant-pwa-v1";
const urlsToCache = ["/", "/offline.html", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Retourner la réponse en cache si disponible
      if (response) {
        return response;
      }

      // Sinon, faire la requête réseau
      return fetch(event.request)
        .then((response) => {
          // Vérifier si la réponse est valide
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          // Cloner la réponse
          const responseToCache = response.clone();

          // Mettre en cache
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // En cas d'erreur réseau, retourner la page offline
          if (event.request.destination === "document") {
            return caches.match("/offline.html");
          }
        });
    }),
  );
});

// src/lib/pwa/offline-cache.ts
export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered: ", registration);
        })
        .catch((registrationError) => {
          console.log("SW registration failed: ", registrationError);
        });
    });
  }
}

export function checkForAppUpdate() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // Nouvelle version disponible
      showUpdateNotification();
    });
  }
}
```

**Livrable :** PWA complète avec fonctionnalités offline
**Durée estimée :** 3-4 jours

### **4.3 📊 A/B Testing**

**Fichiers à créer :**

- `src/lib/ab-testing/ab-testing.ts`
- `src/lib/ab-testing/variants.ts`

**Actions :**

```typescript
// src/lib/ab-testing/ab-testing.ts
interface ABTest {
  id: string;
  name: string;
  variants: ABVariant[];
  trafficSplit: number; // Pourcentage de trafic à tester
}

interface ABVariant {
  id: string;
  name: string;
  weight: number; // Poids de la variante (0-100)
  config: any;
}

export function getABTestVariant(testId: string, userId: string): ABVariant {
  const test = getABTest(testId);
  if (!test) return null;

  // Générer un hash basé sur l'utilisateur et le test
  const hash = generateHash(userId + testId);
  const hashValue = hash % 100;

  let cumulativeWeight = 0;
  for (const variant of test.variants) {
    cumulativeWeight += variant.weight;
    if (hashValue < cumulativeWeight) {
      return variant;
    }
  }

  return test.variants[0]; // Fallback
}

export function trackABTestConversion(testId: string, variantId: string, conversion: string) {
  gtag("event", "ab_test_conversion", {
    test_id: testId,
    variant_id: variantId,
    conversion: conversion,
    timestamp: new Date().toISOString(),
  });
}

// src/lib/ab-testing/variants.ts
export const AB_TESTS: ABTest[] = [
  {
    id: "hero_layout",
    name: "Layout de la section hero",
    trafficSplit: 50,
    variants: [
      {
        id: "control",
        name: "Contrôle (actuel)",
        weight: 50,
        config: {
          layout: "contained",
          style: "image",
        },
      },
      {
        id: "variant_a",
        name: "Variant A - Plein écran",
        weight: 25,
        config: {
          layout: "fullscreen",
          style: "video",
        },
      },
      {
        id: "variant_b",
        name: "Variant B - Minimal",
        weight: 25,
        config: {
          layout: "minimal",
          style: "text",
        },
      },
    ],
  },
  {
    id: "cta_button",
    name: "Bouton d'appel à l'action",
    trafficSplit: 30,
    variants: [
      {
        id: "control",
        name: 'Contrôle - "Réserver"',
        weight: 50,
        config: {
          text: "Réserver",
          color: "primary",
          size: "lg",
        },
      },
      {
        id: "variant_a",
        name: 'Variant A - "Réserver maintenant"',
        weight: 25,
        config: {
          text: "Réserver maintenant",
          color: "accent",
          size: "lg",
        },
      },
      {
        id: "variant_b",
        name: 'Variant B - "Voir les disponibilités"',
        weight: 25,
        config: {
          text: "Voir les disponibilités",
          color: "secondary",
          size: "lg",
        },
      },
    ],
  },
];
```

**Livrable :** Système d'A/B testing complet
**Durée estimée :** 3-4 jours

---

## 📅 **PLANNING D'EXÉCUTION**

### **SEMAINE 1 : Corrections Critiques**

- **Jour 1-2** : Correction du système de proxy
- **Jour 3** : Standardisation des états de chargement
- **Jour 4** : Validation renforcée
- **Jour 5** : Tests et validation

### **SEMAINE 2 : Architecture Modulaire**

- **Jour 1-3** : Système de thèmes dynamiques
- **Jour 4-5** : PWA de base

### **SEMAINE 3 : Performance et Analytics**

- **Jour 1-2** : Cache intelligent
- **Jour 3** : Images optimisées
- **Jour 4** : Métadonnées dynamiques
- **Jour 5** : Analytics et conversion

### **SEMAINE 4 : Fonctionnalités Avancées**

- **Jour 1-3** : Système de réservation avancé
- **Jour 4-5** : PWA avec fonctionnalités offline

### **SEMAINE 5 : Optimisation et Tests**

- **Jour 1-2** : A/B testing
- **Jour 3-4** : Tests complets
- **Jour 5** : Déploiement et monitoring

---

## 🎯 **RÉSULTATS ATTENDUS**

### **📈 Métriques de Performance**

- **Temps de chargement** : < 2 secondes
- **Score Lighthouse** : > 90
- **Core Web Vitals** : Tous verts
- **Conversion** : +25% de réservations

### **🎨 Expérience Utilisateur**

- **Design personnalisé** : 3 thèmes prédéfinis + personnalisation
- **PWA** : Installation sur mobile
- **Responsive** : Parfait sur tous les appareils
- **Accessibilité** : Standards WCAG AA

### **📊 Business Impact**

- **SEO** : Meilleur référencement
- **Conversion** : Plus de réservations
- **Engagement** : Temps passé augmenté
- **Satisfaction** : NPS amélioré

---

## 🚀 **CONCLUSION**

Ce plan d'amélioration transforme le système de site public en une **plateforme de conversion sophistiquée** qui :

1. **Corrige les problèmes critiques** (proxy, validation, cache)
2. **Ajoute des fonctionnalités avancées** (thèmes, PWA, analytics)
3. **Optimise les performances** (cache, images, SEO)
4. **Maximise les conversions** (A/B testing, tracking)

**Résultat final :** Une plateforme **professionnelle, performante et rentable** qui positionne l'application comme un **outil business** plutôt qu'un simple site vitrine ! 🎯

---

**Document créé le :** $(date)
**Version :** 1.0
**Statut :** Plan d'exécution complet
**Priorité :** HAUTE pour les corrections critiques

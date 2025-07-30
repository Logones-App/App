# 📋 PLAN COMPLET : SOLUTION ZUSTAND POUR BOOKING SUCCESS

## 🎯 OBJECTIF

Résoudre le problème de redirection vers `/success` sur les domaines personnalisés en utilisant Zustand au lieu des paramètres d'URL, en respectant les patterns documentés.

## 🌐 CONTEXTE DU MIDDLEWARE ET DOMAINES

### **Problème Identifié :**

Le middleware gère différemment les URLs selon le type de domaine :

**Domaine Principal (`logones.fr`) :**

- URL avec slug : `/fr/la-plank-des-gones/booking/success`
- Pas de transformation par le middleware

**Domaine Personnalisé (`logones.com`) :**

- URL sans slug : `/fr/booking/success`
- Le middleware ajoute automatiquement le slug : `/fr/la-plank-des-gones/booking/success`
- **Problème :** Si on utilise l'URL avec slug sur un domaine personnalisé, le middleware va nettoyer et créer une boucle de redirection

### **Solution :**

Détecter le type de domaine et utiliser l'URL appropriée :

- **Domaine personnalisé** → URL sans slug (le middleware ajoute le slug)
- **Domaine principal** → URL avec slug (pas de transformation)

## 📝 MODIFICATIONS À EFFECTUER

### **1. CRÉER LE STORE ZUSTAND**

**Fichier :** `src/lib/stores/booking-confirmation-store.ts`

```typescript
import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface BookingData {
  id: string;
  establishment_id: string;
  date: string;
  time: string;
  service_name: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  number_of_guests: number;
  special_requests?: string;
  status: string;
  created_at: string;
  establishment: {
    id: string;
    name: string;
    slug: string;
    address: string;
    phone: string;
    email: string;
    description: string;
    image_url: string;
  };
}

interface BookingConfirmationState {
  confirmationData: BookingData | null;
  timestamp: number | null;
  setConfirmationData: (data: BookingData) => void;
  clearConfirmationData: () => void;
  isExpired: () => boolean;
  getConfirmationData: () => BookingData | null;
}

export const useBookingConfirmationStore = create<BookingConfirmationState>()(
  devtools(
    (set, get) => ({
      confirmationData: null,
      timestamp: null,

      setConfirmationData: (data: BookingData) =>
        set({
          confirmationData: data,
          timestamp: Date.now(),
        }),

      clearConfirmationData: () =>
        set({
          confirmationData: null,
          timestamp: null,
        }),

      isExpired: () => {
        const { timestamp } = get();
        return timestamp ? Date.now() - timestamp > 5 * 60 * 1000 : true; // 5 minutes
      },

      getConfirmationData: () => {
        const { confirmationData, timestamp } = get();
        if (!confirmationData || !timestamp) return null;

        // Vérifier l'expiration
        if (Date.now() - timestamp > 5 * 60 * 1000) {
          get().clearConfirmationData();
          return null;
        }

        return confirmationData;
      },
    }),
    {
      name: "booking-confirmation-store",
    },
  ),
);
```

### **2. MODIFIER L'API ROUTE `/api/booking/create`**

**Fichier :** `src/app/api/booking/create/route.ts`

**Changements :**

- ✅ **Ajouter les données complètes de la réservation dans la réponse**
- ✅ **Inclure les informations de l'établissement**
- ✅ **Retourner un objet `bookingData` complet**

```typescript
// Ligne ~150 : Modifier le return
return NextResponse.json(
  {
    success: true,
    message: "Réservation créée avec succès",
    bookingId: booking.id,
    confirmationToken,
    bookingData: {
      id: booking.id,
      establishment_id: booking.establishment_id,
      date: booking.date,
      time: booking.time,
      service_name: booking.service_name,
      customer_first_name: booking.customer_first_name,
      customer_last_name: booking.customer_last_name,
      customer_email: booking.customer_email,
      customer_phone: booking.customer_phone,
      number_of_guests: booking.number_of_guests,
      special_requests: booking.special_requests,
      status: booking.status,
      created_at: booking.created_at,
      establishment: {
        id: establishment.id,
        name: establishment.name,
        slug: establishment.slug,
        address: establishment.address,
        phone: establishment.phone,
        email: establishment.email,
        description: establishment.description,
        image_url: establishment.image_url,
      },
    },
  },
  { status: 201 },
);
```

### **3. MODIFIER LA FONCTION `createBooking`**

**Fichier :** `src/app/[locale]/(root)/(public)/[slug]/booking/_components/database-utils.ts`

**Changements :**

- ✅ **Modifier le type de retour pour inclure `bookingData`**
- ✅ **Transmettre les données complètes depuis l'API**

```typescript
// Ligne ~140 : Modifier l'interface de retour
): Promise<{
  success: boolean;
  bookingId?: string;
  confirmationToken?: string;
  bookingData?: any; // Ajouter cette ligne
  error?: string
}> {

// Ligne ~180 : Modifier le return
return {
  success: true,
  bookingId: data.booking.id,
  confirmationToken: data.confirmationToken,
  bookingData: data.bookingData, // Ajouter cette ligne
};
```

### **4. MODIFIER LA PAGE CONFIRM**

**Fichier :** `src/app/[locale]/(root)/(public)/[slug]/booking/confirm/[date]/[time]/page.tsx`

**Changements :**

- ✅ **Utiliser Zustand au lieu de SessionStorage**
- ✅ **Rediriger sans paramètres d'URL**
- ✅ **Respecter le pattern `router.push()` documenté**

```typescript
// Ligne ~10 : Ajouter l'import Zustand
import { useBookingConfirmationStore } from "@/lib/stores/booking-confirmation-store";

// Ligne ~150 : Modifier handleSubmit
if (result.success && result.bookingId && result.confirmationToken && result.bookingData) {
  // Stocker dans Zustand
  useBookingConfirmationStore.getState().setConfirmationData(result.bookingData);

  // Détecter le type de domaine pour éviter les problèmes de middleware
  const isCustomDomain = window.location.hostname !== "logones.fr";

  if (isCustomDomain) {
    // Domaine personnalisé : URL sans slug (le middleware ajoute le slug)
    router.push(`/fr/booking/success`);
  } else {
    // Domaine principal : URL avec slug
    router.push(`/fr/${establishment.slug}/booking/success`);
  }
} else {
  setError(result.error ?? t("error.generic"));
}
```

### **5. MODIFIER LA PAGE SUCCESS**

**Fichier :** `src/app/[locale]/(root)/(public)/[slug]/booking/success/page.tsx`

**Changements :**

- ✅ **Utiliser Zustand au lieu de SessionStorage**
- ✅ **Lire depuis le store avec vérification d'expiration**
- ✅ **Nettoyer le store après utilisation**

```typescript
// Ligne ~10 : Ajouter l'import Zustand
import { useBookingConfirmationStore } from "@/lib/stores/booking-confirmation-store";

// Ligne ~60 : Remplacer loadData
async function loadData() {
  try {
    const resolvedParams = await params;
    const establishmentSlug =
      resolvedParams.slug ?? resolvedParams["establishment-slug"] ?? resolvedParams.establishmentSlug;

    if (!establishmentSlug) {
      console.error("❌ Slug manquant");
      return;
    }

    // Récupérer depuis Zustand
    const bookingData = useBookingConfirmationStore.getState().getConfirmationData();

    if (!bookingData) {
      console.log("❌ Pas de données de confirmation, redirection");
      router.push(`/${establishmentSlug}/booking`);
      return;
    }

    // Récupérer l'établissement
    const establishmentData = await getEstablishmentBySlug(establishmentSlug);

    setEstablishment(establishmentData);
    setBooking(bookingData);

    // Nettoyer le store après utilisation
    useBookingConfirmationStore.getState().clearConfirmationData();
  } catch (error) {
    console.error("❌ Erreur lors du chargement:", error);
  } finally {
    setLoading(false);
  }
}
```

### **6. SUPPRIMER LES FONCTIONS OBSOLÈTES**

**Fichier :** `src/app/[locale]/(root)/(public)/[slug]/booking/_components/database-utils.ts`

**Changements :**

- ❌ **Supprimer `getBookingWithToken`** (plus nécessaire)
- ❌ **Supprimer les imports liés**

```typescript
// Supprimer cette fonction complètement
// export async function getBookingWithToken(bookingId: string, confirmationToken: string): Promise<Booking | null> {
//   ...
// }
```

### **7. SUPPRIMER LES SCRIPTS RLS OBSOLÈTES**

**Fichiers à supprimer :**

- ❌ `scripts/bookings-secure-update.sql`
- ❌ `scripts/bookings-insert-policy-fix.sql`
- ❌ `scripts/bookings-anon-insert-fix.sql`
- ❌ `scripts/bookings-public-insert.sql`

**Raison :** Plus besoin de RLS complexe pour la page success

### **8. ✅ RLS DÉJÀ CONFIGURÉ**

**Résultat de la vérification :**

- ✅ **`bookings_insert_anon`** existe déjà → Permet les INSERT publics
- ✅ **`bookings_select_public`** existe déjà → Permet la lecture avec tokens
- ✅ **Policies admin** existent déjà → Fonctionnent pour le dashboard

**Aucune modification RLS nécessaire !** Les policies sont déjà correctement configurées.

### **9. METTRE À JOUR LA DOCUMENTATION**

**Fichier :** `Documentation/GUIDES-TECHNIQUES/BOOKING-SECURITY-SYSTEM.md`

**Changements :**

- ✅ **Ajouter une section "Zustand"**
- ✅ **Expliquer pourquoi on a abandonné les tokens**
- ✅ **Documenter le nouveau flow**

````markdown
## 🔄 NOUVELLE APPROCHE : ZUSTAND

### **Pourquoi Zustand ?**

- ✅ **Cohérence avec le projet** → Déjà utilisé (auth-store, realtime-store)
- ✅ **Persistance automatique** → Avec devtools middleware
- ✅ **Type safety** → TypeScript intégré
- ✅ **Pattern familier** → Équipe déjà formée
- ✅ **Performance** → Pas de re-renders inutiles
- ✅ **Debugging** → Redux DevTools intégré

### **Flow Simplifié**

1. **Création** → API retourne toutes les données
2. **Stockage** → Zustand avec timestamp
3. **Affichage** → Lecture directe depuis Zustand
4. **Nettoyage** → Suppression automatique après utilisation

### **Pattern Zustand**

```typescript
// Stockage avec expiration
useBookingConfirmationStore.getState().setConfirmationData(result.bookingData);

// Lecture avec vérification d'expiration
const bookingData = useBookingConfirmationStore.getState().getConfirmationData();
if (bookingData) {
  setBooking(bookingData);
  useBookingConfirmationStore.getState().clearConfirmationData();
}
```
````

````

**Créer un nouveau fichier :** `Documentation/GUIDES-TECHNIQUES/ZUSTAND-PATTERN.md`

```markdown
# 🗂️ Pattern Zustand pour Données Temporaires

## 🎯 Objectif

Gérer les données temporaires entre pages sans utiliser les paramètres d'URL, particulièrement utile pour les domaines personnalisés avec middleware.

## 📋 Cas d'Usage

- ✅ **Pages de confirmation** (booking success)
- ✅ **Données sensibles** (tokens, informations personnelles)
- ✅ **Navigation complexe** (domaines personnalisés)
- ✅ **Performance** (éviter les requêtes base)

## 🔧 Implémentation

### **1. Création du Store**

```typescript
import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface State {
  data: any;
  timestamp: number | null;
  setData: (data: any) => void;
  clearData: () => void;
  isExpired: () => boolean;
  getData: () => any;
}

export const useStore = create<State>()(
  devtools(
    (set, get) => ({
      data: null,
      timestamp: null,

      setData: (data: any) => set({
        data,
        timestamp: Date.now(),
      }),

      clearData: () => set({
        data: null,
        timestamp: null,
      }),

      isExpired: () => {
        const { timestamp } = get();
        return timestamp ? (Date.now() - timestamp > 5 * 60 * 1000) : true;
      },

      getData: () => {
        const { data, timestamp } = get();
        if (!data || !timestamp) return null;

        if (Date.now() - timestamp > 5 * 60 * 1000) {
          get().clearData();
          return null;
        }

        return data;
      },
    }),
    {
      name: "store-name",
    },
  ),
);
````

### **2. Utilisation**

```typescript
// Stockage
useStore.getState().setData(result.data);

// Lecture
const data = useStore.getState().getData();
if (data) {
  // Utiliser les données
  setData(data);
  useStore.getState().clearData();
}
```

## ✅ Avantages

- ✅ **Persistance au refresh** → Avec devtools
- ✅ **Type safety** → TypeScript intégré
- ✅ **Pattern familier** → Cohérence avec le projet
- ✅ **Debugging** → Redux DevTools
- ✅ **Performance** → Pas de re-renders inutiles
- ✅ **Expiration automatique** → Gestion temporelle

```

## 🗑️ FICHIERS À SUPPRIMER

### **Scripts SQL obsolètes :**
- ❌ `scripts/bookings-secure-update.sql`
- ❌ `scripts/bookings-insert-policy-fix.sql`
- ❌ `scripts/bookings-anon-insert-fix.sql`
- ❌ `scripts/bookings-public-insert.sql`

### **Fonctions obsolètes :**
- ❌ `getBookingWithToken` dans `database-utils.ts`

## ✅ AVANTAGES DE CETTE SOLUTION

1. **Cohérence avec le projet** → Zustand déjà utilisé
2. **Persistance automatique** → Avec devtools middleware
3. **Type safety** → TypeScript intégré
4. **Pattern familier** → Équipe déjà formée
5. **Performance** → Pas de re-renders inutiles
6. **Debugging** → Redux DevTools intégré
7. **Gère les domaines** → Détection automatique du type de domaine
8. **Évite les boucles** → URLs appropriées selon le contexte
9. **Respecte la documentation** → Patterns documentés

## 🚀 ORDRE D'EXÉCUTION

1. **Créer le store Zustand** (`booking-confirmation-store.ts`)
2. **Modifier l'API route** (`/api/booking/create`)
3. **Modifier `createBooking`** (`database-utils.ts`)
4. **Modifier la page confirm**
5. **Modifier la page success**
6. **Supprimer `getBookingWithToken`**
7. **Supprimer les scripts obsolètes**
8. **Mettre à jour la documentation**
9. **Tester sur domaine principal et personnalisé**

## 🧪 TESTS À EFFECTUER

1. **Création de réservation** sur domaine principal
2. **Création de réservation** sur domaine personnalisé
3. **Redirection vers success** sur les deux domaines
4. **Affichage des données** sans requête base
5. **Expiration** après 5 minutes
6. **Nettoyage** du store Zustand
7. **Persistance** au refresh (avec devtools)
8. **Debugging** avec Redux DevTools
```

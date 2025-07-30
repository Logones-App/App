# 🎯 PLAN D'IMPLÉMENTATION - SYSTÈME ZUSTAND POUR BOOKING SUCCESS

## 📋 OBJECTIF

Résoudre le problème de redirection vers la page success sur les domaines personnalisés en utilisant Zustand pour stocker temporairement les données de réservation, évitant ainsi les problèmes de middleware avec les paramètres d'URL.

---

## 🏗️ ARCHITECTURE PROPOSÉE

### **1. Store Zustand pour Booking Confirmation**

```typescript
// src/lib/stores/booking-confirmation-store.ts
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

### **2. Flux de Données**

```
1. Création de réservation → API retourne données complètes
2. Stockage dans Zustand → Données temporaires (5 min)
3. Redirection sans paramètres → Évite problèmes middleware
4. Lecture depuis Zustand → Affichage de confirmation
5. Nettoyage automatique → Après utilisation
```

---

## 🔧 IMPLÉMENTATION TECHNIQUE

### **Étape 1 : Créer le Store Zustand**

**Fichier :** `src/lib/stores/booking-confirmation-store.ts`

**Action :** Créer le fichier avec le code Zustand ci-dessus

**Avantages :**

- ✅ Persistance au refresh (devtools middleware)
- ✅ Expiration automatique (5 minutes)
- ✅ Type safety (TypeScript)
- ✅ Pattern familier (cohérence projet)

### **Étape 2 : Modifier l'API Route**

**Fichier :** `src/app/api/booking/create/route.ts`

**Modifications :**

```typescript
// Ligne ~150 : Modifier le return
return NextResponse.json(
  {
    success: true,
    message: "Réservation créée avec succès",
    bookingId: booking.id,
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

### **Étape 3 : Modifier la Fonction createBooking**

**Fichier :** `src/app/[locale]/(root)/(public)/[slug]/booking/_components/database-utils.ts`

**Modifications :**

```typescript
// Ligne ~140 : Modifier l'interface de retour
): Promise<{
  success: boolean;
  bookingId?: string;
  bookingData?: any; // Ajouter cette ligne
  error?: string
}> {

// Ligne ~180 : Modifier le return
return {
  success: true,
  bookingId: data.booking.id,
  bookingData: data.bookingData, // Ajouter cette ligne
};
```

### **Étape 4 : Modifier la Page de Confirmation**

**Fichier :** `src/app/[locale]/(root)/(public)/[slug]/booking/confirm/[date]/[time]/page.tsx`

**Modifications :**

```typescript
// Ligne ~10 : Ajouter l'import Zustand
import { useBookingConfirmationStore } from "@/lib/stores/booking-confirmation-store";

// Ligne ~150 : Modifier handleSubmit
if (result.success && result.bookingData) {
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

### **Étape 5 : Modifier la Page Success**

**Fichier :** `src/app/[locale]/(root)/(public)/[slug]/booking/success/page.tsx`

**Modifications :**

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

### **Étape 6 : Supprimer les Éléments Obsolètes**

**Actions :**

1. **Supprimer la fonction getBookingWithToken** de `database-utils.ts`
2. **Supprimer les scripts RLS obsolètes** :
   - `scripts/bookings-secure-update.sql`
   - `scripts/bookings-insert-policy-fix.sql`
   - `scripts/bookings-anon-insert-fix.sql`
   - `scripts/bookings-public-insert.sql`

### **Étape 7 : Supprimer la Policy SELECT Publique**

**Fichier :** `scripts/remove-bookings-select-public.sql`

**Contenu :**

```sql
-- Supprimer la policy SELECT publique (plus nécessaire avec Zustand)
DROP POLICY IF EXISTS "bookings_select_public" ON bookings;

-- Vérifier le résultat
SELECT
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'bookings'
ORDER BY policyname;
```

---

## 📚 DOCUMENTATION

### **Étape 8 : Créer la Documentation Zustand Pattern**

**Fichier :** `Documentation/GUIDES-TECHNIQUES/ZUSTAND-PATTERN.md`

**Contenu :**

````markdown
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

      setData: (data: any) =>
        set({
          data,
          timestamp: Date.now(),
        }),

      clearData: () =>
        set({
          data: null,
          timestamp: null,
        }),

      isExpired: () => {
        const { timestamp } = get();
        return timestamp ? Date.now() - timestamp > 5 * 60 * 1000 : true;
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
```
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

````

### **Étape 9 : Mettre à Jour la Documentation Booking Security**

**Fichier :** `Documentation/GUIDES-TECHNIQUES/BOOKING-SECURITY-SYSTEM.md`

**Action :** ✅ **DÉJÀ FAIT** - La documentation a été mise à jour avec le nouveau système Zustand

---

## 🛡️ SÉCURITÉ ET AVANTAGES

### **✅ Avantages de l'Approche Zustand**

1. **Sécurité Renforcée**
   - ❌ Pas d'accès public aux données via API
   - ✅ Données temporaires en mémoire seulement
   - ✅ Expiration automatique (5 minutes)

2. **Performance Améliorée**
   - ❌ Plus de requêtes base pour l'affichage
   - ✅ Données en mémoire locale
   - ✅ Navigation plus rapide

3. **Simplicité**
   - ❌ Plus de gestion de tokens
   - ✅ Pattern Zustand familier
   - ✅ Moins de code à maintenir

4. **Cohérence**
   - ✅ Utilise le même pattern que le reste de l'app
   - ✅ Respecte les patterns de navigation
   - ✅ Intégration avec devtools

### **🔒 Politique RLS Simplifiée**

```sql
-- Seulement la policy INSERT publique (déjà existante)
CREATE POLICY "bookings_insert_anon" ON "public"."bookings"
FOR INSERT TO anon
WITH CHECK (true);

-- Pas de policy SELECT publique (sécurité maximale)
-- Les admins utilisent les policies existantes pour authenticated
````

---

## 🧪 TESTS ET VALIDATION

### **Tests à Effectuer**

1. **Test sur Domaine Principal**

   - ✅ Création de réservation
   - ✅ Redirection vers success
   - ✅ Affichage des données
   - ✅ Nettoyage automatique

2. **Test sur Domaine Personnalisé**

   - ✅ Création de réservation
   - ✅ Redirection sans problèmes middleware
   - ✅ Affichage des données
   - ✅ Nettoyage automatique

3. **Test d'Expiration**

   - ✅ Attendre 5 minutes
   - ✅ Vérifier redirection automatique
   - ✅ Vérifier nettoyage du store

4. **Test de Refresh**
   - ✅ Refresh de la page success
   - ✅ Vérifier persistance des données
   - ✅ Vérifier expiration correcte

---

## 📋 CHECKLIST D'IMPLÉMENTATION

### **Phase 1 : Store et API**

- [ ] Créer `booking-confirmation-store.ts`
- [ ] Modifier API route `/api/booking/create`
- [ ] Modifier fonction `createBooking`
- [ ] Tester création de réservation

### **Phase 2 : Pages**

- [ ] Modifier page confirmation
- [ ] Modifier page success
- [ ] Tester navigation complète

### **Phase 3 : Nettoyage**

- [ ] Supprimer `getBookingWithToken`
- [ ] Supprimer scripts RLS obsolètes
- [ ] Supprimer policy SELECT publique
- [ ] Vérifier RLS final

### **Phase 4 : Documentation**

- [ ] Créer `ZUSTAND-PATTERN.md`
- [ ] Vérifier `BOOKING-SECURITY-SYSTEM.md`
- [ ] Tester sur tous les domaines

---

## 🎯 RÉSULTAT ATTENDU

**Problème Résolu :**

- ✅ Redirection vers success fonctionne sur tous les domaines
- ✅ Pas de problèmes de middleware
- ✅ Navigation fluide sans paramètres d'URL
- ✅ Sécurité renforcée sans accès public aux données
- ✅ Performance améliorée (pas de requêtes base)
- ✅ Code plus simple et maintenable

**Pattern Établi :**

- ✅ Zustand pour données temporaires
- ✅ Expiration automatique
- ✅ Navigation sécurisée
- ✅ Documentation complète

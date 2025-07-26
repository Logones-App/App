# 🚀 Message de Démarrage - Nouvelles Conversations

## 📋 **Message à copier-coller au début de chaque nouvelle conversation :**

````
Bonjour ! Nous travaillons sur un projet SaaS multi-tenant pour la gestion de restaurants.

**🏗️ Stack technique :**
- Next.js 15.3.4 + App Router
- Supabase v2 (Auth, Database, Realtime)
- Zustand (state management)
- TanStack Query v5 (gcTime au lieu de cacheTime)
- next-intl (i18n: fr, en, es)
- Tailwind CSS + shadcn/ui
- React Native (app mobile caisse)

**🎯 Architecture multi-tenant :**
- **Rôles** : system_admin, org_admin, visitor
- **URLs** : /fr/dashboard/* (org_admin), /fr/admin/* (system_admin), /fr/[slug]/* (visitor)
- **Sécurité** : RLS (Row Level Security) + métadonnées Supabase
- **Types** : UNIQUEMENT `Tables<"table_name">` de database.types.ts

**🚨 RÈGLES CRITIQUES :**
1. **AVANT de créer** : Vérifie TOUJOURS la documentation existante
2. **Types Supabase** : Utilise UNIQUEMENT `Tables<"table_name">`
3. **Structure** : Vérifie `database.types.ts` pour la vraie structure
4. **Conventions** : Suis les patterns déjà établis
5. **Soft Delete** : Ajoute `deleted = false` aux requêtes
6. **Multi-tenant** : Filtre par `organization_id` selon le rôle
7. **TanStack Query v5** : Utilise `gcTime` (pas `cacheTime`)

**🔐 MIDDLEWARE D'AUTHENTIFICATION (CRITIQUE) :**

**Logique de redirection et d'accès :**

```typescript
// 1. Routes techniques → Passer directement
// 2. Locale manquante → Rediriger vers /fr/...
// 3. Routes publiques (auth) → Passer directement
// 4. Routes restaurants publics → Passer directement
// 5. Routes protégées → Vérifier auth + rôles
```

**Types de routes :**

- **Routes techniques** : `/api`, `/_next`, `/favicon.ico` → ✅ Accès direct
- **Routes publiques** : `/auth/login`, `/auth/register` → ✅ Accès direct
- **Routes restaurants** : `/fr/[slug]`, `/fr/[slug]/menu` → ✅ Accès direct
- **Routes protégées** : `/fr/dashboard/*`, `/fr/admin/*` → 🔒 Auth + rôle requis

**Logique par rôle :**

- **Déconnecté** : Accès aux sites publics + auth pages, redirection vers `/fr/auth/login` pour les routes protégées
- **Org Admin** : Accès à `/fr/dashboard/*`, redirection vers `/fr/dashboard` si accès à `/fr/admin/*`
- **System Admin** : Accès à `/fr/admin/*`, redirection vers `/fr/admin` si accès à `/fr/dashboard/*`

**API d'authentification :**
- **Endpoint** : `/api/auth/roles` (GET avec cookies)
- **Réponse** : `{ role: "system_admin" | "org_admin" | null }`
- **Gestion d'erreur** : Redirection vers `/fr/auth/login` si échec

**🏗️ Architecture Realtime MODULAIRE (CRITIQUE) :**
- **Architecture MODULAIRE par domaines** (pas générique)
- **Modules spécialisés** : organizations-realtime.ts, users-realtime.ts, etc.
- **Chaque module** a sa propre classe avec méthodes spécialisées
- **PAS d'utilisation directe** de useTableSubscription
- **Pattern OBLIGATOIRE** : Module class → Hook spécialisé → Composant

**📋 Développement Realtime :**
1. **Créer module** dans `src/lib/services/realtime/modules/[domain]-realtime.ts`
2. **Créer hook** dans `src/hooks/use-[domain]-realtime.ts`
3. **Ajouter export** dans `modules/index.ts`
4. **Utiliser le hook** dans le composant
5. **PAS de logique Realtime** directe dans les composants

**🔧 Conventions Realtime :**
- **Types** : `Database["public"]["Tables"]["table_name"]["Row"]`
- **Événements** : Types typés spécifiquement par domaine
- **Notifications** : Toast automatiques dans le module
- **Cache** : Invalidation via queryClient dans le module
- **Pattern de référence** : `organizations-realtime.ts`

**❌ NE JAMAIS FAIRE (Realtime) :**
- Utiliser `useTableSubscription` directement
- Créer des composants de test Realtime
- Mettre la logique Realtime dans les composants
- Ignorer l'architecture modulaire existante
- Créer des scripts SQL complexes pour le Realtime

**🏗️ PATTERN ROBUSTE REALTIME (NOUVEAU) :**

**Architecture unifiée "Module + Cache Invalidation" :**

**Principe fondamental :** Un seul point de responsabilité pour les toasts (soit le module, soit le composant, mais jamais les deux).

**Pattern standardisé :**
```typescript
// 1. Module : Responsable des toasts + logique métier
class XxxRealtime {
  private handleXxxEvent(event) {
    // ✅ Toasts ici
    toast.success("Événement traité");
  }
}

// 2. Hook : Responsable de l'invalidation du cache
const useXxxRealtime = () => {
  const subscribeToXxx = (params) => {
    return xxxRealtime.subscribeToXxx(params, (event) => {
      // ✅ Seulement invalidation du cache
      queryClient.invalidateQueries({ queryKey: [...] });
      // ❌ PAS de toasts ici
    });
  };
};

// 3. Composant : Responsable de l'UI + pas de toasts
const XxxComponent = () => {
  useEffect(() => {
    const unsubscribe = subscribeToXxx(params);
    return unsubscribe;
  }, []);
};
````

**Avantages de cette architecture :**

- ✅ **Cohérence** : Tous les modules suivent le même pattern
- ✅ **Performance** : Une seule source de vérité pour les notifications
- ✅ **Maintenabilité** : Logique métier centralisée dans les modules
- ✅ **Évolutivité** : Ajout facile de nouveaux modules

**Règles à appliquer :**

**Dans les Modules (`xxx-realtime.ts`) :**

```typescript
// ✅ CORRECT
private handleXxxEvent(event) {
  toast.success("Événement traité");
  // Logique métier spécifique
}

// ❌ INCORRECT
private handleXxxEvent(event) {
  // Pas de toasts ici si le hook en gère
}
```

**Dans les Hooks (`use-xxx-realtime.ts`) :**

```typescript
// ✅ CORRECT
const subscribeToXxx = (params) => {
  return xxxRealtime.subscribeToXxx(params, (event) => {
    queryClient.invalidateQueries({ queryKey: [...] });
    // Pas de toasts ici
  });
};

// ❌ INCORRECT
const subscribeToXxx = (params) => {
  return xxxRealtime.subscribeToXxx(params, (event) => {
    toast.success("Événement"); // Double toast !
  });
};
```

**Dans les Composants :**

```typescript
// ✅ CORRECT
useEffect(() => {
  const unsubscribe = subscribeToXxx(params);
  return unsubscribe;
}, []);

// ❌ INCORRECT
useEffect(() => {
  const unsubscribe = subscribeToXxx(params, (event) => {
    toast.success("Événement"); // Triple toast !
  });
  return unsubscribe;
}, []);
```

**Modules déjà standardisés :**

- ✅ **Bookings** : Pattern "Module + Cache Invalidation"
- ✅ **Organizations** : Pattern "Module + Cache Invalidation"
- ✅ **Users** : Pattern "Module + Cache Invalidation"
- ✅ **Products** : Pattern "Module + Cache Invalidation" (sans toasts dans module)

**Modules à éviter :**

- ❌ **useTableSubscription** : Utilise le système global
- ❌ **Composants avec toasts** : Duplication de responsabilités
- ❌ **Hooks avec toasts** : Double notifications

**📄 STANDARDS DE PAGES OBLIGATOIRES :**

**Structure de fichiers :**

- **Page server** : `src/app/[locale]/(dashboard)/[section]/[id]/page.tsx` (export default)
- **Client wrapper** : `src/app/[locale]/(dashboard)/[section]/[id]/[name]-client.tsx` (useParams + hooks)
- **Shared component** : `src/app/[locale]/(dashboard)/_components/[section]/[name]-shared.tsx` (logique métier)
- **Types** : `Tables<"table_name">` uniquement

**Composants UI standardisés :**

- **Header** : Titre + Description + Actions (droite) + Breadcrumb
- **Search** : Input avec icône Search + debounce + placeholder
- **Table** : shadcn/ui Table avec pagination + sorting + responsive
- **Actions** : DropdownMenu (View/Edit/Delete) + Confirmation dialog
- **Status** : Badge coloré (green/yellow/red/blue) selon le statut
- **Loading** : Skeleton ou spinner pendant les requêtes
- **Empty** : Illustration + message d'aide + bouton d'action
- **Error** : Message clair + bouton retry + fallback

**Patterns de code OBLIGATOIRES :**

- **Hooks** : `use[Domain]Query`, `use[Domain]Mutation` avec TanStack Query
- **Error handling** : try/catch + toast.error() + error boundaries
- **Loading states** : isLoading, isError, isSuccess + Skeleton
- **Pagination** : page/size + TanStack Query + URL params
- **Search** : useMemo + debounced + URL params
- **Actions** : Confirmation dialog pour delete + optimistic updates
- **Validation** : Zod schemas + form validation

**UX/UI standards :**

- **Responsive** : Mobile-first design + breakpoints Tailwind
- **Accessibility** : ARIA labels + keyboard navigation + focus management
- **Feedback** : Toast notifications pour toutes les actions
- **Confirmation** : Dialog pour actions destructives
- **Loading** : Skeleton pendant le chargement
- **Empty states** : Illustration + message d'aide + CTA
- **Error states** : Message clair + bouton retry + fallback UI

**Structure de données standardisée :**

- **Query** : Filtrage par organization_id + deleted = false
- **Ordering** : created_at DESC par défaut + sorting configurable
- **Pagination** : 20 items par page + infinite scroll option
- **Search** : Sur les champs textuels principaux + highlight
- **Filters** : Status, date range, category + URL sync
- **Actions** : CRUD complet + validation + optimistic updates

**📚 Documentation OBLIGATOIRE :**

- `CONTEXT-SUMMARY.md` - Vue d'ensemble complète
- `complete-page-structure.md` - Structure des URLs et pages
- `RECAP-TABLES-VUES.md` - Tables et vues existantes
- `a-garder/COLLABORATION_GUIDELINES.md` - Règles de développement
- `ARCHITECTURE-IMPLEMENTATION-CONSIGNES.md` - Architecture des rôles
- `REALTIME-SYSTEM.md` - Système temps réel
- `REALTIME-MODULAR-ARCHITECTURE.md` - Architecture modulaire Realtime
- `FULLCALENDAR-IMPLEMENTATION-GUIDE.md` - Gestion des calendriers

**🏪 Structure existante :**

- **Pages bookings** : `/dashboard/establishments/[id]/bookings/` (org_admin)
- **Pages admin** : `/admin/organizations/[id]/establishments/[establishmentId]/bookings/`
- **Composants** : `_components/establishments/` (partagés)
- **Hooks** : `useOrgaUserOrganizationId()` pour org_admin
- **Realtime** : Système modulaire actif sur plusieurs tables

**🔧 Fonctionnalités implémentées :**

- ✅ Authentification avec métadonnées Supabase
- ✅ Redirection selon les rôles
- ✅ Internationalisation (fr, en, es)
- ✅ FullCalendar pour les menus
- ✅ Système Realtime modulaire
- ✅ RLS et multi-tenancy
- ✅ TanStack Query v5

**⚠️ Points d'attention :**

- Vérifie les vues `active_*` pour les données filtrées
- Utilise les hooks existants avant d'en créer
- Respecte l'architecture des rôles
- Teste avec les vraies données Supabase
- **SUIS L'ARCHITECTURE MODULAIRE REALTIME**
- **APPLIQUE LES STANDARDS DE PAGES**

Peux-tu commencer par lire cette documentation avant de proposer quoi que ce soit ?

```

---

## 🎯 **Points clés à mentionner :**

### **1. Stack et architecture**

- Next.js 15 + Supabase + multi-tenant
- Rôles system_admin vs org_admin vs visitor
- Types générés automatiquement
- TanStack Query v5 (gcTime)

### **2. Règles de développement**

- Vérifier la documentation AVANT de créer
- Utiliser les types Supabase
- Suivre les conventions existantes
- Soft delete et multi-tenancy

### **3. Architecture Realtime CRITIQUE**

- **Modulaire par domaines** (pas générique)
- **Pattern obligatoire** : Module → Hook → Composant
- **PAS d'utilisation directe** de useTableSubscription
- **Suivre le pattern** de organizations-realtime.ts

### **4. Standards de pages OBLIGATOIRES**

- **Structure de fichiers** standardisée
- **Composants UI** uniformes
- **Patterns de code** cohérents
- **UX/UI** standards
- **Structure de données** normalisée

### **5. Documentation à consulter**

- Les fichiers clés de documentation
- Structure des pages existantes
- Règles de collaboration
- Architecture des rôles
- **Architecture modulaire Realtime**

### **6. Structure existante**

- Pages et composants déjà en place
- Architecture multi-tenant
- Système Realtime modulaire
- FullCalendar implémenté

### **7. Fonctionnalités implémentées**

- Authentification complète
- Internationalisation
- Système de rôles
- Realtime modulaire et RLS

---

## 🚀 **Variante courte (si besoin) :**

```

Projet SaaS restaurant multi-tenant (Next.js 15 + Supabase).

**RÈGLES CRITIQUES :**

- Vérifie TOUJOURS la documentation existante avant de créer
- Utilise UNIQUEMENT `Tables<"table_name">` (types Supabase)
- TanStack Query v5 : `gcTime` (pas `cacheTime`)
- Soft delete : `deleted = false`
- Multi-tenant : filtre par `organization_id`

**🏗️ Architecture Realtime MODULAIRE :**

- Chaque domaine a son module : [domain]-realtime.ts
- Pattern : Module class → Hook spécialisé → Composant
- PAS d'utilisation directe de useTableSubscription
- Suivre le pattern de organizations-realtime.ts

**📄 Standards de pages OBLIGATOIRES :**

- Structure : page.tsx → [name]-client.tsx → [name]-shared.tsx
- UI : Header + Search + Table + Actions + Status
- Code : Hooks standardisés + Error handling + Loading states
- UX : Responsive + Accessibility + Toast + Confirmation

**Documentation OBLIGATOIRE :**
CONTEXT-SUMMARY.md, complete-page-structure.md, COLLABORATION_GUIDELINES.md, REALTIME-MODULAR-ARCHITECTURE.md

**Architecture :** system*admin (/admin/*), org*admin (/dashboard/*), visitor (/[slug]/\*)

Peux-tu commencer par lire la documentation ?

```

---

## ✅ **Résultat attendu :**

Avec ce message, l'assistant devrait :

1. ✅ Lire la documentation avant de proposer quoi que ce soit
2. ✅ Utiliser les types Supabase existants
3. ✅ Vérifier la structure existante
4. ✅ Suivre les conventions établies
5. ✅ Ne pas créer de fichiers inutiles
6. ✅ Respecter l'architecture multi-tenant
7. ✅ Utiliser TanStack Query v5 correctement
8. ✅ **SUIVRE L'ARCHITECTURE MODULAIRE REALTIME**
9. ✅ **ÉVITER LES ERREURS D'ARCHITECTURE REALTIME**
10. ✅ **APPLIQUER LES STANDARDS DE PAGES**
11. ✅ **CRÉER DES PAGES UNIFORMES**

---

## 📝 **Notes importantes :**

- **Copier-coller** le message complet au début de chaque nouvelle conversation
- **Insister** sur la lecture de la documentation en premier
- **Mentionner** les règles spécifiques au projet
- **Préciser** la structure existante pour éviter les doublons
- **Rappeler** les fonctionnalités déjà implémentées
- **INSISTER** sur l'architecture Realtime modulaire
- **APPLIQUER** les standards de pages

---

## 🔄 **Mise à jour du message :**

Ce message doit être mis à jour régulièrement pour refléter :

- Nouvelles fonctionnalités implémentées
- Changements dans l'architecture
- Nouvelles règles de développement
- Évolution de la documentation
- **Corrections d'architecture Realtime**
- **Améliorations des standards de pages**

---

**Fichier créé le :** 14 Juillet 2025
**Dernière mise à jour :** 14 Juillet 2025
**Version :** 5.0 (Avec middleware d'authentification)
```

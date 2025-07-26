# 🍽️ SITE PUBLIC RESTAURANT - ARCHITECTURE ET GUIDE

## 🎯 Vue d'ensemble

Le site public des restaurants permet aux visiteurs non connectés d'accéder aux informations publiques des établissements de restauration.

### **URLs publiques :**

- **Page d'accueil** : `/{locale}/{slug}` (ex: `/fr/la-plank-des-gones`)
- **Page menu** : `/{locale}/{slug}/menu` (ex: `/fr/la-plank-des-gones/menu`)
- **Page réservations** : `/{locale}/{slug}/reservations` (à créer)
- **Page contact** : `/{locale}/{slug}/contact` (à créer)
- **Page à propos** : `/{locale}/{slug}/about` (à créer)

---

## 🏗️ Architecture Technique

### **Structure des routes :**

```
src/app/[locale]/(root)/(public)/
├── [slug]/
│   ├── page.tsx                    # Page d'accueil du restaurant
│   ├── restaurant-public-client.tsx # Composant client principal
│   ├── menu/
│   │   ├── page.tsx               # Page menu
│   │   └── menu-public-client.tsx # Composant menu public
│   ├── reservations/              # À créer
│   ├── contact/                   # À créer
│   └── about/                     # À créer
└── layout.tsx                     # Layout public simplifié
```

### **Layouts hiérarchie :**

1. **`src/app/layout.tsx`** - Layout racine (passe les enfants)
2. **`src/app/[locale]/layout.tsx`** - Providers (i18n, auth, query, etc.)
3. **`src/app/[locale]/(root)/layout.tsx`** - `<html>`, `<body>`, `ThemeProvider`
4. **`src/app/[locale]/(root)/(public)/layout.tsx`** - Layout public simplifié

---

## 🔒 Sécurité et RLS

### **Tables avec accès public (lecture seule) :**

#### **1. `establishments`** ✅

```sql
CREATE POLICY "establishments_public_read" ON establishments
FOR SELECT TO public
USING (deleted = false);
```

#### **2. `menus`** ✅

```sql
CREATE POLICY "menus_public_read" ON menus
FOR SELECT TO public
USING (deleted = false AND is_public = true);
```

#### **3. `products`** ✅

```sql
CREATE POLICY "products_public_read" ON products
FOR SELECT TO public
USING (deleted = false);
```

#### **4. `categories`** ✅

```sql
CREATE POLICY "categories_public_read" ON categories
FOR SELECT TO public
USING (deleted = false);
```

#### **5. `opening_hours`** ✅

```sql
CREATE POLICY "opening_hours_public_read" ON opening_hours
FOR SELECT TO public
USING (deleted = false);
```

#### **6. `opening_hours_exceptions`** ✅

```sql
CREATE POLICY "opening_hours_exceptions_public_read" ON opening_hours_exceptions
FOR SELECT TO public
USING (deleted = false);
```

### **Principe de sécurité :**

- ✅ **Accès public** : Lecture seule pour les visiteurs non connectés
- ✅ **Sécurité maintenue** : Les utilisateurs connectés gardent leurs permissions complètes
- ✅ **Données filtrées** : Seules les données non supprimées et publiques sont accessibles
- ❌ **Pas de modification** : Les visiteurs ne peuvent que consulter

---

## 🎨 Interface Utilisateur

### **Composants principaux :**

#### **1. `RestaurantPublicClient`**

- **Fichier** : `src/app/[locale]/(root)/(public)/[slug]/restaurant-public-client.tsx`
- **Fonction** : Page d'accueil du restaurant
- **Contenu** :
  - Header avec navigation
  - Section hero avec description
  - Informations (adresse, horaires, contact)
  - Boutons d'action (menu, réservations)

#### **2. `MenuPublicClient`**

- **Fichier** : `src/app/[locale]/(root)/(public)/[slug]/menu/menu-public-client.tsx`
- **Fonction** : Affichage du menu public
- **Contenu** :
  - Liste des catégories
  - Produits par catégorie
  - Prix et descriptions

### **Design :**

- **Thème** : Orange/Ambre (couleurs restaurant)
- **Responsive** : Mobile-first
- **Accessibilité** : Standards WCAG
- **Performance** : Optimisé pour le SEO

---

## 🔄 Middleware et Routing

### **Middleware public :**

```typescript
// src/middleware/auth-middleware.ts
function isRestaurantPublicRoute(pathname: string): boolean {
  const routeWithoutLocale = pathname.replace(/^\/[a-z]{2}\//, "/").replace(/^\/[a-z]{2}$/, "/");

  // Exclure les routes privées
  if (
    routeWithoutLocale.startsWith("/admin") ||
    routeWithoutLocale.startsWith("/dashboard") ||
    routeWithoutLocale.startsWith("/auth")
  ) {
    return false;
  }

  // Accepter les slugs de restaurant
  return /^\/[^\/]+$/.test(routeWithoutLocale) || /^\/[^\/]+\//.test(routeWithoutLocale);
}
```

### **Comportement :**

- ✅ **Routes publiques** : Passage direct sans authentification
- ✅ **Routes privées** : Redirection vers login si non connecté
- ✅ **Locale** : Gestion automatique (fr, en, es)

---

## 📊 Données et Requêtes

### **Requêtes principales :**

#### **1. Informations du restaurant :**

```typescript
const { data: establishment } = await supabase
  .from("establishments")
  .select("*")
  .eq("slug", slug)
  .eq("deleted", false)
  .single();
```

#### **2. Menu public :**

```typescript
const { data: menus } = await supabase
  .from("menus")
  .select("*")
  .eq("establishments_id", establishmentId)
  .eq("is_public", true)
  .eq("deleted", false);
```

#### **3. Produits par menu :**

```typescript
const { data: products } = await supabase
  .from("products")
  .select(
    `
    *,
    categories(name),
    menus_products!inner(menu_id)
  `,
  )
  .eq("deleted", false)
  .eq("menus_products.menu_id", menuId);
```

#### **4. Horaires d'ouverture :**

```typescript
const { data: openingHours } = await supabase
  .from("opening_hours")
  .select("*")
  .eq("establishment_id", establishmentId)
  .eq("deleted", false)
  .order("day_of_week");
```

---

## 🚀 Fonctionnalités à développer

### **Phase 1 - Actuelle :** ✅

- [x] Page d'accueil du restaurant
- [x] Page menu public
- [x] RLS configuré
- [x] Middleware fonctionnel

### **Phase 2 - À développer :**

- [ ] **Page réservations** : Formulaire de réservation
- [ ] **Page contact** : Informations de contact
- [ ] **Page à propos** : Histoire et équipe
- [ ] **Système de réservation** : Intégration avec `bookings`
- [ ] **Galerie photos** : Images du restaurant
- [ ] **Avis clients** : Système de notation

### **Phase 3 - Avancées :**

- [ ] **Menu interactif** : Filtres et recherche
- [ ] **Réservation en ligne** : Créneaux disponibles
- [ ] **Notifications** : Confirmations par email
- [ ] **SEO avancé** : Métadonnées dynamiques
- [ ] **Analytics** : Suivi des visites

---

## 🔧 Configuration et Déploiement

### **Variables d'environnement :**

```env
# Supabase (déjà configuré)
NEXT_PUBLIC_SUPABASE_URL=your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Internationalisation (déjà configuré)
NEXT_PUBLIC_DEFAULT_LOCALE=fr
```

### **Déploiement :**

- ✅ **Vercel** : Compatible
- ✅ **Netlify** : Compatible
- ✅ **Docker** : Compatible
- ✅ **SSR** : Supporté

---

## 📝 Notes importantes

### **Performance :**

- **SSR** : Toutes les pages sont rendues côté serveur
- **Cache** : TanStack Query pour la mise en cache
- **Images** : Optimisation automatique Next.js
- **SEO** : Métadonnées dynamiques par restaurant

### **Sécurité :**

- **RLS** : Protection au niveau base de données
- **Validation** : Vérification des slugs et données
- **Rate limiting** : Protection contre les abus
- **CORS** : Configuration appropriée

### **Maintenance :**

- **Logs** : Suivi des erreurs et performances
- **Monitoring** : Surveillance de la disponibilité
- **Backup** : Sauvegarde automatique des données
- **Updates** : Mises à jour régulières

---

## 🐛 Dépannage

### **Problèmes courants :**

#### **1. Erreur 404 sur un restaurant :**

- Vérifier que le slug existe dans `establishments`
- Vérifier que `deleted = false`
- Vérifier les policies RLS

#### **2. Menu vide :**

- Vérifier que `is_public = true` sur le menu
- Vérifier que `deleted = false` sur les produits
- Vérifier les associations `menus_products`

#### **3. Horaires non affichés :**

- Vérifier que `deleted = false` sur `opening_hours`
- Vérifier que `establishment_id` correspond
- Vérifier les policies RLS

#### **4. Erreur d'authentification :**

- Vérifier que les policies RLS publiques sont créées
- Vérifier que le client Supabase est bien configuré
- Vérifier les logs du serveur

---

**Documentation créée le :** $(date)
**Version :** 1.0
**Statut :** En développement actif

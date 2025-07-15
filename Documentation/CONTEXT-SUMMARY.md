# 📋 Synthèse Complète du Contexte - SaaS Dashboard Restaurant

## 🎯 **CONTEXTE GÉNÉRAL**

### **Application**

- **Type** : SaaS multi-tenant pour gestion de restaurants
- **Stack** : Next.js 15, Supabase v2, Zustand, React 19, TanStack Query, Tailwind v4
- **Architecture** : Système de rôles natif Supabase avec métadonnées utilisateur

### **Problème Principal Résolu**

L'utilisateur rencontrait des problèmes de gestion des rôles et d'authentification :

- Détection incorrecte des rôles côté client vs serveur
- Redirections vers `/unauthorized` malgré une authentification valide
- Architecture complexe avec LegendState et tables personnalisées

**Solution** : Migration vers le système natif de rôles Supabase via les métadonnées utilisateur.

---

## 🏗️ **ARCHITECTURE FINALE**

### **Structure des URLs**

```
👥 Visiteurs (Public)     : /fr/[establishment-slug]/*
👨‍💼 Org Admin            : /fr/dashboard/*
🏢 System Admin          : /fr/admin/*
```

### **Structure des Dossiers**

```
src/app/[locale]/
├── (dashboard)/          # Layout partagé
│   ├── admin/           # System Admin
│   └── dashboard/       # Org Admin
├── [establishment-slug]/ # Visiteurs
└── auth/                # Authentification
```

### **Système de Rôles avec Métadonnées Supabase**

#### **App Metadata (Sécurisée)**

```json
{
  "role": "system_admin",
  "provider": "email",
  "providers": ["email"],
  "subscription_tier": "premium",
  "permissions": ["read", "write", "admin", "manage_users", "manage_organizations"],
  "features": ["dashboard", "analytics", "user_management", "organization_management"],
  "access_level": "system",
  "created_by": "system",
  "last_role_update": "2025-07-14T07:22:53.699Z"
}
```

#### **User Metadata (Préférences)**

```json
{
  "role": "system_admin",
  "firstname": "Phil",
  "lastname": "Goddet",
  "email_verified": true,
  "preferences": {
    "theme": "dark",
    "language": "fr",
    "notifications": { "email": true, "push": false, "sms": false },
    "dashboard": { "layout": "grid", "default_view": "overview", "refresh_interval": 30000 },
    "accessibility": { "high_contrast": false, "font_size": "medium", "reduced_motion": false }
  },
  "profile": {
    "avatar_url": null,
    "bio": "System Administrator",
    "timezone": "Europe/Paris",
    "date_format": "DD/MM/YYYY",
    "time_format": "24h"
  },
  "last_login": "2025-07-14T07:22:53.699Z",
  "login_count": 1
}
```

---

## 🔧 **SOLUTIONS IMPLÉMENTÉES**

### **1. Service MetadataService**

```typescript
// src/lib/services/metadataService.ts
export class MetadataService {
  static getAppMetadata(user: User): AppMetadata;
  static getUserMetadata(user: User): UserMetadata;
  static hasPermission(user: User, permission: string): boolean;
  static hasFeature(user: User, feature: string): boolean;
  static isSystemAdmin(user: User): boolean;
  static isOrgAdmin(user: User): boolean;
  static getMainRole(user: User): "system_admin" | "org_admin" | null;
  static getUserPreferences(user: User): UserPreferences;
  static getUserProfile(user: User): UserProfile;
}
```

### **2. Hooks React Unifiés**

```typescript
// src/hooks/use-user-metadata.ts
export function useUserMetadata(); // Métadonnées complètes
export function useUserPreferences(); // Préférences utilisateur
export function useUserProfile(); // Profil utilisateur
export function useUserPermissions(); // Permissions
export function useUserFeatures(); // Features
```

### **3. API Routes Sécurisées**

```typescript
// src/app/api/auth/roles/route.ts - Récupération des rôles
// src/app/api/auth/update-role/route.ts - Mise à jour des rôles
```

### **4. Composants de Protection**

```typescript
// src/components/auth/protected-route.tsx - Protection des routes
// src/components/user/user-profile-card.tsx - Affichage des métadonnées
```

---

## 🗄️ **BASE DE DONNÉES**

### **Tables Conservées**

```sql
-- Pour les org_admin uniquement
CREATE TABLE users_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Organisations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Tables Supprimées**

```sql
-- Remplacé par les métadonnées Supabase
-- DROP TABLE users_roles;
```

### **Relations Clés**

- Un utilisateur peut avoir plusieurs rôles (via métadonnées)
- Un utilisateur peut appartenir à plusieurs organisations
- Un établissement appartient toujours à une organisation
- Les features sont granulaires et liées aux organisations

---

## 🚨 **PROBLÈMES RÉSOLUS**

### **1. Détection des Rôles**

- ✅ **Problème** : Hook client `useUserMainRole` ne détectait pas les rôles
- ✅ **Solution** : API route côté serveur avec service role key
- ✅ **Résultat** : Détection correcte des rôles `system_admin` et `org_admin`

### **2. Redirections Incorrectes**

- ✅ **Problème** : Redirections vers `/unauthorized` malgré authentification
- ✅ **Solution** : Middleware et composants de protection unifiés
- ✅ **Résultat** : Redirections appropriées selon les rôles

### **3. Architecture Complexe**

- ✅ **Problème** : LegendState + tables personnalisées + RLS complexe
- ✅ **Solution** : Métadonnées Supabase natives + Zustand + TanStack Query
- ✅ **Résultat** : Architecture simple, performante et maintenable

### **4. Performance**

- ✅ **Problème** : Requêtes DB multiples pour les rôles
- ✅ **Solution** : Rôles dans le JWT + cache TanStack Query
- ✅ **Résultat** : Performance optimisée avec lecture directe des métadonnées

---

## 🎯 **AVANTAGES DE LA NOUVELLE ARCHITECTURE**

### **1. Performance**

- ✅ **Rôles dans le JWT** : Pas de requêtes DB supplémentaires
- ✅ **Cache optimisé** : TanStack Query avec stale time approprié
- ✅ **Lecture directe** : Métadonnées disponibles immédiatement

### **2. Sécurité**

- ✅ **App metadata sécurisée** : Contrôlée par le serveur uniquement
- ✅ **Priorité app_metadata** : Protection contre la manipulation
- ✅ **Service role key** : Mises à jour sécurisées

### **3. Simplicité**

- ✅ **Moins de tables** : Suppression de `users_roles`
- ✅ **Un seul système** : Métadonnées Supabase natives
- ✅ **Code simplifié** : Moins de logique à maintenir

### **4. Flexibilité**

- ✅ **Permissions granulaires** : Array de permissions
- ✅ **Features configurables** : Array de features
- ✅ **Préférences extensibles** : Structure JSON complète

### **5. Cohérence**

- ✅ **Système natif Supabase** : Intégration parfaite
- ✅ **Pas de duplication** : Un seul système de rôles
- ✅ **Synchronisation automatique** : Métadonnées toujours à jour

---

## 🧪 **TESTS ET VALIDATION**

### **Page de Test**

- **URL** : `http://localhost:3001/dashboard/metadata-test`
- **Fonctionnalités** : Affichage complet des métadonnées, permissions, features
- **Statut** : ✅ Fonctionnel

### **Logs de Validation**

```
API - User metadata: {
  email_verified: true,
  firstname: 'Phil',
  lastname: 'Goddet',
  role: 'system_admin'
}

API - App metadata: {
  role: 'system_admin',
  permissions: ['read', 'write', 'admin', 'manage_users', 'manage_organizations'],
  features: ['dashboard', 'analytics', 'user_management', 'organization_management']
}
```

---

## 🔄 **IMPLÉMENTATION REALTIME RÉUSSIE**

### **Contexte**

L'utilisateur souhaitait implémenter le realtime Supabase sur une table pour tester le système. La table `messages` a été choisie comme exemple.

### **Problèmes Rencontrés et Résolus**

#### **1. Boucle Infinie dans React**

- **Problème** : `Maximum update depth exceeded` causé par des dépendances circulaires
- **Solution** :
  - Utilisation de `useCallback` pour stabiliser les fonctions
  - Suppression des fonctions `connect`/`disconnect` des dépendances `useEffect`
  - Utilisation de `useRef` pour gérer les canaux realtime
  - Dépendances vides pour le nettoyage

#### **2. Gestion des Canaux Realtime**

- **Problème** : Reconnexions répétées et canaux non fermés
- **Solution** :
  - Stockage du canal dans un `useRef`
  - Nettoyage propre dans le `useEffect` cleanup
  - Vérification de l'existence du canal avant fermeture

#### **3. Structure de la Table**

- **Problème** : Erreur "column title does not exist"
- **Solution** : Vérification de la structure réelle de la table `messages`
- **Résultat** : Colonnes correctes : `id`, `content`, `organization_id`, `deleted`, `created_at`, `updated_at`

### **Architecture Finale Realtime**

#### **Page avec Realtime**

```typescript
// src/app/[locale]/(dashboard)/admin/messages/page.tsx
export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<any>(null);

  // Chargement initial
  const loadMessages = useCallback(async () => {
    // ... logique de chargement
  }, [supabase]);

  // Configuration realtime
  useEffect(() => {
    const channel = supabase
      .channel("messages_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          // Gestion des événements INSERT/UPDATE/DELETE
        },
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [loadMessages]);
}
```

#### **Store Zustand Amélioré**

```typescript
// src/lib/stores/realtime-store.ts
export const useRealtimeStore = create<RealtimeState>()(
  devtools((set, get) => ({
    connect: async () => {
      const state = get();
      if (state.isConnected || state.connectionStatus === "connecting") {
        return; // Éviter les connexions multiples
      }
      // ... logique de connexion
    },

    disconnect: () => {
      const state = get();
      if (!state.isConnected) {
        return; // Éviter les déconnexions répétées
      }
      // ... logique de déconnexion
    },
  })),
);
```

### **Configuration Supabase**

#### **Activation du Realtime**

```sql
-- Activer le realtime sur la table messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Vérifier l'activation
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

#### **Politiques RLS**

```sql
-- Politiques pour system_admin (accès complet)
CREATE POLICY "system_admin_all_messages" ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'system_admin'
    )
  );

-- Politiques pour org_admin (accès limité)
CREATE POLICY "org_admin_own_messages" ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'org_admin'
      AND messages.organization_id = (
        SELECT organization_id FROM users_organizations
        WHERE user_id = auth.uid()
        LIMIT 1
      )
    )
  );
```

### **Leçons Apprises**

#### **1. Gestion des Dépendances React**

- ✅ **Éviter les dépendances circulaires** dans `useEffect`
- ✅ **Utiliser `useCallback`** pour stabiliser les fonctions
- ✅ **Utiliser `useRef`** pour les références persistantes
- ✅ **Dépendances vides** pour le nettoyage

#### **2. Gestion des Canaux Supabase**

- ✅ **Stockage du canal** dans une ref pour éviter les fuites mémoire
- ✅ **Nettoyage propre** dans le cleanup du `useEffect`
- ✅ **Vérification d'existence** avant fermeture

#### **3. Gestion des États**

- ✅ **État local** pour la connexion plutôt que global
- ✅ **Vérifications de sécurité** dans les stores Zustand
- ✅ **Logs détaillés** pour le débogage

#### **4. Performance**

- ✅ **Éviter les re-renders** inutiles
- ✅ **Stabiliser les fonctions** avec `useCallback`
- ✅ **Gérer les états de chargement** et d'erreur

### **Guide de Réplication**

Un guide complet a été créé : `Documentation/REALTIME-IMPLEMENTATION-GUIDE.md`

**Contenu du guide :**

- Configuration Supabase (realtime + RLS)
- Template de page avec realtime
- Gestion des événements (INSERT/UPDATE/DELETE)
- Fonctions CRUD
- Interface utilisateur
- Exemple complet pour table "products"
- Points clés et dépannage
- Checklist de validation

---

## 🧹 **NETTOYAGE EFFECTUÉ**

### **Dossiers Supprimés**

- ✅ `src/app/[locale]/(main)/dashboard1/` (ancien dashboard)
- ✅ `src/app/[locale]/(dashboard)/admin/notifications/` (page de test cassée)

### **Résultat**

- Architecture plus propre
- Moins de code dupliqué
- Structure claire et maintenable

---

## 📊 **STATUT ACTUEL**

### **✅ Fonctionnel**

- Système d'authentification avec rôles
- Métadonnées utilisateur complètes
- API routes sécurisées
- Composants de protection
- Realtime sur table `messages`
- Guide d'implémentation realtime

### **🔄 En Cours**

- Tests sur d'autres tables
- Optimisations de performance
- Documentation continue

### **📋 À Faire**

- Implémentation realtime sur autres tables
- Tests de charge
- Monitoring et analytics

---

## 🎯 **PROCHAINES ÉTAPES**

1. **Implémenter le realtime** sur d'autres tables importantes
2. **Créer des composants réutilisables** pour les tables avec realtime
3. **Ajouter des tests automatisés** pour le realtime
4. **Optimiser les performances** pour de grandes quantités de données
5. **Implémenter des notifications** en temps réel

---

**Le projet est maintenant stable avec une architecture claire, un système de rôles robuste et une implémentation realtime fonctionnelle !** 🚀

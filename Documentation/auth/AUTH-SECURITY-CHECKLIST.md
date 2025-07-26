# 🔒 Checklist de Sécurité - Authentification et Métadonnées

## ✅ Vérifications de Base

### **1. Configuration Supabase**

- [x] **Service Role Key** : Stockée dans les variables d'environnement
- [x] **Anon Key** : Utilisée côté client uniquement
- [x] **URL Supabase** : Configurée correctement
- [x] **RLS (Row Level Security)** : Activé sur les tables sensibles

### **2. Métadonnées Utilisateur**

- [x] **App Metadata** : Contrôlée par le serveur uniquement
- [x] **User Metadata** : Modifiable par l'utilisateur (avec précaution)
- [x] **Priorité** : App metadata prioritaire sur user metadata
- [x] **Validation** : Vérification des rôles côté serveur

### **3. Gestion des Rôles**

- [x] **System Admin** : Détecté via métadonnées
- [x] **Org Admin** : Détecté via users_organizations
- [x] **Fallback** : API route pour contourner RLS
- [x] **Cache** : TanStack Query pour optimiser les performances

## 🛡️ Sécurité des Métadonnées

### **App Metadata (Sécurisée)**

```typescript
// ✅ BONNE PRATIQUE
const systemRole = user.app_metadata?.role || user.user_metadata?.role;

// ❌ MAUVAISE PRATIQUE
const role = user.user_metadata?.role; // Seulement user_metadata
```

### **Vérification des Permissions**

```typescript
// ✅ Vérification sécurisée
static hasPermission(user: User, permission: string): boolean {
  const appMetadata = this.getAppMetadata(user);
  return appMetadata.permissions.includes(permission);
}

// ✅ Vérification des features
static hasFeature(user: User, feature: string): boolean {
  const appMetadata = this.getAppMetadata(user);
  return appMetadata.features.includes(feature);
}
```

### **Mise à Jour Sécurisée**

```typescript
// ✅ Via API Admin uniquement
const { data, error } = await supabase.auth.admin.updateUserById(userId, {
  app_metadata: {
    role: "system_admin",
    permissions: ["read", "write", "admin"],
    features: ["dashboard", "analytics"],
  },
  user_metadata: {
    role: "system_admin",
    preferences: { theme: "dark" },
  },
});
```

## 🔐 Protection des Routes

### **Middleware**

```typescript
// ✅ Vérification côté serveur - Logique actuelle
export async function authMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Routes techniques → Passer directement
  if (isExcludedRoute(pathname)) {
    return NextResponse.next();
  }

  // 2. Locale manquante → Rediriger vers /fr/...
  if (!hasLocale(pathname)) {
    return NextResponse.redirect(new URL(`/${routing.defaultLocale}${pathname}`, req.url));
  }

  // 3. Routes publiques (auth) → Passer directement
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // 4. Routes restaurants publics → Passer directement
  if (isRestaurantPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // 5. Routes protégées → Vérifier auth + rôles via API
  try {
    const response = await fetch(`${req.nextUrl.origin}/api/auth/roles`, {
      method: "GET",
      headers: { Cookie: req.headers.get("cookie") || "" },
    });

    if (!response.ok) {
      return NextResponse.redirect(new URL(`/${locale}/auth/login`, req.url));
    }

    const roleData = await response.json();

    if (!roleData.role) {
      return NextResponse.redirect(new URL(`/${locale}/auth/login`, req.url));
    }

    // Redirection selon le rôle
    const authorizedRoute = getAuthorizedRoute(roleData.role);
    if (pathname.includes(authorizedRoute)) {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL(`/${locale}${authorizedRoute}`, req.url));
  } catch (error) {
    return NextResponse.redirect(new URL(`/${locale}/auth/login`, req.url));
  }
}
```

### **Types de Routes Gérées**

| Type de Route          | Exemples                         | Comportement          |
| ---------------------- | -------------------------------- | --------------------- |
| **Routes techniques**  | `/api`, `/_next`, `/favicon.ico` | ✅ Accès direct       |
| **Routes publiques**   | `/auth/login`, `/auth/register`  | ✅ Accès direct       |
| **Routes restaurants** | `/fr/[slug]`, `/fr/[slug]/menu`  | ✅ Accès direct       |
| **Routes protégées**   | `/fr/dashboard/*`, `/fr/admin/*` | 🔒 Auth + rôle requis |

### **Logique de Redirection par Rôle**

- **Déconnecté** : Redirection vers `/fr/auth/login`
- **Org Admin** : Accès à `/fr/dashboard/*`, redirection vers `/fr/dashboard` si accès à `/fr/admin/*`
- **System Admin** : Accès à `/fr/admin/*`, redirection vers `/fr/admin` si accès à `/fr/dashboard/*`

### **Composants de Protection**

```typescript
// ✅ Protection côté client
export function ProtectedRoute({ children, requiredRoles }) {
  const { user, isAuthenticated } = useAuthStore();
  const { data: userMainRole, isLoading } = useUserMainRole(user?.id);

  useEffect(() => {
    if (isAuthenticated && !isLoading && requiredRoles) {
      if (!userMainRole || !requiredRoles.includes(userMainRole.role)) {
        router.push('/unauthorized');
      }
    }
  }, [isAuthenticated, isLoading, userMainRole, requiredRoles]);

  return <>{children}</>;
}
```

## 🚨 Points de Vigilance

### **1. Métadonnées Manipulables**

- ⚠️ **User Metadata** : L'utilisateur peut la modifier
- ✅ **Solution** : Toujours vérifier app_metadata en priorité
- ✅ **Validation** : Vérification côté serveur obligatoire

### **2. Cache et Performance**

- ⚠️ **Cache obsolète** : Métadonnées peuvent changer
- ✅ **Solution** : Invalidation du cache lors des mises à jour
- ✅ **Stale Time** : Configuration appropriée pour TanStack Query

### **3. Tokens JWT**

- ⚠️ **Expiration** : Tokens peuvent expirer
- ✅ **Solution** : Refresh automatique via Supabase
- ✅ **Sécurité** : Tokens signés par Supabase

### **4. RLS (Row Level Security)**

- ⚠️ **Policies** : Peuvent bloquer les requêtes
- ✅ **Solution** : API routes avec service role key
- ✅ **Test** : Vérifier toutes les policies

## 🔍 Tests de Sécurité

### **1. Test de Manipulation**

```typescript
// Test : Utilisateur modifie ses métadonnées
const maliciousUser = {
  ...user,
  user_metadata: {
    ...user.user_metadata,
    role: "system_admin", // Tentative de manipulation
  },
};

// ✅ Doit être détecté et rejeté
const actualRole = MetadataService.getMainRole(maliciousUser);
console.log(actualRole); // Doit retourner le vrai rôle
```

### **2. Test de Permissions**

```typescript
// Test : Vérification des permissions
const hasAdminPermission = MetadataService.hasPermission(user, "admin");
const hasUserManagement = MetadataService.hasFeature(user, "user_management");

// ✅ Doit correspondre aux permissions réelles
console.log("Admin:", hasAdminPermission);
console.log("User Management:", hasUserManagement);
```

### **3. Test de Routes**

```typescript
// Test : Accès aux routes protégées
// ✅ system_admin doit pouvoir accéder à /admin/*
// ✅ org_admin doit pouvoir accéder à /dashboard/*
// ❌ Utilisateur sans rôle ne doit pas accéder aux routes protégées
```

## 📋 Checklist de Validation

### **Configuration**

- [ ] Variables d'environnement sécurisées
- [ ] Service role key non exposée côté client
- [ ] RLS activé sur toutes les tables sensibles
- [ ] Policies RLS testées et fonctionnelles

### **Métadonnées**

- [ ] App metadata contrôlée par le serveur
- [ ] Priorité app_metadata sur user_metadata
- [ ] Validation côté serveur pour tous les rôles
- [ ] Mise à jour sécurisée via API Admin

### **Routes**

- [ ] Middleware protège toutes les routes sensibles
- [ ] Composants ProtectedRoute fonctionnels
- [ ] Redirections appropriées en cas d'accès non autorisé
- [ ] Gestion des états de chargement

### **Performance**

- [ ] Cache TanStack Query configuré
- [ ] Invalidation du cache lors des mises à jour
- [ ] Pas de requêtes inutiles côté client
- [ ] Optimisation des re-renders

### **Tests**

- [ ] Tests de manipulation des métadonnées
- [ ] Tests de permissions et features
- [ ] Tests d'accès aux routes protégées
- [ ] Tests de performance et cache

## 🎯 Bonnes Pratiques

### **1. Toujours Vérifier Côté Serveur**

```typescript
// ✅ API Route sécurisée
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Vérification côté serveur
  const systemRole = user.app_metadata?.role || user.user_metadata?.role;

  if (systemRole !== "system_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Logique métier sécurisée
  return NextResponse.json({ data: "sensitive_data" });
}
```

### **2. Utiliser les Hooks Sécurisés**

```typescript
// ✅ Hook avec validation
export function useUserMetadata() {
  const { user } = useAuthStore();

  return useMemo(() => {
    if (!user) return defaultMetadata;

    return {
      role: MetadataService.getMainRole(user), // Validation automatique
      permissions: MetadataService.getAppMetadata(user).permissions,
      hasPermission: (permission: string) => MetadataService.hasPermission(user, permission),
    };
  }, [user]);
}
```

### **3. Gérer les Erreurs**

```typescript
// ✅ Gestion d'erreurs robuste
try {
  const role = MetadataService.getMainRole(user);
  if (!role) {
    // Redirection vers page d'erreur
    router.push("/unauthorized");
    return;
  }
} catch (error) {
  console.error("Erreur de récupération du rôle:", error);
  // Fallback sécurisé
  router.push("/auth/login");
}
```

## 🚀 Validation Finale

Avant de déployer en production, vérifiez que :

1. ✅ **Toutes les métadonnées sont correctement configurées**
2. ✅ **Les permissions sont granulaires et sécurisées**
3. ✅ **Les routes sont protégées côté serveur ET client**
4. ✅ **Le cache est optimisé et sécurisé**
5. ✅ **Les tests de sécurité passent**
6. ✅ **La documentation est à jour**

Cette checklist garantit une implémentation sécurisée et robuste du système d'authentification avec métadonnées Supabase ! 🔒

# 🔐 Nouvelle Architecture d'Authentification - Métadonnées Supabase

## 🎯 Vue d'Ensemble

L'application utilise maintenant le système natif de rôles Supabase via les métadonnées utilisateur, offrant une architecture plus simple, performante et sécurisée.

## 🏗️ Architecture des Métadonnées

### **App Metadata (Sécurisée)**

```typescript
interface AppMetadata {
  role: "system_admin" | "org_admin" | null;
  provider: string;
  providers: string[];
  subscription_tier: "free" | "premium" | "enterprise";
  permissions: string[];
  features: string[];
  access_level: "system" | "organization" | "user";
  created_by: string;
  last_role_update: string;
}
```

### **User Metadata (Préférences)**

```typescript
interface UserMetadata {
  role: "system_admin" | "org_admin" | null;
  firstname: string;
  lastname: string;
  email_verified: boolean;
  preferences: UserPreferences;
  profile: UserProfile;
  last_login: string;
  login_count: number;
}
```

## 🔄 Flux d'Authentification

### **1. Connexion Utilisateur**

```typescript
// src/lib/queries/auth.ts
export const useLogin = () => {
  return useMutation({
    mutationFn: async ({ email, password }) => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Synchroniser avec Zustand
      setUser(data.user);
      setSession(data.session);

      return data;
    },
  });
};
```

### **2. Récupération des Rôles**

```typescript
// src/app/api/auth/roles/route.ts
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Vérifier system_admin via métadonnées
  const systemRole = user.app_metadata?.role || user.user_metadata?.role;

  if (systemRole === "system_admin") {
    return NextResponse.json({
      role: "system_admin",
      organizationId: null,
    });
  }

  // Vérifier org_admin via users_organizations
  const { data: orgRole } = await supabase
    .from("users_organizations")
    .select("organization_id, organizations (*)")
    .eq("user_id", user.id)
    .eq("deleted", false)
    .single();

  if (orgRole) {
    return NextResponse.json({
      role: "org_admin",
      organizationId: orgRole.organization_id,
    });
  }

  return NextResponse.json({ role: null });
}
```

### **3. Hook Client**

```typescript
// src/lib/queries/auth.ts
export const useUserMainRole = (userId?: string) => {
  return useQuery({
    queryKey: ["user-main-role", userId],
    queryFn: async () => {
      const response = await fetch("/api/auth/roles", {
        credentials: "include",
      });

      if (!response.ok) return null;

      const data = await response.json();

      if (data.role === "system_admin") {
        setUserRole("system_admin");
        return { role: "system_admin", organizationId: null };
      }

      if (data.role === "org_admin") {
        setUserRole("org_admin");
        return { role: "org_admin", organizationId: data.organizationId };
      }

      return null;
    },
  });
};
```

## 🛡️ Sécurité et Permissions

### **Vérification des Permissions**

```typescript
// src/lib/services/metadataService.ts
export class MetadataService {
  static hasPermission(user: User, permission: string): boolean {
    const appMetadata = this.getAppMetadata(user);
    return appMetadata.permissions.includes(permission);
  }

  static hasFeature(user: User, feature: string): boolean {
    const appMetadata = this.getAppMetadata(user);
    return appMetadata.features.includes(feature);
  }

  static isSystemAdmin(user: User): boolean {
    return this.getMainRole(user) === "system_admin";
  }
}
```

### **Composants de Protection**

```typescript
// src/components/auth/protected-route.tsx
export function ProtectedRoute({ children, requiredRoles }) {
  const { user, isAuthenticated } = useAuthStore();
  const { data: userMainRole, isLoading: roleLoading } = useUserMainRole(user?.id);

  useEffect(() => {
    if (isAuthenticated && !roleLoading && requiredRoles) {
      if (!userMainRole || !requiredRoles.includes(userMainRole.role)) {
        router.push('/unauthorized');
      }
    }
  }, [isAuthenticated, roleLoading, userMainRole, requiredRoles]);

  return <>{children}</>;
}
```

## 🎨 Interface Utilisateur

### **Hooks React**

```typescript
// src/hooks/use-user-metadata.ts
export function useUserMetadata() {
  const { user } = useAuthStore();

  return useMemo(() => {
    if (!user) return defaultMetadata;

    return {
      role: MetadataService.getMainRole(user),
      permissions: MetadataService.getAppMetadata(user).permissions,
      features: MetadataService.getAppMetadata(user).features,
      preferences: MetadataService.getUserPreferences(user),
      profile: MetadataService.getUserProfile(user),
      isSystemAdmin: MetadataService.isSystemAdmin(user),
      isOrgAdmin: MetadataService.isOrgAdmin(user),
      hasPermission: (permission: string) => MetadataService.hasPermission(user, permission),
      hasFeature: (feature: string) => MetadataService.hasFeature(user, feature),
    };
  }, [user]);
}
```

### **Composant de Profil**

```typescript
// src/components/user/user-profile-card.tsx
export function UserProfileCard() {
  const {
    role,
    permissions,
    features,
    preferences,
    profile,
    hasPermission,
    hasFeature,
  } = useUserMetadata();

  return (
    <div className="space-y-6">
      {/* Informations principales */}
      <Card>
        <CardHeader>
          <CardTitle>{profile?.fullName}</CardTitle>
          <div className="flex gap-2">
            <Badge>{role}</Badge>
            {hasPermission('admin') && <Badge variant="destructive">Admin</Badge>}
          </div>
        </CardHeader>
      </Card>

      {/* Permissions et Features */}
      <Card>
        <CardContent>
          <h4>Permissions</h4>
          <div className="flex flex-wrap gap-1">
            {permissions.map(permission => (
              <Badge key={permission} variant="outline">{permission}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## 🗄️ Structure de Base de Données

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

## 🔧 Migration et Maintenance

### **Script de Migration**

```javascript
// scripts/update-user-metadata-enhanced.js
const appMetadata = {
  role: "system_admin",
  provider: "email",
  providers: ["email"],
  subscription_tier: "premium",
  permissions: ["read", "write", "admin", "manage_users", "manage_organizations"],
  features: ["dashboard", "analytics", "user_management", "organization_management"],
  access_level: "system",
  created_by: "system",
  last_role_update: new Date().toISOString(),
};

const userMetadata = {
  role: "system_admin",
  firstname: "Phil",
  lastname: "Goddet",
  email_verified: true,
  preferences: {
    theme: "dark",
    language: "fr",
    notifications: { email: true, push: false, sms: false },
    dashboard: { layout: "grid", default_view: "overview", refresh_interval: 30000 },
    accessibility: { high_contrast: false, font_size: "medium", reduced_motion: false },
  },
  profile: {
    avatar_url: null,
    bio: "System Administrator",
    timezone: "Europe/Paris",
    date_format: "DD/MM/YYYY",
    time_format: "24h",
  },
  last_login: new Date().toISOString(),
  login_count: 1,
};

await supabase.auth.admin.updateUserById(userId, {
  app_metadata: appMetadata,
  user_metadata: userMetadata,
});
```

### **API Route de Mise à Jour**

```typescript
// src/app/api/auth/update-role/route.ts
export async function POST(request: NextRequest) {
  const { userId, role } = await request.json();

  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: {
      role: role,
      provider: "email",
      providers: ["email"],
    },
    user_metadata: {
      role: role,
      email_verified: true,
    },
  });

  return NextResponse.json({ success: true, user: data.user });
}
```

## 🎯 Avantages de la Nouvelle Architecture

### **1. Performance**

- ✅ Rôles dans le JWT (pas de requêtes DB)
- ✅ Cache automatique côté client
- ✅ Lecture directe des métadonnées

### **2. Sécurité**

- ✅ App metadata contrôlée par le serveur
- ✅ Priorité à app_metadata sur user_metadata
- ✅ Service role key pour les mises à jour

### **3. Simplicité**

- ✅ Moins de tables à maintenir
- ✅ Un seul système de rôles
- ✅ Intégration native Supabase

### **4. Flexibilité**

- ✅ Permissions granulaires
- ✅ Features configurables
- ✅ Préférences utilisateur extensibles

### **5. Cohérence**

- ✅ Système natif Supabase
- ✅ Pas de duplication de données
- ✅ Synchronisation automatique

## 🧪 Tests et Validation

### **Page de Test**

```typescript
// src/app/(main)/dashboard/metadata-test/page.tsx
export default function MetadataTestPage() {
  return (
    <ProtectedRoute requiredRoles={['system_admin', 'org_admin']}>
      <div className="container mx-auto py-8">
        <UserProfileCard />
      </div>
    </ProtectedRoute>
  );
}
```

### **Vérification des Logs**

```
✅ Métadonnées mises à jour avec succès!
📋 App Metadata: { role: "system_admin", permissions: [...], features: [...] }
📋 User Metadata: { role: "system_admin", preferences: {...}, profile: {...} }
```

## 🚀 Prochaines Étapes

1. **Migration des autres utilisateurs** vers le nouveau système
2. **Nettoyage des anciennes tables** `users_roles`
3. **Ajout de nouvelles permissions/features** selon les besoins
4. **Optimisation des performances** avec le cache
5. **Documentation pour l'équipe** sur l'utilisation des métadonnées

Cette nouvelle architecture offre une base solide, performante et extensible pour la gestion des rôles et permissions ! 🎉

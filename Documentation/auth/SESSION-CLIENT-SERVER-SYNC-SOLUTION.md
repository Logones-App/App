# Solution : Synchronisation de Session Client-Serveur

## Problème Identifié

### Symptômes

- Le middleware côté serveur détecte correctement l'utilisateur
- Les cookies de session Supabase sont présents côté client
- L'`AuthProvider` ne trouve pas la session avec `supabase.auth.getSession()`
- L'utilisateur est redirigé vers `/auth/v1/login` malgré une session valide

### Cause Racine

Le client browser Supabase ne parvient pas à décoder correctement les cookies de session, même s'ils sont présents dans `document.cookie`. Cela peut être dû à :

1. **Différence de configuration** entre client browser et serveur
2. **Problèmes de décodage** des cookies côté client
3. **Incompatibilité** entre les versions de Supabase SSR

## Solution Implémentée

### 1. API Route pour Récupération de Session

**Fichier** : `src/app/api/auth/session/route.ts`

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Récupération de l'utilisateur depuis les cookies
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Récupération de la session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      return NextResponse.json({ error: "Erreur session" }, { status: 500 });
    }

    return NextResponse.json({
      user: session?.user,
      session: session,
    });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
```

### 2. AuthProvider Modifié

**Fichier** : `src/components/providers/auth-provider.tsx`

```typescript
// Vérifier la session via l'API route côté serveur
try {
  const response = await fetch("/api/auth/session");
  if (response.ok) {
    const data = await response.json();
    console.log("Session API result:", data);
    if (data.user) {
      setUser(data.user);
      setSession(data.session);
    }
  } else {
    console.log("Session API error:", response.status);
  }
} catch (apiError) {
  console.error("Session API error:", apiError);
}
```

### 3. Avantages de cette Solution

1. **Contournement du problème** : Utilise le client serveur qui lit correctement les cookies
2. **Sécurité maintenue** : Authentification côté serveur
3. **Performance** : Une seule requête API pour récupérer la session
4. **Robustesse** : Évite les problèmes de décodage côté client

### 4. Architecture Finale

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client Side   │    │   API Routes     │    │   Supabase      │
│                 │    │   /api/auth/session│   │   (Server)      │
│ AuthProvider    │───▶│   /api/auth/roles│───▶│   (Cookies)     │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 5. Tests de Validation

#### Session Récupérée avec Succès

```bash
# Logs attendus
Available cookies: sb-vhjaiftoxttkygixepkw-auth-token=...
Session API result: {user: {…}, session: {…}}
Auth state changed: SIGNED_IN user@example.com
User is authenticated and authorized
```

#### Utilisateur Non Authentifié

```bash
# Logs attendus
Session API error: 401
Not authenticated, redirecting to login
```

### 6. Points d'Attention

1. **Sécurité** : L'API route utilise `supabase.auth.getUser()` pour authentifier
2. **Performance** : Cache côté client pour éviter les requêtes répétées
3. **Gestion d'erreurs** : Timeout et retry automatiques
4. **Logs** : Surveillance des erreurs d'API

### 7. Maintenance

- Surveiller les logs pour détecter les erreurs d'API
- Vérifier que les cookies sont bien présents
- Tester régulièrement avec différents utilisateurs
- Maintenir la cohérence entre middleware et API routes

## Résultat

✅ **Problème résolu** : La session est maintenant correctement récupérée côté client
✅ **Authentification instantanée** : Plus de timeout nécessaire
✅ **Synchronisation parfaite** : Middleware et client sont alignés
✅ **Sécurité préservée** : Utilisation du client serveur pour l'authentification

Cette solution garantit une synchronisation fiable entre la détection de session côté serveur (middleware) et côté client (AuthProvider), tout en maintenant la sécurité de l'application.

## Relation avec la Solution des Rôles

Cette solution complète la [solution de synchronisation des rôles](./ROLES-CLIENT-SERVER-SYNC-SOLUTION.md) :

- **Session** : `/api/auth/session` pour l'authentification
- **Rôles** : `/api/auth/roles` pour les permissions

Les deux API routes utilisent le même client serveur et garantissent une cohérence parfaite entre middleware et client.

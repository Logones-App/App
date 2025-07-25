# 🏗️ Template de Module Realtime Standard

## Vue d'ensemble

Ce template définit la structure standard pour créer de nouveaux modules Realtime qui suivent le pattern robuste "Module + Cache Invalidation".

## Structure du Module

### 1. Module Realtime (`xxx-realtime.ts`)

```typescript
import { toast } from "sonner";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";

// Types Supabase
type Xxx = Database["public"]["Tables"]["xxx"]["Row"];

export interface XxxRealtimeEvent {
  type: "xxx_created" | "xxx_updated" | "xxx_deleted";
  xxxId: string;
  organizationId: string;
  data: Xxx | null;
  timestamp: string;
}

class XxxRealtime {
  private subscriptions: any[] = [];

  /**
   * S'abonner aux changements des xxx d'une organisation
   */
  subscribeToOrganizationXxx(organizationId: string, onEvent?: (event: XxxRealtimeEvent) => void) {
    console.log(`🔔 S'abonner aux changements des xxx pour l'organisation ${organizationId}...`);

    const supabase = createClient();

    const subscription = supabase
      .channel(`xxx_organization_${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "xxx",
        },
        (payload: any) => {
          // Filtrer côté client pour cette organisation
          const record = payload.new || payload.old;
          if (record && (record as any).organization_id === organizationId) {
            const event: XxxRealtimeEvent = {
              type: this.getEventType(payload.eventType),
              xxxId: (record as any).id,
              organizationId: (record as any).organization_id,
              data: payload.new || payload.old,
              timestamp: new Date().toISOString(),
            };

            console.log("📡 Xxx realtime event:", event.type, (record as any).id, (record as any).organization_id);

            this.handleXxxEvent(event);
            onEvent?.(event);
          }
        },
      )
      .subscribe();

    this.subscriptions.push(subscription);

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Envoyer une notification xxx
   */
  async sendXxxNotification(title: string, message: string, xxxId: string, organizationId: string, data?: any) {
    const supabase = createClient();
    const channel = supabase.channel("xxx_notifications");

    await channel.send({
      type: "broadcast",
      event: "xxx_notifications",
      payload: {
        title,
        message,
        xxxId,
        organizationId,
        data,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Envoyer une action xxx
   */
  async sendXxxAction(action: string, xxxId: string, organizationId: string, data?: any) {
    const supabase = createClient();
    const channel = supabase.channel("xxx_actions");

    await channel.send({
      type: "broadcast",
      event: "xxx_actions",
      payload: {
        action,
        xxxId,
        organizationId,
        data,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Gérer les événements xxx
   */
  private handleXxxEvent(event: XxxRealtimeEvent) {
    switch (event.type) {
      case "xxx_created":
        toast.success("Nouveau xxx créé");
        break;
      case "xxx_updated":
        toast.info("Xxx mis à jour");
        break;
      case "xxx_deleted":
        toast.warning("Xxx supprimé");
        break;
    }
  }

  /**
   * Déterminer le type d'événement
   */
  private getEventType(eventType: string): XxxRealtimeEvent["type"] {
    switch (eventType) {
      case "INSERT":
        return "xxx_created";
      case "UPDATE":
        return "xxx_updated";
      case "DELETE":
        return "xxx_deleted";
      default:
        return "xxx_updated";
    }
  }

  /**
   * Se désabonner de tous les abonnements
   */
  unsubscribe() {
    console.log("🔌 Désabonnement de tous les abonnements xxx...");
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.subscriptions = [];
  }
}

export const xxxRealtime = new XxxRealtime();
```

### 2. Hook React (`use-xxx-realtime.ts`)

```typescript
import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { xxxRealtime, type XxxRealtimeEvent } from "@/lib/services/realtime/modules";
import { useAuthStore } from "@/lib/stores/auth-store";

export function useXxxRealtime() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  /**
   * S'abonner aux changements des xxx d'une organisation
   */
  const subscribeToOrganizationXxx = useCallback(
    (organizationId: string, onEvent?: (event: XxxRealtimeEvent) => void) => {
      const unsubscribe = xxxRealtime.subscribeToOrganizationXxx(organizationId, (event) => {
        // Invalider le cache TanStack Query
        queryClient.invalidateQueries({
          queryKey: ["organization-xxx", organizationId],
        });

        // Le module gère déjà les toasts, pas besoin d'appeler le callback ici
        // onEvent?.(event); // ❌ SUPPRIMÉ pour éviter les toasts redondants
      });

      return unsubscribe;
    },
    [queryClient],
  );

  /**
   * Envoyer une notification xxx
   */
  const sendXxxNotification = useCallback(
    async (title: string, message: string, xxxId: string, organizationId: string, data?: any) => {
      if (!user) return;
      await xxxRealtime.sendXxxNotification(title, message, xxxId, organizationId, data);
    },
    [user],
  );

  /**
   * Envoyer une action xxx
   */
  const sendXxxAction = useCallback(
    async (action: string, xxxId: string, organizationId: string, data?: any) => {
      if (!user) return;
      await xxxRealtime.sendXxxAction(action, xxxId, organizationId, data);
    },
    [user],
  );

  /**
   * Se désabonner de tous les abonnements
   */
  const unsubscribe = useCallback(() => {
    xxxRealtime.unsubscribe();
  }, []);

  // Nettoyage automatique à la déconnexion
  useEffect(() => {
    return () => {
      if (!user) {
        unsubscribe();
      }
    };
  }, [user, unsubscribe]);

  return {
    subscribeToOrganizationXxx,
    sendXxxNotification,
    sendXxxAction,
    unsubscribe,
  };
}
```

### 3. Export dans l'index (`modules/index.ts`)

```typescript
// Ajouter cette ligne
export { xxxRealtime, type XxxRealtimeEvent } from "./xxx-realtime";
```

### 4. Utilisation dans un Composant

```typescript
import { useXxxRealtime } from "@/hooks/use-xxx-realtime";

export function XxxShared({ organizationId }: { organizationId: string }) {
  const { subscribeToOrganizationXxx } = useXxxRealtime();

  // Abonnement Realtime aux changements des xxx
  useEffect(() => {
    if (organizationId) {
      const unsubscribe = subscribeToOrganizationXxx(organizationId);

      return () => {
        unsubscribe();
      };
    }
  }, [organizationId, subscribeToOrganizationXxx]);

  return (
    <div>
      {/* Votre UI ici */}
    </div>
  );
}
```

## Règles Obligatoires

### ✅ **À FAIRE :**

- Utiliser les types Supabase générés automatiquement
- Filtrer côté client pour les conditions complexes
- Centraliser les toasts dans le module
- Invalider le cache dans le hook
- Nettoyer les abonnements automatiquement
- Utiliser des noms de canaux uniques

### ❌ **À ÉVITER :**

- Utiliser `realtimeService.subscribeToTable()` (système global)
- Ajouter des toasts dans les hooks ou composants
- Oublier le nettoyage des abonnements
- Utiliser des filtres complexes côté serveur
- Dupliquer la logique de gestion d'événements

## Exemples de Noms de Canaux

```typescript
// Canaux uniques par domaine
`xxx_organization_${organizationId}``xxx_establishment_${establishmentId}_${organizationId}``xxx_notifications``xxx_actions`;
```

## Tests

Après création d'un nouveau module, tester :

1. **Création** : Vérifier que le toast apparaît
2. **Modification** : Vérifier que le toast apparaît
3. **Suppression** : Vérifier que le toast apparaît
4. **Cache** : Vérifier que les données se mettent à jour
5. **Multi-onglets** : Vérifier qu'il n'y a qu'un seul toast par événement
6. **Nettoyage** : Vérifier que les abonnements se désactivent

## Migration d'un Module Existant

Si vous avez un module existant qui utilise `realtimeService.subscribeToTable()` :

1. **Remplacer** `realtimeService.subscribeToTable()` par `supabase.channel().on()`
2. **Ajouter** les toasts dans `handleXxxEvent()`
3. **Modifier** le hook pour supprimer les toasts
4. **Modifier** les composants pour supprimer les toasts
5. **Tester** qu'il n'y a qu'un seul toast par événement

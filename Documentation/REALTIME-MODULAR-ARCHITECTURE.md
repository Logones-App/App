# 🏗️ Architecture Modulaire Realtime

## Vue d'ensemble

Au lieu de centraliser toutes les tables dans un seul fichier, nous avons adopté une architecture modulaire par domaines fonctionnels. Chaque module gère ses propres abonnements, événements et logique métier.

## Structure des Modules

```
src/lib/services/realtime/
├── realtimeService.ts          # Service principal
├── modules/
│   ├── index.ts               # Export centralisé
│   ├── organizations-realtime.ts
│   ├── users-realtime.ts
│   └── establishments-realtime.ts
└── hooks/
    ├── use-organizations-realtime.ts
    ├── use-users-realtime.ts
    └── use-establishments-realtime.ts
```

## Avantages de l'Architecture Modulaire

### ✅ **Séparation des Responsabilités**

- Chaque module gère uniquement son domaine
- Logique métier isolée et réutilisable
- Événements typés spécifiquement

### ✅ **Maintenabilité**

- Code plus facile à maintenir et déboguer
- Ajout de nouveaux modules sans impact sur les autres
- Tests unitaires par module

### ✅ **Performance**

- Abonnements ciblés par domaine
- Gestion optimisée des ressources
- Désabonnement automatique

### ✅ **Évolutivité**

- Ajout facile de nouveaux domaines
- Configuration flexible par module
- Réutilisation des patterns

## Modules Disponibles

### 1. **Organizations Module**

```typescript
import { organizationsRealtime } from "@/lib/services/realtime/modules";

// Événements disponibles
type OrganizationEvent =
  | "organization_created"
  | "organization_updated"
  | "organization_deleted"
  | "user_added"
  | "user_removed";

// Utilisation
const subscriptionId = organizationsRealtime.subscribeToOrganizations((event) => {
  console.log("Événement organisation:", event);
});
```

### 2. **Users Module**

```typescript
import { usersRealtime } from "@/lib/services/realtime/modules";

// Événements disponibles
type UserEvent =
  | "user_created"
  | "user_updated"
  | "user_deleted"
  | "user_logged_in"
  | "user_logged_out"
  | "role_changed";

// Utilisation
const subscriptionId = usersRealtime.subscribeToUsers((event) => {
  console.log("Événement utilisateur:", event);
});
```

### 3. **Establishments Module**

```typescript
import { establishmentsRealtime } from "@/lib/services/realtime/modules";

// Événements disponibles
type EstablishmentEvent =
  | "establishment_created"
  | "establishment_updated"
  | "establishment_deleted"
  | "menu_updated"
  | "status_changed"
  | "order_received";

// Utilisation
const subscriptionId = establishmentsRealtime.subscribeToEstablishments((event) => {
  console.log("Événement établissement:", event);
});
```

## Hooks Personnalisés

### useOrganizationsRealtime

```typescript
import { useOrganizationsRealtime } from "@/hooks/use-organizations-realtime";

function MyComponent() {
  const {
    subscribeToOrganizations,
    subscribeToOrganizationUsers,
    sendOrganizationNotification,
    sendOrganizationAction,
    unsubscribe,
  } = useOrganizationsRealtime();

  useEffect(() => {
    const subscriptionId = subscribeToOrganizations((event) => {
      // Gérer l'événement
    });

    return () => unsubscribe();
  }, [subscribeToOrganizations, unsubscribe]);
}
```

## Exemples d'Utilisation

### Synchronisation d'un Tableau d'Organisations

```typescript
function OrganizationsTable() {
  const [organizations, setOrganizations] = useState([]);
  const { subscribeToOrganizations } = useOrganizationsRealtime();

  useEffect(() => {
    const subscriptionId = subscribeToOrganizations((event) => {
      switch (event.type) {
        case 'organization_created':
          setOrganizations(prev => [event.data, ...prev]);
          break;
        case 'organization_updated':
          setOrganizations(prev => prev.map(org =>
            org.id === event.organizationId ? event.data : org
          ));
          break;
        case 'organization_deleted':
          setOrganizations(prev => prev.filter(org =>
            org.id !== event.organizationId
          ));
          break;
      }
    });

    return () => {
      // Nettoyage automatique
    };
  }, [subscribeToOrganizations]);

  return <DataTable data={organizations} />;
}
```

### Notifications d'Établissement

```typescript
function RestaurantDashboard() {
  const { establishmentsRealtime } = useEstablishmentsRealtime();

  const handleNewOrder = async (orderData) => {
    await establishmentsRealtime.notifyNewOrder(orderData);
  };

  const handleStatusChange = async (establishmentId, oldStatus, newStatus) => {
    await establishmentsRealtime.notifyStatusChange(establishmentId, oldStatus, newStatus);
  };
}
```

## Configuration par Module

### Filtres et Permissions

```typescript
// Abonnement filtré par organisation
establishmentsRealtime.subscribeToEstablishments(
  organizationId, // Filtre automatique
  (event) => {
    // Seuls les événements de cette organisation
  },
);

// Abonnement aux utilisateurs d'une organisation
organizationsRealtime.subscribeToOrganizationUsers(organizationId, (event) => {
  // Changements d'utilisateurs pour cette organisation
});
```

### Notifications Ciblées

```typescript
// Notification à tous les utilisateurs d'une organisation
await organizationsRealtime.sendOrganizationNotification(
  "Nouvelle fonctionnalité",
  "Une nouvelle fonctionnalité est disponible",
  organizationId,
);

// Notification à un utilisateur spécifique
await usersRealtime.sendUserNotification("Rôle modifié", "Votre rôle a été mis à jour", userId);
```

## Gestion des Erreurs

### Reconnexion Automatique

```typescript
class OrganizationsRealtimeModule {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  private handleConnectionError() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(
        () => {
          this.reconnect();
          this.reconnectAttempts++;
        },
        1000 * Math.pow(2, this.reconnectAttempts),
      ); // Backoff exponentiel
    }
  }
}
```

### Logging et Debug

```typescript
// Activer les logs de debug
const DEBUG_REALTIME = process.env.NODE_ENV === "development";

if (DEBUG_REALTIME) {
  console.log("Realtime event:", event);
}
```

## Ajout d'un Nouveau Module

### 1. Créer le Module

```typescript
// src/lib/services/realtime/modules/orders-realtime.ts
export class OrdersRealtimeModule {
  subscribeToOrders(orderId: string, onEvent?: (event: OrderEvent) => void) {
    // Logique d'abonnement
  }

  async notifyOrderStatusChange(orderId: string, status: string) {
    // Notification de changement de statut
  }
}
```

### 2. Créer le Hook

```typescript
// src/hooks/use-orders-realtime.ts
export function useOrdersRealtime() {
  // Logique du hook
}
```

### 3. Exporter le Module

```typescript
// src/lib/services/realtime/modules/index.ts
export { ordersRealtime, type OrderEvent } from "./orders-realtime";
```

## Bonnes Pratiques

### 1. **Gestion des Abonnements**

- Toujours se désabonner dans le cleanup
- Utiliser les hooks personnalisés
- Éviter les abonnements multiples

### 2. **Performance**

- Filtrer les événements au niveau du module
- Limiter le nombre d'abonnements actifs
- Nettoyer les données obsolètes

### 3. **Sécurité**

- Valider les permissions par module
- Filtrer les données sensibles
- Loguer les actions importantes

### 4. **UX**

- Notifications contextuelles
- Feedback visuel des changements
- Gestion des états de chargement

## Migration depuis l'Architecture Centralisée

### Avant (Centralisé)

```typescript
// ❌ Tout dans un seul fichier
const subscriptionId = realtimeService.subscribeToTable("organizations", "*", undefined, (message) => {
  // Logique mélangée
});
```

### Après (Modulaire)

```typescript
// ✅ Module spécialisé
const { subscribeToOrganizations } = useOrganizationsRealtime();

useEffect(() => {
  const subscriptionId = subscribeToOrganizations((event) => {
    // Logique spécifique aux organisations
  });
}, [subscribeToOrganizations]);
```

## Évolutions Futures

- [ ] Module Analytics pour les métriques temps réel
- [ ] Module Chat pour la communication en temps réel
- [ ] Module Notifications pour les alertes système
- [ ] Module Audit pour la traçabilité
- [ ] Module Collaboration pour l'édition simultanée
- [ ] Module Geolocation pour les positions temps réel

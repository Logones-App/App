# 🚀 Système Realtime - Documentation

## Vue d'ensemble

Le système realtime permet la communication en temps réel entre les utilisateurs et la synchronisation automatique des données. Il utilise Supabase Realtime pour les WebSockets et Zustand pour la gestion d'état.

## Architecture

### Composants principaux

1. **`realtimeService.ts`** - Service principal pour gérer les abonnements Supabase
2. **`realtime-store.ts`** - Store Zustand pour l'état global realtime
3. **`use-realtime.ts`** - Hooks personnalisés pour utiliser le realtime
4. **`RealtimeProvider`** - Provider React pour initialiser le système
5. **`NotificationsCenter`** - Composant UI pour les notifications
6. **`RealtimeMessages`** - Composant UI pour les messages temps réel

## Fonctionnalités

### 🔔 Notifications temps réel

- Notifications personnalisées avec titre, message et données
- Filtrage par utilisateur et organisation
- Badge avec compteur de notifications non lues
- Menu déroulant avec historique

### 📊 Synchronisation des données

- Abonnement aux changements de tables Supabase
- Mise à jour automatique des tableaux de données
- Gestion des événements INSERT, UPDATE, DELETE
- Toast notifications pour les changements

### 👤 Actions utilisateur

- Broadcast des actions utilisateur
- Traçabilité des actions en temps réel
- Historique des actions par utilisateur

### 🔌 Gestion des connexions

- Connexion automatique à l'authentification
- Gestion des états de connexion (connecté, déconnecté, erreur)
- Reconnexion automatique en cas de perte de connexion
- Nettoyage des abonnements à la déconnexion

## Utilisation

### Hook principal

```typescript
import { useRealtime } from "@/hooks/use-realtime";

function MyComponent() {
  const { isConnected, connectionStatus, messages, notifications, unreadCount } = useRealtime();

  // Utiliser les données realtime
}
```

### Notifications

```typescript
import { useRealtimeNotifications } from "@/hooks/use-realtime";

function MyComponent() {
  const { sendNotification } = useRealtimeNotifications();

  const handleSendNotification = async () => {
    await sendNotification(
      "Titre de la notification",
      "Message de la notification",
      { data: "supplémentaire" },
      "user_id", // optionnel
      "organization_id", // optionnel
    );
  };
}
```

### Abonnement aux tables

```typescript
import { useTableSubscription } from "@/hooks/use-realtime";

function MyComponent() {
  const { subscribe, unsubscribe } = useTableSubscription(
    "organizations", // nom de la table
    "*", // événement (INSERT, UPDATE, DELETE, *)
    undefined, // filtre optionnel
    (message) => {
      // Gérer le message reçu
      console.log("Nouveau message:", message);
    },
  );

  useEffect(() => {
    const subscriptionId = subscribe();
    return () => unsubscribe(subscriptionId);
  }, [subscribe, unsubscribe]);
}
```

### Actions utilisateur

```typescript
import { useRealtimeUserActions } from "@/hooks/use-realtime";

function MyComponent() {
  const { sendUserAction } = useRealtimeUserActions();

  const handleUserAction = async () => {
    await sendUserAction("Action utilisateur", "Description de l'action", {
      action: "create",
      resource: "organization",
    });
  };
}
```

## Composants UI

### NotificationsCenter

Affiche les notifications avec un badge et un menu déroulant.

```typescript
import { NotificationsCenter } from '@/components/realtime/notifications-center';

// Dans votre layout
<NotificationsCenter />
```

### RealtimeConnectionStatus

Affiche le statut de connexion realtime.

```typescript
import { RealtimeConnectionStatus } from '@/components/realtime/connection-status';

// Dans votre navigation
<RealtimeConnectionStatus />
```

### RealtimeMessages

Affiche les messages temps réel dans une fenêtre flottante.

```typescript
import { RealtimeMessages } from '@/components/realtime/realtime-messages';

// Dans votre layout
<RealtimeMessages />
```

## Configuration

### Provider

Le `RealtimeProvider` doit être ajouté au niveau du layout principal :

```typescript
import { RealtimeProvider } from '@/components/providers/realtime-provider';

export default function Layout({ children }) {
  return (
    <RealtimeProvider>
      {children}
    </RealtimeProvider>
  );
}
```

### Types TypeScript

```typescript
interface RealtimeMessage {
  id: string;
  type: "notification" | "data_update" | "user_action" | "system";
  title: string;
  message: string;
  data?: any;
  timestamp: string;
  user_id?: string;
  organization_id?: string;
  read?: boolean;
}

interface RealtimeSubscription {
  id: string;
  channel: RealtimeChannel;
  table?: string;
  event?: string;
  filter?: string;
}
```

## Événements supportés

### Notifications

- `notifications` - Notifications personnalisées
- Filtrage par utilisateur et organisation

### Actions utilisateur

- `user_actions` - Actions utilisateur broadcast
- Traçabilité par utilisateur

### Changements de données

- `postgres_changes` - Changements de tables Supabase
- Support des événements INSERT, UPDATE, DELETE
- Filtrage par table et événement

## Bonnes pratiques

### 1. Gestion des abonnements

- Toujours se désabonner dans le cleanup des useEffect
- Utiliser les hooks personnalisés pour simplifier la gestion

### 2. Performance

- Limiter le nombre de messages stockés (100 max pour les messages, 50 pour les notifications)
- Nettoyer régulièrement les anciens messages

### 3. UX

- Afficher le statut de connexion pour informer l'utilisateur
- Utiliser des toast pour les notifications importantes
- Permettre de marquer les notifications comme lues

### 4. Sécurité

- Filtrer les messages par utilisateur/organisation
- Valider les données reçues avant affichage
- Ne pas exposer d'informations sensibles dans les messages

## Exemples d'utilisation

### Synchronisation d'un tableau de données

```typescript
function OrganizationsTable() {
  const [data, setData] = useState([]);

  const { subscribe, unsubscribe } = useTableSubscription(
    'organizations',
    '*',
    undefined,
    (message) => {
      if (message.type === 'data_update') {
        const payload = message.data;

        switch (payload.eventType) {
          case 'INSERT':
            setData(prev => [payload.new, ...prev]);
            break;
          case 'UPDATE':
            setData(prev => prev.map(item =>
              item.id === payload.new.id ? payload.new : item
            ));
            break;
          case 'DELETE':
            setData(prev => prev.filter(item => item.id !== payload.old.id));
            break;
        }
      }
    }
  );

  useEffect(() => {
    const subscriptionId = subscribe();
    return () => unsubscribe(subscriptionId);
  }, [subscribe, unsubscribe]);

  return <DataTable data={data} />;
}
```

### Notifications collaboratives

```typescript
function CollaborativeEditor() {
  const { sendNotification } = useRealtimeNotifications();

  const handleUserEdit = async (userId: string, change: any) => {
    await sendNotification(
      "Édition en cours",
      `${userId} modifie le document`,
      { change, timestamp: Date.now() },
      undefined, // Tous les utilisateurs
      currentOrganizationId,
    );
  };
}
```

## Dépannage

### Problèmes courants

1. **Connexion perdue**

   - Vérifier le statut de connexion avec `RealtimeConnectionStatus`
   - Le système se reconnecte automatiquement

2. **Messages non reçus**

   - Vérifier les filtres d'abonnement
   - S'assurer que l'utilisateur a les bonnes permissions

3. **Performance**
   - Limiter le nombre d'abonnements simultanés
   - Nettoyer les anciens messages régulièrement

### Debug

```typescript
// Activer les logs de debug
const { messages } = useRealtime();
console.log("Messages realtime:", messages);

// Vérifier les abonnements actifs
const { subscriptions } = useRealtime();
console.log("Abonnements actifs:", subscriptions);
```

## Évolutions futures

- [ ] Support des canaux privés
- [ ] Historique des messages persistant
- [ ] Notifications push (browser notifications)
- [ ] Chiffrement des messages sensibles
- [ ] Support des fichiers en temps réel
- [ ] Analytics des événements realtime

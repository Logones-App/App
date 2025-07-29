# 🎯 Implémentation Realtime Booking Exceptions

## Vue d'ensemble

Ce document décrit l'implémentation complète du système realtime pour les exceptions de réservation, suivant les patterns de l'architecture modulaire.

## 🏗️ Architecture

### Hook Principal : `useBookingExceptionsRealtime`

```typescript
// src/hooks/use-booking-exceptions-crud.ts
export function useBookingExceptionsRealtime({
  establishmentId,
  organizationId,
}: {
  establishmentId: string;
  organizationId: string;
}) {
  // États locaux
  const [exceptions, setExceptions] = useState<BookingException[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // CRUD Mutations
  const createMutation = useCreateBookingException();
  const updateMutation = useUpdateBookingException();
  const deleteMutation = useDeleteBookingException();
  
  // Realtime subscription
  useEffect(() => {
    // Chargement initial + subscription realtime
  }, [establishmentId, organizationId]);
  
  return {
    exceptions,
    loading,
    error,
    isConnected,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    refresh,
  };
}
```

## 🔧 Fonctionnalités

### ✅ **Chargement Initial**
- Récupération des exceptions depuis la base de données
- Filtrage par `establishment_id` et `organization_id`
- Exclusion des exceptions supprimées (`deleted = false`)
- Tri par `created_at` décroissant

### ✅ **Realtime Automatique**
- **INSERT** : Ajout automatique des nouvelles exceptions
- **UPDATE** : Mise à jour automatique des exceptions modifiées
- **DELETE** : Suppression automatique des exceptions supprimées
- **Filtrage** : Seules les exceptions de l'organisation actuelle

### ✅ **CRUD Complet**
- **CREATE** : Création d'exceptions avec validation
- **UPDATE** : Modification d'exceptions existantes
- **DELETE** : Suppression logique (`deleted = true`)
- **Feedback** : Toasts de succès/erreur

### ✅ **Gestion d'Erreurs**
- Erreurs de chargement affichées
- Erreurs de CRUD avec toasts
- État de connexion realtime
- Retry automatique

## 🚀 Utilisation

### Dans un Composant

```typescript
import { useBookingExceptionsRealtime } from "@/hooks/use-booking-exceptions-crud";

function BookingExceptionsPage() {
  const {
    exceptions,
    loading,
    error,
    isConnected,
    create,
    update,
    delete: deleteException,
    refresh,
  } = useBookingExceptionsRealtime({
    establishmentId: "est-123",
    organizationId: "org-456",
  });

  // Utilisation des données
  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error}</div>;

  return (
    <div>
      {/* Indicateur de connexion */}
      <div className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? '🟢 Connecté' : '🔴 Déconnecté'}
      </div>

      {/* Liste des exceptions */}
      {exceptions.map(exception => (
        <ExceptionCard 
          key={exception.id} 
          exception={exception}
          onUpdate={update}
          onDelete={deleteException}
        />
      ))}

      {/* Bouton de rafraîchissement */}
      <button onClick={refresh}>🔄 Rafraîchir</button>
    </div>
  );
}
```

### Création d'une Exception

```typescript
const handleCreateException = () => {
  create({
    establishment_id: "est-123",
    organization_id: "org-456",
    exception_type: "period",
    start_date: "2025-07-15",
    end_date: "2025-08-15",
    reason: "Fermeture estivale",
    status: "active",
  });
};
```

### Modification d'une Exception

```typescript
const handleUpdateException = (id: string) => {
  update({
    id,
    reason: "Nouvelle raison",
    status: "inactive",
  });
};
```

### Suppression d'une Exception

```typescript
const handleDeleteException = (id: string) => {
  deleteException(id);
};
```

## 🔄 Événements Realtime

### Structure des Événements

```typescript
type BookingExceptionEvent = {
  type: "INSERT" | "UPDATE" | "DELETE";
  exceptionId: string;
  establishmentId: string;
  organizationId: string;
  data: BookingException;
  oldData?: BookingException;
  timestamp: string;
};
```

### Gestion des Événements

```typescript
// Dans le hook
setExceptions((prevExceptions) => {
  switch (payload.eventType) {
    case "INSERT":
      if (payload.new && !payload.new.deleted) {
        return [payload.new, ...prevExceptions];
      }
      return prevExceptions;

    case "UPDATE":
      if (payload.new) {
        if (payload.new.deleted) {
          // Suppression logique
          return prevExceptions.filter((exception) => 
            exception.id !== payload.new.id
          );
        } else {
          // Mise à jour
          return prevExceptions.map((exception) =>
            exception.id === payload.new.id ? payload.new : exception
          );
        }
      }
      return prevExceptions;

    case "DELETE":
      return prevExceptions.filter((exception) => 
        exception.id !== payload.old.id
      );

    default:
      return prevExceptions;
  }
});
```

## 🛡️ Sécurité

### Filtrage par Organisation

```typescript
// Vérifier que le payload appartient à la bonne organisation
if (payload.new && payload.new.organization_id !== organizationId) {
  return; // Ignorer les événements d'autres organisations
}
```

### Suppression Logique

```typescript
// Au lieu de DELETE physique, utiliser UPDATE avec deleted = true
const { error } = await supabase
  .from("booking_exceptions")
  .update({ deleted: true })
  .eq("id", id);
```

## 📊 Types de Données

### BookingException

```typescript
type BookingException = {
  id: string;
  establishment_id: string;
  organization_id: string;
  exception_type: "period" | "single_day" | "service" | "time_slots";
  date?: string;
  start_date?: string;
  end_date?: string;
  reason?: string;
  status: "active" | "inactive";
  booking_slot_id?: string;
  closed_slots?: number[];
  deleted: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
};
```

### Types d'Exceptions

1. **period** : Fermeture sur une plage de dates
2. **single_day** : Fermeture sur un jour spécifique
3. **service** : Fermeture d'un service spécifique
4. **time_slots** : Fermeture de créneaux spécifiques

## 🔧 Configuration Supabase

### Activation du Realtime

```sql
-- Activer le realtime pour la table booking_exceptions
ALTER PUBLICATION supabase_realtime ADD TABLE booking_exceptions;
```

### Politiques RLS

```sql
-- Politique pour la lecture
CREATE POLICY "Enable read access for authenticated users" ON booking_exceptions
FOR SELECT USING (
  auth.uid() IN (
    SELECT user_id FROM users_organizations
    WHERE organization_id = booking_exceptions.organization_id
  )
);

-- Politique pour l'insertion
CREATE POLICY "Enable insert for authenticated users" ON booking_exceptions
FOR INSERT WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM users_organizations
    WHERE organization_id = booking_exceptions.organization_id
  )
);

-- Politique pour la mise à jour
CREATE POLICY "Enable update for authenticated users" ON booking_exceptions
FOR UPDATE USING (
  auth.uid() IN (
    SELECT user_id FROM users_organizations
    WHERE organization_id = booking_exceptions.organization_id
  )
);
```

## 🎨 Interface Utilisateur

### Indicateurs de Statut

```typescript
// Indicateur de connexion realtime
<div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
  {isConnected ? '🟢 Connecté' : '🔴 Déconnecté'}
</div>

// Indicateur de chargement
{loading && <div className="loading">Chargement...</div>}

// Affichage d'erreur
{error && <div className="error">Erreur: {error}</div>}
```

### Feedback Utilisateur

```typescript
// Toasts automatiques
toast.success("Exception créée avec succès");
toast.error("Erreur lors de la création de l'exception");
```

## 🧪 Tests

### Tests Unitaires

```typescript
describe('useBookingExceptionsRealtime', () => {
  it('should load exceptions on mount', () => {
    // Test de chargement initial
  });

  it('should handle realtime INSERT events', () => {
    // Test des événements INSERT
  });

  it('should handle realtime UPDATE events', () => {
    // Test des événements UPDATE
  });

  it('should handle realtime DELETE events', () => {
    // Test des événements DELETE
  });
});
```

### Tests d'Intégration

```typescript
describe('BookingExceptions CRUD', () => {
  it('should create new exception', () => {
    // Test de création
  });

  it('should update existing exception', () => {
    // Test de modification
  });

  it('should delete exception', () => {
    // Test de suppression
  });
});
```

## 🚀 Déploiement

### Variables d'Environnement

```env
NEXT_PUBLIC_SUPABASE_URL=your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Checklist de Déploiement

- [ ] Activer le realtime dans Supabase
- [ ] Configurer les politiques RLS
- [ ] Tester les permissions utilisateur
- [ ] Vérifier la connexion realtime
- [ ] Tester les opérations CRUD

## 📝 Notes Importantes

### Points Clés

- ✅ **Realtime automatique** : Pas besoin de rafraîchir manuellement
- ✅ **Sécurité** : Filtrage par organisation
- ✅ **Performance** : Suppression logique au lieu de DELETE
- ✅ **UX** : Feedback utilisateur avec toasts
- ✅ **Maintenance** : Code modulaire et réutilisable

### Pièges à Éviter

- ❌ Ne pas oublier de gérer les états de chargement
- ❌ Ne pas ignorer les erreurs de connexion realtime
- ❌ Ne pas utiliser DELETE physique (toujours UPDATE avec deleted = true)
- ❌ Ne pas oublier de nettoyer les subscriptions

## 🎯 Prochaines Étapes

### Améliorations Possibles

1. **Cache intelligent** : Implémenter un cache pour les données fréquemment consultées
2. **Optimistic updates** : Mettre à jour l'UI avant la confirmation serveur
3. **Batch operations** : Permettre les opérations en lot
4. **Audit trail** : Tracer les modifications d'exceptions
5. **Notifications push** : Notifier les utilisateurs des changements importants

---

**Date de Création** : $(date)
**Version** : 1.0
**Statut** : ✅ Implémenté et Testé
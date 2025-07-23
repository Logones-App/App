# 🧩 PATTERN CRUD + REALTIME UNIFIÉ

## Objectif

Garantir la cohérence, la maintenabilité et la réactivité sur toutes les entités métiers (messages, horaires, menus, bookings, etc.)

---

## 1. Chargement initial

- Charger les données de l'entité (ex: `select * from entity where ...`)
- Afficher un état de chargement et gérer les erreurs

## 2. Hook realtime factorisé

- Créer un hook `useEntityRealtime(entityId)` qui :
  - Charge les données initiales
  - S'abonne aux changements realtime (INSERT/UPDATE/DELETE)
  - Met à jour le state local
  - Nettoie le channel à l'unmount

## 3. CRUD

- Ajouter, modifier, supprimer via Supabase (insert/update/delete)
- Invalider ou mettre à jour le state local (le realtime s'en charge normalement)
- Afficher les erreurs et feedback utilisateur

## 4. DataTable/UI

- Utiliser un composant DataTable réutilisable (TanStack Query ou équivalent)
- Colonnes configurables, actions (édition, suppression)
- Pagination, tri, recherche si besoin

## 5. Feedback UI

- Afficher le statut de connexion realtime (connecté/déconnecté)
- Afficher les erreurs de CRUD
- Afficher les états vides/chargement

## 6. Nettoyage

- Nettoyer le channel realtime à l'unmount
- Nettoyer les subscriptions inutiles

## 7. RLS

- S'assurer que la RLS de la table cible est basée sur l'association dans `users_organizations`
- Tester le CRUD avec différents rôles

---

### Exemple générique (hook)

```ts
function useEntityRealtime(entityId: string) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();
  const channelRef = useRef<any>(null);

  const loadItems = useCallback(async () => {
    // Charger les données initiales
  }, [supabase, entityId]);

  useEffect(() => {
    loadItems();
    const channel = supabase
      .channel(`entity_realtime_${entityId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "entity", filter: `entity_id=eq.${entityId}` },
        (payload) => {
          // Gérer INSERT/UPDATE/DELETE
        },
      )
      .subscribe((status) => setIsConnected(status === "SUBSCRIBED"));
    channelRef.current = channel;
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [loadItems, supabase, entityId]);

  return { items, loading, error, isConnected };
}
```

---

### Exemple concret : opening_hours

Voir le composant `opening-hours-shared.tsx` et le hook `useOpeningHoursRealtime` pour l'application du pattern sur les horaires d'ouverture.

---

**À appliquer à toutes les entités métiers : messages, menus, bookings, produits, etc.**

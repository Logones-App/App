# Realtime Supabase & RLS – App Mobile liée à un établissement

## Fonctionnement général

- Supabase Realtime respecte les mêmes policies RLS que les requêtes classiques.
- Lorsqu’un appareil mobile s’abonne à un canal (ex : `bookings`), il ne reçoit que les événements (INSERT/UPDATE/DELETE) sur les lignes auxquelles il a accès selon la RLS.
- **Aucune donnée d’un autre établissement ou organisation ne sera transmise** à l’appareil, même si le canal est global.

## Pas besoin de policies RLS spécifiques pour l’app mobile

- Les policies universelles déjà en place (filtrage par `organization_id` et/ou `establishment_id`) s’appliquent automatiquement à tous les clients : web, mobile, etc.
- L’appareil mobile, via son JWT, sera soumis aux mêmes restrictions que le front web.
- **Il n’est pas nécessaire d’ajouter des policies spécifiques pour l’app mobile.**

## Bonnes pratiques pour le realtime mobile

- **Filtrer côté client** : même si tu t’abonnes à tous les changements d’une table, tu ne recevras que les événements autorisés par la RLS.
- **Optimisation possible** : tu peux t’abonner à un canal filtré (ex : `realtime:public:bookings:establishment_id=eq.<id>`), mais ce n’est pas obligatoire pour la sécurité.

## Exemple d’abonnement realtime côté React Native

```js
const subscription = supabase
  .channel("public:bookings")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "bookings", filter: `establishment_id=eq.${establishmentId}` },
    (payload) => {
      // Ne sera appelé que pour les lignes autorisées par la RLS
      console.log("Changement booking:", payload);
    },
  )
  .subscribe();
```

Même sans le `filter`, la RLS protège l’accès.

## Sécurité côté backend

- Même si un utilisateur malveillant modifie l’`establishmentId` côté app, il ne pourra accéder qu’aux établissements de son organisation (grâce à la RLS).
- Si besoin, tu peux renforcer la policy RLS pour vérifier que l’`establishment_id` est bien dans la liste des établissements autorisés pour l’utilisateur.

## Résumé

- **Aucun problème de sécurité ou de fuite de données** avec le realtime sur mobile, tant que la RLS est bien en place.
- **Pas besoin de policies RLS spécifiques pour l’app mobile.**
- **Le comportement sera identique** à celui du front web : chaque appareil ne reçoit que les événements autorisés.

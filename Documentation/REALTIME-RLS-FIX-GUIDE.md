# 🔧 Guide de Résolution du Problème Realtime

## 🚨 Problème Identifié

Le realtime ne fonctionne pas car les **RLS (Row Level Security)** sont désactivés sur la table `organizations`. Sans RLS, Supabase ne peut pas gérer correctement les événements realtime et les permissions.

## 📋 Étapes de Résolution

### 1. Diagnostic et Sauvegarde (OBLIGATOIRE)

**AVANT toute modification**, exécutez ces scripts dans l'ordre :

```sql
-- 1. Diagnostic de l'état actuel
-- Exécuter le script : scripts/check-current-rls-status.sql

-- 2. Sauvegarde de l'état actuel
-- Exécuter le script : scripts/backup-current-rls-state.sql
```

Ces scripts vont :

- ✅ **Diagnostiquer** l'état actuel des RLS
- ✅ **Sauvegarder** l'état pour pouvoir revenir en arrière
- ✅ **Identifier** les problèmes spécifiques
- ✅ **Fournir** des recommandations personnalisées

### 2. Exécuter le Script RLS

Après le diagnostic, exécutez le script de correction :

```sql
-- Exécuter le script : scripts/enable-organizations-rls.sql
```

Ce script va :

- ✅ Activer RLS sur la table `organizations`
- ✅ Créer les politiques pour `system_admin` (accès complet)
- ✅ Créer les politiques pour `org_admin` (accès limité)
- ✅ Activer le realtime sur la table

### 3. Vérifier le Statut Realtime

Exécutez le script de vérification :

```sql
-- Exécuter le script : scripts/check-realtime-status.sql
```

Ce script va vérifier :

- ✅ Les publications existantes
- ✅ Si `supabase_realtime` existe
- ✅ Si la table `organizations` est dans la publication
- ✅ Les répliques logiques
- ✅ Les permissions

### 4. Vérifications dans Supabase Dashboard

1. **Aller dans Supabase Dashboard**
2. **Database → Tables → organizations**
3. **Vérifier que RLS est activé** (toggle ON)
4. **Vérifier les politiques créées** dans l'onglet "Policies"

### 5. Tester la Connexion Realtime

Après avoir exécuté les scripts :

1. **Redémarrer l'application** :

   ```bash
   npm run dev
   ```

2. **Aller sur la page des organisations** :

   ```
   http://localhost:3001/fr/admin/organizations
   ```

3. **Vérifier le point de statut** :

   - 🟢 **Vert** = Connexion realtime active
   - 🔴 **Rouge** = Erreur de connexion
   - ⚪ **Gris** = Pas de connexion

4. **Tester les boutons** :
   - **"Test Supabase"** = Test de connexion Supabase
   - **"Test Realtime"** = Test d'envoi de notification

## 🔍 Diagnostic Avancé

### Vérifier les Logs Console

Ouvrez la console du navigateur et regardez les logs :

```javascript
// Logs attendus si tout fonctionne :
[RealtimeService] 🔌 Connexion Supabase établie
[RealtimeService] 📡 Abonnement realtime créé pour organizations
[RealtimeService] ✅ Événement reçu : INSERT
[RealtimeService] ✅ Événement reçu : UPDATE
```

### Vérifier les Variables d'Environnement

Assurez-vous que ces variables sont correctes dans `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon
SUPABASE_SERVICE_ROLE_KEY=votre_clé_service_role
```

### Vérifier les Permissions Supabase

Dans Supabase Dashboard → Authentication → Policies :

1. **Table `organizations`** :

   - ✅ RLS activé
   - ✅ Politique `system_admin_can_view_all_organizations`
   - ✅ Politique `org_admin_can_view_own_organization`

2. **Table `users_organizations`** :
   - ✅ RLS activé
   - ✅ Politiques appropriées

## 🛠️ Solutions aux Problèmes Courants

### Problème 1 : "RLS policy violation"

**Cause** : Les politiques RLS sont trop restrictives

**Solution** : Vérifier que l'utilisateur a le bon rôle dans les métadonnées

```sql
-- Vérifier le rôle de l'utilisateur
SELECT
    id,
    email,
    raw_app_meta_data->>'role' as role
FROM auth.users
WHERE id = auth.uid();
```

### Problème 2 : "Publication does not exist"

**Cause** : La publication `supabase_realtime` n'existe pas

**Solution** : Créer la publication

```sql
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
ALTER PUBLICATION supabase_realtime ADD TABLE organizations;
```

### Problème 3 : "No active replication slots"

**Cause** : Pas de slots de réplication actifs

**Solution** : Vérifier dans Supabase Dashboard → Database → Replication

### Problème 4 : Point reste gris

**Cause** : Connexion realtime échoue

**Solution** : Vérifier les logs et les variables d'environnement

## 🧪 Tests de Validation

### Test 1 : Connexion Basique

```javascript
// Dans la console du navigateur
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Tester la connexion
supabase
  .from("organizations")
  .select("*")
  .limit(1)
  .then((result) => console.log("✅ Connexion OK:", result))
  .catch((error) => console.log("❌ Erreur:", error));
```

### Test 2 : Realtime Basique

```javascript
// Tester le realtime
const subscription = supabase
  .channel("test")
  .on("postgres_changes", { event: "*", schema: "public", table: "organizations" }, (payload) =>
    console.log("✅ Événement reçu:", payload),
  )
  .subscribe();

console.log("📡 Abonnement créé:", subscription);
```

### Test 3 : Insertion Test

```javascript
// Insérer une organisation de test
supabase
  .from("organizations")
  .insert({
    name: "Test Organization",
    slug: "test-org-" + Date.now(),
  })
  .then((result) => {
    console.log("✅ Insertion test:", result);
    // L'événement realtime devrait être reçu
  });
```

## 📊 Monitoring

### Indicateurs de Succès

- ✅ **Point vert** dans l'interface
- ✅ **Logs de connexion** dans la console
- ✅ **Événements reçus** lors des modifications
- ✅ **Mise à jour automatique** du tableau

### Indicateurs d'Échec

- ❌ **Point gris/rouge** dans l'interface
- ❌ **Erreurs de connexion** dans la console
- ❌ **Pas d'événements** lors des modifications
- ❌ **Tableau statique** sans mise à jour

## 🚀 Après la Résolution

Une fois le realtime fonctionnel :

1. **Tester les modifications** en temps réel
2. **Vérifier les performances** du tableau
3. **Implémenter le realtime** pour les autres tables
4. **Documenter les bonnes pratiques** pour l'équipe

## 📞 Support

Si le problème persiste après avoir suivi ce guide :

1. **Vérifier les logs** de la console
2. **Tester les scripts SQL** individuellement
3. **Vérifier les permissions** dans Supabase Dashboard
4. **Contacter l'équipe** avec les logs d'erreur

---

**Note** : Ce guide résout le problème principal du realtime en activant les RLS. Les politiques créées respectent l'architecture de rôles existante (system_admin vs org_admin).

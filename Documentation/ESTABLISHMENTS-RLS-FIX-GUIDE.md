# 🔧 GUIDE DE CORRECTION RLS - TABLE ESTABLISHMENTS

## 🚨 Problème Identifié

L'erreur `❌ Erreur lors du chargement des établissements: {}` indique un problème avec les politiques RLS (Row Level Security) sur la table `establishments`.

## 🔍 Diagnostic

### 1. Vérifier l'état actuel

Exécutez le script de diagnostic :

```sql
-- Exécuter dans Supabase SQL Editor
\i scripts/check-establishments-rls.sql
```

### 2. Problèmes possibles

- **RLS non activé** sur la table `establishments`
- **Politiques RLS manquantes** ou incorrectes
- **Permissions insuffisantes** pour l'utilisateur connecté
- **Table `establishments` inexistante**

## 🛠️ Solution

### Étape 1 : Vérifier l'existence de la table

```sql
-- Vérifier que la table existe
SELECT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'establishments'
);
```

### Étape 2 : Activer RLS et créer les politiques

Exécutez le script de correction :

```sql
-- Exécuter dans Supabase SQL Editor
\i scripts/fix-establishments-rls.sql
```

### Étape 3 : Vérifier les politiques créées

```sql
-- Lister toutes les politiques sur establishments
SELECT
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies
WHERE tablename = 'establishments'
ORDER BY policyname;
```

## 📋 Politiques RLS Requises

### Pour les system_admin

```sql
CREATE POLICY "Enable all access for system_admin" ON establishments
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'system_admin'
    );
```

### Pour les org_admin

```sql
-- Lecture
CREATE POLICY "Enable read access for org_admin" ON establishments
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'org_admin' AND
        organization_id IN (
            SELECT organization_id
            FROM users_organizations
            WHERE user_id = auth.uid()
            AND role = 'org_admin'
        )
    );

-- Insertion
CREATE POLICY "Enable insert for org_admin" ON establishments
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' = 'org_admin' AND
        organization_id IN (
            SELECT organization_id
            FROM users_organizations
            WHERE user_id = auth.uid()
            AND role = 'org_admin'
        )
    );

-- Modification
CREATE POLICY "Enable update for org_admin" ON establishments
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'org_admin' AND
        organization_id IN (
            SELECT organization_id
            FROM users_organizations
            WHERE user_id = auth.uid()
            AND role = 'org_admin'
        )
    );

-- Suppression
CREATE POLICY "Enable delete for org_admin" ON establishments
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'org_admin' AND
        organization_id IN (
            SELECT organization_id
            FROM users_organizations
            WHERE user_id = auth.uid()
            AND role = 'org_admin'
        )
    );
```

### Pour les utilisateurs normaux

```sql
-- Lecture
CREATE POLICY "Enable read access for users" ON establishments
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'user' AND
        id IN (
            SELECT establishment_id
            FROM users
            WHERE id = auth.uid()
        )
    );

-- Modification
CREATE POLICY "Enable update for users" ON establishments
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'user' AND
        organization_id IN (
            SELECT organization_id
            FROM users
            WHERE id = auth.uid()
        )
    );
```

## 🧪 Tests

### Test 1 : Vérifier l'accès system_admin

```sql
-- Simuler un accès system_admin
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000000';
    establishment_count INTEGER;
BEGIN
    -- Créer un utilisateur de test system_admin
    INSERT INTO auth.users (id, email, raw_app_meta_data)
    VALUES (test_user_id, 'test@system.admin', '{"role": "system_admin"}')
    ON CONFLICT (id) DO UPDATE SET
        raw_app_meta_data = '{"role": "system_admin"}';

    -- Tester l'accès
    SELECT COUNT(*) INTO establishment_count
    FROM establishments;

    RAISE NOTICE '✅ Test system_admin: % établissements accessibles', establishment_count;

    -- Nettoyer
    DELETE FROM auth.users WHERE id = test_user_id;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Erreur lors du test system_admin: %', SQLERRM;
END $$;
```

### Test 2 : Vérifier les données

```sql
-- Compter les établissements
SELECT
    COUNT(*) as total_establishments,
    COUNT(CASE WHEN deleted = false THEN 1 END) as active_establishments,
    COUNT(CASE WHEN deleted = true THEN 1 END) as deleted_establishments
FROM establishments;
```

## 🔄 Mise à jour de l'application

### Gestion d'erreur améliorée

L'application a été mise à jour pour :

1. **Afficher un message d'erreur informatif** au lieu d'un objet vide
2. **Ne pas bloquer le chargement** de l'organisation si les établissements échouent
3. **Proposer un bouton "Réessayer"** pour recharger la page
4. **Logger les erreurs** dans la console pour le débogage

### Code mis à jour

```typescript
// Gestion d'erreur améliorée
if (establishmentsError) {
  console.error("❌ Erreur lors du chargement des établissements:", establishmentsError);
  setEstablishmentsError("Impossible de charger les établissements. Vérifiez les permissions.");
  setEstablishments([]);
} else {
  setEstablishments(establishmentsData || []);
  setEstablishmentsError(null);
}
```

## ✅ Vérification finale

1. **Exécuter le script de diagnostic** pour vérifier l'état
2. **Appliquer le script de correction** si nécessaire
3. **Tester l'accès** avec différents rôles
4. **Vérifier l'affichage** dans l'application

## 🆘 En cas de problème persistant

1. **Vérifier les logs** dans la console du navigateur
2. **Contrôler les permissions** de l'utilisateur connecté
3. **S'assurer que la table** `establishments` existe et contient des données
4. **Vérifier les relations** avec les tables `organizations` et `users_organizations`

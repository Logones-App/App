# ⚠️ NOTE IMPORTANTE

> **Pour toute génération de script RLS, se référer exclusivement à `RLS-POLICIES-STANDARD.md` qui fait foi pour le standard universel du projet. Ce fichier est un exemple d'application sur la table products.**

# 🔄 Reset des Policies RLS - Table `products`

## 🟢 Objectif

- Remettre à zéro toutes les policies RLS de la table `products`.
- Appliquer le standard universel basé uniquement sur l'association `users_organizations`.
- Garantir la cohérence, la sécurité et la maintenabilité.

## 🚦 Procédure Sécurisée

1. **Supprimer toutes les policies existantes**
2. **Redonner les droits GRANT nécessaires**
3. **Créer les 4 policies universelles (SELECT, INSERT, UPDATE, DELETE)**
4. **S'assurer que RLS est activé**

## 📝 Script SQL à exécuter

```sql
-- 1. Supprimer toutes les policies existantes
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'products') LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s" ON products;', r.policyname);
    END LOOP;
END $$;

-- 2. Redonner les droits GRANT nécessaires
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE products TO authenticated;
GRANT SELECT ON TABLE products TO public;

-- 3. Politique SELECT (lecture publique des produits non supprimés)
CREATE POLICY "public_read_products" ON products
FOR SELECT TO public
USING (deleted = false);

-- 4. Politique universelle pour authenticated (basée sur users_organizations)
CREATE POLICY "products_select_universal" ON products
FOR SELECT TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM users_organizations
    WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND deleted = false
  )
);

CREATE POLICY "products_insert_universal" ON products
FOR INSERT TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users_organizations
    WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND deleted = false
  )
);

CREATE POLICY "products_update_universal" ON products
FOR UPDATE TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM users_organizations
    WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND deleted = false
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users_organizations
    WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND deleted = false
  )
);

CREATE POLICY "products_delete_universal" ON products
FOR DELETE TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM users_organizations
    WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND deleted = false
  )
);

-- 5. S'assurer que RLS est activé
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
```

## 📚 Référence

- Inspiré de : `Documentation/RLS-POLICIES-STANDARD.md`
- Architecture unifiée multi-tenant basée sur `users_organizations`

## ✅ Avantages

- Simplicité, sécurité, cohérence, maintenabilité
- Plus de distinction par rôle dans la RLS (géré côté app)
- Compatible realtime et multi-organisation

---

**À exécuter dans Supabase SQL Editor.**

**Aucune donnée n'est supprimée.**

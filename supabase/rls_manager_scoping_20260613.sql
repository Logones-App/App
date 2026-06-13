-- =============================================================
-- RLS MANAGER SCOPING — à coller dans Supabase SQL Editor
-- Date : 2026-06-13
-- =============================================================
-- Ce script fait 3 choses :
--  1. Supprime la contrainte unique (user_id) qui empêche un
--     commercial d'être dans plusieurs organisations.
--  2. Crée une fonction helper sécurisée pour le contrôle d'accès.
--  3. Met à jour toutes les policies RLS pour les tables qui ont
--     DEUX colonnes : organization_id + establishment_id.
--     → org_admin / commercial : voient toute leur org (comportement inchangé)
--     → manager : ne voit que son établissement
-- =============================================================


-- =============================================================
-- ÉTAPE 1 — Permettre un commercial sur plusieurs organisations
-- =============================================================

-- La contrainte unique sur user_id seul est incompatible avec
-- le rôle commercial (un user_id → plusieurs rows / orgs).
ALTER TABLE public.users_organizations
  DROP CONSTRAINT IF EXISTS users_organizations_user_unique;

-- Index partiel redondant sur le même principe
DROP INDEX IF EXISTS public.users_organizations_user_unique_active;

-- On GARDE : users_organizations_user_id_organization_id_key (user_id, org_id)
-- qui empêche les doublons par organisation.


-- =============================================================
-- ÉTAPE 2 — Fonction helper de contrôle d'accès
-- =============================================================
-- Reçoit (organization_id, establishment_id) de la ligne en cours.
-- Retourne TRUE si l'utilisateur JWT a accès à cette ligne :
--   • Accès org    : sa ligne users_organizations a establishment_id IS NULL
--                    et organization_id correspond → org_admin / commercial
--   • Accès établ  : sa ligne users_organizations a establishment_id NOT NULL
--                    et il correspond → manager
-- SECURITY DEFINER = la fonction bypass le RLS de users_organizations
-- elle-même (nécessaire pour lire la table depuis les policies).

CREATE OR REPLACE FUNCTION public.auth_can_access_establishment(
  p_org_id uuid,
  p_est_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users_organizations uo
    WHERE uo.user_id = (
            current_setting('request.jwt.claims', true)::json ->> 'sub'
          )::uuid
      AND uo.deleted = false
      AND (
        -- org_admin / commercial : pas d'établissement spécifique dans leur ligne
        (uo.establishment_id IS NULL AND uo.organization_id = p_org_id)
        OR
        -- manager : establishment_id défini, doit correspondre
        (uo.establishment_id IS NOT NULL
         AND p_est_id IS NOT NULL
         AND uo.establishment_id = p_est_id)
      )
  )
$$;

-- GRANT obligatoire : sans ça les policies appellent la fonction
-- mais le rôle authenticated n'a pas le droit de l'exécuter → tout false
GRANT EXECUTE ON FUNCTION public.auth_can_access_establishment(uuid, uuid) TO authenticated;


-- =============================================================
-- ÉTAPE 3 — Mettre à jour les policies pour toutes les tables
--           ayant DEUX colonnes : organization_id + establishment_id
-- =============================================================
-- Le bloc DO() :
--  a. Requête information_schema pour trouver automatiquement
--     toutes les tables concernées.
--  b. Supprime les 4 anciennes policies _universal.
--  c. Recrée 4 nouvelles policies utilisant auth_can_access_establishment().
-- Tables exclues : users_organizations (junction), establishments (cas spécial).

DO $$
DECLARE
  rec record;
  tbl text;
BEGIN
  FOR rec IN
    SELECT DISTINCT c1.table_name
    FROM information_schema.columns c1
    JOIN information_schema.columns c2
      ON  c1.table_name   = c2.table_name
      AND c1.table_schema = c2.table_schema
      AND c2.column_name  = 'establishment_id'
    WHERE c1.table_schema = 'public'
      AND c1.column_name  = 'organization_id'
      AND c1.table_name NOT IN ('users_organizations', 'establishments')
    ORDER BY c1.table_name
  LOOP
    tbl := rec.table_name;

    -- Supprimer les anciennes policies
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
      tbl || '_select_universal', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
      tbl || '_insert_universal', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
      tbl || '_update_universal', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
      tbl || '_delete_universal', tbl);

    -- SELECT
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated '
      'USING (public.auth_can_access_establishment(organization_id, establishment_id))',
      tbl || '_select_universal', tbl
    );

    -- INSERT
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated '
      'WITH CHECK (public.auth_can_access_establishment(organization_id, establishment_id))',
      tbl || '_insert_universal', tbl
    );

    -- UPDATE
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated '
      'USING  (public.auth_can_access_establishment(organization_id, establishment_id)) '
      'WITH CHECK (public.auth_can_access_establishment(organization_id, establishment_id))',
      tbl || '_update_universal', tbl
    );

    -- DELETE
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated '
      'USING (public.auth_can_access_establishment(organization_id, establishment_id))',
      tbl || '_delete_universal', tbl
    );

    RAISE NOTICE 'Policies mises à jour : %', tbl;
  END LOOP;
END $$;


-- =============================================================
-- ÉTAPE 4 — Cas spécial : table establishments
-- La table establishments n'a pas establishment_id (elle EST
-- l'établissement). Son PK est "id".
-- → org_admin / commercial : voient toutes les establishments de leur org
-- → manager : ne voit que son établissement (id = leur establishment_id)
-- =============================================================

DROP POLICY IF EXISTS establishments_select_universal ON public.establishments;
DROP POLICY IF EXISTS establishments_insert_universal ON public.establishments;
DROP POLICY IF EXISTS establishments_update_universal ON public.establishments;
DROP POLICY IF EXISTS establishments_delete_universal ON public.establishments;

CREATE POLICY establishments_select_universal ON public.establishments
FOR SELECT TO authenticated USING (
  -- org_admin / commercial
  organization_id IN (
    SELECT uo.organization_id FROM public.users_organizations uo
    WHERE uo.user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid
      AND uo.deleted = false AND uo.establishment_id IS NULL
  )
  OR
  -- manager : son établissement précis
  id IN (
    SELECT uo.establishment_id FROM public.users_organizations uo
    WHERE uo.user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid
      AND uo.deleted = false AND uo.establishment_id IS NOT NULL
  )
);

-- INSERT : réservé aux org_admin / commercial (pas les managers)
CREATE POLICY establishments_insert_universal ON public.establishments
FOR INSERT TO authenticated WITH CHECK (
  organization_id IN (
    SELECT uo.organization_id FROM public.users_organizations uo
    WHERE uo.user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid
      AND uo.deleted = false AND uo.establishment_id IS NULL
  )
);

-- UPDATE : org_admin / commercial ET manager (son propre établissement)
CREATE POLICY establishments_update_universal ON public.establishments
FOR UPDATE TO authenticated
USING (
  organization_id IN (
    SELECT uo.organization_id FROM public.users_organizations uo
    WHERE uo.user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid
      AND uo.deleted = false AND uo.establishment_id IS NULL
  )
  OR id IN (
    SELECT uo.establishment_id FROM public.users_organizations uo
    WHERE uo.user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid
      AND uo.deleted = false AND uo.establishment_id IS NOT NULL
  )
)
WITH CHECK (
  organization_id IN (
    SELECT uo.organization_id FROM public.users_organizations uo
    WHERE uo.user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid
      AND uo.deleted = false AND uo.establishment_id IS NULL
  )
  OR id IN (
    SELECT uo.establishment_id FROM public.users_organizations uo
    WHERE uo.user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid
      AND uo.deleted = false AND uo.establishment_id IS NOT NULL
  )
);

-- DELETE : uniquement org_admin / commercial
CREATE POLICY establishments_delete_universal ON public.establishments
FOR DELETE TO authenticated USING (
  organization_id IN (
    SELECT uo.organization_id FROM public.users_organizations uo
    WHERE uo.user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid
      AND uo.deleted = false AND uo.establishment_id IS NULL
  )
);


-- =============================================================
-- VÉRIFICATION (optionnel — à lancer séparément)
-- =============================================================
-- Lister les tables mises à jour :
--
-- SELECT DISTINCT tablename, policyname
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND policyname LIKE '%_universal'
-- ORDER BY tablename, policyname;
--
-- Vérifier que la contrainte unique est bien supprimée :
--
-- SELECT conname FROM pg_constraint
-- WHERE conrelid = 'public.users_organizations'::regclass
--   AND contype = 'u';
-- (ne doit plus voir users_organizations_user_unique)
-- =============================================================

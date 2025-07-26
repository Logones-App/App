-- Script pour tester les domaines personnalisés
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier si la table custom_domains existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'custom_domains'
) as table_exists;

-- 2. Vérifier les domaines existants
SELECT 
  cd.domain,
  cd.establishment_slug,
  cd.is_active,
  cd.deleted,
  e.name as establishment_name,
  e.slug as establishment_slug
FROM custom_domains cd
JOIN establishments e ON cd.establishment_id = e.id
WHERE cd.deleted = false
ORDER BY cd.created_at DESC;

-- 3. Ajouter le domaine de test s'il n'existe pas
INSERT INTO custom_domains (
  domain,
  establishment_id,
  establishment_slug,
  is_active,
  organization_id
) 
SELECT 
  'la-plank-des-gones.com',
  e.id,
  e.slug,
  true,
  e.organization_id
FROM establishments e
WHERE e.slug = 'la-plank-des-gones'
AND NOT EXISTS (
  SELECT 1 FROM custom_domains cd 
  WHERE cd.domain = 'la-plank-des-gones.com' 
  AND cd.deleted = false
);

-- 4. Vérifier après insertion
SELECT 
  cd.domain,
  cd.establishment_slug,
  cd.is_active,
  cd.deleted,
  e.name as establishment_name
FROM custom_domains cd
JOIN establishments e ON cd.establishment_id = e.id
WHERE cd.domain = 'la-plank-des-gones.com'
AND cd.deleted = false; 
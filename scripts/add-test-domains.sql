-- Script pour ajouter des domaines de test
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier que la table custom_domains existe
SELECT * FROM custom_domains LIMIT 1;

-- 2. Ajouter des domaines de test
INSERT INTO custom_domains (
  domain,
  establishment_id,
  establishment_slug,
  is_active,
  organization_id
) VALUES 
  (
    'la-plank-des-gones.com',
    (SELECT id FROM establishments WHERE slug = 'la-plank-des-gones' LIMIT 1),
    'la-plank-des-gones',
    true,
    (SELECT organization_id FROM establishments WHERE slug = 'la-plank-des-gones' LIMIT 1)
  ),
  (
    'test-restaurant.logones.fr',
    (SELECT id FROM establishments WHERE slug = 'la-plank-des-gones' LIMIT 1),
    'la-plank-des-gones',
    true,
    (SELECT organization_id FROM establishments WHERE slug = 'la-plank-des-gones' LIMIT 1)
  ),
  (
    'demo-restaurant.logones.fr',
    (SELECT id FROM establishments WHERE slug = 'la-plank-des-gones' LIMIT 1),
    'la-plank-des-gones',
    true,
    (SELECT organization_id FROM establishments WHERE slug = 'la-plank-des-gones' LIMIT 1)
  );

-- 3. Vérifier les domaines ajoutés
SELECT 
  cd.domain,
  cd.establishment_slug,
  cd.is_active,
  e.name as establishment_name,
  o.name as organization_name
FROM custom_domains cd
JOIN establishments e ON cd.establishment_id = e.id
JOIN organizations o ON cd.organization_id = o.id
WHERE cd.deleted = false
ORDER BY cd.created_at DESC; 
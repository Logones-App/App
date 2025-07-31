-- Migration pour créer la table establishment_gallery
-- Ce script crée la table et configure les politiques RLS

-- 1. Créer la table establishment_gallery
CREATE TABLE IF NOT EXISTS establishment_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Informations image
  image_url TEXT NOT NULL,
  image_name VARCHAR(255),
  image_description TEXT,
  alt_text VARCHAR(500),
  
  -- Métadonnées
  file_size INTEGER,
  mime_type VARCHAR(100),
  dimensions JSONB,
  
  -- Affichage
  display_order INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID DEFAULT (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT false
);

-- 2. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_establishment_gallery_establishment_id ON establishment_gallery(establishment_id);
CREATE INDEX IF NOT EXISTS idx_establishment_gallery_organization_id ON establishment_gallery(organization_id);
CREATE INDEX IF NOT EXISTS idx_establishment_gallery_display_order ON establishment_gallery(display_order);
CREATE INDEX IF NOT EXISTS idx_establishment_gallery_public ON establishment_gallery(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_establishment_gallery_featured ON establishment_gallery(is_featured) WHERE is_featured = true;

-- 3. Activer RLS
ALTER TABLE establishment_gallery ENABLE ROW LEVEL SECURITY;

-- 4. Politiques RLS pour la table establishment_gallery

-- Politique SELECT pour les org_admin
CREATE POLICY "establishment_gallery_select_universal" ON establishment_gallery
FOR SELECT TO authenticated
USING (
  organization_id IN (
    SELECT users_organizations.organization_id
    FROM users_organizations
    WHERE ((users_organizations.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid) AND (users_organizations.deleted = false))
  )
);

-- Politique INSERT pour les org_admin
CREATE POLICY "establishment_gallery_insert_universal" ON establishment_gallery
FOR INSERT TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT users_organizations.organization_id
    FROM users_organizations
    WHERE ((users_organizations.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid) AND (users_organizations.deleted = false))
  )
);

-- Politique UPDATE pour les org_admin
CREATE POLICY "establishment_gallery_update_universal" ON establishment_gallery
FOR UPDATE TO authenticated
USING (
  organization_id IN (
    SELECT users_organizations.organization_id
    FROM users_organizations
    WHERE ((users_organizations.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid) AND (users_organizations.deleted = false))
  )
)
WITH CHECK (
  organization_id IN (
    SELECT users_organizations.organization_id
    FROM users_organizations
    WHERE ((users_organizations.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid) AND (users_organizations.deleted = false))
  )
);

-- Politique DELETE pour les org_admin
CREATE POLICY "establishment_gallery_delete_universal" ON establishment_gallery
FOR DELETE TO authenticated
USING (
  organization_id IN (
    SELECT users_organizations.organization_id
    FROM users_organizations
    WHERE ((users_organizations.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid) AND (users_organizations.deleted = false))
  )
);

-- Politique pour les system_admin (accès à toutes les images)
CREATE POLICY "system_admin_gallery_access" ON establishment_gallery
  FOR ALL USING (true);

-- Politique pour l'affichage public (lecture seule des images publiques)
CREATE POLICY "public_gallery_read" ON establishment_gallery
  FOR SELECT USING (
    is_public = true AND deleted = false
  );

-- 5. Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_establishment_gallery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger pour updated_at
CREATE TRIGGER trigger_update_establishment_gallery_updated_at
  BEFORE UPDATE ON establishment_gallery
  FOR EACH ROW
  EXECUTE FUNCTION update_establishment_gallery_updated_at();

-- 7. Fonction pour obtenir les images d'un établissement
CREATE OR REPLACE FUNCTION get_establishment_gallery_images(
  p_establishment_id UUID,
  p_organization_id UUID DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  image_url TEXT,
  image_name VARCHAR(255),
  image_description TEXT,
  alt_text VARCHAR(500),
  file_size INTEGER,
  mime_type VARCHAR(100),
  dimensions JSONB,
  display_order INTEGER,
  is_public BOOLEAN,
  is_featured BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eg.id,
    eg.image_url,
    eg.image_name,
    eg.image_description,
    eg.alt_text,
    eg.file_size,
    eg.mime_type,
    eg.dimensions,
    eg.display_order,
    eg.is_public,
    eg.is_featured,
    eg.created_at
  FROM establishment_gallery eg
  WHERE eg.establishment_id = p_establishment_id
    AND eg.deleted = false
    AND (p_organization_id IS NULL OR eg.organization_id = p_organization_id)
  ORDER BY eg.display_order ASC, eg.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
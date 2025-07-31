-- Migration pour créer la table establishment_gallery_sections
-- Ce script crée la table et configure les politiques RLS

-- 1. Créer la table establishment_gallery_sections
CREATE TABLE IF NOT EXISTS establishment_gallery_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES establishment_gallery(id) ON DELETE CASCADE,
  section VARCHAR(50) NOT NULL CHECK (section IN ('hero_carousel', 'home_cards', 'gallery')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT false,
  
  -- Contrainte d'unicité pour éviter les doublons
  UNIQUE(establishment_id, image_id, section)
);

-- 2. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_gallery_sections_establishment_id ON establishment_gallery_sections(establishment_id);
CREATE INDEX IF NOT EXISTS idx_gallery_sections_organization_id ON establishment_gallery_sections(organization_id);
CREATE INDEX IF NOT EXISTS idx_gallery_sections_section ON establishment_gallery_sections(section);
CREATE INDEX IF NOT EXISTS idx_gallery_sections_display_order ON establishment_gallery_sections(display_order);
CREATE INDEX IF NOT EXISTS idx_gallery_sections_establishment_section ON establishment_gallery_sections(establishment_id, section, display_order);

-- 3. Activer RLS
ALTER TABLE establishment_gallery_sections ENABLE ROW LEVEL SECURITY;

-- 4. Politiques RLS pour la table establishment_gallery_sections

-- Politique SELECT pour les org_admin
CREATE POLICY "gallery_sections_select_universal" ON establishment_gallery_sections
FOR SELECT TO authenticated
USING (
  organization_id IN (
    SELECT users_organizations.organization_id
    FROM users_organizations
    WHERE ((users_organizations.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid) AND (users_organizations.deleted = false))
  )
);

-- Politique INSERT pour les org_admin
CREATE POLICY "gallery_sections_insert_universal" ON establishment_gallery_sections
FOR INSERT TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT users_organizations.organization_id
    FROM users_organizations
    WHERE ((users_organizations.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid) AND (users_organizations.deleted = false))
  )
);

-- Politique UPDATE pour les org_admin
CREATE POLICY "gallery_sections_update_universal" ON establishment_gallery_sections
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
CREATE POLICY "gallery_sections_delete_universal" ON establishment_gallery_sections
FOR DELETE TO authenticated
USING (
  organization_id IN (
    SELECT users_organizations.organization_id
    FROM users_organizations
    WHERE ((users_organizations.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid) AND (users_organizations.deleted = false))
  )
);

-- Politique pour les system_admin (accès à toutes les sections)
CREATE POLICY "system_admin_gallery_sections_access" ON establishment_gallery_sections
  FOR ALL USING (true);

-- 5. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_gallery_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger pour updated_at
CREATE TRIGGER trigger_update_gallery_sections_updated_at
  BEFORE UPDATE ON establishment_gallery_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_gallery_sections_updated_at();

-- 7. Fonction pour obtenir les images d'une section
CREATE OR REPLACE FUNCTION get_establishment_gallery_section_images(
  p_establishment_id UUID,
  p_section VARCHAR(50)
)
RETURNS TABLE (
  id UUID,
  establishment_id UUID,
  organization_id UUID,
  image_id UUID,
  section VARCHAR(50),
  display_order INTEGER,
  image_url TEXT,
  image_name VARCHAR(255),
  image_description TEXT,
  alt_text VARCHAR(500),
  file_size INTEGER,
  mime_type VARCHAR(100),
  dimensions JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gs.id,
    gs.establishment_id,
    gs.organization_id,
    gs.image_id,
    gs.section,
    gs.display_order,
    g.image_url,
    g.image_name,
    g.image_description,
    g.alt_text,
    g.file_size,
    g.mime_type,
    g.dimensions,
    gs.created_at,
    gs.updated_at
  FROM establishment_gallery_sections gs
  INNER JOIN establishment_gallery g ON g.id = gs.image_id
  WHERE gs.establishment_id = p_establishment_id
    AND gs.section = p_section
    AND gs.deleted = false
    AND g.deleted = false
  ORDER BY gs.display_order ASC, gs.created_at ASC;
END;
$$ LANGUAGE plpgsql; 
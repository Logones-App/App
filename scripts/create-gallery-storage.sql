-- Configuration du stockage Supabase pour la galerie
-- Ce script configure le bucket et les politiques RLS

-- 1. Créer le bucket gallery (si pas déjà existant)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gallery', 
  'gallery', 
  true, 
  10485760, -- 10MB max par fichier
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- 2. Politique pour les org_admin (gestion complète de leurs images)
CREATE POLICY "org_admin_gallery_access" ON storage.objects
  FOR ALL USING (
    bucket_id = 'gallery' AND 
    (storage.foldername(name))[1] IN (
      SELECT users_organizations.organization_id::text
      FROM users_organizations
      WHERE ((users_organizations.user_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))::uuid) AND (users_organizations.deleted = false))
    )
  );

-- 3. Politique pour les system_admin (accès à toutes les images)
CREATE POLICY "system_admin_gallery_access" ON storage.objects
  FOR ALL USING (
    bucket_id = 'gallery'
  );

-- 4. Politique pour l'affichage public (lecture seule)
CREATE POLICY "public_gallery_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'gallery' AND 
    storage.foldername(name) IS NOT NULL
  );

-- 5. Fonction helper pour obtenir l'URL d'une image
CREATE OR REPLACE FUNCTION get_gallery_image_url(
  p_organization_id UUID,
  p_establishment_id UUID,
  p_image_name TEXT
) RETURNS TEXT AS $$
BEGIN
  RETURN storage.url('gallery', p_organization_id::text || '/' || p_establishment_id::text || '/' || p_image_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Fonction pour nettoyer les images orphelines
CREATE OR REPLACE FUNCTION cleanup_orphaned_gallery_images() RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Supprimer les images qui n'ont plus d'établissement associé
  DELETE FROM storage.objects 
  WHERE bucket_id = 'gallery' 
    AND NOT EXISTS (
      SELECT 1 FROM establishments e 
      WHERE e.id::text = (storage.foldername(name))[2]
        AND e.organization_id::text = (storage.foldername(name))[1]
        AND e.deleted = false
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
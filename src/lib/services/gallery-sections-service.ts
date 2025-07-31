import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/database.types';
import { 
  GallerySectionImage, 
  GallerySection,
  GalleryImage 
} from '@/types/gallery';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Type pour les données de la base de données
type DbGallerySection = Database['public']['Tables']['establishment_gallery_sections']['Row'];

// Fonction pour convertir DbGallerySection vers GallerySectionImage
function convertDbToGallerySectionImage(dbSection: DbGallerySection & {
  image_url: string;
  image_name: string;
  image_description?: string;
  alt_text?: string;
  file_size?: number;
  mime_type?: string;
  dimensions?: any;
}): GallerySectionImage {
  return {
    id: dbSection.id,
    establishment_id: dbSection.establishment_id,
    organization_id: dbSection.organization_id,
    image_id: dbSection.image_id,
    section: dbSection.section as GallerySection,
    display_order: dbSection.display_order,
    created_at: dbSection.created_at ?? '',
    updated_at: dbSection.updated_at ?? '',
    deleted: dbSection.deleted,
    image_url: dbSection.image_url,
    image_name: dbSection.image_name,
    image_description: dbSection.image_description,
    alt_text: dbSection.alt_text,
    file_size: dbSection.file_size,
    mime_type: dbSection.mime_type,
    dimensions: dbSection.dimensions as { width: number; height: number } | undefined,
  };
}

export class GallerySectionsService {
  /**
   * Obtenir les images d'une section
   */
  static async getSectionImages(
    establishmentId: string,
    section: GallerySection,
    organizationId?: string
  ): Promise<GallerySectionImage[]> {
    let query = supabase
      .from('establishment_gallery_sections')
      .select(`
        *,
        establishment_gallery!inner(
          image_url,
          image_name,
          image_description,
          alt_text,
          file_size,
          mime_type,
          dimensions
        )
      `)
      .eq('establishment_id', establishmentId)
      .eq('section', section)
      .eq('deleted', false)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erreur lors de la récupération: ${error.message}`);
    }

    return (data || []).map((item) => {
      const galleryData = item.establishment_gallery;
      return convertDbToGallerySectionImage({
        ...item,
        image_url: galleryData.image_url,
        image_name: galleryData.image_name || '',
        image_description: galleryData.image_description || undefined,
        alt_text: galleryData.alt_text || undefined,
        file_size: galleryData.file_size || undefined,
        mime_type: galleryData.mime_type || undefined,
        dimensions: galleryData.dimensions || undefined,
      });
    });
  }

  /**
   * Ajouter une image à une section
   */
  static async addImageToSection(
    establishmentId: string,
    imageId: string,
    section: GallerySection,
    organizationId: string,
    displayOrder?: number
  ): Promise<void> {
    // Obtenir le prochain ordre si non spécifié
    if (displayOrder === undefined) {
      const { data: maxOrder } = await supabase
        .from('establishment_gallery_sections')
        .select('display_order')
        .eq('establishment_id', establishmentId)
        .eq('section', section)
        .eq('deleted', false)
        .order('display_order', { ascending: false })
        .limit(1);

      displayOrder = (maxOrder?.[0]?.display_order ?? -1) + 1;
    }

    const { error } = await supabase
      .from('establishment_gallery_sections')
      .insert({
        establishment_id: establishmentId,
        organization_id: organizationId,
        image_id: imageId,
        section,
        display_order: displayOrder,
      });

    if (error) {
      throw new Error(`Erreur lors de l'ajout: ${error.message}`);
    }
  }

  /**
   * Retirer une image d'une section
   */
  static async removeImageFromSection(
    sectionId: string,
    organizationId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('establishment_gallery_sections')
      .update({ deleted: true })
      .eq('id', sectionId)
      .eq('organization_id', organizationId);

    if (error) {
      throw new Error(`Erreur lors de la suppression: ${error.message}`);
    }
  }

  /**
   * Réorganiser les images d'une section
   */
  static async reorderSectionImages(
    sectionImages: GallerySectionImage[],
    organizationId: string
  ): Promise<void> {
    // Mettre à jour chaque image individuellement
    for (let i = 0; i < sectionImages.length; i++) {
      const { error } = await supabase
        .from('establishment_gallery_sections')
        .update({ display_order: i })
        .eq('id', sectionImages[i].id)
        .eq('organization_id', organizationId);

      if (error) {
        throw new Error(`Erreur lors de la réorganisation: ${error.message}`);
      }
    }
  }

  /**
   * Vérifier si une image est dans une section
   */
  static async isImageInSection(
    establishmentId: string,
    imageId: string,
    section: GallerySection,
    organizationId?: string
  ): Promise<boolean> {
    let query = supabase
      .from('establishment_gallery_sections')
      .select('id')
      .eq('establishment_id', establishmentId)
      .eq('image_id', imageId)
      .eq('section', section)
      .eq('deleted', false);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erreur lors de la vérification: ${error.message}`);
    }

    return (data || []).length > 0;
  }

  /**
   * Obtenir le nombre d'images dans une section
   */
  static async getSectionImageCount(
    establishmentId: string,
    section: GallerySection,
    organizationId?: string
  ): Promise<number> {
    let query = supabase
      .from('establishment_gallery_sections')
      .select('id', { count: 'exact' })
      .eq('establishment_id', establishmentId)
      .eq('section', section)
      .eq('deleted', false);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Erreur lors du comptage: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Obtenir toutes les images disponibles pour sélection
   */
  static async getAvailableImages(
    establishmentId: string,
    organizationId?: string
  ): Promise<GalleryImage[]> {
    let query = supabase
      .from('establishment_gallery')
      .select('*')
      .eq('establishment_id', establishmentId)
      .eq('deleted', false)
      .order('created_at', { ascending: false });

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erreur lors de la récupération: ${error.message}`);
    }

    return (data || []).map((item) => ({
      id: item.id,
      establishment_id: item.establishment_id,
      organization_id: item.organization_id,
      image_url: item.image_url,
      image_name: item.image_name || '',
      image_description: item.image_description || undefined,
      alt_text: item.alt_text || undefined,
      file_size: item.file_size || undefined,
      mime_type: item.mime_type || undefined,
      dimensions: item.dimensions as { width: number; height: number } | undefined,
      display_order: item.display_order,
      is_public: item.is_public,
      is_featured: item.is_featured,
      created_at: item.created_at || '',
      created_by: item.created_by || undefined,
      updated_at: item.updated_at || '',
      deleted: item.deleted,
    }));
  }
} 
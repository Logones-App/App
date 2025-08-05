import { createClient } from "@supabase/supabase-js";

import { Database } from "@/lib/supabase/database.types";
import {
  generateUniqueFileName,
  validateImageFile,
  getImageDimensions,
  generateStoragePath,
  extractFilePathFromUrl,
} from "@/lib/utils/gallery-helpers";
import { GalleryImage, GalleryImageUpload, GalleryImageUpdate, GalleryResponse } from "@/types/gallery";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// Type pour les données de la base de données
type DbGalleryImage = Database["public"]["Tables"]["establishment_gallery"]["Row"];

// Fonction pour convertir DbGalleryImage vers GalleryImage
function convertDbToGalleryImage(dbImage: DbGalleryImage): GalleryImage {
  return {
    id: dbImage.id,
    establishment_id: dbImage.establishment_id,
    organization_id: dbImage.organization_id,
    image_url: dbImage.image_url,
    image_name: dbImage.image_name ?? "",
    image_description: dbImage.image_description ?? undefined,
    alt_text: dbImage.alt_text ?? undefined,
    file_size: dbImage.file_size ?? undefined,
    mime_type: dbImage.mime_type ?? undefined,
    dimensions: dbImage.dimensions as { width: number; height: number } | undefined,
    display_order: dbImage.display_order,
    is_public: dbImage.is_public,
    is_featured: dbImage.is_featured,
    created_at: dbImage.created_at,
    created_by: dbImage.created_by,
    updated_at: dbImage.updated_at,
    deleted: dbImage.deleted,
  };
}

export class GalleryStorageService {
  private static readonly BUCKET_NAME = "gallery";
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  /**
   * Upload une image dans la galerie
   */
  static async uploadImage(upload: GalleryImageUpload): Promise<GalleryImage> {
    // Validation du fichier
    const validationError = validateImageFile(upload.file, this.MAX_FILE_SIZE);
    if (validationError) {
      throw new Error(validationError);
    }

    // Générer un nom unique pour le fichier
    const fileName = generateUniqueFileName(upload.file, upload.imageName);
    const filePath = generateStoragePath(upload.organizationId, upload.establishmentId, fileName);

    try {
      // Obtenir les dimensions de l'image
      const dimensions = await getImageDimensions(upload.file);

      // Upload du fichier vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, upload.file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Erreur lors de l'upload: ${uploadError.message}`);
      }

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage.from(this.BUCKET_NAME).getPublicUrl(filePath);

      // Créer l'enregistrement en base de données
      const { data: dbData, error: dbError } = await supabase
        .from("establishment_gallery")
        .insert({
          establishment_id: upload.establishmentId,
          organization_id: upload.organizationId,
          image_url: urlData.publicUrl,
          image_name: fileName,
          image_description: upload.description,
          alt_text: upload.altText,
          file_size: upload.file.size,
          mime_type: upload.file.type,
          dimensions: dimensions,
          is_public: upload.isPublic ?? true,
          is_featured: upload.isFeatured ?? false,
          display_order: 0, // Sera mis à jour après
        })
        .select()
        .single();

      if (dbError) {
        // Nettoyer le fichier uploadé en cas d'erreur DB
        await this.deleteFile(filePath);
        throw new Error(`Erreur lors de l'enregistrement: ${dbError.message}`);
      }

      return convertDbToGalleryImage(dbData);
    } catch (error) {
      console.error("Erreur upload galerie:", error);
      throw error;
    }
  }

  /**
   * Récupérer les images d'un établissement
   */
  static async getEstablishmentImages(establishmentId: string, organizationId?: string): Promise<GalleryImage[]> {
    let query = supabase
      .from("establishment_gallery")
      .select("*")
      .eq("establishment_id", establishmentId)
      .eq("deleted", false)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erreur lors de la récupération: ${error.message}`);
    }

    return (data ?? []).map(convertDbToGalleryImage);
  }

  /**
   * Supprimer une image
   */
  static async deleteImage(imageId: string, organizationId: string): Promise<void> {
    // Récupérer les infos de l'image
    const { data: image, error: fetchError } = await supabase
      .from("establishment_gallery")
      .select("image_url, establishment_id")
      .eq("id", imageId)
      .eq("organization_id", organizationId)
      .single();

    if (fetchError || !image) {
      throw new Error("Image non trouvée");
    }

    // Soft delete en base
    const { error: dbError } = await supabase.from("establishment_gallery").update({ deleted: true }).eq("id", imageId);

    if (dbError) {
      throw new Error(`Erreur lors de la suppression: ${dbError.message}`);
    }

    // Supprimer le fichier du storage
    const filePath = extractFilePathFromUrl(image.image_url);
    await this.deleteFile(filePath);
  }

  /**
   * Mettre à jour l'ordre d'affichage
   */
  static async updateDisplayOrder(imageId: string, newOrder: number, organizationId: string): Promise<void> {
    const { error } = await supabase
      .from("establishment_gallery")
      .update({ display_order: newOrder })
      .eq("id", imageId)
      .eq("organization_id", organizationId);

    if (error) {
      throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
    }
  }

  /**
   * Mettre à jour les propriétés d'une image
   */
  static async updateImage(
    imageId: string,
    updates: Partial<Pick<GalleryImage, "image_name" | "image_description" | "alt_text" | "is_public" | "is_featured">>,
    organizationId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("establishment_gallery")
      .update(updates)
      .eq("id", imageId)
      .eq("organization_id", organizationId);

    if (error) {
      throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
    }
  }

  /**
   * Réorganiser plusieurs images
   */
  static async reorderImages(images: GalleryImage[], organizationId: string): Promise<void> {
    // Mettre à jour chaque image individuellement pour éviter les conflits
    for (let i = 0; i < images.length; i++) {
      const { error } = await supabase
        .from("establishment_gallery")
        .update({ display_order: i })
        .eq("id", images[i].id)
        .eq("organization_id", organizationId);

      if (error) {
        throw new Error(`Erreur lors de la réorganisation: ${error.message}`);
      }
    }
  }

  /**
   * Obtenir les images publiques d'un établissement
   */
  static async getPublicImages(establishmentId: string): Promise<GalleryImage[]> {
    const { data, error } = await supabase
      .from("establishment_gallery")
      .select("*")
      .eq("establishment_id", establishmentId)
      .eq("is_public", true)
      .eq("deleted", false)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Erreur lors de la récupération: ${error.message}`);
    }

    return (data ?? []).map(convertDbToGalleryImage);
  }

  /**
   * Obtenir les images mises en avant d'un établissement
   */
  static async getFeaturedImages(establishmentId: string): Promise<GalleryImage[]> {
    const { data, error } = await supabase
      .from("establishment_gallery")
      .select("*")
      .eq("establishment_id", establishmentId)
      .eq("is_public", true)
      .eq("is_featured", true)
      .eq("deleted", false)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Erreur lors de la récupération: ${error.message}`);
    }

    return (data ?? []).map(convertDbToGalleryImage);
  }

  /**
   * Compter les images d'un établissement
   */
  static async countEstablishmentImages(establishmentId: string, organizationId?: string): Promise<number> {
    let query = supabase
      .from("establishment_gallery")
      .select("id", { count: "exact" })
      .eq("establishment_id", establishmentId)
      .eq("deleted", false);

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Erreur lors du comptage: ${error.message}`);
    }

    return count ?? 0;
  }

  // Méthodes privées utilitaires
  private static async deleteFile(filePath: string): Promise<void> {
    try {
      await supabase.storage.from(this.BUCKET_NAME).remove([filePath]);
    } catch (error) {
      console.warn("Erreur lors de la suppression du fichier:", error);
    }
  }
}

import { useCallback } from "react";

import compressImage from "browser-image-compression";

import { createClient } from "@/lib/supabase/client";
import { GalleryImage } from "@/types/gallery";

interface UploadMetadata {
  imageName: string;
  description: string;
  altText: string;
  isPublic: boolean;
  isFeatured: boolean;
}

interface UseGalleryUploadOptions {
  establishmentId: string;
  organizationId: string;
  onSuccess?: (image: GalleryImage) => void;
  onError?: (error: string) => void;
}

export function useGalleryUpload({ establishmentId, organizationId, onSuccess, onError }: UseGalleryUploadOptions) {
  const uploadImage = useCallback(
    async (file: File, metadata: UploadMetadata) => {
      const supabase = createClient();

      try {
        // Validation du fichier
        if (!file || file.size === 0) {
          throw new Error("Fichier invalide");
        }

        // Compression de l'image
        const compressedFile = await compressImage(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });

        // Générer un nom de fichier unique
        const timestamp = Date.now();
        const fileExtension = compressedFile.name.split(".").pop();
        const fileName = `${timestamp}.${fileExtension}`;
        const filePath = `${establishmentId}/${fileName}`;

        // Upload vers Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("gallery")
          .upload(filePath, compressedFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Erreur lors de l'upload: ${uploadError.message}`);
        }

        // Obtenir l'URL publique
        const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(filePath);
        const imageUrl = urlData.publicUrl;

        // Obtenir le prochain ordre d'affichage
        const { data: maxOrderData } = await supabase
          .from("establishment_gallery")
          .select("display_order")
          .eq("establishment_id", establishmentId)
          .order("display_order", { ascending: false })
          .limit(1);

        const nextOrder = maxOrderData && maxOrderData.length > 0 ? (maxOrderData[0]?.display_order ?? 0) + 1 : 0;

        // Insérer dans la base de données
        const { data: insertData, error: insertError } = await supabase
          .from("establishment_gallery")
          .insert({
            establishment_id: establishmentId,
            organization_id: organizationId,
            image_url: imageUrl,
            image_name: metadata.imageName ?? compressedFile.name,
            image_description: metadata.description,
            alt_text: metadata.altText,
            file_size: compressedFile.size,
            mime_type: compressedFile.type,
            display_order: nextOrder,
            is_public: metadata.isPublic,
            is_featured: metadata.isFeatured,
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(`Erreur lors de l'insertion: ${insertError.message}`);
        }

        const newImage: GalleryImage = {
          id: insertData.id,
          establishment_id: insertData.establishment_id,
          organization_id: insertData.organization_id,
          image_url: insertData.image_url,
          image_name: insertData.image_name,
          image_description: insertData.image_description,
          alt_text: insertData.alt_text,
          file_size: insertData.file_size,
          mime_type: insertData.mime_type,
          dimensions: insertData.dimensions as { width: number; height: number } | null,
          display_order: insertData.display_order,
          is_public: insertData.is_public,
          is_featured: insertData.is_featured,
          created_at: insertData.created_at,
          created_by: insertData.created_by,
          updated_at: insertData.updated_at,
          deleted: insertData.deleted,
        };

        onSuccess?.(newImage);
        return newImage;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
        onError?.(errorMessage);
        throw err;
      }
    },
    [establishmentId, organizationId, onSuccess, onError],
  );

  return { uploadImage };
}

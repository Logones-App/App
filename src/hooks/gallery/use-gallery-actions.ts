"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { GalleryStorageService } from "@/lib/services/gallery-storage-service";

interface UseGalleryActionsOptions {
  organizationId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useGalleryActions({ organizationId, onSuccess, onError }: UseGalleryActionsOptions) {
  const togglePublic = useCallback(
    async (imageId: string, isPublic: boolean) => {
      try {
        await GalleryStorageService.updateImage(imageId, { is_public: isPublic }, organizationId);
        toast.success(isPublic ? "Image rendue publique" : "Image rendue privée");
        onSuccess?.();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erreur lors de la modification";
        toast.error(errorMessage);
        onError?.(errorMessage);
      }
    },
    [organizationId, onSuccess, onError]
  );

  const toggleFeatured = useCallback(
    async (imageId: string, isFeatured: boolean) => {
      try {
        await GalleryStorageService.updateImage(imageId, { is_featured: isFeatured }, organizationId);
        toast.success(isFeatured ? "Image mise en avant" : "Image retirée de l'avant");
        onSuccess?.();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erreur lors de la modification";
        toast.error(errorMessage);
        onError?.(errorMessage);
      }
    },
    [organizationId, onSuccess, onError]
  );

  return {
    togglePublic,
    toggleFeatured,
  };
} 
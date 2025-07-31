import { useState, useCallback } from 'react';
import { GalleryImage } from '@/types/gallery';
import { GalleryStorageService } from '@/lib/services/gallery-storage-service';

export interface UseGalleryReorderOptions {
  establishmentId: string;
  organizationId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useGalleryReorder({
  establishmentId,
  organizationId,
  onSuccess,
  onError
}: UseGalleryReorderOptions) {
  const [reordering, setReordering] = useState(false);

  const reorderImages = useCallback(async (images: GalleryImage[]) => {
    if (!images.length) return;

    setReordering(true);

    try {
      await GalleryStorageService.reorderImages(images, organizationId);
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la réorganisation';
      onError?.(errorMessage);
    } finally {
      setReordering(false);
    }
  }, [organizationId, onSuccess, onError]);

  const updateImageOrder = useCallback(async (
    imageId: string, 
    newOrder: number
  ) => {
    setReordering(true);

    try {
      await GalleryStorageService.updateDisplayOrder(imageId, newOrder, organizationId);
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la mise à jour';
      onError?.(errorMessage);
    } finally {
      setReordering(false);
    }
  }, [organizationId, onSuccess, onError]);

  return {
    reordering,
    reorderImages,
    updateImageOrder
  };
} 
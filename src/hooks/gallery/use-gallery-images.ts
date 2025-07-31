import { useState, useEffect, useMemo } from 'react';
import { GalleryImage, GalleryFilters } from '@/types/gallery';
import { GalleryStorageService } from '@/lib/services/gallery-storage-service';
import { filterImages } from '@/lib/utils/gallery-helpers';

export interface UseGalleryImagesOptions {
  establishmentId: string;
  organizationId?: string;
  filters?: GalleryFilters;
  enabled?: boolean;
}

export function useGalleryImages({
  establishmentId,
  organizationId,
  filters = {},
  enabled = true
}: UseGalleryImagesOptions) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mémoriser les images filtrées pour éviter les re-renders inutiles
  const filteredImages = useMemo(() => {
    return filterImages(images, filters);
  }, [images, filters]);

  // Charger les images
  const loadImages = async () => {
    if (!enabled || !establishmentId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await GalleryStorageService.getEstablishmentImages(
        establishmentId,
        organizationId
      );
      setImages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // Recharger les images
  const refetch = () => {
    loadImages();
  };

  // Charger les images au montage et quand les dépendances changent
  useEffect(() => {
    loadImages();
  }, [establishmentId, organizationId, enabled]);

  return {
    images,
    filteredImages,
    loading,
    error,
    refetch
  };
} 
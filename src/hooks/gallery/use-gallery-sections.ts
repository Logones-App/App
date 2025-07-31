"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { GallerySectionsService } from "@/lib/services/gallery-sections-service";
import { GallerySection, GallerySectionImage, UseGallerySectionsOptions } from "@/types/gallery";

export function useGallerySections({
  establishmentId,
  organizationId,
  section,
  onSuccess,
  onError,
}: UseGallerySectionsOptions) {
  const [sectionImages, setSectionImages] = useState<GallerySectionImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les images de la section
  const loadSectionImages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const images = await GallerySectionsService.getSectionImages(
        establishmentId,
        section,
        organizationId
      );
      setSectionImages(images);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors du chargement";
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [establishmentId, section, organizationId, onError]);

  // Ajouter une image à la section
  const addImageToSection = useCallback(
    async (imageId: string) => {
      try {
        const currentCount = sectionImages.length;
        await GallerySectionsService.addImageToSection(
          establishmentId,
          imageId,
          section,
          organizationId,
          currentCount
        );
        toast.success("Image ajoutée à la section");
        onSuccess?.();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'ajout";
        toast.error(errorMessage);
        onError?.(errorMessage);
        throw err;
      }
    },
    [establishmentId, section, organizationId, sectionImages.length, onSuccess, onError]
  );

  // Supprimer une image de la section
  const removeImageFromSection = useCallback(
    async (sectionImageId: string) => {
      try {
        await GallerySectionsService.removeImageFromSection(sectionImageId, organizationId);
        toast.success("Image retirée de la section");
        onSuccess?.();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erreur lors de la suppression";
        toast.error(errorMessage);
        onError?.(errorMessage);
        throw err;
      }
    },
    [organizationId, onSuccess, onError]
  );

  // Réorganiser les images de la section
  const reorderSectionImages = useCallback(
    async (images: GallerySectionImage[]) => {
      try {
        await GallerySectionsService.reorderSectionImages(images, organizationId);
        toast.success("Ordre des images mis à jour");
        onSuccess?.();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erreur lors de la réorganisation";
        toast.error(errorMessage);
        onError?.(errorMessage);
        throw err;
      }
    },
    [organizationId, onSuccess, onError]
  );

  // Vérifier si une image est dans la section
  const isImageInSection = useCallback(
    async (imageId: string) => {
      try {
        return await GallerySectionsService.isImageInSection(
          establishmentId,
          imageId,
          section,
          organizationId
        );
      } catch (err) {
        console.error("Erreur lors de la vérification:", err);
        return false;
      }
    },
    [establishmentId, section, organizationId]
  );

  // Obtenir le nombre d'images dans la section
  const getSectionImageCount = useCallback(async () => {
    try {
      return await GallerySectionsService.getSectionImageCount(
        establishmentId,
        section,
        organizationId
      );
    } catch (err) {
      console.error("Erreur lors du comptage:", err);
      return 0;
    }
  }, [establishmentId, section, organizationId]);

  // Obtenir les images disponibles (non utilisées dans cette section)
  const getAvailableImages = useCallback(async () => {
    try {
      const allImages = await GallerySectionsService.getAvailableImages(establishmentId, organizationId);
      const sectionImageIds = new Set(sectionImages.map(img => img.image_id));
      return allImages.filter(img => !sectionImageIds.has(img.id));
    } catch (err) {
      console.error("Erreur lors de la récupération des images disponibles:", err);
      return [];
    }
  }, [establishmentId, organizationId, sectionImages]);

  // Charger les images au montage et quand les dépendances changent
  useEffect(() => {
    loadSectionImages();
  }, [loadSectionImages]);

  return {
    sectionImages,
    isLoading,
    error,
    refetch: loadSectionImages,
    addImageToSection,
    removeImageFromSection,
    reorderSectionImages,
    isImageInSection,
    getSectionImageCount,
    getAvailableImages,
  };
} 
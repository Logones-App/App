"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertCircle } from "lucide-react";
import { GallerySectionConfig, GallerySection } from "@/types/gallery";
import { useGalleryRealtime } from "@/hooks/gallery/use-gallery-realtime";
import { SiteConfigurationImageSelector } from "./site-configuration-image-selector";
import { SiteConfigurationImageReorder } from "./site-configuration-image-reorder";

interface SiteConfigurationSectionProps {
  establishmentId: string;
  organizationId: string;
  section: GallerySection;
  config: GallerySectionConfig;
  isSystemAdmin: boolean;
}

export function SiteConfigurationSection({
  establishmentId,
  organizationId,
  section,
  config,
  isSystemAdmin,
}: SiteConfigurationSectionProps) {
  const t = useTranslations("SiteConfiguration");
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [showReorder, setShowReorder] = useState(false);

  const {
    sectionImages,
    loading: isLoading,
    error,
    isConnected,
    addImageToSection,
    removeImageFromSection,
    reorderSectionImages,
    refetch,
  } = useGalleryRealtime({
    establishmentId,
    organizationId,
    section,
    enabled: true,
  });

  const handleAddImage = async (imageId: string) => {
    try {
      await addImageToSection(imageId, section);
      setShowImageSelector(false);
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'image:", error);
    }
  };

  const handleRemoveImage = async (sectionImageId: string) => {
    try {
      await removeImageFromSection(sectionImageId);
    } catch (error) {
      console.error("Erreur lors de la suppression de l'image:", error);
    }
  };

  const handleReorderImages = async (images: any[]) => {
    try {
      await reorderSectionImages(images);
      setShowReorder(false);
    } catch (error) {
      console.error("Erreur lors de la réorganisation:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t("errors.loadingError")}: {error}
        </AlertDescription>
      </Alert>
    );
  }

  const imageCount = sectionImages.length;
  const maxImages = config.maxImages;
  const canAddMore = !maxImages || imageCount < maxImages;

  return (
    <div className="space-y-6">
      {/* Informations de la section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Badge variant="outline">
            {t("sections.imageCount", { count: imageCount })}
            {maxImages && ` / ${maxImages}`}
          </Badge>
          <Badge variant={isConnected ? "default" : "destructive"}>{isConnected ? "Connecté" : "Déconnecté"}</Badge>
          {!canAddMore && (
            <Alert className="w-auto">
              <Info className="h-4 w-4" />
              <AlertDescription>{t("sections.maxImagesReached", { count: maxImages })}</AlertDescription>
            </Alert>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {imageCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowReorder(true)}>
              {t("actions.reorder")}
            </Button>
          )}
          {canAddMore && (
            <Button size="sm" onClick={() => setShowImageSelector(true)}>
              {t("actions.addImage")}
            </Button>
          )}
        </div>
      </div>

      {/* Liste des images de la section */}
      {imageCount === 0 ? (
        <div className="text-muted-foreground py-8 text-center">
          <p>{t("sections.noImages")}</p>
          {canAddMore && (
            <Button variant="outline" className="mt-2" onClick={() => setShowImageSelector(true)}>
              {t("actions.addFirstImage")}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {sectionImages.map((sectionImage) => (
            <div key={sectionImage.id} className="group relative aspect-square overflow-hidden rounded-lg border">
              <img
                src={sectionImage.image_url}
                alt={sectionImage.alt_text ?? sectionImage.image_name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Button variant="destructive" size="sm" onClick={() => handleRemoveImage(sectionImage.id)}>
                  {t("actions.remove")}
                </Button>
              </div>
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="text-xs">
                  {sectionImage.display_order + 1}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de sélection d'images */}
      {showImageSelector && (
        <SiteConfigurationImageSelector
          establishmentId={establishmentId}
          organizationId={organizationId}
          section={section}
          onImageSelect={handleAddImage}
          onClose={() => setShowImageSelector(false)}
          isSystemAdmin={isSystemAdmin}
        />
      )}

      {/* Modal de réorganisation */}
      {showReorder && (
        <SiteConfigurationImageReorder
          sectionImages={sectionImages}
          onReorder={handleReorderImages}
          onClose={() => setShowReorder(false)}
          section={section}
        />
      )}
    </div>
  );
}

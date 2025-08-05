"use client";

import { useState, useEffect, useMemo } from "react";

import { Search, X, Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useGalleryModal } from "@/hooks/gallery/use-gallery-modal";
import { Tables } from "@/lib/supabase/database.types";
import { GallerySection } from "@/types/gallery";

type GalleryImage = Tables<"establishment_gallery">;

interface SiteConfigurationImageSelectorProps {
  establishmentId: string;
  organizationId: string;
  section: GallerySection;
  sectionImages: any[]; // Images déjà dans la section
  onImageSelect: (imageId: string) => void;
  onClose: () => void;
  isSystemAdmin: boolean;
}

export function SiteConfigurationImageSelector({
  establishmentId,
  organizationId,
  section,
  sectionImages,
  onImageSelect,
  onClose,
  isSystemAdmin,
}: SiteConfigurationImageSelectorProps) {
  const t = useTranslations("SiteConfiguration");
  const [filteredImages, setFilteredImages] = useState<GalleryImage[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  // Utiliser le hook MODAL avec contrôle précis du chargement
  const {
    images: allImages,
    isLoading,
    error,
  } = useGalleryModal({
    establishmentId,
    organizationId,
    isOpen: true,
  });

  // Filtrer les images disponibles (non supprimées) ET exclure celles déjà dans la section
  const availableImages = useMemo(() => {
    // Récupérer les IDs des images déjà dans la section
    const sectionImageIds = new Set(sectionImages.map((img: any) => img.image_id));

    return allImages.filter((image) => {
      return !image.deleted && image.image_url && !sectionImageIds.has(image.id); // Exclure les images déjà dans la section
    });
  }, [allImages, sectionImages]);

  // Filtrer les images selon la recherche
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredImages(availableImages);
    } else {
      const filtered = availableImages.filter(
        (image) =>
          (image.image_name && image.image_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (image.image_description && image.image_description.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (image.alt_text && image.alt_text.toLowerCase().includes(searchTerm.toLowerCase())),
      );
      setFilteredImages(filtered);
    }
  }, [searchTerm, availableImages]);

  const handleImageSelect = (image: GalleryImage) => {
    // Si l'image est déjà sélectionnée, la désélectionner
    if (selectedImage?.id === image.id) {
      setSelectedImage(null);
    } else {
      setSelectedImage(image);
    }
  };

  const handleConfirmSelection = () => {
    if (selectedImage) {
      onImageSelect(selectedImage.id);
      onClose();
    }
  };

  const handleCancelSelection = () => {
    setSelectedImage(null);
  };

  const getImageUrl = (image: GalleryImage) => {
    if (!image.image_url) return "/placeholder-image.jpg";

    // Si c'est déjà une URL complète
    if (image.image_url.startsWith("http")) {
      return image.image_url;
    }

    // Si c'est une URL relative, ajouter le domaine
    if (image.image_url.startsWith("/")) {
      return `${window.location.origin}${image.image_url}`;
    }

    // Fallback
    return image.image_url;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t("imageSelector.title")}</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
            <Input
              placeholder={t("imageSelector.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Informations */}
          <div className="text-muted-foreground flex items-center justify-between text-sm">
            <span>{t("imageSelector.availableImages", { count: filteredImages.length })}</span>
            {selectedImage && <Badge variant="secondary">{t("imageSelector.selected")}</Badge>}
          </div>

          {/* Grille d'images */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <p>{t("imageSelector.noImages")}</p>
            </div>
          ) : (
            <div className="grid max-h-[400px] grid-cols-2 gap-4 overflow-y-auto md:grid-cols-3 lg:grid-cols-4">
              {filteredImages.map((image) => {
                const isSelected = selectedImage?.id === image.id;
                return (
                  <div
                    key={image.id}
                    className={`group relative aspect-square cursor-pointer overflow-hidden rounded-lg border transition-all ${
                      isSelected ? "ring-primary ring-2" : "hover:ring-primary/50 hover:ring-2"
                    }`}
                    onClick={() => handleImageSelect(image)}
                  >
                    <img
                      src={getImageUrl(image)}
                      alt={image.alt_text ?? image.image_name ?? "Image"}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder-image.jpg";
                      }}
                    />
                    {isSelected && (
                      <div className="bg-primary/20 absolute inset-0 flex items-center justify-center">
                        <Check className="text-primary h-8 w-8 rounded-full bg-white p-1" />
                      </div>
                    )}
                    <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="truncate text-xs text-white">{image.image_name ?? "Image sans nom"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 border-t pt-4">
            <Button variant="outline" onClick={onClose}>
              {t("actions.cancel")}
            </Button>
            {selectedImage && (
              <Button variant="outline" onClick={handleCancelSelection}>
                {t("actions.reset")}
              </Button>
            )}
            <Button onClick={handleConfirmSelection} disabled={!selectedImage}>
              {t("actions.addToSection")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Search, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { GallerySectionsService } from "@/lib/services/gallery-sections-service";
import { GallerySection, GalleryImage } from "@/types/gallery";

interface SiteConfigurationImageSelectorProps {
  establishmentId: string;
  organizationId: string;
  section: GallerySection;
  onImageSelect: (imageId: string) => void;
  onClose: () => void;
  isSystemAdmin: boolean;
}

export function SiteConfigurationImageSelector({
  establishmentId,
  organizationId,
  section,
  onImageSelect,
  onClose,
  isSystemAdmin,
}: SiteConfigurationImageSelectorProps) {
  const t = useTranslations("SiteConfiguration");
  const [availableImages, setAvailableImages] = useState<GalleryImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<GalleryImage[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  // Charger les images disponibles
  useEffect(() => {
    const loadAvailableImages = async () => {
      try {
        setIsLoading(true);
        const images = await GallerySectionsService.getAvailableImages(establishmentId, organizationId);
        setAvailableImages(images);
        setFilteredImages(images);
      } catch (error) {
        console.error("Erreur lors du chargement des images:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAvailableImages();
  }, [establishmentId, organizationId]);

  // Filtrer les images selon la recherche
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredImages(availableImages);
    } else {
      const filtered = availableImages.filter(
        (image) =>
          image.image_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (image.image_description && image.image_description.toLowerCase().includes(searchTerm.toLowerCase())) ??
          (image.alt_text && image.alt_text.toLowerCase().includes(searchTerm.toLowerCase())),
      );
      setFilteredImages(filtered);
    }
  }, [searchTerm, availableImages]);

  const handleImageSelect = (image: GalleryImage) => {
    setSelectedImage(image);
  };

  const handleConfirmSelection = () => {
    if (selectedImage) {
      onImageSelect(selectedImage.id);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
                      src={image.image_url}
                      alt={image.alt_text ?? image.image_name}
                      className="h-full w-full object-cover"
                    />
                    {isSelected && (
                      <div className="bg-primary/20 absolute inset-0 flex items-center justify-center">
                        <Check className="text-primary h-8 w-8 rounded-full bg-white p-1" />
                      </div>
                    )}
                    <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="truncate text-xs text-white">{image.image_name}</p>
                      {image.file_size && <p className="text-xs text-white/70">{formatFileSize(image.file_size)}</p>}
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
            <Button onClick={handleConfirmSelection} disabled={!selectedImage}>
              {t("actions.addToSection")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

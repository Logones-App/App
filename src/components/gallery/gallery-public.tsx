"use client";

import React, { useState } from "react";
import { GalleryCarousel } from "./gallery-carousel";
import { GalleryGrid } from "./gallery-grid";
import { GalleryLightbox } from "./gallery-lightbox";
import { GalleryStorageService } from "@/lib/services/gallery-storage-service";
import { GalleryImage } from "@/types/gallery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, Eye } from "lucide-react";

interface GalleryPublicProps {
  establishmentId: string;
  showCarousel?: boolean;
  showGallery?: boolean;
  className?: string;
}

export function GalleryPublic({
  establishmentId,
  showCarousel = true,
  showGallery = true,
  className = "",
}: GalleryPublicProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Charger les images publiques
  React.useEffect(() => {
    const loadImages = async () => {
      try {
        setLoading(true);
        const publicImages = await GalleryStorageService.getPublicImages(establishmentId);
        setImages(publicImages);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors du chargement");
      } finally {
        setLoading(false);
      }
    };

    loadImages();
  }, [establishmentId]);

  const handleImageClick = (image: GalleryImage) => {
    const index = images.findIndex((img) => img.id === image.id);
    setLightboxIndex(index >= 0 ? index : 0);
    setLightboxOpen(true);
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2"></div>
            <p className="text-muted-foreground">Chargement de la galerie...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mb-4 text-red-500">
              <ImageIcon className="mx-auto h-12 w-12" />
            </div>
            <h3 className="mb-2 text-lg font-medium">Erreur de chargement</h3>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent className="p-8 text-center">
            <ImageIcon className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-medium">Aucune image disponible</h3>
            <p className="text-muted-foreground">La galerie de photos n&apos;est pas encore disponible.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const featuredImages = images.filter((img) => img.is_featured);
  const allImages = images;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Carousel des images mises en avant */}
      {showCarousel && featuredImages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Photos en vedette
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GalleryCarousel images={featuredImages} autoPlay={true} showNavigation={true} showDots={true} />
          </CardContent>
        </Card>
      )}

      {/* Galerie complète */}
      {showGallery && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Galerie photos
              </CardTitle>
              <Badge variant="secondary">
                {images.length} photo{images.length > 1 ? "s" : ""}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <GalleryGrid images={allImages} onImageClick={handleImageClick} isEditable={false} />
          </CardContent>
        </Card>
      )}

      {/* Lightbox */}
      <GalleryLightbox
        images={images}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onImageChange={setLightboxIndex}
      />
    </div>
  );
}

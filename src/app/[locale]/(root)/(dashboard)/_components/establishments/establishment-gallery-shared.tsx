"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Upload, Grid3X3, Settings, Image as ImageIcon, AlertCircle } from "lucide-react";
import { GalleryUpload } from "@/components/gallery/gallery-upload";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { GalleryLightbox } from "@/components/gallery/gallery-lightbox";
import { useGalleryRealtime } from "@/hooks/gallery/use-gallery-realtime";
import { GalleryStorageService } from "@/lib/services/gallery-storage-service";
import { GalleryImage } from "@/types/gallery";
import { toast } from "sonner";
import { GalleryReorder } from "@/components/gallery/gallery-reorder";

interface EstablishmentGallerySharedProps {
  establishmentId: string;
  organizationId: string;
  isSystemAdmin?: boolean;
}

export function EstablishmentGalleryShared({
  establishmentId,
  organizationId,
  isSystemAdmin = false,
}: EstablishmentGallerySharedProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("gallery");
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const { images, loading, error, isConnected, refetch, updateImage, deleteImage, reorderImages } = useGalleryRealtime({
    establishmentId,
    organizationId,
    enabled: true,
  });

  // Filtrer les images pour l'affichage
  const filteredImages = images.filter((img) => !img.deleted);

  const handleUploadComplete = (image: GalleryImage) => {
    toast.success("Image uploadée avec succès");
    refetch();
  };

  const handleUploadError = (error: string) => {
    toast.error(`Erreur lors de l'upload: ${error}`);
  };

  const handleImageClick = (image: GalleryImage) => {
    const index = filteredImages.findIndex((img) => img.id === image.id);
    setLightboxIndex(index >= 0 ? index : 0);
    setLightboxOpen(true);
  };

  const handleImageEdit = (image: GalleryImage) => {
    // TODO: Implémenter l'édition d'image
    toast.info("Fonctionnalité d'édition à venir");
  };

  const handleImageDelete = async (imageId: string) => {
    try {
      await deleteImage(imageId);
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    }
  };

  const handleImageReorder = (reorderedImages: GalleryImage[]) => {
    reorderImages(reorderedImages);
  };

  const handleTogglePublic = (imageId: string, isPublic: boolean) => {
    updateImage(imageId, { is_public: isPublic });
  };

  const handleToggleFeatured = (imageId: string, isFeatured: boolean) => {
    updateImage(imageId, { is_featured: isFeatured });
  };

  const stats = {
    total: images.length,
    public: images.filter((img) => img.is_public).length,
    private: images.filter((img) => !img.is_public).length,
    featured: images.filter((img) => img.is_featured).length,
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>

          <div>
            <h1 className="text-2xl font-bold">Galerie d'images</h1>
            <p className="text-muted-foreground">Gérez les images de votre établissement</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">{stats.total} images</Badge>
          {stats.featured > 0 && <Badge variant="default">{stats.featured} en avant</Badge>}
          <Badge variant={isConnected ? "default" : "destructive"}>{isConnected ? "Connecté" : "Déconnecté"}</Badge>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Erreur lors du chargement de la galerie: {error}</AlertDescription>
        </Alert>
      )}

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gallery" className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4" />
            Galerie
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Réorganisation
          </TabsTrigger>
        </TabsList>

        {/* Onglet Galerie */}
        <TabsContent value="gallery" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2"></div>
                <p>Chargement de la galerie...</p>
              </CardContent>
            </Card>
          ) : (
            <GalleryGrid
              images={filteredImages}
              onImageClick={handleImageClick}
              onImageEdit={handleImageEdit}
              onImageDelete={handleImageDelete}
              onTogglePublic={handleTogglePublic}
              onToggleFeatured={handleToggleFeatured}
              isEditable={true}
            />
          )}
        </TabsContent>

        {/* Onglet Upload */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload d&apos;images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GalleryUpload
                establishmentId={establishmentId}
                organizationId={organizationId}
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                maxFiles={20}
                maxFileSize={10 * 1024 * 1024} // 10MB
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Réorganisation */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Réorganisation des images
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center">
                  <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2"></div>
                  <p>Chargement...</p>
                </div>
              ) : filteredImages.length === 0 ? (
                <div className="py-8 text-center">
                  <ImageIcon className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                  <h3 className="mb-2 text-lg font-medium">Aucune image</h3>
                  <p className="text-muted-foreground mb-4">
                    Ajoutez des images dans l'onglet Upload pour pouvoir les réorganiser.
                  </p>
                  <Button onClick={() => setActiveTab("upload")}>
                    <Upload className="mr-2 h-4 w-4" />
                    Ajouter des images
                  </Button>
                </div>
              ) : (
                <GalleryReorder images={filteredImages} onReorder={handleImageReorder} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Lightbox */}
      <GalleryLightbox
        images={filteredImages}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onImageChange={setLightboxIndex}
      />
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";

import { useRouter } from "next/navigation";

import { ArrowLeft, Upload, Grid3X3, Settings, Image as ImageIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { GalleryLightbox } from "@/components/gallery/gallery-lightbox";
import { GalleryReorder } from "@/components/gallery/gallery-reorder";
import { GalleryUpload } from "@/components/gallery/gallery-upload";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GalleryStorageService } from "@/lib/services/gallery-storage-service";
import { createClient } from "@/lib/supabase/client";
import { GalleryImage } from "@/types/gallery";

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
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les images de manière statique pour éviter les conflits realtime
  const loadImages = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from("establishment_gallery")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("display_order", { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      // Transformer les données pour correspondre au type GalleryImage
      const transformedImages: GalleryImage[] = (data || []).map((item: any) => ({
        id: item.id,
        establishment_id: item.establishment_id,
        organization_id: item.organization_id,
        image_url: item.image_url,
        image_name: item.image_name,
        image_description: item.image_description,
        alt_text: item.alt_text,
        file_size: item.file_size,
        mime_type: item.mime_type,
        dimensions: item.dimensions as { width: number; height: number } | null,
        display_order: item.display_order,
        is_public: item.is_public,
        is_featured: item.is_featured,
        created_at: item.created_at,
        created_by: item.created_by,
        updated_at: item.updated_at,
        deleted: item.deleted,
      }));

      setImages(transformedImages);
    } catch (err) {
      setError("Erreur lors du chargement des images");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, [establishmentId]);

  console.log("🏢 EstablishmentGalleryShared - État:", {
    establishmentId,
    organizationId,
    imagesCount: images.length,
    loading,
    error,
  });

  // Filtrer les images pour l'affichage
  const filteredImages = images.filter((img) => !img.deleted);

  const handleUploadComplete = (image: GalleryImage) => {
    toast.success("Image uploadée avec succès");
    loadImages(); // Recharger les images
  };

  const handleUploadError = (error: string) => {
    toast.error(`Erreur lors de l&apos;upload: ${error}`);
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
      const supabase = createClient();
      await supabase.from("establishment_gallery").delete().eq("id", imageId);

      loadImages(); // Recharger les images
      toast.success("Image supprimée avec succès");
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleImageReorder = async (reorderedImages: GalleryImage[]) => {
    try {
      const supabase = createClient();

      // Mettre à jour l'ordre de chaque image
      for (let i = 0; i < reorderedImages.length; i++) {
        await supabase.from("establishment_gallery").update({ display_order: i }).eq("id", reorderedImages[i].id);
      }

      loadImages(); // Recharger les images
      toast.success("Ordre des images mis à jour");
    } catch (error) {
      console.error("Erreur lors de la réorganisation:", error);
      toast.error("Erreur lors de la réorganisation");
    }
  };

  const handleTogglePublic = async (imageId: string, isPublic: boolean) => {
    try {
      const supabase = createClient();
      await supabase.from("establishment_gallery").update({ is_public: isPublic }).eq("id", imageId);

      loadImages(); // Recharger les images
      toast.success("Statut public mis à jour");
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleToggleFeatured = async (imageId: string, isFeatured: boolean) => {
    try {
      const supabase = createClient();
      await supabase.from("establishment_gallery").update({ is_featured: isFeatured }).eq("id", imageId);

      loadImages(); // Recharger les images
      toast.success("Statut featured mis à jour");
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      toast.error("Erreur lors de la mise à jour");
    }
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
            <h1 className="text-2xl font-bold">Galerie d&apos;images</h1>
            <p className="text-muted-foreground">Gérez les images de votre établissement</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">{stats.total} images</Badge>
          {stats.featured > 0 && <Badge variant="default">{stats.featured} en avant</Badge>}
          {/* Removed isConnected badge as it's no longer managed by useGalleryRealtime */}
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
            <GalleryGrid images={filteredImages} isEditable={true} />
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
                onSuccess={handleUploadComplete}
                onError={handleUploadError}
                maxFiles={20}
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
                    Ajoutez des images dans l&apos;onglet Upload pour pouvoir les réorganiser.
                  </p>
                  <Button onClick={() => setActiveTab("upload")}>
                    <Upload className="mr-2 h-4 w-4" />
                    Ajouter des images
                  </Button>
                </div>
              ) : (
                <GalleryReorder
                  images={filteredImages}
                  onReorder={handleImageReorder}
                  onCancel={() => setActiveTab("gallery")}
                />
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

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { GalleryImage, GallerySection, GallerySectionImage } from "@/types/gallery";
import { toast } from "sonner";

interface UseGalleryRealtimeOptions {
  establishmentId: string;
  organizationId?: string;
  section?: GallerySection;
  enabled?: boolean;
}

interface UseGalleryRealtimeReturn {
  // État des données
  images: GalleryImage[];
  sectionImages: GallerySectionImage[];
  
  // États de chargement et erreurs
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  
  // Actions CRUD
  addImage: (image: GalleryImage) => Promise<void>;
  updateImage: (imageId: string, updates: Partial<GalleryImage>) => Promise<void>;
  deleteImage: (imageId: string) => Promise<void>;
  reorderImages: (images: GalleryImage[]) => Promise<void>;
  
  // Actions pour les sections
  addImageToSection: (imageId: string, section: GallerySection) => Promise<void>;
  removeImageFromSection: (sectionImageId: string) => Promise<void>;
  reorderSectionImages: (images: GallerySectionImage[]) => Promise<void>;
  
  // Utilitaires
  refetch: () => Promise<void>;
}

export function useGalleryRealtime({
  establishmentId,
  organizationId,
  section,
  enabled = true,
}: UseGalleryRealtimeOptions): UseGalleryRealtimeReturn {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [sectionImages, setSectionImages] = useState<GallerySectionImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const supabase = createClient();
  const channelRef = useRef<any>(null);

  // Charger les images initiales
  const loadImages = useCallback(async () => {
    if (!enabled || !establishmentId) return;

    try {
      setLoading(true);
      setError(null);

      // Charger toutes les images de l'établissement
      const { data: imagesData, error: imagesError } = await supabase
        .from("establishment_gallery")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (imagesError) throw imagesError;
      setImages((imagesData ?? []) as GalleryImage[]);

      // Charger les images de la section si spécifiée
      if (section) {
        const { data: sectionData, error: sectionError } = await supabase
          .from("establishment_gallery_sections")
          .select(`
            *,
            establishment_gallery!inner(
              image_url,
              image_name,
              image_description,
              alt_text,
              file_size,
              mime_type,
              dimensions
            )
          `)
          .eq("establishment_id", establishmentId)
          .eq("section", section)
          .eq("deleted", false)
          .order("display_order", { ascending: true });

        if (sectionError) throw sectionError;
        
        const formattedSectionImages = (sectionData ?? []).map((item) => ({
          id: item.id,
          establishment_id: item.establishment_id,
          organization_id: item.organization_id,
          image_id: item.image_id,
          section: item.section as GallerySection,
          display_order: item.display_order,
          created_at: item.created_at,
          updated_at: item.updated_at,
          deleted: item.deleted,
          // Données de l'image jointe
          image_url: item.establishment_gallery.image_url,
          image_name: item.establishment_gallery.image_name ?? "",
          image_description: item.establishment_gallery.image_description ?? undefined,
          alt_text: item.establishment_gallery.alt_text ?? undefined,
          file_size: item.establishment_gallery.file_size ?? undefined,
          mime_type: item.establishment_gallery.mime_type ?? undefined,
          dimensions: item.establishment_gallery.dimensions ?? undefined,
        }));

        setSectionImages(formattedSectionImages as GallerySectionImage[]);
      } else {
        setSectionImages([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors du chargement";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [establishmentId, section, enabled, supabase]);

  // Actions CRUD pour les images
  const addImage = useCallback(async (image: GalleryImage) => {
    try {
      const { error } = await supabase
        .from("establishment_gallery")
        .insert(image);

      if (error) throw error;
      toast.success("Image ajoutée avec succès");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'ajout";
      toast.error(errorMessage);
      throw err;
    }
  }, [supabase]);

  const updateImage = useCallback(async (imageId: string, updates: Partial<GalleryImage>) => {
    try {
      const { error } = await supabase
        .from("establishment_gallery")
        .update(updates)
        .eq("id", imageId);

      if (error) throw error;
      toast.success("Image mise à jour avec succès");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la mise à jour";
      toast.error(errorMessage);
      throw err;
    }
  }, [supabase]);

  const deleteImage = useCallback(async (imageId: string) => {
    try {
      const { error } = await supabase
        .from("establishment_gallery")
        .update({ deleted: true })
        .eq("id", imageId);

      if (error) throw error;
      toast.success("Image supprimée avec succès");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la suppression";
      toast.error(errorMessage);
      throw err;
    }
  }, [supabase]);

  const reorderImages = useCallback(async (reorderedImages: GalleryImage[]) => {
    try {
      for (let i = 0; i < reorderedImages.length; i++) {
        const { error } = await supabase
          .from("establishment_gallery")
          .update({ display_order: i })
          .eq("id", reorderedImages[i].id);

        if (error) throw error;
      }
      toast.success("Ordre des images mis à jour");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la réorganisation";
      toast.error(errorMessage);
      throw err;
    }
  }, [supabase]);

  // Actions pour les sections
  const addImageToSection = useCallback(async (imageId: string, targetSection: GallerySection) => {
    try {
      const currentCount = sectionImages.length;
      const { error } = await supabase
        .from("establishment_gallery_sections")
        .insert({
          establishment_id: establishmentId,
          organization_id: organizationId!,
          image_id: imageId,
          section: targetSection,
          display_order: currentCount,
        });

      if (error) throw error;
      toast.success("Image ajoutée à la section");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'ajout à la section";
      toast.error(errorMessage);
      throw err;
    }
  }, [establishmentId, organizationId, sectionImages.length, supabase]);

  const removeImageFromSection = useCallback(async (sectionImageId: string) => {
    try {
      const { error } = await supabase
        .from("establishment_gallery_sections")
        .update({ deleted: true })
        .eq("id", sectionImageId);

      if (error) throw error;
      toast.success("Image retirée de la section");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la suppression de la section";
      toast.error(errorMessage);
      throw err;
    }
  }, [supabase]);

  const reorderSectionImages = useCallback(async (images: GallerySectionImage[]) => {
    try {
      for (let i = 0; i < images.length; i++) {
        const { error } = await supabase
          .from("establishment_gallery_sections")
          .update({ display_order: i })
          .eq("id", images[i].id);

        if (error) throw error;
      }
      toast.success("Ordre des images de la section mis à jour");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la réorganisation de la section";
      toast.error(errorMessage);
      throw err;
    }
  }, [supabase]);

  // Configuration du realtime
  useEffect(() => {
    if (!enabled || !establishmentId) return;

    // Chargement initial des données
    loadImages();

    // Configuration du channel realtime pour establishment_gallery
    const galleryChannel = supabase
      .channel(`gallery_realtime_${establishmentId}`)
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "establishment_gallery",
          filter: `establishment_id=eq.${establishmentId}`
        },
        (payload) => {
          console.log("Gallery realtime event:", payload);
          
          if (payload.eventType === "INSERT") {
            setImages(prev => [...prev, payload.new as GalleryImage]);
          } else if (payload.eventType === "UPDATE") {
            setImages(prev => prev.map(img => 
              img.id === payload.new.id ? payload.new as GalleryImage : img
            ));
          } else if (payload.eventType === "DELETE") {
            setImages(prev => prev.filter(img => img.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        console.log("Gallery channel status:", status);
        setIsConnected(status === "SUBSCRIBED");
      });

    // Configuration du channel realtime pour establishment_gallery_sections
    const sectionsChannel = supabase
      .channel(`gallery_sections_realtime_${establishmentId}`)
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "establishment_gallery_sections",
          filter: `establishment_id=eq.${establishmentId}`
        },
        (payload) => {
          console.log("Gallery sections realtime event:", payload);
          
          if (payload.eventType === "INSERT") {
            // Recharger les sections pour avoir les données jointes
            loadImages();
          } else if (payload.eventType === "UPDATE") {
            setSectionImages(prev => prev.map(img => 
              img.id === payload.new.id ? { ...img, ...payload.new } : img
            ));
          } else if (payload.eventType === "DELETE") {
            setSectionImages(prev => prev.filter(img => img.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        console.log("Gallery sections channel status:", status);
        setIsConnected(status === "SUBSCRIBED");
      });

    channelRef.current = { galleryChannel, sectionsChannel };

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current.galleryChannel);
        supabase.removeChannel(channelRef.current.sectionsChannel);
      }
    };
  }, [establishmentId, section, enabled, supabase]); // Retiré loadImages des dépendances

  return {
    images,
    sectionImages,
    loading,
    error,
    isConnected,
    addImage,
    updateImage,
    deleteImage,
    reorderImages,
    addImageToSection,
    removeImageFromSection,
    reorderSectionImages,
    refetch: loadImages,
  };
} 
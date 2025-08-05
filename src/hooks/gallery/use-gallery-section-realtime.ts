"use client";

import { useState, useEffect, useCallback } from "react";

import { createClient } from "@/lib/supabase/client";
import { GallerySectionImage, GallerySection } from "@/types/gallery";

interface UseGallerySectionRealtimeProps {
  establishmentId: string;
  organizationId: string;
  section: GallerySection;
}

export function useGallerySectionRealtime({
  establishmentId,
  organizationId,
  section,
}: UseGallerySectionRealtimeProps) {
  const [images, setImages] = useState<GallerySectionImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Fonction pour charger toutes les données de section puis filtrer côté client
  const loadSectionImages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // ✅ SOLUTION VALIDÉE : Charger toutes les données sans filtre côté DB
      const { data, error: fetchError } = await supabase
        .from("establishment_gallery_sections")
        .select(
          `
          id,
          establishment_id,
          image_id,
          section,
          display_order,
          deleted,
          establishment_gallery (
            id,
            image_name,
            image_url,
            image_description,
            alt_text,
            file_size,
            dimensions,
            is_public,
            is_featured,
            deleted,
            created_at,
            updated_at
          )
        `,
        )
        .eq("establishment_id", establishmentId)
        // ❌ SUPPRIMÉ : .eq("section", section) - Ce filtre cassait le realtime
        .order("display_order", { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      // ✅ FILTRAGE CÔTÉ CLIENT selon notre découverte
      const filteredData = (data || []).filter((item) => item.section === section);

      // Transformer les données
      const transformedImages: GallerySectionImage[] = filteredData
        .filter((item) => item.establishment_gallery && !item.establishment_gallery.deleted && !item.deleted)
        .map((item) => ({
          id: item.id,
          establishment_id: item.establishment_id,
          organization_id: organizationId, // ← Ajout de la propriété manquante
          image_id: item.image_id,
          section: item.section as GallerySection, // ← Cast vers GallerySection
          display_order: item.display_order ?? 0,
          image_name: item.establishment_gallery.image_name ?? "",
          image_url: item.establishment_gallery.image_url ?? "",
          image_description: item.establishment_gallery.image_description ?? "",
          alt_text: item.establishment_gallery.alt_text ?? "",
          file_size: item.establishment_gallery.file_size ?? 0,
          dimensions: null, // ← Mise à null car le format de la DB ne correspond pas
          mime_type: null, // ← Ajout de la propriété manquante
          is_public: item.establishment_gallery.is_public ?? false,
          is_featured: item.establishment_gallery.is_featured ?? false,
          deleted: item.establishment_gallery.deleted ?? false,
          created_at: item.establishment_gallery.created_at ?? "",
          updated_at: item.establishment_gallery.updated_at ?? "",
        }))
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

      setImages(transformedImages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, [establishmentId, section, supabase, organizationId]);

  useEffect(() => {
    // Chargement initial
    loadSectionImages();

    // ✅ CONFIGURATION REALTIME AVEC UN SEUL FILTRE MAXIMUM
    const channel = supabase
      .channel(`gallery-section-${establishmentId}-${section}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "establishment_gallery_sections",
          filter: `establishment_id=eq.${establishmentId}`, // ← UN SEUL FILTRE
        },
        (payload) => {
          // ✅ RECHARGER TOUTES LES DONNÉES PUIS FILTRER CÔTÉ CLIENT
          loadSectionImages();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "establishment_gallery",
          filter: `establishment_id=eq.${establishmentId}`, // ← UN SEUL FILTRE
        },
        (payload) => {
          // ✅ RECHARGER TOUTES LES DONNÉES PUIS FILTRER CÔTÉ CLIENT
          loadSectionImages();
        },
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [establishmentId, section, loadSectionImages, supabase]);

  // Fonctions CRUD pour cette section spécifique
  const addImageToSection = async (imageId: string) => {
    try {
      // ✅ Calculer le prochain ordre d'affichage
      const nextOrder = images.length;

      // ✅ Tentative d'INSERT normale
      const { error: insertError } = await supabase.from("establishment_gallery_sections").insert({
        establishment_id: establishmentId,
        organization_id: organizationId,
        image_id: imageId,
        section: section,
        display_order: nextOrder,
        deleted: false,
      });

      if (insertError) {
        // ❌ Erreur de contrainte d'unicité → L'association existe déjà
        if (insertError.code === "23505") {
          // Code PostgreSQL pour violation d'unicité
          // ✅ UPDATE pour récupérer l'association existante
          const { error: updateError } = await supabase
            .from("establishment_gallery_sections")
            .update({
              deleted: false,
              display_order: nextOrder,
              updated_at: new Date().toISOString(),
            })
            .eq("establishment_id", establishmentId)
            .eq("image_id", imageId)
            .eq("section", section);

          if (updateError) {
            throw updateError;
          }
        } else {
          throw insertError;
        }
      }
    } catch (err) {
      throw err;
    }
  };

  const removeImageFromSection = async (sectionId: string) => {
    try {
      // ✅ SOFT DELETE de l'association image-section
      const { error } = await supabase
        .from("establishment_gallery_sections")
        .update({ deleted: true })
        .eq("id", sectionId);

      if (error) {
        throw error;
      }
    } catch (err) {
      throw err;
    }
  };

  const updateImageOrder = async (imageId: string, newOrder: number) => {
    try {
      const { error } = await supabase
        .from("establishment_gallery_sections")
        .update({ display_order: newOrder })
        .eq("image_id", imageId)
        .eq("section", section)
        .eq("establishment_id", establishmentId);

      if (error) {
        throw error;
      }
    } catch (err) {
      throw err;
    }
  };

  return {
    images,
    isLoading,
    error,
    addImageToSection,
    removeImageFromSection,
    updateImageOrder,
    refetch: loadSectionImages,
  };
}

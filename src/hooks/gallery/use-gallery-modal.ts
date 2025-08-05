"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";

type GalleryImage = Tables<"establishment_gallery">;

interface UseGalleryModalProps {
  establishmentId?: string;
  organizationId?: string;
  isOpen: boolean; // Nouvelle prop pour contrôler le chargement
}

interface UseGalleryModalReturn {
  images: GalleryImage[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useGalleryModal({
  establishmentId,
  organizationId,
  isOpen,
}: UseGalleryModalProps): UseGalleryModalReturn {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const loadImages = async () => {
    if (!establishmentId || !organizationId) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log("🔄 Chargement modal des images:", { establishmentId, organizationId, isOpen });

      // Charger toutes les images de l'établissement (sans realtime)
      const { data: imagesData, error: imagesError } = await supabase
        .from("establishment_gallery")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("display_order", { ascending: true });

      if (imagesError) {
        console.error("❌ Erreur lors du chargement modal des images:", imagesError);
        setError(imagesError.message);
        return;
      }

      setImages(imagesData ?? []);
      console.log("✅ Images chargées pour modal:", imagesData?.length);
    } catch (err) {
      console.error("💥 Erreur inattendue lors du chargement modal des images:", err);
      setError("Erreur inattendue");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Ne charger que quand la modal est ouverte
    if (isOpen && establishmentId && organizationId) {
      loadImages();
    } else {
      // Réinitialiser quand la modal se ferme
      setImages([]);
      setError(null);
    }
  }, [isOpen, establishmentId, organizationId]); // Dépendances différentes

  const refetch = () => {
    if (isOpen) {
      loadImages();
    }
  };

  return {
    images,
    isLoading,
    error,
    refetch,
  };
}

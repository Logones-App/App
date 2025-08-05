"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";

type GalleryImage = Tables<"establishment_gallery">;

interface UseGalleryStaticProps {
  establishmentId?: string;
  organizationId?: string;
  enabled?: boolean;
}

interface UseGalleryStaticReturn {
  images: GalleryImage[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useGalleryStatic({
  establishmentId,
  organizationId,
  enabled = true,
}: UseGalleryStaticProps): UseGalleryStaticReturn {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const loadImages = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("🔄 Chargement statique des images:", { establishmentId, organizationId });

      // Charger toutes les images de l'établissement (sans realtime)
      const { data: imagesData, error: imagesError } = await supabase
        .from("establishment_gallery")
        .select("*")
        .eq("establishment_id", establishmentId!)
        .eq("deleted", false)
        .order("display_order", { ascending: true });

      if (imagesError) {
        console.error("❌ Erreur lors du chargement statique des images:", imagesError);
        setError(imagesError.message);
        return;
      }

      setImages(imagesData ?? []);
      console.log("✅ Images chargées statiquement:", imagesData?.length);
    } catch (err) {
      console.error("💥 Erreur inattendue lors du chargement statique des images:", err);
      setError("Erreur inattendue");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    // Chargement initial uniquement (pas de realtime)
    loadImages();
  }, [enabled, establishmentId, organizationId]);

  const refetch = () => {
    loadImages();
  };

  return {
    images,
    isLoading,
    error,
    refetch,
  };
}

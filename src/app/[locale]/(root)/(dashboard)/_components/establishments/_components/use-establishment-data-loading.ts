"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

interface UseEstablishmentDataLoadingProps {
  establishmentId: string;
}

export function useEstablishmentDataLoading({ establishmentId }: UseEstablishmentDataLoadingProps) {
  const [galleryData, setGalleryData] = useState<Tables<"establishment_gallery">[]>([]);
  const [sectionsData, setSectionsData] = useState<Tables<"establishment_gallery_sections">[]>([]);
  const [combinedData, setCombinedData] = useState<Tables<"establishment_gallery">[]>([]);
  const [heroCarouselData, setHeroCarouselData] = useState<Tables<"establishment_gallery">[]>([]);
  const [homeCardsData, setHomeCardsData] = useState<Tables<"establishment_gallery">[]>([]);
  const [gallerySectionData, setGallerySectionData] = useState<Tables<"establishment_gallery">[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [combinedLoading, setCombinedLoading] = useState(false);
  const [heroCarouselLoading, setHeroCarouselLoading] = useState(false);
  const [homeCardsLoading, setHomeCardsLoading] = useState(false);
  const [gallerySectionLoading, setGallerySectionLoading] = useState(false);

  const loadGalleryData = async () => {
    try {
      setGalleryLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("establishment_gallery")
        .select("*")
        .eq("establishment_id", establishmentId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur chargement gallery:", error);
      } else {
        setGalleryData(data ?? []);
        console.log("Données gallery chargées:", data);
      }
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setGalleryLoading(false);
    }
  };

  const loadSectionsData = async () => {
    try {
      setSectionsLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("establishment_gallery_sections")
        .select("*")
        .eq("establishment_id", establishmentId)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Erreur chargement sections:", error);
      } else {
        setSectionsData(data ?? []);
        console.log("Données sections chargées:", data);
      }
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setSectionsLoading(false);
    }
  };

  const loadCombinedData = async () => {
    try {
      setCombinedLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("establishment_gallery")
        .select("*")
        .eq("establishment_id", establishmentId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur chargement combined:", error);
      } else {
        setCombinedData(data ?? []);
        console.log("Données combined chargées:", data);
      }
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setCombinedLoading(false);
    }
  };

  const loadSectionData = async (
    section: string,
    setData: (data: Tables<"establishment_gallery">[]) => void,
    setLoading: (loading: boolean) => void,
  ) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("establishment_gallery")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("section", section)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(`Erreur chargement ${section}:`, error);
      } else {
        setData(data ?? []);
        console.log(`Données ${section} chargées:`, data);
      }
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadHeroCarouselData = () => loadSectionData("hero_carousel", setHeroCarouselData, setHeroCarouselLoading);
  const loadHomeCardsData = () => loadSectionData("home_cards", setHomeCardsData, setHomeCardsLoading);
  const loadGallerySectionData = () => loadSectionData("gallery", setGallerySectionData, setGallerySectionLoading);

  return {
    // Data
    galleryData,
    sectionsData,
    combinedData,
    heroCarouselData,
    homeCardsData,
    gallerySectionData,
    // Loading states
    galleryLoading,
    sectionsLoading,
    combinedLoading,
    heroCarouselLoading,
    homeCardsLoading,
    gallerySectionLoading,
    // Loading functions
    loadGalleryData,
    loadSectionsData,
    loadCombinedData,
    loadHeroCarouselData,
    loadHomeCardsData,
    loadGallerySectionData,
  };
}

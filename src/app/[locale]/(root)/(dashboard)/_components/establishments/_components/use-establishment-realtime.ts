"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

interface UseEstablishmentRealtimeProps {
  establishmentId: string;
  loadGalleryData: () => void;
  loadSectionsData: () => void;
  loadCombinedData: () => void;
  loadHeroCarouselData: () => void;
  loadHomeCardsData: () => void;
  loadGallerySectionData: () => void;
}

export function useEstablishmentRealtime({
  establishmentId,
  loadGalleryData,
  loadSectionsData,
  loadCombinedData,
  loadHeroCarouselData,
  loadHomeCardsData,
  loadGallerySectionData,
}: UseEstablishmentRealtimeProps) {
  const [isGalleryRealtimeActive, setIsGalleryRealtimeActive] = useState(false);
  const [isSectionsRealtimeActive, setIsSectionsRealtimeActive] = useState(false);
  const [isCombinedRealtimeActive, setIsCombinedRealtimeActive] = useState(false);
  const [isHeroCarouselRealtimeActive, setIsHeroCarouselRealtimeActive] = useState(false);
  const [isHomeCardsRealtimeActive, setIsHomeCardsRealtimeActive] = useState(false);
  const [isGallerySectionRealtimeActive, setIsGallerySectionRealtimeActive] = useState(false);

  const toggleGalleryRealtime = async () => {
    try {
      const supabase = createClient();
      if (isGalleryRealtimeActive) {
        await supabase.channel("gallery-changes").unsubscribe();
        setIsGalleryRealtimeActive(false);
        console.log("Désabonnement gallery realtime");
      } else {
        supabase
          .channel("gallery-changes")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "establishment_gallery",
              filter: `establishment_id=eq.${establishmentId}`,
            },
            () => {
              console.log("Changement gallery détecté");
              loadGalleryData();
            },
          )
          .subscribe();

        setIsGalleryRealtimeActive(true);
        console.log("Abonnement gallery realtime");
      }
    } catch (error) {
      console.error("Erreur toggle gallery realtime:", error);
    }
  };

  const toggleSectionsRealtime = async () => {
    try {
      const supabase = createClient();
      if (isSectionsRealtimeActive) {
        await supabase.channel("sections-changes").unsubscribe();
        setIsSectionsRealtimeActive(false);
        console.log("Désabonnement sections realtime");
      } else {
        supabase
          .channel("sections-changes")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "establishment_gallery_sections",
              filter: `establishment_id=eq.${establishmentId}`,
            },
            () => {
              console.log("Changement sections détecté");
              loadSectionsData();
            },
          )
          .subscribe();

        setIsSectionsRealtimeActive(true);
        console.log("Abonnement sections realtime");
      }
    } catch (error) {
      console.error("Erreur toggle sections realtime:", error);
    }
  };

  const toggleCombinedRealtime = async () => {
    try {
      const supabase = createClient();
      if (isCombinedRealtimeActive) {
        await supabase.channel("combined-changes").unsubscribe();
        setIsCombinedRealtimeActive(false);
        console.log("Désabonnement combined realtime");
      } else {
        supabase
          .channel("combined-changes")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "establishment_gallery",
              filter: `establishment_id=eq.${establishmentId}`,
            },
            () => {
              console.log("Changement combined détecté");
              loadCombinedData();
            },
          )
          .subscribe();

        setIsCombinedRealtimeActive(true);
        console.log("Abonnement combined realtime");
      }
    } catch (error) {
      console.error("Erreur toggle combined realtime:", error);
    }
  };

  const toggleSectionRealtime = async (
    section: string,
    isActive: boolean,
    setIsActive: (active: boolean) => void,
    loadFunction: () => void,
    channelName: string,
  ) => {
    try {
      const supabase = createClient();
      if (isActive) {
        await supabase.channel(channelName).unsubscribe();
        setIsActive(false);
        console.log(`Désabonnement ${section} realtime`);
      } else {
        supabase
          .channel(channelName)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "establishment_gallery",
              filter: `establishment_id=eq.${establishmentId} AND section=eq.${section}`,
            },
            () => {
              console.log(`Changement ${section} détecté`);
              loadFunction();
            },
          )
          .subscribe();

        setIsActive(true);
        console.log(`Abonnement ${section} realtime`);
      }
    } catch (error) {
      console.error(`Erreur toggle ${section} realtime:`, error);
    }
  };

  const toggleHeroCarouselRealtime = () =>
    toggleSectionRealtime(
      "hero_carousel",
      isHeroCarouselRealtimeActive,
      setIsHeroCarouselRealtimeActive,
      loadHeroCarouselData,
      "hero-carousel-changes",
    );

  const toggleHomeCardsRealtime = () =>
    toggleSectionRealtime(
      "home_cards",
      isHomeCardsRealtimeActive,
      setIsHomeCardsRealtimeActive,
      loadHomeCardsData,
      "home-cards-changes",
    );

  const toggleGallerySectionRealtime = () =>
    toggleSectionRealtime(
      "gallery",
      isGallerySectionRealtimeActive,
      setIsGallerySectionRealtimeActive,
      loadGallerySectionData,
      "gallery-section-changes",
    );

  return {
    // States
    isGalleryRealtimeActive,
    isSectionsRealtimeActive,
    isCombinedRealtimeActive,
    isHeroCarouselRealtimeActive,
    isHomeCardsRealtimeActive,
    isGallerySectionRealtimeActive,
    // Functions
    toggleGalleryRealtime,
    toggleSectionsRealtime,
    toggleCombinedRealtime,
    toggleHeroCarouselRealtime,
    toggleHomeCardsRealtime,
    toggleGallerySectionRealtime,
  };
}

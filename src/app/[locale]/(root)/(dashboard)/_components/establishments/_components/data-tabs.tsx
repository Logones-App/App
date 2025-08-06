"use client";

import { Play, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tables } from "@/lib/supabase/database.types";

interface DataCardProps {
  title: string;
  description: string;
  data: Tables<"establishment_gallery">[] | Tables<"establishment_gallery_sections">[];
  loading: boolean;
  isRealtimeActive: boolean;
  toggleRealtime: () => void;
}

function DataCard({ title, description, data, loading, isRealtimeActive, toggleRealtime }: DataCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{title}</span>
          <Button size="sm" variant={isRealtimeActive ? "destructive" : "default"} onClick={toggleRealtime}>
            {isRealtimeActive ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Chargement...</p>
        ) : (
          <pre className="max-h-40 overflow-auto text-xs">{JSON.stringify(data, null, 2)}</pre>
        )}
      </CardContent>
    </Card>
  );
}

interface DataTabsProps {
  galleryData: Tables<"establishment_gallery">[];
  sectionsData: Tables<"establishment_gallery_sections">[];
  combinedData: Tables<"establishment_gallery">[];
  heroCarouselData: Tables<"establishment_gallery">[];
  homeCardsData: Tables<"establishment_gallery">[];
  gallerySectionData: Tables<"establishment_gallery">[];
  galleryLoading: boolean;
  sectionsLoading: boolean;
  combinedLoading: boolean;
  heroCarouselLoading: boolean;
  homeCardsLoading: boolean;
  gallerySectionLoading: boolean;
  isGalleryRealtimeActive: boolean;
  isSectionsRealtimeActive: boolean;
  isCombinedRealtimeActive: boolean;
  isHeroCarouselRealtimeActive: boolean;
  isHomeCardsRealtimeActive: boolean;
  isGallerySectionRealtimeActive: boolean;
  toggleGalleryRealtime: () => void;
  toggleSectionsRealtime: () => void;
  toggleCombinedRealtime: () => void;
  toggleHeroCarouselRealtime: () => void;
  toggleHomeCardsRealtime: () => void;
  toggleGallerySectionRealtime: () => void;
  combinedDataFilter: string;
  setCombinedDataFilter: (filter: string) => void;
}

export function DataTabs({
  galleryData,
  sectionsData,
  combinedData,
  heroCarouselData,
  homeCardsData,
  gallerySectionData,
  galleryLoading,
  sectionsLoading,
  combinedLoading,
  heroCarouselLoading,
  homeCardsLoading,
  gallerySectionLoading,
  isGalleryRealtimeActive,
  isSectionsRealtimeActive,
  isCombinedRealtimeActive,
  isHeroCarouselRealtimeActive,
  isHomeCardsRealtimeActive,
  isGallerySectionRealtimeActive,
  toggleGalleryRealtime,
  toggleSectionsRealtime,
  toggleCombinedRealtime,
  toggleHeroCarouselRealtime,
  toggleHomeCardsRealtime,
  toggleGallerySectionRealtime,
  combinedDataFilter,
  setCombinedDataFilter,
}: DataTabsProps) {
  const transformedData =
    combinedDataFilter === "hero_carousel"
      ? combinedData.filter((item: Tables<"establishment_gallery">) => item.section === "hero_carousel")
      : combinedData;

  return (
    <>
      <DataCard
        title="Gallery Data"
        description="Données de establishment_gallery"
        data={galleryData}
        loading={galleryLoading}
        isRealtimeActive={isGalleryRealtimeActive}
        toggleRealtime={toggleGalleryRealtime}
      />

      <DataCard
        title="Sections Data"
        description="Données de establishment_gallery_sections"
        data={sectionsData}
        loading={sectionsLoading}
        isRealtimeActive={isSectionsRealtimeActive}
        toggleRealtime={toggleSectionsRealtime}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Combined Data</span>
            <Button
              size="sm"
              variant={isCombinedRealtimeActive ? "destructive" : "default"}
              onClick={toggleCombinedRealtime}
            >
              {isCombinedRealtimeActive ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </CardTitle>
          <CardDescription>Données combinées avec filtre</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-2">
            <select
              value={combinedDataFilter}
              onChange={(e) => setCombinedDataFilter(e.target.value)}
              className="rounded border p-1"
            >
              <option value="all">Toutes les sections</option>
              <option value="hero_carousel">Hero Carousel uniquement</option>
            </select>
          </div>
          {combinedLoading ? (
            <p>Chargement...</p>
          ) : (
            <pre className="max-h-40 overflow-auto text-xs">{JSON.stringify(transformedData, null, 2)}</pre>
          )}
        </CardContent>
      </Card>

      <DataCard
        title="Hero Carousel Data"
        description="Données hero_carousel"
        data={heroCarouselData}
        loading={heroCarouselLoading}
        isRealtimeActive={isHeroCarouselRealtimeActive}
        toggleRealtime={toggleHeroCarouselRealtime}
      />

      <DataCard
        title="Home Cards Data"
        description="Données home_cards"
        data={homeCardsData}
        loading={homeCardsLoading}
        isRealtimeActive={isHomeCardsRealtimeActive}
        toggleRealtime={toggleHomeCardsRealtime}
      />

      <DataCard
        title="Gallery Section Data"
        description="Données gallery"
        data={gallerySectionData}
        loading={gallerySectionLoading}
        isRealtimeActive={isGallerySectionRealtimeActive}
        toggleRealtime={toggleGallerySectionRealtime}
      />
    </>
  );
}

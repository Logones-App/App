"use client";

import { useState, useEffect } from "react";

import { Settings, Image as ImageIcon, TestTube } from "lucide-react";
import { useTranslations } from "next-intl";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { DataTabs } from "./_components/data-tabs";
import { useEstablishmentDataLoading } from "./_components/use-establishment-data-loading";
import { useEstablishmentRealtime } from "./_components/use-establishment-realtime";
import { BackToEstablishmentButton } from "./back-to-establishment-button";
import { SiteConfigurationImageManagement } from "./site-configuration/site-configuration-image-management";

interface EstablishmentSiteConfigurationSharedProps {
  establishmentId: string;
  organizationId: string;
  establishmentName: string;
  isSystemAdmin: boolean;
}

export function EstablishmentSiteConfigurationShared({
  establishmentId,
  organizationId,
  establishmentName,
  isSystemAdmin,
}: EstablishmentSiteConfigurationSharedProps) {
  const t = useTranslations("SiteConfiguration");
  const [activeTab, setActiveTab] = useState("image-management");
  const [combinedDataFilter, setCombinedDataFilter] = useState<string>("all");

  // Utilisation des hooks personnalisés
  const {
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
    loadGalleryData,
    loadSectionsData,
    loadCombinedData,
    loadHeroCarouselData,
    loadHomeCardsData,
    loadGallerySectionData,
  } = useEstablishmentDataLoading({ establishmentId });

  const {
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
  } = useEstablishmentRealtime({
    establishmentId,
    loadGalleryData,
    loadSectionsData,
    loadCombinedData,
    loadHeroCarouselData,
    loadHomeCardsData,
    loadGallerySectionData,
  });

  // Chargement initial des données
  useEffect(() => {
    loadGalleryData();
    loadSectionsData();
    loadCombinedData();
    loadHeroCarouselData();
    loadHomeCardsData();
    loadGallerySectionData();
  }, [
    establishmentId,
    loadGalleryData,
    loadSectionsData,
    loadCombinedData,
    loadHeroCarouselData,
    loadHomeCardsData,
    loadGallerySectionData,
  ]);

  return (
    <div className="container mx-auto p-6">
      <BackToEstablishmentButton establishmentId={establishmentId} organizationId={organizationId} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{establishmentName}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="image-management" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Gestion des images
          </TabsTrigger>
          <TabsTrigger value="data-test" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Test des données
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Paramètres
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image-management">
          <SiteConfigurationImageManagement
            establishmentId={establishmentId}
            organizationId={organizationId}
            isSystemAdmin={isSystemAdmin}
          />
        </TabsContent>

        <TabsContent value="data-test" className="space-y-4">
          <DataTabs
            galleryData={galleryData}
            sectionsData={sectionsData}
            combinedData={combinedData}
            heroCarouselData={heroCarouselData}
            homeCardsData={homeCardsData}
            gallerySectionData={gallerySectionData}
            galleryLoading={galleryLoading}
            sectionsLoading={sectionsLoading}
            combinedLoading={combinedLoading}
            heroCarouselLoading={heroCarouselLoading}
            homeCardsLoading={homeCardsLoading}
            gallerySectionLoading={gallerySectionLoading}
            isGalleryRealtimeActive={isGalleryRealtimeActive}
            isSectionsRealtimeActive={isSectionsRealtimeActive}
            isCombinedRealtimeActive={isCombinedRealtimeActive}
            isHeroCarouselRealtimeActive={isHeroCarouselRealtimeActive}
            isHomeCardsRealtimeActive={isHomeCardsRealtimeActive}
            isGallerySectionRealtimeActive={isGallerySectionRealtimeActive}
            toggleGalleryRealtime={toggleGalleryRealtime}
            toggleSectionsRealtime={toggleSectionsRealtime}
            toggleCombinedRealtime={toggleCombinedRealtime}
            toggleHeroCarouselRealtime={toggleHeroCarouselRealtime}
            toggleHomeCardsRealtime={toggleHomeCardsRealtime}
            toggleGallerySectionRealtime={toggleGallerySectionRealtime}
            combinedDataFilter={combinedDataFilter}
            setCombinedDataFilter={setCombinedDataFilter}
          />
        </TabsContent>

        <TabsContent value="settings">
          <div className="rounded-lg border p-4">
            <h3 className="mb-4 text-lg font-semibold">Paramètres de configuration</h3>
            <p className="text-muted-foreground">
              Configuration avancée pour la gestion du site de l&apos;établissement.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

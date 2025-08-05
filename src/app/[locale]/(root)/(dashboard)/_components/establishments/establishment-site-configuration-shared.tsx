"use client";

import { useState, useEffect } from "react";

import { ArrowLeft, Settings, Image as ImageIcon, TestTube, Play, Square } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { BackToEstablishmentButton } from "./BackToEstablishmentButton";
import { SiteConfigurationImageManagement } from "./site-configuration/site-configuration-image-management";
import type { Tables } from "@/lib/supabase/database.types";

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

  // États pour les données de test
  const [galleryData, setGalleryData] = useState<any[]>([]);
  const [sectionsData, setSectionsData] = useState<any[]>([]);
  const [combinedData, setCombinedData] = useState<any[]>([]);
  const [heroCarouselData, setHeroCarouselData] = useState<any[]>([]);
  const [homeCardsData, setHomeCardsData] = useState<any[]>([]);
  const [gallerySectionData, setGallerySectionData] = useState<any[]>([]);
  const [isGalleryRealtimeActive, setIsGalleryRealtimeActive] = useState(false);
  const [isSectionsRealtimeActive, setIsSectionsRealtimeActive] = useState(false);
  const [isCombinedRealtimeActive, setIsCombinedRealtimeActive] = useState(false);
  const [isHeroCarouselRealtimeActive, setIsHeroCarouselRealtimeActive] = useState(false);
  const [isHomeCardsRealtimeActive, setIsHomeCardsRealtimeActive] = useState(false);
  const [isGallerySectionRealtimeActive, setIsGallerySectionRealtimeActive] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [combinedLoading, setCombinedLoading] = useState(false);
  const [heroCarouselLoading, setHeroCarouselLoading] = useState(false);
  const [homeCardsLoading, setHomeCardsLoading] = useState(false);
  const [gallerySectionLoading, setGallerySectionLoading] = useState(false);
  const [combinedDataFilter, setCombinedDataFilter] = useState<string>("all"); // "all" ou "hero_carousel"

  // Fonction pour charger les données de establishment_gallery
  const loadGalleryData = async () => {
    try {
      setGalleryLoading(true);
      const { createClient } = await import("@/lib/supabase/client");
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

  // Fonction pour charger les données de establishment_gallery_sections
  const loadSectionsData = async () => {
    try {
      setSectionsLoading(true);
      const { createClient } = await import("@/lib/supabase/client");
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

  // Fonction pour charger les données combinées (jointure)
  const loadCombinedData = async () => {
    try {
      setCombinedLoading(true);
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      console.log("Chargement des données combinées...");

      // Requête avec jointure similaire à use-gallery-section-realtime
      const { data, error } = await supabase
        .from("establishment_gallery_sections")
        .select(
          `
          id,
          establishment_id,
          image_id,
          section,
          display_order,
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
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Erreur chargement données combinées:", error);
      } else {
        console.log("Données brutes combinées reçues:", data);

        // Transformer les données comme dans le hook
        const transformedData = (data || [])
          .filter((item: any) => item.establishment_gallery && !item.establishment_gallery.deleted)
          .map((item: any) => ({
            id: item.id,
            establishment_id: item.establishment_id,
            image_id: item.image_id,
            section: item.section,
            display_order: item.display_order,
            created_at: item.establishment_gallery.created_at,
            updated_at: item.establishment_gallery.updated_at,
            deleted: item.establishment_gallery.deleted,
            image_name: item.establishment_gallery.image_name,
            image_url: item.establishment_gallery.image_url,
            image_description: item.establishment_gallery.image_description,
            alt_text: item.establishment_gallery.alt_text,
            file_size: item.establishment_gallery.file_size,
            dimensions: item.establishment_gallery.dimensions,
            is_public: item.establishment_gallery.is_public,
            is_featured: item.establishment_gallery.is_featured,
          }))
          .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

        setCombinedData(transformedData);
        console.log("Données combinées transformées:", transformedData);
      }
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setCombinedLoading(false);
    }
  };

  // Fonction générique pour charger les données d'une section spécifique
  const loadSectionData = async (
    section: string,
    setData: (data: any[]) => void,
    setLoading: (loading: boolean) => void,
  ) => {
    try {
      setLoading(true);
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      console.log(`Chargement des données pour la section: ${section}`);

      const { data, error } = await supabase
        .from("establishment_gallery_sections")
        .select(
          `
          id,
          establishment_id,
          image_id,
          section,
          display_order,
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
        .eq("section", section)
        .order("display_order", { ascending: true });

      if (error) {
        console.error(`Erreur chargement données ${section}:`, error);
      } else {
        console.log(`Données brutes ${section} reçues:`, data);

        const transformedData = (data || [])
          .filter((item: any) => item.establishment_gallery && !item.establishment_gallery.deleted)
          .map((item: any) => ({
            id: item.id,
            establishment_id: item.establishment_id,
            image_id: item.image_id,
            section: item.section,
            display_order: item.display_order,
            created_at: item.establishment_gallery.created_at,
            updated_at: item.establishment_gallery.updated_at,
            deleted: item.establishment_gallery.deleted,
            image_name: item.establishment_gallery.image_name,
            image_url: item.establishment_gallery.image_url,
            image_description: item.establishment_gallery.image_description,
            alt_text: item.establishment_gallery.alt_text,
            file_size: item.establishment_gallery.file_size,
            dimensions: item.establishment_gallery.dimensions,
            is_public: item.establishment_gallery.is_public,
            is_featured: item.establishment_gallery.is_featured,
          }))
          .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

        setData(transformedData);
        console.log(`Données ${section} transformées:`, transformedData);
      }
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fonctions spécifiques pour chaque section
  const loadHeroCarouselData = () => loadSectionData("hero_carousel", setHeroCarouselData, setHeroCarouselLoading);
  const loadHomeCardsData = () => loadSectionData("home_cards", setHomeCardsData, setHomeCardsLoading);
  const loadGallerySectionData = () => loadSectionData("gallery", setGallerySectionData, setGallerySectionLoading);

  // Fonction pour activer le realtime sur establishment_gallery
  const toggleGalleryRealtime = async () => {
    if (isGalleryRealtimeActive) {
      setIsGalleryRealtimeActive(false);
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      console.log("Activation realtime gallery...");

      const channel = supabase
        .channel("test-gallery-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "establishment_gallery",
            filter: `establishment_id=eq.${establishmentId}`,
          },
          (payload) => {
            console.log("Événement realtime gallery reçu:", payload);
            // Recharger les données
            loadGalleryData();
          },
        )
        .subscribe((status) => {
          console.log("Statut subscription gallery:", status);
          if (status === "SUBSCRIBED") {
            setIsGalleryRealtimeActive(true);
          }
        });

      // Stocker le channel pour le nettoyer plus tard
      (window as any).galleryChannel = channel;
    } catch (err) {
      console.error("Erreur activation realtime gallery:", err);
    }
  };

  // Fonction pour activer le realtime sur establishment_gallery_sections
  const toggleSectionsRealtime = async () => {
    if (isSectionsRealtimeActive) {
      setIsSectionsRealtimeActive(false);
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      console.log("Activation realtime sections...");

      const channel = supabase
        .channel("test-sections-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "establishment_gallery_sections",
            filter: `establishment_id=eq.${establishmentId}`,
          },
          (payload) => {
            console.log("Événement realtime sections reçu:", payload);
            // Recharger les données
            loadSectionsData();
          },
        )
        .subscribe((status) => {
          console.log("Statut subscription sections:", status);
          if (status === "SUBSCRIBED") {
            setIsSectionsRealtimeActive(true);
          }
        });

      // Stocker le channel pour le nettoyer plus tard
      (window as any).sectionsChannel = channel;
    } catch (err) {
      console.error("Erreur activation realtime sections:", err);
    }
  };

  // Fonction pour activer le realtime sur les données combinées
  const toggleCombinedRealtime = async () => {
    if (isCombinedRealtimeActive) {
      setIsCombinedRealtimeActive(false);
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      console.log("Activation realtime données combinées...");

      const channel = supabase
        .channel("test-combined-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "establishment_gallery_sections",
            filter: `establishment_id=eq.${establishmentId}`,
          },
          (payload) => {
            console.log("Événement realtime sections (combiné) reçu:", payload);
            // Recharger les données combinées
            loadCombinedData();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "establishment_gallery",
            filter: `establishment_id=eq.${establishmentId}`,
          },
          (payload) => {
            console.log("Événement realtime gallery (combiné) reçu:", payload);
            // Recharger les données combinées
            loadCombinedData();
          },
        )
        .subscribe((status) => {
          console.log("Statut subscription combiné:", status);
          if (status === "SUBSCRIBED") {
            setIsCombinedRealtimeActive(true);
          }
        });

      // Stocker le channel pour le nettoyer plus tard
      (window as any).combinedChannel = channel;
    } catch (err) {
      console.error("Erreur activation realtime combiné:", err);
    }
  };

  // Fonction générique pour activer le realtime sur une section spécifique
  const toggleSectionRealtime = async (
    section: string,
    isActive: boolean,
    setIsActive: (active: boolean) => void,
    loadFunction: () => void,
    channelName: string,
  ) => {
    if (isActive) {
      setIsActive(false);
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      console.log(`Activation realtime section ${section}...`);

      const channel = supabase
        .channel(`test-${channelName}-realtime`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "establishment_gallery_sections",
            filter: `establishment_id=eq.${establishmentId}`, // ← UN SEUL FILTRE
          },
          (payload) => {
            console.log(`Événement realtime ${section} reçu:`, payload);
            // ✅ RECHARGER TOUTES LES DONNÉES PUIS FILTRER CÔTÉ CLIENT
            loadFunction();
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
            console.log(`Événement realtime gallery pour ${section} reçu:`, payload);
            // ✅ RECHARGER TOUTES LES DONNÉES PUIS FILTRER CÔTÉ CLIENT
            loadFunction();
          },
        )
        .subscribe((status) => {
          console.log(`Statut subscription ${section}:`, status);
          if (status === "SUBSCRIBED") {
            setIsActive(true);
          }
        });

      // Stocker le channel pour le nettoyer plus tard
      (window as any)[`${channelName}Channel`] = channel;
    } catch (err) {
      console.error(`Erreur activation realtime ${section}:`, err);
    }
  };

  // Fonctions spécifiques pour chaque section
  const toggleHeroCarouselRealtime = () =>
    toggleSectionRealtime(
      "hero_carousel",
      isHeroCarouselRealtimeActive,
      setIsHeroCarouselRealtimeActive,
      loadHeroCarouselData,
      "heroCarousel",
    );

  const toggleHomeCardsRealtime = () =>
    toggleSectionRealtime(
      "home_cards",
      isHomeCardsRealtimeActive,
      setIsHomeCardsRealtimeActive,
      loadHomeCardsData,
      "homeCards",
    );

  const toggleGallerySectionRealtime = () =>
    toggleSectionRealtime(
      "gallery",
      isGallerySectionRealtimeActive,
      setIsGallerySectionRealtimeActive,
      loadGallerySectionData,
      "gallerySection",
    );

  // Cleanup des channels au démontage
  useEffect(() => {
    return () => {
      if ((window as any).galleryChannel) {
        const supabase = require("@/lib/supabase/client").createClient();
        supabase.removeChannel((window as any).galleryChannel);
      }
      if ((window as any).sectionsChannel) {
        const supabase = require("@/lib/supabase/client").createClient();
        supabase.removeChannel((window as any).sectionsChannel);
      }
      if ((window as any).combinedChannel) {
        const supabase = require("@/lib/supabase/client").createClient();
        supabase.removeChannel((window as any).combinedChannel);
      }
      if ((window as any).heroCarouselChannel) {
        const supabase = require("@/lib/supabase/client").createClient();
        supabase.removeChannel((window as any).heroCarouselChannel);
      }
      if ((window as any).homeCardsChannel) {
        const supabase = require("@/lib/supabase/client").createClient();
        supabase.removeChannel((window as any).homeCardsChannel);
      }
      if ((window as any).gallerySectionChannel) {
        const supabase = require("@/lib/supabase/client").createClient();
        supabase.removeChannel((window as any).gallerySectionChannel);
      }
    };
  }, []);

  return (
    <div className="container mx-auto space-y-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <BackToEstablishmentButton establishmentId={establishmentId} organizationId={organizationId} />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">{t("description", { establishmentName })}</p>
          </div>
        </div>
      </div>

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 lg:grid-cols-3">
          <TabsTrigger value="image-management" className="flex items-center space-x-2">
            <ImageIcon className="h-4 w-4" />
            <span>{t("tabs.imageManagement")}</span>
          </TabsTrigger>
          <TabsTrigger value="general-settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>{t("tabs.generalSettings")}</span>
          </TabsTrigger>
          <TabsTrigger value="tests" className="flex items-center space-x-2">
            <TestTube className="h-4 w-4" />
            <span>Tests</span>
          </TabsTrigger>
        </TabsList>

        {/* Gestion des images */}
        <TabsContent value="image-management" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ImageIcon className="h-5 w-5" />
                <span>{t("imageManagement.title")}</span>
              </CardTitle>
              <CardDescription>{t("imageManagement.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <SiteConfigurationImageManagement
                establishmentId={establishmentId}
                organizationId={organizationId}
                isSystemAdmin={isSystemAdmin}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paramètres généraux */}
        <TabsContent value="general-settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>{t("generalSettings.title")}</span>
              </CardTitle>
              <CardDescription>{t("generalSettings.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center">
                <Settings className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                <p className="text-muted-foreground">{t("generalSettings.comingSoon")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tests */}
        <TabsContent value="tests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TestTube className="h-5 w-5" />
                <span>Tests Realtime</span>
              </CardTitle>
              <CardDescription>Tests pour diagnostiquer les problèmes de realtime</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h3 className="mb-2 font-semibold">Informations de debug</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Establishment ID:</strong> {establishmentId}
                    </p>
                    <p>
                      <strong>Organization ID:</strong> {organizationId}
                    </p>
                    <p>
                      <strong>Establishment Name:</strong> {establishmentName}
                    </p>
                    <p>
                      <strong>Is System Admin:</strong> {isSystemAdmin ? "Oui" : "Non"}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="mb-2 font-semibold">Test de connexion Supabase</h3>
                  <Button
                    onClick={async () => {
                      try {
                        const { createClient } = await import("@/lib/supabase/client");
                        const supabase = createClient();
                        const { data, error } = await supabase
                          .from("establishment_gallery_sections")
                          .select("count")
                          .eq("establishment_id", establishmentId)
                          .limit(1);

                        if (error) {
                          console.error("Erreur de connexion:", error);
                          alert(`Erreur de connexion: ${error.message}`);
                        } else {
                          console.log("Connexion réussie:", data);
                          alert("Connexion Supabase réussie !");
                        }
                      } catch (err) {
                        console.error("Erreur:", err);
                        alert(`Erreur: ${err}`);
                      }
                    }}
                  >
                    Tester la connexion
                  </Button>
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="mb-2 font-semibold">Test des événements realtime</h3>
                  <Button
                    onClick={async () => {
                      try {
                        const { createClient } = await import("@/lib/supabase/client");
                        const supabase = createClient();

                        console.log("Test de subscription realtime...");

                        const channel = supabase
                          .channel("test-realtime")
                          .on(
                            "postgres_changes",
                            {
                              event: "*",
                              schema: "public",
                              table: "establishment_gallery_sections",
                              filter: `establishment_id=eq.${establishmentId}`,
                            },
                            (payload) => {
                              console.log("Événement realtime reçu:", payload);
                              alert(`Événement realtime reçu: ${payload.eventType}`);
                            },
                          )
                          .subscribe((status) => {
                            console.log("Statut subscription test:", status);
                            alert(`Subscription test: ${status}`);
                          });

                        // Nettoyer après 10 secondes
                        setTimeout(() => {
                          supabase.removeChannel(channel);
                          console.log("Test de subscription terminé");
                        }, 10000);
                      } catch (err) {
                        console.error("Erreur test realtime:", err);
                        alert(`Erreur test realtime: ${err}`);
                      }
                    }}
                  >
                    Tester les événements realtime
                  </Button>
                </div>

                {/* Tableau establishment_gallery */}
                <div className="rounded-lg border p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold">Tableau establishment_gallery</h3>
                    <div className="flex space-x-2">
                      <Button onClick={loadGalleryData} disabled={galleryLoading} variant="outline" size="sm">
                        {galleryLoading ? "Chargement..." : "Recharger"}
                      </Button>
                      <Button
                        onClick={toggleGalleryRealtime}
                        variant={isGalleryRealtimeActive ? "destructive" : "default"}
                        size="sm"
                      >
                        {isGalleryRealtimeActive ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {isGalleryRealtimeActive ? "Arrêter" : "Realtime"}
                      </Button>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left">ID</th>
                          <th className="p-2 text-left">Image Name</th>
                          <th className="p-2 text-left">URL</th>
                          <th className="p-2 text-left">Public</th>
                          <th className="p-2 text-left">Featured</th>
                          <th className="p-2 text-left">Deleted</th>
                          <th className="p-2 text-left">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {galleryData.map((item, index) => (
                          <tr key={item.id || index} className="border-b">
                            <td className="p-2 font-mono text-xs">{item.id}</td>
                            <td className="p-2">{item.image_name}</td>
                            <td className="max-w-32 truncate p-2">{item.image_url}</td>
                            <td className="p-2">{item.is_public ? "✅" : "❌"}</td>
                            <td className="p-2">{item.is_featured ? "✅" : "❌"}</td>
                            <td className="p-2">{item.deleted ? "✅" : "❌"}</td>
                            <td className="p-2 text-xs">{new Date(item.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {galleryData.length === 0 && <p className="text-muted-foreground p-4 text-center">Aucune donnée</p>}
                  </div>
                </div>

                {/* Tableau establishment_gallery_sections */}
                <div className="rounded-lg border p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold">Tableau establishment_gallery_sections</h3>
                    <div className="flex space-x-2">
                      <Button onClick={loadSectionsData} disabled={sectionsLoading} variant="outline" size="sm">
                        {sectionsLoading ? "Chargement..." : "Recharger"}
                      </Button>
                      <Button
                        onClick={toggleSectionsRealtime}
                        variant={isSectionsRealtimeActive ? "destructive" : "default"}
                        size="sm"
                      >
                        {isSectionsRealtimeActive ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {isSectionsRealtimeActive ? "Arrêter" : "Realtime"}
                      </Button>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left">ID</th>
                          <th className="p-2 text-left">Image ID</th>
                          <th className="p-2 text-left">Section</th>
                          <th className="p-2 text-left">Order</th>
                          <th className="p-2 text-left">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionsData.map((item, index) => (
                          <tr key={item.id || index} className="border-b">
                            <td className="p-2 font-mono text-xs">{item.id}</td>
                            <td className="p-2 font-mono text-xs">{item.image_id}</td>
                            <td className="p-2">{item.section}</td>
                            <td className="p-2">{item.display_order}</td>
                            <td className="p-2 text-xs">{new Date(item.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {sectionsData.length === 0 && (
                      <p className="text-muted-foreground p-4 text-center">Aucune donnée</p>
                    )}
                  </div>
                </div>

                {/* Tableau données combinées (jointure) */}
                <div className="rounded-lg border p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold">Tableau données combinées (jointure)</h3>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => setCombinedDataFilter(combinedDataFilter === "all" ? "hero_carousel" : "all")}
                        variant="outline"
                        size="sm"
                      >
                        {combinedDataFilter === "all" ? "Toutes sections" : "Hero Carousel uniquement"}
                      </Button>
                      <Button onClick={loadCombinedData} disabled={combinedLoading} variant="outline" size="sm">
                        {combinedLoading ? "Chargement..." : "Recharger"}
                      </Button>
                      <Button
                        onClick={toggleCombinedRealtime}
                        variant={isCombinedRealtimeActive ? "destructive" : "default"}
                        size="sm"
                      >
                        {isCombinedRealtimeActive ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {isCombinedRealtimeActive ? "Arrêter" : "Realtime"}
                      </Button>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left">Section ID</th>
                          <th className="p-2 text-left">Image ID</th>
                          <th className="p-2 text-left">Section</th>
                          <th className="p-2 text-left">Order</th>
                          <th className="p-2 text-left">Image Name</th>
                          <th className="p-2 text-left">URL</th>
                          <th className="p-2 text-left">Public</th>
                          <th className="p-2 text-left">Featured</th>
                          <th className="p-2 text-left">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {combinedData
                          .filter((item) => combinedDataFilter === "all" || item.section === combinedDataFilter)
                          .map((item, index) => (
                            <tr key={item.id || index} className="border-b">
                              <td className="p-2 font-mono text-xs">{item.id}</td>
                              <td className="p-2 font-mono text-xs">{item.image_id}</td>
                              <td className="p-2">{item.section}</td>
                              <td className="p-2">{item.display_order}</td>
                              <td className="p-2">{item.image_name}</td>
                              <td className="max-w-32 truncate p-2">{item.image_url}</td>
                              <td className="p-2">{item.is_public ? "✅" : "❌"}</td>
                              <td className="p-2">{item.is_featured ? "✅" : "❌"}</td>
                              <td className="p-2 text-xs">{new Date(item.created_at).toLocaleString()}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {combinedData.filter((item) => combinedDataFilter === "all" || item.section === combinedDataFilter)
                      .length === 0 && <p className="text-muted-foreground p-4 text-center">Aucune donnée</p>}
                  </div>
                </div>

                {/* Tableau Hero Carousel */}
                <div className="rounded-lg border p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold">Tableau Hero Carousel</h3>
                    <div className="flex space-x-2">
                      <Button onClick={loadHeroCarouselData} disabled={heroCarouselLoading} variant="outline" size="sm">
                        {heroCarouselLoading ? "Chargement..." : "Recharger"}
                      </Button>
                      <Button
                        onClick={toggleHeroCarouselRealtime}
                        variant={isHeroCarouselRealtimeActive ? "destructive" : "default"}
                        size="sm"
                      >
                        {isHeroCarouselRealtimeActive ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {isHeroCarouselRealtimeActive ? "Arrêter" : "Realtime"}
                      </Button>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left">Section ID</th>
                          <th className="p-2 text-left">Image ID</th>
                          <th className="p-2 text-left">Order</th>
                          <th className="p-2 text-left">Image Name</th>
                          <th className="p-2 text-left">URL</th>
                          <th className="p-2 text-left">Public</th>
                          <th className="p-2 text-left">Featured</th>
                          <th className="p-2 text-left">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {heroCarouselData.map((item, index) => (
                          <tr key={item.id || index} className="border-b">
                            <td className="p-2 font-mono text-xs">{item.id}</td>
                            <td className="p-2 font-mono text-xs">{item.image_id}</td>
                            <td className="p-2">{item.display_order}</td>
                            <td className="p-2">{item.image_name}</td>
                            <td className="max-w-32 truncate p-2">{item.image_url}</td>
                            <td className="p-2">{item.is_public ? "✅" : "❌"}</td>
                            <td className="p-2">{item.is_featured ? "✅" : "❌"}</td>
                            <td className="p-2 text-xs">{new Date(item.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {heroCarouselData.length === 0 && (
                      <p className="text-muted-foreground p-4 text-center">Aucune donnée</p>
                    )}
                  </div>
                </div>

                {/* Tableau Home Cards */}
                <div className="rounded-lg border p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold">Tableau Home Cards</h3>
                    <div className="flex space-x-2">
                      <Button onClick={loadHomeCardsData} disabled={homeCardsLoading} variant="outline" size="sm">
                        {homeCardsLoading ? "Chargement..." : "Recharger"}
                      </Button>
                      <Button
                        onClick={toggleHomeCardsRealtime}
                        variant={isHomeCardsRealtimeActive ? "destructive" : "default"}
                        size="sm"
                      >
                        {isHomeCardsRealtimeActive ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {isHomeCardsRealtimeActive ? "Arrêter" : "Realtime"}
                      </Button>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left">Section ID</th>
                          <th className="p-2 text-left">Image ID</th>
                          <th className="p-2 text-left">Order</th>
                          <th className="p-2 text-left">Image Name</th>
                          <th className="p-2 text-left">URL</th>
                          <th className="p-2 text-left">Public</th>
                          <th className="p-2 text-left">Featured</th>
                          <th className="p-2 text-left">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {homeCardsData.map((item, index) => (
                          <tr key={item.id || index} className="border-b">
                            <td className="p-2 font-mono text-xs">{item.id}</td>
                            <td className="p-2 font-mono text-xs">{item.image_id}</td>
                            <td className="p-2">{item.display_order}</td>
                            <td className="p-2">{item.image_name}</td>
                            <td className="max-w-32 truncate p-2">{item.image_url}</td>
                            <td className="p-2">{item.is_public ? "✅" : "❌"}</td>
                            <td className="p-2">{item.is_featured ? "✅" : "❌"}</td>
                            <td className="p-2 text-xs">{new Date(item.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {homeCardsData.length === 0 && (
                      <p className="text-muted-foreground p-4 text-center">Aucune donnée</p>
                    )}
                  </div>
                </div>

                {/* Tableau Gallery Section */}
                <div className="rounded-lg border p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold">Tableau Gallery Section</h3>
                    <div className="flex space-x-2">
                      <Button
                        onClick={loadGallerySectionData}
                        disabled={gallerySectionLoading}
                        variant="outline"
                        size="sm"
                      >
                        {gallerySectionLoading ? "Chargement..." : "Recharger"}
                      </Button>
                      <Button
                        onClick={toggleGallerySectionRealtime}
                        variant={isGallerySectionRealtimeActive ? "destructive" : "default"}
                        size="sm"
                      >
                        {isGallerySectionRealtimeActive ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {isGallerySectionRealtimeActive ? "Arrêter" : "Realtime"}
                      </Button>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left">Section ID</th>
                          <th className="p-2 text-left">Image ID</th>
                          <th className="p-2 text-left">Order</th>
                          <th className="p-2 text-left">Image Name</th>
                          <th className="p-2 text-left">URL</th>
                          <th className="p-2 text-left">Public</th>
                          <th className="p-2 text-left">Featured</th>
                          <th className="p-2 text-left">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gallerySectionData.map((item, index) => (
                          <tr key={item.id || index} className="border-b">
                            <td className="p-2 font-mono text-xs">{item.id}</td>
                            <td className="p-2 font-mono text-xs">{item.image_id}</td>
                            <td className="p-2">{item.display_order}</td>
                            <td className="p-2">{item.image_name}</td>
                            <td className="max-w-32 truncate p-2">{item.image_url}</td>
                            <td className="p-2">{item.is_public ? "✅" : "❌"}</td>
                            <td className="p-2">{item.is_featured ? "✅" : "❌"}</td>
                            <td className="p-2 text-xs">{new Date(item.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {gallerySectionData.length === 0 && (
                      <p className="text-muted-foreground p-4 text-center">Aucune donnée</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

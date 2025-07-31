"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Image, Home, Grid3X3, Plus, Save, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteConfigurationSection } from "./site-configuration-section";
import { useGalleryRealtime } from "@/hooks/gallery/use-gallery-realtime";
import { GallerySectionConfig, GallerySection } from "@/types/gallery";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableSectionImageItem } from "./sortable-section-image-item";

interface SiteConfigurationImageManagementProps {
  establishmentId: string;
  organizationId: string;
  isSystemAdmin: boolean;
}

export function SiteConfigurationImageManagement({
  establishmentId,
  organizationId,
  isSystemAdmin,
}: SiteConfigurationImageManagementProps) {
  const t = useTranslations("SiteConfiguration");
  const [activeSection, setActiveSection] = useState<GallerySection>("hero_carousel");
  const [showReorder, setShowReorder] = useState<Record<GallerySection, boolean>>({
    hero_carousel: false,
    home_cards: false,
    gallery: false,
  });

  // Hook pour récupérer les images de section
  const { sectionImages, reorderSectionImages, loading } = useGalleryRealtime({
    establishmentId,
    organizationId,
    section: activeSection,
  });

  // Configuration des sections
  const sectionConfigs: Record<GallerySection, GallerySectionConfig> = {
    hero_carousel: {
      section: "hero_carousel",
      title: t("sections.hero_carousel.title"),
      description: t("sections.hero_carousel.description"),
      icon: Image,
    },
    home_cards: {
      section: "home_cards",
      title: t("sections.home_cards.title"),
      description: t("sections.home_cards.description"),
      maxImages: 4,
      icon: Home,
    },
    gallery: {
      section: "gallery",
      title: t("sections.gallery.title"),
      description: t("sections.gallery.description"),
      icon: Grid3X3,
    },
  };

  const sections: GallerySection[] = ["hero_carousel", "home_cards", "gallery"];

  const toggleReorder = (section: GallerySection) => {
    setShowReorder((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const closeReorder = (section: GallerySection) => {
    setShowReorder((prev) => ({
      ...prev,
      [section]: false,
    }));
  };

  // Drag & Drop pour la réorganisation
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const [reorderImages, setReorderImages] = useState(sectionImages);
  const [hasChanges, setHasChanges] = useState(false);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setReorderImages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // Mettre à jour display_order pour chaque image
        const updatedItems = newItems.map((item, index) => ({
          ...item,
          display_order: index,
        }));

        setHasChanges(true);
        return updatedItems;
      });
    }
  };

  const handleSaveReorder = async () => {
    try {
      await reorderSectionImages(reorderImages);
      setHasChanges(false);
      closeReorder(activeSection);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
    }
  };

  const handleCancelReorder = () => {
    setReorderImages(sectionImages);
    setHasChanges(false);
    closeReorder(activeSection);
  };

  // Mettre à jour les images de réorganisation quand les sectionImages changent
  React.useEffect(() => {
    setReorderImages(sectionImages);
  }, [sectionImages]);

  return (
    <div className="space-y-6">
      {/* Navigation des sections */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {sections.map((section) => {
          const config = sectionConfigs[section];
          const Icon = config.icon;
          const isActive = activeSection === section;

          return (
            <Card
              key={section}
              className={`cursor-pointer transition-all hover:shadow-md ${isActive ? "ring-primary ring-2" : ""}`}
              onClick={() => setActiveSection(section)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Icon className="h-5 w-5" />
                    <CardTitle className="text-lg">{config.title}</CardTitle>
                  </div>
                  {config.maxImages && (
                    <Badge variant="secondary">{t("sections.maxImages", { count: config.maxImages })}</Badge>
                  )}
                </div>
                <CardDescription className="text-sm">{config.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Section active */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {(() => {
                const Icon = sectionConfigs[activeSection].icon;
                return <Icon className="h-5 w-5" />;
              })()}
              <CardTitle>{sectionConfigs[activeSection].title}</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleReorder(activeSection)}
                className="flex items-center space-x-2"
              >
                <Grid3X3 className="h-4 w-4" />
                <span>{t("actions.reorder")}</span>
              </Button>
              <Button size="sm" className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>{t("actions.addImage")}</span>
              </Button>
            </div>
          </div>
          <CardDescription>{sectionConfigs[activeSection].description}</CardDescription>
        </CardHeader>
        <CardContent>
          <SiteConfigurationSection
            establishmentId={establishmentId}
            organizationId={organizationId}
            section={activeSection}
            config={sectionConfigs[activeSection]}
            isSystemAdmin={isSystemAdmin}
          />
        </CardContent>
      </Card>

      {/* Zone de réorganisation pour chaque section */}
      {sections.map((section) => {
        if (!showReorder[section]) return null;

        return (
          <Card key={`reorder-${section}`} className="border-2 border-dashed">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {(() => {
                    const Icon = sectionConfigs[section].icon;
                    return <Icon className="h-5 w-5" />;
                  })()}
                  <CardTitle className="text-lg">
                    {t("imageReorder.title", { section: sectionConfigs[section].title })}
                  </CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline" onClick={handleCancelReorder}>
                    <X className="h-4 w-4" />
                    <span>{t("actions.cancel")}</span>
                  </Button>
                  <Button
                    size="sm"
                    className="flex items-center space-x-2"
                    onClick={handleSaveReorder}
                    disabled={!hasChanges || loading}
                  >
                    <Save className="h-4 w-4" />
                    <span>{t("actions.save")}</span>
                  </Button>
                </div>
              </div>
              <CardDescription>{t("imageReorder.instructions")}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
                </div>
              ) : reorderImages.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">{t("imageReorder.noImages")}</div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={reorderImages.map((img) => img.id)} strategy={verticalListSortingStrategy}>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                      {reorderImages.map((image) => (
                        <SortableSectionImageItem key={image.id} image={image} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

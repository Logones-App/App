"use client";

import React, { useState } from "react";

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
import { Image, Home, Grid3X3, Plus, Save, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GallerySectionConfig, GallerySection } from "@/types/gallery";

import { SiteConfigurationSection } from "./site-configuration-section";
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

  const handleDragEnd = (event: DragEndEvent) => {
    // Cette fonctionnalité sera gérée par chaque section individuellement
    console.log("Drag & Drop désactivé - géré par les sections individuelles");
  };

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
    </div>
  );
}

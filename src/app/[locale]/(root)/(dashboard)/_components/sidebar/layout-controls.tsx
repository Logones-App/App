"use client";

import { useState } from "react";

import { Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { SidebarVariant, SidebarCollapsible, ContentLayout } from "@/lib/layout-preferences";
import { setValueToCookie } from "@/server/server-actions";

// Valeurs par défaut (fallback si pas de cookie)
const DEFAULT_VARIANT: SidebarVariant = "inset";
const DEFAULT_COLLAPSIBLE: SidebarCollapsible = "icon";
const DEFAULT_LAYOUT: ContentLayout = "centered";

export function LayoutControls() {
  // On peut améliorer en lisant les cookies côté client si besoin
  const [variant, setVariant] = useState<SidebarVariant>(DEFAULT_VARIANT);
  const [collapsible, setCollapsible] = useState<SidebarCollapsible>(DEFAULT_COLLAPSIBLE);
  const [contentLayout, setContentLayout] = useState<ContentLayout>(DEFAULT_LAYOUT);

  const handleValueChange = async (key: string, value: string) => {
    await setValueToCookie(key, value);
    if (key === "sidebar_variant") setVariant(value as SidebarVariant);
    if (key === "sidebar_collapsible") setCollapsible(value as SidebarCollapsible);
    if (key === "content_layout") setContentLayout(value as ContentLayout);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon">
          <Settings />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end">
        <div className="flex flex-col gap-5">
          <div className="space-y-1.5">
            <h4 className="text-sm leading-none font-medium">Paramètres d&apos;affichage</h4>
            <p className="text-muted-foreground text-xs">Personnalisez l&apos;apparence de votre dashboard.</p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Type de sidebar</Label>
              <ToggleGroup
                className="w-full"
                size="sm"
                variant="outline"
                type="single"
                value={variant}
                onValueChange={(value) => handleValueChange("sidebar_variant", value)}
              >
                <ToggleGroupItem className="text-xs" value="inset" aria-label="Toggle inset">
                  Inset
                </ToggleGroupItem>
                <ToggleGroupItem className="text-xs" value="sidebar" aria-label="Toggle sidebar">
                  Sidebar
                </ToggleGroupItem>
                <ToggleGroupItem className="text-xs" value="floating" aria-label="Toggle floating">
                  Floating
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Sidebar rétractable</Label>
              <ToggleGroup
                className="w-full"
                size="sm"
                variant="outline"
                type="single"
                value={collapsible}
                onValueChange={(value) => handleValueChange("sidebar_collapsible", value)}
              >
                <ToggleGroupItem className="text-xs" value="icon" aria-label="Toggle icon">
                  Icône
                </ToggleGroupItem>
                <ToggleGroupItem className="text-xs" value="offcanvas" aria-label="Toggle offcanvas">
                  OffCanvas
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Disposition du contenu</Label>
              <ToggleGroup
                className="w-full"
                size="sm"
                variant="outline"
                type="single"
                value={contentLayout}
                onValueChange={(value) => handleValueChange("content_layout", value)}
              >
                <ToggleGroupItem className="text-xs" value="centered" aria-label="Toggle centered">
                  Centré
                </ToggleGroupItem>
                <ToggleGroupItem className="text-xs" value="full-width" aria-label="Toggle full-width">
                  Pleine largeur
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

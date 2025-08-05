"use client";

import React, { useState, useMemo } from "react";

import { Grid3X3, List } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GalleryImage } from "@/types/gallery";

interface GalleryGridProps {
  images: GalleryImage[];
  isEditable?: boolean;
}

export function GalleryGrid({ images, isEditable = true }: GalleryGridProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredAndSortedImages = useMemo(() => {
    console.log("🖼️ Filtrage des images:", {
      totalImages: images.length,
      images,
    });

    const filtered = images.filter((image) => {
      // Vérifier que l'image existe et a un ID
      if (!image || !image.id) {
        console.log("⚠️ Image invalide filtrée:", image);
        return false;
      }

      // Vérifier qu'elle n'est pas supprimée
      if (image.deleted) {
        return false;
      }

      // Vérifier qu'elle a une URL ou un nom
      const hasContent = image.image_url || image.image_name;
      if (!hasContent) {
        console.log("⚠️ Image sans contenu filtrée:", image);
        return false;
      }

      return true;
    });

    console.log("✅ Images filtrées:", filtered.length);

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "date") {
        comparison = new Date(a.created_at ?? "").getTime() - new Date(b.created_at ?? "").getTime();
      } else if (sortBy === "name") {
        comparison = (a.image_name ?? "").localeCompare(b.image_name ?? "");
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [images, sortBy, sortOrder]);

  const handleSortChange = (value: string) => {
    setSortBy(value);
  };

  const handleSortOrderChange = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Galerie d&apos;images</CardTitle>
              <p className="text-muted-foreground text-sm">Gérez et visualisez les images de votre établissement</p>
            </div>
            <Badge variant="secondary">{filteredAndSortedImages.length} image(s)</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Trier par:</span>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="rounded border px-2 py-1 text-sm"
                >
                  <option value="date">Date</option>
                  <option value="name">Nom</option>
                </select>
                <Button variant="ghost" size="sm" onClick={handleSortOrderChange} className="ml-2">
                  {sortOrder === "asc" ? "↑" : "↓"}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => handleViewModeChange("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => handleViewModeChange("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {filteredAndSortedImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 text-4xl">📸</div>
              <h3 className="mb-2 text-lg font-semibold">Aucune image</h3>
              <p className="text-muted-foreground text-sm">Aucune image n&apos;a été ajoutée à la galerie.</p>
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                  : "space-y-4"
              }
            >
              {filteredAndSortedImages.map((image) => (
                <div key={image.id} className="relative">
                  <img
                    src={image.image_url}
                    alt={image.alt_text ?? image.image_name ?? "Image"}
                    className="h-48 w-full rounded-lg object-cover"
                  />
                  <div className="mt-2">
                    <p className="font-medium">{image.image_name}</p>
                    {image.image_description && (
                      <p className="text-muted-foreground text-sm">{image.image_description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

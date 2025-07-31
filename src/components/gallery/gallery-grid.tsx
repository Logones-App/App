"use client";

import React, { useState } from "react";
import { GalleryGridProps, GalleryImage } from "@/types/gallery";
import { GalleryItem } from "./gallery-item";
import { GalleryReorder } from "./gallery-reorder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Grid3X3, List, Eye, EyeOff, Star, StarOff } from "lucide-react";

export function GalleryGrid({
  images,
  onImageClick,
  onImageEdit,
  onImageDelete,
  onTogglePublic,
  onToggleFeatured,
  onImageReorder,
  isEditable = false,
  className = "",
}: GalleryGridProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPublic, setFilterPublic] = useState<"all" | "public" | "private">("all");
  const [filterFeatured, setFilterFeatured] = useState<"all" | "featured" | "not-featured">("all");

  // Filtrer les images
  const filteredImages = images.filter((image) => {
    // Filtre par recherche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const searchableText = [image.image_name, image.image_description, image.alt_text]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!searchableText.includes(searchLower)) {
        return false;
      }
    }

    // Filtre par visibilité
    if (filterPublic === "public" && !image.is_public) return false;
    if (filterPublic === "private" && image.is_public) return false;

    // Filtre par mise en avant
    if (filterFeatured === "featured" && !image.is_featured) return false;
    if (filterFeatured === "not-featured" && image.is_featured) return false;

    return true;
  });

  const stats = {
    total: images.length,
    public: images.filter((img) => img.is_public).length,
    private: images.filter((img) => !img.is_public).length,
    featured: images.filter((img) => img.is_featured).length,
    filtered: filteredImages.length,
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* En-tête avec filtres */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Galerie d'images
              <Badge variant="secondary">
                {stats.filtered}/{stats.total}
              </Badge>
            </CardTitle>

            <div className="flex items-center gap-2">
              {/* Mode d'affichage */}
              <div className="flex items-center rounded-md border">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            {/* Recherche */}
            <div className="flex-1">
              <Input
                placeholder="Rechercher dans les images..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {/* Filtres */}
            <div className="flex items-center gap-2">
              <Select
                value={filterPublic}
                onValueChange={(value: string) => setFilterPublic(value as "all" | "public" | "private")}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Publiques
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <EyeOff className="h-4 w-4" />
                      Privées
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filterFeatured}
                onValueChange={(value: string) => setFilterFeatured(value as "all" | "featured" | "not-featured")}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="featured">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      En avant
                    </div>
                  </SelectItem>
                  <SelectItem value="not-featured">
                    <div className="flex items-center gap-2">
                      <StarOff className="h-4 w-4" />
                      Normales
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Statistiques */}
          <div className="text-muted-foreground mt-4 flex items-center gap-4 text-sm">
            <span>Total: {stats.total}</span>
            <span>Publiques: {stats.public}</span>
            <span>Privées: {stats.private}</span>
            <span>En avant: {stats.featured}</span>
          </div>
        </CardContent>
      </Card>

      {/* Grille d'images */}
      <div
        className={
          viewMode === "grid" ? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "space-y-2"
        }
      >
        {filteredImages.map((image) => (
          <GalleryItem
            key={image.id}
            image={image}
            onClick={onImageClick}
            onEdit={onImageEdit}
            onDelete={onImageDelete}
            onTogglePublic={onTogglePublic}
            onToggleFeatured={onToggleFeatured}
            isEditable={isEditable}
            viewMode={viewMode}
          />
        ))}
      </div>

      {/* Message si aucune image */}
      {filteredImages.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="space-y-2">
              <Grid3X3 className="text-muted-foreground mx-auto h-12 w-12" />
              <h3 className="text-lg font-medium">Aucune image trouvée</h3>
              <p className="text-muted-foreground text-sm">
                                 {searchTerm || filterPublic !== "all" || filterFeatured !== "all"
                   ? "Aucune image ne correspond aux critères de recherche."
                   : "Aucune image n&apos;a été ajoutée à la galerie."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

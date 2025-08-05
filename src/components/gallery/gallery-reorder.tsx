"use client";

import React, { useState, useCallback } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GalleryImage } from "@/types/gallery";

import { SortableGalleryItem } from "./sortable-gallery-item";

interface GalleryReorderProps {
  images: GalleryImage[];
  onReorder: (reorderedImages: GalleryImage[]) => void;
  onCancel: () => void;
}

export function GalleryReorder({ images, onReorder, onCancel }: GalleryReorderProps) {
  const [reorderImages, setReorderImages] = useState<GalleryImage[]>(images);
  const [hasChanges, setHasChanges] = useState(false);

  const handleDragEnd = useCallback((event: { active: { id: string }; over: { id: string } | null }) => {
    const { active, over } = event;
    if (active.id !== over?.id && over) {
      setReorderImages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = [...items];
        const [removed] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, removed);
        setHasChanges(true);
        return newItems;
      });
    }
  }, []);

  const handleSaveReorder = async () => {
    try {
      await onReorder(reorderImages);
      setHasChanges(false);
      onCancel();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'ordre:", error);
    }
  };

  const handleCancelReorder = () => {
    setReorderImages(images);
    setHasChanges(false);
    onCancel();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Réorganisation des images</CardTitle>
              <p className="text-muted-foreground text-sm">
                Glissez et déposez les images pour changer leur ordre d&apos;affichage
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{reorderImages.length} image(s)</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {reorderImages.map((image) => (
              <SortableGalleryItem key={image.id} image={image} />
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleCancelReorder}>
          Annuler
        </Button>
        <Button onClick={handleSaveReorder} disabled={!hasChanges} className="min-w-[100px]">
          Sauvegarder
        </Button>
      </div>
    </div>
  );
}

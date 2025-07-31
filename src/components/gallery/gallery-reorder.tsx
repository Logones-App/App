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
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { GalleryImage } from "@/types/gallery";
import { GalleryItem } from "./gallery-item";
import { SortableGalleryItem } from "./sortable-gallery-item";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Save, RotateCcw } from "lucide-react";
import { generateDragId } from "@/lib/utils/gallery-helpers";

interface GalleryReorderProps {
  images: GalleryImage[];
  onReorder: (images: GalleryImage[]) => void;
  className?: string;
}

export function GalleryReorder({ images, onReorder, className = "" }: GalleryReorderProps) {
  const [items, setItems] = useState<GalleryImage[]>(images);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => generateDragId(item) === active.id);
        const newIndex = items.findIndex((item) => generateDragId(item) === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // Mettre à jour l'ordre d'affichage
        const updatedItems = newItems.map((item, index) => ({
          ...item,
          display_order: index,
        }));

        setHasChanges(true);
        return updatedItems;
      });
    }

    setActiveId(null);
  };

  const handleSaveOrder = () => {
    onReorder(items);
    setHasChanges(false);
  };

  const handleResetOrder = () => {
    setItems(images);
    setHasChanges(false);
  };

  const activeItem = activeId ? items.find((item) => generateDragId(item) === activeId) : null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* En-tête avec actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="text-muted-foreground h-5 w-5" />
              <h3 className="font-medium">Réorganiser les images</h3>
              {hasChanges && <Badge variant="default">Modifications non sauvegardées</Badge>}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleResetOrder} disabled={!hasChanges}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Annuler
              </Button>
              <Button size="sm" onClick={handleSaveOrder} disabled={!hasChanges}>
                <Save className="mr-2 h-4 w-4" />
                Sauvegarder
              </Button>
            </div>
          </div>

          <p className="text-muted-foreground mt-2 text-sm">
            Glissez et déposez les images pour changer leur ordre d&apos;affichage
          </p>
        </CardContent>
      </Card>

      {/* Grille avec drag & drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map((item) => generateDragId(item))} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((image) => (
              <SortableGalleryItem key={image.id} image={image} isEditable={true} />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeItem ? (
            <div className="h-64 w-64 overflow-hidden rounded-lg shadow-lg">
              <img
                src={activeItem.image_url}
                alt={activeItem.alt_text ?? activeItem.image_name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

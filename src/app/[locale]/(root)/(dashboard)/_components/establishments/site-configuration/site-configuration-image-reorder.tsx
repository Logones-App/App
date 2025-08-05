"use client";

import { useState } from "react";

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
import { X, Save, RotateCcw, Info } from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GallerySection, GallerySectionImage } from "@/types/gallery";

import { SortableSectionImageItem } from "./sortable-section-image-item";

interface SiteConfigurationImageReorderProps {
  sectionImages: GallerySectionImage[];
  onReorder: (images: GallerySectionImage[]) => void;
  onClose: () => void;
  section: GallerySection;
}

export function SiteConfigurationImageReorder({
  sectionImages,
  onReorder,
  onClose,
  section,
}: SiteConfigurationImageReorderProps) {
  const t = useTranslations("SiteConfiguration");
  const [images, setImages] = useState<GallerySectionImage[]>(sectionImages);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setImages((items) => {
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

  const handleSave = () => {
    onReorder(images);
  };

  const handleCancel = () => {
    setImages(sectionImages);
    setHasChanges(false);
    onClose();
  };

  const handleReset = () => {
    setImages(sectionImages);
    setHasChanges(false);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t("imageReorder.title", { section: t(`sections.${section}.title`) })}</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>{t("imageReorder.instructions")}</AlertDescription>
          </Alert>

          {/* Informations */}
          <div className="text-muted-foreground flex items-center justify-between text-sm">
            <span>{t("imageReorder.imageCount", { count: images.length })}</span>
            {hasChanges && <Badge variant="secondary">{t("imageReorder.hasChanges")}</Badge>}
          </div>

          {/* Liste des images réorganisables */}
          {images.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <p>{t("imageReorder.noImages")}</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={images} strategy={verticalListSortingStrategy}>
                <div className="max-h-[400px] space-y-2 overflow-y-auto">
                  {images.map((image) => (
                    <SortableSectionImageItem key={image.id} image={image} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center space-x-2">
              {hasChanges && (
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t("actions.reset")}
                </Button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={handleCancel}>
                {t("actions.cancel")}
              </Button>
              <Button onClick={handleSave} disabled={!hasChanges}>
                <Save className="mr-2 h-4 w-4" />
                {t("actions.save")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GalleryImage } from "@/types/gallery";
import { GalleryItem } from "./gallery-item";
import { generateDragId } from "@/lib/utils/gallery-helpers";
import { GripVertical } from "lucide-react";

interface SortableGalleryItemProps {
  image: GalleryImage;
  isEditable?: boolean;
}

export function SortableGalleryItem({ image, isEditable = false }: SortableGalleryItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: generateDragId(image),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`relative ${isDragging ? "z-50" : ""}`}>
      {/* Handle de drag */}
      {isEditable && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 z-10 cursor-grab rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black/70 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      <GalleryItem
        image={image}
        onClick={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        isEditable={isEditable}
        viewMode="grid"
      />
    </div>
  );
}

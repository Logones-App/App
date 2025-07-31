"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Image as ImageIcon } from "lucide-react";
import { GallerySectionImage } from "@/types/gallery";

interface SortableSectionImageItemProps {
  image: GallerySectionImage;
}

export function SortableSectionImageItem({ image }: SortableSectionImageItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card hover:bg-accent/50 flex cursor-move items-center space-x-3 rounded-lg border p-3 transition-colors ${
        isDragging ? "opacity-50" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      {/* Handle de drag */}
      <div className="flex-shrink-0">
        <GripVertical className="text-muted-foreground h-4 w-4" />
      </div>

      {/* Image */}
      <div className="bg-muted h-12 w-12 flex-shrink-0 overflow-hidden rounded">
        {image.image_url ? (
          <img src={image.image_url} alt={image.alt_text ?? image.image_name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="text-muted-foreground h-6 w-6" />
          </div>
        )}
      </div>

      {/* Informations */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center space-x-2">
          <span className="truncate text-sm font-medium">{image.image_name}</span>
          <span className="text-muted-foreground text-xs">#{image.display_order + 1}</span>
        </div>
        <div className="text-muted-foreground flex items-center space-x-2 text-xs">
          {image.file_size && <span>{formatFileSize(image.file_size)}</span>}
          {image.dimensions && (
            <span>
              {image.dimensions.width} × {image.dimensions.height}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

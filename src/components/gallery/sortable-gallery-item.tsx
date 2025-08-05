"use client";

import React from "react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { formatFileSize } from "@/lib/utils/gallery-helpers";
import { GalleryImage } from "@/types/gallery";

interface SortableGalleryItemProps {
  image: GalleryImage;
}

export function SortableGalleryItem({ image }: SortableGalleryItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative aspect-square overflow-hidden rounded-lg border bg-white shadow-sm transition-all ${
        isDragging ? "z-50 scale-105 shadow-lg" : "hover:shadow-md"
      }`}
    >
      <img
        src={image.image_url}
        alt={image.alt_text ?? image.image_name ?? "Image"}
        className="h-full w-full object-cover"
      />
      <div className="bg-opacity-0 group-hover:bg-opacity-20 absolute inset-0 bg-black transition-all duration-200" />

      {/* Overlay pour le drag */}
      <div {...attributes} {...listeners} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Informations de l'image */}
      <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-white">
        <p className="truncate text-xs font-medium">{image.image_name}</p>
        {image.file_size && <p className="text-xs opacity-75">{formatFileSize(image.file_size)}</p>}
      </div>
    </div>
  );
}

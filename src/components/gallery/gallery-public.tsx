"use client";

import React, { useState } from "react";

import { GalleryImage } from "@/types/gallery";

import { GalleryLightbox } from "./gallery-lightbox";

interface GalleryPublicProps {
  images: GalleryImage[];
  className?: string;
}

export function GalleryPublic({ images, className }: GalleryPublicProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const publicImages = images.filter((image) => image.is_public);

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleCloseLightbox = () => {
    setSelectedImageIndex(null);
  };

  const handleImageChange = (index: number) => {
    setSelectedImageIndex(index);
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 text-4xl">📸</div>
      <h3 className="mb-2 text-lg font-semibold">Aucune photo disponible</h3>
      <p className="text-muted-foreground">La galerie de photos n&apos;est pas encore disponible.</p>
    </div>
  );

  const renderContent = () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {publicImages.map((image, index) => (
        <div
          key={image.id}
          className="group relative cursor-pointer overflow-hidden rounded-lg"
          onClick={() => handleImageClick(index)}
        >
          <img
            src={image.image_url}
            alt={image.alt_text ?? image.image_name ?? "Image"}
            className="h-48 w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
          <div className="bg-opacity-0 group-hover:bg-opacity-20 absolute inset-0 bg-black transition-all duration-200" />
        </div>
      ))}
    </div>
  );

  return (
    <div className={className}>
      {publicImages.length === 0 ? renderEmptyState() : renderContent()}

      {selectedImageIndex !== null && (
        <GalleryLightbox
          images={publicImages}
          initialIndex={selectedImageIndex}
          isOpen={selectedImageIndex !== null}
          onClose={handleCloseLightbox}
          onImageChange={handleImageChange}
        />
      )}
    </div>
  );
}

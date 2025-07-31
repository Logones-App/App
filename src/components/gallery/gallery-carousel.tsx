"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, Keyboard } from "swiper/modules";
import { GalleryCarouselProps } from "@/types/gallery";
import { getCarouselImageUrl } from "@/lib/utils/gallery-helpers";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

export function GalleryCarousel({
  images,
  autoPlay = true,
  showNavigation = true,
  showDots = true,
  className = "",
}: GalleryCarouselProps) {
  if (!images.length) {
    return (
      <div className={`bg-muted flex aspect-video items-center justify-center rounded-lg ${className}`}>
        <div className="text-center">
          <div className="mb-2 text-4xl">📸</div>
          <p className="text-muted-foreground">Aucune image disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Swiper
        modules={[Navigation, Pagination, Autoplay, Keyboard]}
        spaceBetween={0}
        slidesPerView={1}
        navigation={showNavigation}
        pagination={showDots ? { clickable: true } : false}
        autoplay={autoPlay ? { delay: 5000, disableOnInteraction: false } : false}
        keyboard={{ enabled: true }}
        loop={images.length > 1}
        className="aspect-video"
      >
        {images.map((image) => (
          <SwiperSlide key={image.id}>
            <div className="relative h-full w-full">
              <img
                src={getCarouselImageUrl(image.image_url)}
                alt={image.alt_text ?? image.image_name}
                className="h-full w-full object-cover"
                loading="lazy"
              />

              {/* Overlay avec informations */}
              {(image.image_name || image.image_description) && (
                <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  {image.image_name && <h3 className="mb-1 text-lg font-medium text-white">{image.image_name}</h3>}
                  {image.image_description && <p className="text-sm text-white/90">{image.image_description}</p>}
                </div>
              )}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Indicateur de progression */}
      {images.length > 1 && (
        <div className="absolute right-4 bottom-4 rounded bg-black/50 px-2 py-1 text-xs text-white">
          {images.length} images
        </div>
      )}
    </div>
  );
}

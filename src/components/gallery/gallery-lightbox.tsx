"use client";

import React, { useEffect, useState } from "react";

import { X, ChevronLeft, ChevronRight, Download, Copy, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getGalleryImageUrl, formatFileSize } from "@/lib/utils/gallery-helpers";
import { GalleryLightboxProps } from "@/types/gallery";

export function GalleryLightbox({ images, initialIndex = 0, isOpen, onClose, onImageChange }: GalleryLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    onImageChange?.(currentIndex);
  }, [currentIndex, onImageChange]);

  const currentImage = images[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    resetView();
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    resetView();
  };

  const resetView = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentImage.image_url);
    } catch (error) {
      console.error("Erreur lors de la copie:", error);
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = currentImage.image_url;
    link.download = currentImage.image_name ?? "image";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isOpen) return;

    switch (event.key) {
      case "Escape":
        onClose();
        break;
      case "ArrowLeft":
        handlePrevious();
        break;
      case "ArrowRight":
        handleNext();
        break;
      case "+":
      case "=":
        handleZoomIn();
        break;
      case "-":
        handleZoomOut();
        break;
      case "r":
        handleRotate();
        break;
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!currentImage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-7xl overflow-hidden p-0">
        <DialogTitle className="sr-only">{currentImage.image_name ?? "Image"} - Visualiseur d&apos;image</DialogTitle>
        <div className="relative h-full w-full">
          {/* En-tête */}
          <div className="absolute top-0 right-0 left-0 z-10 bg-black/50 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="font-medium">{currentImage.image_name ?? "Image"}</h3>
                <Badge variant="secondary">
                  {currentIndex + 1} / {images.length}
                </Badge>
                {currentImage.file_size && (
                  <span className="text-sm text-white/70">{formatFileSize(currentImage.file_size)}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleCopyUrl} className="text-white hover:bg-white/20">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDownload} className="text-white hover:bg-white/20">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Image principale */}
          <div className="flex h-full w-full items-center justify-center bg-black">
            <div
              className="relative overflow-hidden"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: "transform 0.2s ease",
              }}
            >
              <img
                src={getGalleryImageUrl(currentImage.image_url)}
                alt={currentImage.alt_text ?? currentImage.image_name ?? "Image"}
                className="max-h-full max-w-full object-contain"
                draggable={false}
              />
            </div>
          </div>

          {/* Navigation */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevious}
                className="absolute top-1/2 left-4 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleNext}
                className="absolute top-1/2 right-4 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Contrôles de zoom */}
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-black/50 p-2 text-white">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="text-white hover:bg-white/20"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>

            <span className="px-2 text-sm">{Math.round(zoom * 100)}%</span>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="text-white hover:bg-white/20"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="sm" onClick={handleRotate} className="text-white hover:bg-white/20">
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Description */}
          {currentImage.image_description && (
            <div className="absolute right-0 bottom-0 left-0 bg-black/50 p-4 text-white">
              <p className="text-sm">{currentImage.image_description}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

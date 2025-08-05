"use client";

import React, { useState, useCallback } from "react";

import { useDropzone } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useGalleryUpload } from "@/hooks/gallery/use-gallery-upload";
import { GalleryImage } from "@/types/gallery";

interface GalleryUploadProps {
  establishmentId: string;
  organizationId: string;
  onSuccess?: (image: GalleryImage) => void;
  onError?: (error: string) => void;
  maxFiles?: number;
}

export function GalleryUpload({
  establishmentId,
  organizationId,
  onSuccess,
  onError,
  maxFiles = 10,
}: GalleryUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [metadata, setMetadata] = useState({
    imageName: "",
    description: "",
    altText: "",
    isPublic: false,
    isFeatured: false,
  });

  const { uploadImage } = useGalleryUpload({
    establishmentId,
    organizationId,
    onSuccess,
    onError,
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    maxFiles,
  });

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    for (const file of selectedFiles) {
      await uploadImage(file, metadata);
    }

    setSelectedFiles([]);
    setMetadata({
      imageName: "",
      description: "",
      altText: "",
      isPublic: false,
      isFeatured: false,
    });
  };

  const renderDropzone = () => (
    <Card>
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
          }`}
        >
          <input {...getInputProps()} />
          <div className="space-y-2">
            <div className="text-4xl">📸</div>
            <p className="text-lg font-medium">
              {isDragActive ? "Déposez les images ici" : "Glissez-déposez des images ou cliquez pour sélectionner"}
            </p>
            <p className="text-muted-foreground text-sm">Formats supportés: JPEG, PNG, GIF, WebP</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderSelectedFiles = () => {
    if (selectedFiles.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Fichiers sélectionnés ({selectedFiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center space-x-3">
                  <div className="bg-muted h-10 w-10 rounded" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-muted-foreground text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>
                  Supprimer
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMetadataForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>Métadonnées des images</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="imageName">Nom de l&apos;image</Label>
            <Input
              id="imageName"
              value={metadata.imageName}
              onChange={(e) => setMetadata((prev) => ({ ...prev, imageName: e.target.value }))}
              placeholder="Nom de l'image"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="altText">Texte alternatif</Label>
            <Input
              id="altText"
              value={metadata.altText}
              onChange={(e) => setMetadata((prev) => ({ ...prev, altText: e.target.value }))}
              placeholder="Description pour l'accessibilité"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={metadata.description}
            onChange={(e) => setMetadata((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Description de l'image"
          />
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPublic"
              checked={metadata.isPublic}
              onCheckedChange={(checked) =>
                setMetadata((prev) => ({
                  ...prev,
                  isPublic: checked as boolean,
                }))
              }
            />
            <Label htmlFor="isPublic">Image publique</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isFeatured"
              checked={metadata.isFeatured}
              onCheckedChange={(checked) =>
                setMetadata((prev) => ({
                  ...prev,
                  isFeatured: checked as boolean,
                }))
              }
            />
            <Label htmlFor="isFeatured">Image en avant</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderProgress = () => {
    // The progress and uploading state are no longer managed by useGalleryUpload
    // This component will always show the progress bar as it's not directly tied to the upload process.
    // If you want to show a different progress or state, you'd need to manage it here.
    return (
      <Card>
        <CardHeader>
          <CardTitle>Progression de l&apos;upload</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={0} className="w-full" /> {/* Placeholder for progress */}
            <p className="text-muted-foreground text-sm">Progression de l&apos;upload non disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {renderDropzone()}
      {renderSelectedFiles()}
      {renderMetadataForm()}
      {renderProgress()}

      <div className="flex justify-end">
        <Button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0} // Removed uploading check
          className="min-w-[120px]"
        >
          {/* Removed uploading text */}
          Uploader les images
        </Button>
      </div>
    </div>
  );
}

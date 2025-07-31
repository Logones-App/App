"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, CheckCircle, AlertCircle, Loader2, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GalleryUploadProps } from "@/types/gallery";
import { useGalleryUpload } from "@/hooks/gallery/use-gallery-upload";
import { formatFileSize } from "@/lib/utils/gallery-helpers";

export function GalleryUpload({
  establishmentId,
  organizationId,
  onUploadComplete,
  onUploadError,
  maxFiles = 20,
  maxFileSize = 10 * 1024 * 1024,
  acceptedFileTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"],
  className = "",
}: GalleryUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [metadata, setMetadata] = useState({
    imageName: "",
    description: "",
    altText: "",
    isPublic: true,
    isFeatured: false,
  });

  const { uploading, progress, uploadMultipleImages, clearProgress, removeFromProgress, getProgressStats } =
    useGalleryUpload({
      establishmentId,
      organizationId,
      onSuccess: onUploadComplete,
      onError: onUploadError,
      maxFileSize,
      maxFiles,
    });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject, isDragAccept } = useDropzone({
    onDrop,
    accept: {
      "image/*": acceptedFileTypes,
    },
    maxSize: maxFileSize,
    maxFiles: maxFiles - selectedFiles.length,
    disabled: uploading,
  });

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      uploadMultipleImages(selectedFiles, metadata);
      setSelectedFiles([]);
    }
  };

  const handleCancel = () => {
    setSelectedFiles([]);
    clearProgress();
  };

  const removeFile = (fileToRemove: File) => {
    setSelectedFiles((prev) => prev.filter((file) => file !== fileToRemove));
  };

  const stats = getProgressStats();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Zone de drop */}
      <Card
        className={`transition-all duration-200 ${
          isDragActive ? "border-primary bg-primary/5" : ""
        } ${isDragReject ? "border-destructive bg-destructive/5" : ""}`}
      >
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-all ${
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            } ${uploading ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <input {...getInputProps()} />

            <Upload className="text-muted-foreground mx-auto mb-4 h-12 w-12" />

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                {isDragActive ? "Déposez vos images ici" : "Glissez vos images ici"}
              </h3>

              <p className="text-muted-foreground text-sm">ou cliquez pour sélectionner des fichiers</p>

              <div className="text-muted-foreground space-y-1 text-xs">
                <p>Formats acceptés : {acceptedFileTypes.join(", ")}</p>
                <p>Taille maximale : {formatFileSize(maxFileSize)}</p>
                <p>Maximum {maxFiles} fichiers</p>
              </div>
            </div>

            {isDragReject && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Format de fichier non supporté</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fichiers sélectionnés */}
      {selectedFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="font-medium">Fichiers sélectionnés ({selectedFiles.length})</h4>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={uploading}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Annuler
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-md border p-2">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{file.name}</span>
                    <span className="text-muted-foreground text-xs">({formatFileSize(file.size)})</span>
                  </div>

                  <Button variant="ghost" size="sm" onClick={() => removeFile(file)} disabled={uploading}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métadonnées */}
      <Card>
        <CardContent className="p-4">
          <h4 className="mb-4 font-medium">Métadonnées par défaut</h4>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom de l'image</label>
              <input
                type="text"
                value={metadata.imageName}
                onChange={(e) => setMetadata((prev) => ({ ...prev, imageName: e.target.value }))}
                className="w-full rounded-md border px-3 py-2"
                placeholder="Nom personnalisé (optionnel)"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <input
                type="text"
                value={metadata.description}
                onChange={(e) => setMetadata((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full rounded-md border px-3 py-2"
                placeholder="Description de l'image"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Texte alternatif</label>
              <input
                type="text"
                value={metadata.altText}
                onChange={(e) => setMetadata((prev) => ({ ...prev, altText: e.target.value }))}
                className="w-full rounded-md border px-3 py-2"
                placeholder="Texte pour l'accessibilité"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Visibilité</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={metadata.isPublic}
                    onChange={(e) => setMetadata((prev) => ({ ...prev, isPublic: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Publique</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={metadata.isFeatured}
                    onChange={(e) => setMetadata((prev) => ({ ...prev, isFeatured: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Mise en avant</span>
                </label>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          {selectedFiles.length > 0 && (
            <div className="mt-6 flex items-center gap-2">
              <Button onClick={handleUpload} disabled={uploading}>
                <Play className="mr-2 h-4 w-4" />
                {uploading ? "Upload en cours..." : `Uploader ${selectedFiles.length} fichier(s)`}
              </Button>

              <Button variant="outline" onClick={handleCancel} disabled={uploading}>
                <X className="mr-2 h-4 w-4" />
                Annuler
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progression des uploads */}
      {progress.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="font-medium">Progression des uploads</h4>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{stats.success} terminé</Badge>
                {stats.uploading > 0 && <Badge variant="default">{stats.uploading} en cours</Badge>}
                {stats.error > 0 && <Badge variant="destructive">{stats.error} erreur</Badge>}
                <Button variant="ghost" size="sm" onClick={clearProgress} disabled={uploading}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {progress.map((item, index) => (
                <div key={`${item.file.name}-${index}`} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{item.file.name}</span>
                      <span className="text-muted-foreground text-xs">({formatFileSize(item.file.size)})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin" />}
                      {item.status === "success" && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {item.status === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromProgress(item.file)}
                        disabled={uploading}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <Progress value={item.progress} className="h-2" />

                  {item.error && <p className="text-xs text-red-500">{item.error}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

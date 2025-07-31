import { useState, useCallback } from 'react';
import { GalleryImage, GalleryImageUpload, GalleryUploadProgress } from '@/types/gallery';
import { GalleryStorageService } from '@/lib/services/gallery-storage-service';
import { validateImageFile, formatFileSize } from '@/lib/utils/gallery-helpers';

export interface UseGalleryUploadOptions {
  establishmentId: string;
  organizationId: string;
  onSuccess?: (image: GalleryImage) => void;
  onError?: (error: string) => void;
  maxFileSize?: number;
  maxFiles?: number;
}

export function useGalleryUpload({
  establishmentId,
  organizationId,
  onSuccess,
  onError,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 20
}: UseGalleryUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<GalleryUploadProgress[]>([]);

  const uploadImage = useCallback(async (file: File, metadata?: {
    imageName?: string;
    description?: string;
    altText?: string;
    isPublic?: boolean;
    isFeatured?: boolean;
  }) => {
    // Validation du fichier
    const validationError = validateImageFile(file, maxFileSize);
    if (validationError) {
      onError?.(validationError);
      return;
    }

    // Vérifier le nombre de fichiers
    if (progress.length >= maxFiles) {
      onError?.(`Maximum ${maxFiles} fichiers autorisés`);
      return;
    }

    // Ajouter le fichier à la progression
    const uploadProgress: GalleryUploadProgress = {
      file,
      progress: 0,
      status: 'uploading'
    };
    setProgress(prev => [...prev, uploadProgress]);

    setUploading(true);

    try {
      const uploadData: GalleryImageUpload = {
        file,
        establishmentId,
        organizationId,
        imageName: metadata?.imageName,
        description: metadata?.description,
        altText: metadata?.altText,
        isPublic: metadata?.isPublic ?? true,
        isFeatured: metadata?.isFeatured ?? false
      };

      const image = await GalleryStorageService.uploadImage(uploadData);

      // Mettre à jour la progression
      setProgress(prev => 
        prev.map(p => 
          p.file === file 
            ? { ...p, progress: 100, status: 'success' as const }
            : p
        )
      );

      onSuccess?.(image);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'upload';
      
      // Mettre à jour la progression avec l'erreur
      setProgress(prev => 
        prev.map(p => 
          p.file === file 
            ? { ...p, progress: 0, status: 'error' as const, error: errorMessage }
            : p
        )
      );

      onError?.(errorMessage);
    } finally {
      setUploading(false);
    }
  }, [establishmentId, organizationId, maxFileSize, maxFiles, progress.length, onSuccess, onError]);

  const uploadMultipleImages = useCallback(async (files: File[], metadata?: {
    imageName?: string;
    description?: string;
    altText?: string;
    isPublic?: boolean;
    isFeatured?: boolean;
  }) => {
    if (files.length + progress.length > maxFiles) {
      onError?.(`Maximum ${maxFiles} fichiers autorisés`);
      return;
    }

    // Upload séquentiel pour éviter les conflits
    for (const file of files) {
      await uploadImage(file, metadata);
    }
  }, [uploadImage, progress.length, maxFiles, onError]);

  const clearProgress = useCallback(() => {
    setProgress([]);
  }, []);

  const removeFromProgress = useCallback((file: File) => {
    setProgress(prev => prev.filter(p => p.file !== file));
  }, []);

  const getProgressStats = useCallback(() => {
    const total = progress.length;
    const uploading = progress.filter(p => p.status === 'uploading').length;
    const success = progress.filter(p => p.status === 'success').length;
    const error = progress.filter(p => p.status === 'error').length;
    const totalSize = progress.reduce((sum, p) => sum + p.file.size, 0);

    return {
      total,
      uploading,
      success,
      error,
      totalSize: formatFileSize(totalSize)
    };
  }, [progress]);

  return {
    uploading,
    progress,
    uploadImage,
    uploadMultipleImages,
    clearProgress,
    removeFromProgress,
    getProgressStats
  };
} 
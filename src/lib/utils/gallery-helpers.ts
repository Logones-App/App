import { GalleryImage, ImageTransformations } from '@/types/gallery';

/**
 * Génère un nom de fichier unique pour l'upload
 */
export function generateUniqueFileName(file: File, customName?: string): string {
  const timestamp = Date.now();
  const extension = file.name.split('.').pop()?.toLowerCase();
  const baseName = customName ?? file.name.split('.')[0];
  
  // Nettoyer le nom de fichier
  const cleanName = baseName
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
  
  return `${cleanName}-${timestamp}.${extension}`;
}

/**
 * Valide un fichier image
 */
export function validateImageFile(file: File, maxSize: number = 10 * 1024 * 1024): string | null {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  
  if (!allowedTypes.includes(file.type)) {
    return `Type de fichier non autorisé. Types acceptés: ${allowedTypes.join(', ')}`;
  }
  
  if (file.size > maxSize) {
    return `Fichier trop volumineux. Maximum: ${Math.round(maxSize / 1024 / 1024)}MB`;
  }
  
  return null;
}

/**
 * Obtient les dimensions d'une image
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Génère l'URL d'une image avec transformations
 */
export function getImageUrl(imageUrl: string, transformations?: ImageTransformations): string {
  if (!transformations) return imageUrl;
  
  const params = new URLSearchParams();
  
  if (transformations.width) params.append('width', transformations.width.toString());
  if (transformations.height) params.append('height', transformations.height.toString());
  if (transformations.quality) params.append('quality', transformations.quality.toString());
  if (transformations.format) params.append('format', transformations.format);
  if (transformations.fit) params.append('fit', transformations.fit);
  
  return params.toString() ? `${imageUrl}?${params.toString()}` : imageUrl;
}

/**
 * Génère l'URL d'une image pour le carousel
 */
export function getCarouselImageUrl(imageUrl: string): string {
  return getImageUrl(imageUrl, {
    width: 1200,
    height: 600,
    quality: 80,
    format: 'webp',
    fit: 'cover'
  });
}

/**
 * Génère l'URL d'une image pour la galerie
 */
export function getGalleryImageUrl(imageUrl: string): string {
  return getImageUrl(imageUrl, {
    width: 800,
    height: 600,
    quality: 85,
    format: 'webp',
    fit: 'cover'
  });
}

/**
 * Génère l'URL d'une image pour la thumbnail
 */
export function getThumbnailImageUrl(imageUrl: string): string {
  return getImageUrl(imageUrl, {
    width: 300,
    height: 200,
    quality: 75,
    format: 'webp',
    fit: 'cover'
  });
}

/**
 * Formate la taille d'un fichier
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Trie les images par ordre d'affichage
 */
export function sortImagesByOrder(images: GalleryImage[]): GalleryImage[] {
  return [...images].sort((a, b) => {
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

/**
 * Filtre les images selon les critères
 */
export function filterImages(images: GalleryImage[], filters: {
  isPublic?: boolean;
  isFeatured?: boolean;
  search?: string;
}): GalleryImage[] {
  return images.filter(image => {
    if (filters.isPublic !== undefined && image.is_public !== filters.isPublic) {
      return false;
    }
    
    if (filters.isFeatured !== undefined && image.is_featured !== filters.isFeatured) {
      return false;
    }
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const searchableText = [
        image.image_name,
        image.image_description,
        image.alt_text
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchableText.includes(searchTerm)) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Obtient les images mises en avant pour le carousel
 */
export function getFeaturedImages(images: GalleryImage[]): GalleryImage[] {
  return sortImagesByOrder(
    filterImages(images, { isPublic: true, isFeatured: true })
  );
}

/**
 * Obtient les images publiques pour la galerie
 */
export function getPublicImages(images: GalleryImage[]): GalleryImage[] {
  return sortImagesByOrder(
    filterImages(images, { isPublic: true })
  );
}

/**
 * Génère un chemin de fichier pour Supabase Storage
 */
export function generateStoragePath(organizationId: string, establishmentId: string, fileName: string): string {
  return `${organizationId}/${establishmentId}/${fileName}`;
}

/**
 * Extrait le chemin du fichier depuis une URL Supabase
 */
export function extractFilePathFromUrl(url: string): string {
  const urlParts = url.split('/');
  const bucketIndex = urlParts.findIndex(part => part === 'gallery');
  if (bucketIndex === -1) {
    throw new Error('URL invalide');
  }
  return urlParts.slice(bucketIndex + 1).join('/');
}

/**
 * Vérifie si une image est en cours d'upload
 */
export function isImageUploading(file: File, uploadingFiles: File[]): boolean {
  return uploadingFiles.some(uploadingFile => 
    uploadingFile.name === file.name && 
    uploadingFile.size === file.size &&
    uploadingFile.lastModified === file.lastModified
  );
}

/**
 * Calcule le pourcentage de progression d'upload
 */
export function calculateUploadProgress(loaded: number, total: number): number {
  return Math.round((loaded / total) * 100);
}

/**
 * Génère un ID unique pour le drag & drop
 */
export function generateDragId(image: GalleryImage): string {
  return `gallery-image-${image.id}`;
}

/**
 * Vérifie si une image peut être mise en avant
 */
export function canBeFeatured(image: GalleryImage): boolean {
  return image.is_public && !image.deleted;
}

/**
 * Vérifie si une image peut être rendue publique
 */
export function canBePublic(image: GalleryImage): boolean {
  return !image.deleted;
} 
export interface GalleryImage {
  id: string;
  establishment_id: string;
  organization_id: string;
  image_url: string;
  image_name: string;
  image_description?: string;
  alt_text?: string;
  file_size?: number;
  mime_type?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  display_order: number;
  is_public: boolean;
  is_featured: boolean;
  created_at: string;
  created_by?: string;
  updated_at: string;
  deleted: boolean;
}

export interface GalleryImageUpload {
  file: File;
  establishmentId: string;
  organizationId: string;
  imageName?: string;
  description?: string;
  altText?: string;
  isPublic?: boolean;
  isFeatured?: boolean;
}

export interface GalleryImageUpdate {
  id: string;
  image_name?: string;
  image_description?: string;
  alt_text?: string;
  is_public?: boolean;
  is_featured?: boolean;
  display_order?: number;
}

export interface GalleryFilters {
  isPublic?: boolean;
  isFeatured?: boolean;
  search?: string;
}

export interface GalleryUploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export interface GalleryCarouselProps {
  images: GalleryImage[];
  autoPlay?: boolean;
  showNavigation?: boolean;
  showDots?: boolean;
  className?: string;
}

export interface GalleryGridProps {
  images: GalleryImage[];
  onImageClick?: (image: GalleryImage) => void;
  onImageEdit?: (image: GalleryImage) => void;
  onImageDelete?: (imageId: string) => void;
  onTogglePublic?: (imageId: string, isPublic: boolean) => void;
  onToggleFeatured?: (imageId: string, isFeatured: boolean) => void;
  onImageReorder?: (images: GalleryImage[]) => void;
  isEditable?: boolean;
  className?: string;
}

export interface GalleryUploadProps {
  establishmentId: string;
  organizationId: string;
  onUploadComplete?: (image: GalleryImage) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  maxFileSize?: number; // en bytes
  acceptedFileTypes?: string[];
  className?: string;
}

export interface GalleryLightboxProps {
  images: GalleryImage[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onImageChange?: (index: number) => void;
}

export interface GalleryReorderProps {
  images: GalleryImage[];
  onReorder: (images: GalleryImage[]) => void;
  className?: string;
}

// Types pour les transformations d'images
export interface ImageTransformations {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  fit?: 'cover' | 'contain' | 'fill';
}

// Types pour les métadonnées d'image
export interface ImageMetadata {
  width: number;
  height: number;
  size: number;
  type: string;
  lastModified: number;
}

// Types pour les erreurs
export interface GalleryError {
  code: string;
  message: string;
  details?: any;
}

// Types pour les réponses API
export interface GalleryResponse<T> {
  data: T;
  error?: GalleryError;
}

export interface GalleryUploadResponse {
  image: GalleryImage;
  url: string;
}

// Types pour les hooks
export interface UseGalleryImagesOptions {
  establishmentId: string;
  organizationId?: string;
  filters?: GalleryFilters;
  enabled?: boolean;
}

export interface UseGalleryUploadOptions {
  establishmentId: string;
  organizationId: string;
  onSuccess?: (image: GalleryImage) => void;
  onError?: (error: string) => void;
}

export interface UseGalleryReorderOptions {
  establishmentId: string;
  organizationId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

// Types pour les sections de galerie
export type GallerySection = 'hero_carousel' | 'home_cards' | 'gallery';

export interface GallerySectionImage {
  id: string;
  establishment_id: string;
  organization_id: string;
  image_id: string;
  section: GallerySection;
  display_order: number;
  created_at: string;
  updated_at: string;
  deleted: boolean;
  // Données de l'image jointe
  image_url: string;
  image_name: string;
  image_description?: string;
  alt_text?: string;
  file_size?: number;
  mime_type?: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

export interface GallerySectionConfig {
  section: GallerySection;
  title: string;
  description: string;
  maxImages?: number;
  icon: React.ComponentType<{ className?: string }>;
}

export interface UseGallerySectionsOptions {
  establishmentId: string;
  organizationId: string;
  section: GallerySection;
  onSuccess?: () => void;
  onError?: (error: string) => void;
} 
export interface GalleryImage {
  id: string;
  establishment_id: string;
  organization_id: string;
  image_url: string;
  image_name: string | null;
  image_description?: string | null;
  alt_text?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  dimensions?: {
    width: number;
    height: number;
  } | null;
  display_order: number | null;
  is_public: boolean | null;
  is_featured: boolean | null;
  created_at: string | null;
  created_by?: string | null;
  updated_at: string | null;
  deleted: boolean | null;
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
  status: "uploading" | "success" | "error";
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
  format?: "jpeg" | "png" | "webp";
  fit?: "cover" | "contain" | "fill";
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
  details?: Record<string, unknown>;
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
export type GallerySection = "hero_carousel" | "home_cards" | "gallery";

export interface GallerySectionImage {
  id: string;
  establishment_id: string;
  organization_id: string;
  image_id: string;
  section: GallerySection;
  display_order: number;
  created_at: string | null;
  updated_at: string | null;
  deleted: boolean | null;
  // Données de l'image jointe
  image_url: string;
  image_name: string | null;
  image_description?: string | null;
  alt_text?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  dimensions?: {
    width: number;
    height: number;
  } | null;
}

export interface GalleryPublicProps {
  images: GalleryImage[];
  className?: string;
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

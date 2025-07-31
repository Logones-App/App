# 📸 GUIDE D'UTILISATION DE LA GALERIE

## 🎯 Vue d'ensemble

La galerie d'images permet aux restaurants de gérer leurs photos avec :

- **Upload drag & drop** avec validation
- **Réorganisation** par drag & drop
- **Carousel** pour la page d'accueil
- **Galerie complète** pour l'affichage public
- **Lightbox** pour voir les images en grand
- **Gestion multi-tenant** (org_admin + system_admin)

## 🚀 Installation

### 1. Dépendances

```bash
npm install react-dropzone swiper @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities browser-image-compression
```

### 2. Migration SQL

Exécuter les scripts SQL :

- `scripts/create-gallery-table.sql`
- `scripts/create-gallery-storage.sql`

### 3. Configuration Supabase

- Créer le bucket `gallery` dans Supabase Storage
- Configurer les politiques RLS

## 📁 Structure des fichiers

```
src/
├── components/gallery/
│   ├── gallery-upload.tsx      # Upload drag & drop
│   ├── gallery-grid.tsx        # Grille d'affichage
│   ├── gallery-item.tsx        # Élément individuel
│   ├── gallery-reorder.tsx     # Réorganisation
│   ├── sortable-gallery-item.tsx # Élément draggable
│   ├── gallery-carousel.tsx    # Carousel public
│   ├── gallery-lightbox.tsx    # Lightbox
│   └── gallery-public.tsx      # Composant public
├── lib/
│   ├── hooks/
│   │   ├── use-gallery-images.ts
│   │   ├── use-gallery-upload.ts
│   │   └── use-gallery-reorder.ts
│   ├── services/
│   │   └── gallery-storage-service.ts
│   └── utils/
│       └── gallery-helpers.ts
├── types/
│   └── gallery.ts
└── app/
    └── [locale]/(root)/(dashboard)/
        ├── dashboard/establishments/[id]/gallery/
        └── admin/organizations/[id]/establishments/[establishmentId]/gallery/
```

## 🎨 Utilisation des composants

### 1. Upload d'images

```tsx
import { GalleryUpload } from "@/components/gallery";

<GalleryUpload
  establishmentId="uuid"
  organizationId="uuid"
  onUploadComplete={(image) => console.log("Uploadé:", image)}
  onUploadError={(error) => console.error("Erreur:", error)}
  maxFiles={20}
  maxFileSize={10 * 1024 * 1024} // 10MB
/>;
```

### 2. Affichage de la galerie

```tsx
import { GalleryGrid } from "@/components/gallery";

<GalleryGrid
  images={images}
  onImageClick={(image) => openLightbox(image)}
  onImageEdit={(image) => editImage(image)}
  onImageDelete={(imageId) => deleteImage(imageId)}
  isEditable={true}
/>;
```

### 3. Carousel public

```tsx
import { GalleryCarousel } from "@/components/gallery";

<GalleryCarousel images={featuredImages} autoPlay={true} showNavigation={true} showDots={true} />;
```

### 4. Lightbox

```tsx
import { GalleryLightbox } from "@/components/gallery";

<GalleryLightbox
  images={images}
  initialIndex={0}
  isOpen={lightboxOpen}
  onClose={() => setLightboxOpen(false)}
  onImageChange={(index) => setCurrentIndex(index)}
/>;
```

### 5. Composant public complet

```tsx
import { GalleryPublic } from "@/components/gallery";

<GalleryPublic establishmentId="uuid" showCarousel={true} showGallery={true} />;
```

## 🔧 Hooks personnalisés

### 1. useGalleryImages

```tsx
import { useGalleryImages } from "@/lib/hooks";

const { images, filteredImages, loading, error, refetch } = useGalleryImages({
  establishmentId: "uuid",
  organizationId: "uuid",
  filters: { isPublic: true },
  enabled: true,
});
```

### 2. useGalleryUpload

```tsx
import { useGalleryUpload } from "@/lib/hooks";

const { uploading, progress, uploadImage, uploadMultipleImages } = useGalleryUpload({
  establishmentId: "uuid",
  organizationId: "uuid",
  onSuccess: (image) => console.log("Succès:", image),
  onError: (error) => console.error("Erreur:", error),
});
```

### 3. useGalleryReorder

```tsx
import { useGalleryReorder } from "@/lib/hooks";

const { reordering, reorderImages } = useGalleryReorder({
  establishmentId: "uuid",
  organizationId: "uuid",
  onSuccess: () => console.log("Réorganisation réussie"),
  onError: (error) => console.error("Erreur:", error),
});
```

## 🗄️ Service de stockage

### 1. Upload d'image

```tsx
import { GalleryStorageService } from "@/lib/services/gallery-storage-service";

const image = await GalleryStorageService.uploadImage({
  file: file,
  establishmentId: "uuid",
  organizationId: "uuid",
  imageName: "Nom personnalisé",
  description: "Description",
  altText: "Texte alternatif",
  isPublic: true,
  isFeatured: false,
});
```

### 2. Récupération d'images

```tsx
// Toutes les images
const images = await GalleryStorageService.getEstablishmentImages(establishmentId, organizationId);

// Images publiques
const publicImages = await GalleryStorageService.getPublicImages(establishmentId);

// Images mises en avant
const featuredImages = await GalleryStorageService.getFeaturedImages(establishmentId);
```

### 3. Gestion des images

```tsx
// Supprimer une image
await GalleryStorageService.deleteImage(imageId, organizationId);

// Mettre à jour une image
await GalleryStorageService.updateImage(
  imageId,
  {
    image_name: "Nouveau nom",
    is_public: true,
    is_featured: true,
  },
  organizationId,
);

// Réorganiser les images
await GalleryStorageService.reorderImages(images, organizationId);
```

## 🎯 Fonctionnalités

### ✅ Upload

- Drag & drop avec react-dropzone
- Validation des fichiers (type, taille)
- Compression automatique avec browser-image-compression
- Barre de progression
- Métadonnées personnalisables

### ✅ Affichage

- Grille responsive
- Mode liste/grille
- Filtres (publique/privée, mise en avant)
- Recherche textuelle
- Statistiques

### ✅ Réorganisation

- Drag & drop avec @dnd-kit
- Sauvegarde automatique
- Annulation des modifications
- Indicateur de changements

### ✅ Carousel

- Navigation clavier
- Autoplay configurable
- Dots de navigation
- Responsive

### ✅ Lightbox

- Zoom et rotation
- Navigation clavier
- Téléchargement
- Copie d'URL

### ✅ Sécurité

- Politiques RLS Supabase
- Validation côté client et serveur
- Soft delete
- Contrôle d'accès multi-tenant

## 🎨 Personnalisation

### 1. Styles CSS

```css
/* Personnaliser les couleurs */
.gallery-upload {
  --upload-border-color: theme(colors.primary);
  --upload-bg-color: theme(colors.primary/5);
}

/* Personnaliser les animations */
.gallery-item {
  transition: transform 0.2s ease;
}

.gallery-item:hover {
  transform: scale(1.05);
}
```

### 2. Configuration

```tsx
// Personnaliser les transformations d'images
const customTransformations = {
  width: 800,
  height: 600,
  quality: 85,
  format: "webp",
  fit: "cover",
};

// Personnaliser les validations
const customValidation = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ["image/jpeg", "image/png"],
  maxFiles: 10,
};
```

## 🐛 Dépannage

### Erreurs courantes

1. **"Bucket not found"**

   - Vérifier que le bucket `gallery` existe dans Supabase
   - Vérifier les politiques RLS

2. **"Permission denied"**

   - Vérifier que l'utilisateur a les bonnes permissions
   - Vérifier l'organizationId

3. **"File too large"**

   - Augmenter la limite dans Supabase Storage
   - Réduire la taille des fichiers côté client

4. **"Invalid file type"**
   - Vérifier les types MIME autorisés
   - Ajouter le type dans la configuration

### Debug

```tsx
// Activer les logs de debug
const { images, error } = useGalleryImages({
  establishmentId: "uuid",
  organizationId: "uuid",
  enabled: true,
});

console.log("Images:", images);
console.log("Erreur:", error);
```

## 📈 Performance

### Optimisations

- Lazy loading des images
- Compression automatique
- Cache des transformations
- Pagination pour les grandes galeries

### Métriques

- Temps d'upload < 5s pour 5MB
- Temps de chargement < 2s
- Taille des images < 500KB après compression

## 🔄 Mises à jour

### Version 1.0

- ✅ Upload drag & drop
- ✅ Galerie responsive
- ✅ Réorganisation
- ✅ Carousel public
- ✅ Lightbox
- ✅ Multi-tenant

### Prochaines versions

- [ ] Édition d'images (recadrage, filtres)
- [ ] Albums et collections
- [ ] Partage social
- [ ] Analytics
- [ ] Backup automatique

# 📸 PLAN D'IMPLÉMENTATION GALERIE RESTAURANT

## 🎯 OBJECTIFS

- **Carousel d'images** sur la page d'accueil du restaurant
- **Galerie photo complète** accessible depuis le menu
- **Upload drag & drop** avec preview
- **Réorganisation** des images par drag & drop
- **Optimisation automatique** des images (format, taille)
- **Gestion multi-tenant** (org_admin + system_admin)

## 📊 SPÉCIFICATIONS TECHNIQUES

### Volume estimé :

- **20 images** par restaurant
- **500 restaurants** maximum
- **10,000 images** total
- **50GB** de stockage estimé

### Coûts Supabase Storage :

- **Stockage** : 50GB × $0.02 = $1/mois
- **Transfert** : 20GB × $0.02 = $0.40/mois
- **Total** : $1.40/mois pour 500 restaurants
- **Par restaurant** : $0.003/mois

## 🏗️ ARCHITECTURE

### 1. Base de données

```sql
-- Table establishment_gallery
CREATE TABLE establishment_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Informations image
  image_url TEXT NOT NULL,
  image_name VARCHAR(255),
  image_description TEXT,
  alt_text VARCHAR(500),

  -- Métadonnées
  file_size INTEGER,
  mime_type VARCHAR(100),
  dimensions JSONB,

  -- Affichage
  display_order INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT false
);
```

### 2. Stockage Supabase

```
/gallery/{organization_id}/{establishment_id}/{image_name}
```

### 3. Transformations automatiques

- **Thumbnail** : 300x200px
- **Carousel** : 1200x600px
- **Galerie** : 800x600px
- **Format** : WebP automatique

## 📚 LIBRAIRIES RECOMMANDÉES

### 1. Upload et Drag & Drop

```bash
npm install react-dropzone
```

- **Fonctionnalités** : Drag & drop, validation fichiers, preview
- **Avantages** : Très populaire, excellente documentation
- **Alternatives** : @uploadthing/react, react-file-upload

### 2. Galerie et Carousel

```bash
npm install swiper
```

- **Fonctionnalités** : Carousel responsive, navigation, autoplay
- **Avantages** : Très performant, nombreuses options
- **Alternatives** : react-slick, embla-carousel-react

### 3. Réorganisation Drag & Drop

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- **Fonctionnalités** : Drag & drop pour réorganiser les images
- **Avantages** : Accessible, performant, moderne
- **Alternatives** : react-beautiful-dnd (déprécié)

### 4. Optimisation d'images

```bash
npm install browser-image-compression
```

- **Fonctionnalités** : Compression côté client avant upload
- **Avantages** : Réduit la bande passante, améliore les performances
- **Alternatives** : image-compression

### 5. UI Components

```bash
# Déjà installé avec shadcn/ui
npm install lucide-react
npm install @radix-ui/react-dialog
npm install @radix-ui/react-dropdown-menu
```

### 6. Validation et gestion d'état

```bash
# Déjà installé
npm install react-hook-form
npm install zod
```

## 🚀 PLAN D'IMPLÉMENTATION

### Phase 1 : Infrastructure (1-2 jours)

1. **Migration SQL** - Créer la table `establishment_gallery`
2. **Configuration Supabase Storage** - Bucket et politiques RLS
3. **Service de base** - CRUD operations pour les images
4. **Types TypeScript** - Interfaces et types

### Phase 2 : Upload et gestion (2-3 jours)

1. **Component Upload** - Drag & drop avec react-dropzone
2. **Validation fichiers** - Taille, format, dimensions
3. **Compression images** - browser-image-compression
4. **Service upload** - Intégration Supabase Storage
5. **Gestion d'erreurs** - Feedback utilisateur

### Phase 3 : Interface de gestion (2-3 jours)

1. **Galerie admin** - Affichage des images uploadées
2. **Réorganisation** - Drag & drop avec @dnd-kit
3. **Édition métadonnées** - Nom, description, alt text
4. **Suppression** - Soft delete avec confirmation
5. **Filtres** - Publique/privée, mise en avant

### Phase 4 : Affichage public (2-3 jours)

1. **Carousel page d'accueil** - Swiper.js
2. **Galerie complète** - Grid responsive
3. **Lightbox** - Modal pour voir les images en grand
4. **Optimisation** - Lazy loading, formats adaptatifs
5. **SEO** - Alt text, structured data

### Phase 5 : Optimisations (1-2 jours)

1. **Transformations Supabase** - Redimensionnement automatique
2. **Cache** - Optimisation des performances
3. **Tests** - Unit et integration tests
4. **Documentation** - Guide utilisateur

## 📁 STRUCTURE DES FICHIERS

```
src/
├── app/[locale]/(root)/(dashboard)/
│   ├── dashboard/establishments/[id]/gallery/
│   │   ├── page.tsx
│   │   ├── gallery-client.tsx
│   │   └── _components/
│   │       ├── gallery-upload.tsx
│   │       ├── gallery-grid.tsx
│   │       ├── gallery-item.tsx
│   │       └── gallery-reorder.tsx
│   └── admin/organizations/[id]/establishments/[establishmentId]/gallery/
│       ├── page.tsx
│       ├── gallery-client.tsx
│       └── _components/ (même structure)
├── components/
│   └── gallery/
│       ├── gallery-carousel.tsx
│       ├── gallery-lightbox.tsx
│       └── gallery-public.tsx
├── lib/
│   ├── services/
│   │   └── gallery-storage-service.ts
│   ├── hooks/
│   │   ├── use-gallery-upload.ts
│   │   ├── use-gallery-images.ts
│   │   └── use-gallery-reorder.ts
│   └── utils/
│       ├── image-compression.ts
│       ├── image-validation.ts
│       └── gallery-helpers.ts
└── types/
    └── gallery.ts
```

## 🎨 COMPOSANTS UI

### 1. GalleryUpload

- **Drag & drop zone** avec react-dropzone
- **Preview des images** avant upload
- **Barre de progression** pour l'upload
- **Validation en temps réel**

### 2. GalleryGrid

- **Grid responsive** des images
- **Mode édition** avec réorganisation
- **Actions** : éditer, supprimer, mettre en avant
- **Filtres** : publiques/privées

### 3. GalleryCarousel

- **Carousel Swiper** pour page d'accueil
- **Navigation** : flèches, dots, autoplay
- **Responsive** : adaptatif mobile/desktop
- **Lazy loading** pour les performances

### 4. GalleryLightbox

- **Modal** pour voir les images en grand
- **Navigation** entre les images
- **Zoom** et pan sur les images
- **Fermeture** avec ESC ou clic

## 🔧 CONFIGURATION SUPABASE

### 1. Bucket Storage

```sql
-- Créer le bucket gallery
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gallery',
  'gallery',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);
```

### 2. Politiques RLS

```sql
-- Politique org_admin
CREATE POLICY "org_admin_gallery_access" ON storage.objects
  FOR ALL USING (
    bucket_id = 'gallery' AND
    (storage.foldername(name))[1] = get_user_organization_id()::text
  );

-- Politique system_admin
CREATE POLICY "system_admin_gallery_access" ON storage.objects
  FOR ALL USING (bucket_id = 'gallery');

-- Politique public
CREATE POLICY "public_gallery_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'gallery' AND storage.foldername(name) IS NOT NULL
  );
```

## 🧪 TESTS

### 1. Tests unitaires

- **Validation fichiers** - Taille, format, dimensions
- **Compression images** - Qualité, taille finale
- **Service upload** - Succès, erreurs, rollback

### 2. Tests d'intégration

- **Upload complet** - Fichier → Storage → Database
- **Réorganisation** - Drag & drop → Mise à jour ordre
- **Suppression** - Soft delete + nettoyage storage

### 3. Tests E2E

- **Workflow complet** - Upload → Édition → Affichage public
- **Multi-tenant** - org_admin vs system_admin
- **Responsive** - Mobile, tablet, desktop

## 📈 MÉTRIQUES ET MONITORING

### 1. Performance

- **Temps d'upload** - < 5s pour 5MB
- **Temps de chargement** - < 2s pour la galerie
- **Taille des images** - < 500KB après compression

### 2. Utilisation

- **Images par restaurant** - Moyenne, max, min
- **Stockage utilisé** - GB par organisation
- **Uploads par jour** - Volume d'activité

### 3. Erreurs

- **Échecs d'upload** - Pourcentage, causes
- **Erreurs de validation** - Types d'erreurs
- **Problèmes de performance** - Temps de réponse

## 🚀 DÉPLOIEMENT

### 1. Prérequis

- **Supabase Storage** configuré
- **Migrations SQL** appliquées
- **Variables d'environnement** configurées

### 2. Étapes

1. **Installer les dépendances** - npm install
2. **Configurer Supabase** - Bucket et politiques
3. **Déployer les migrations** - SQL
4. **Tester l'upload** - Fonctionnalité de base
5. **Tester l'affichage** - Carousel et galerie

### 3. Rollback

- **Supprimer les tables** - establishment_gallery
- **Nettoyer le storage** - Bucket gallery
- **Désactiver les composants** - Commenter les imports

## 📝 DOCUMENTATION UTILISATEUR

### 1. Guide org_admin

- **Upload d'images** - Comment ajouter des photos
- **Réorganisation** - Comment changer l'ordre
- **Édition métadonnées** - Nom, description, alt text
- **Gestion des images** - Suppression, mise en avant

### 2. Guide system_admin

- **Accès à toutes les galeries** - Navigation
- **Modération** - Validation des images
- **Support** - Aide aux utilisateurs

### 3. Guide technique

- **API endpoints** - Documentation des services
- **Configuration** - Variables d'environnement
- **Dépannage** - Problèmes courants

## 🎯 SUCCÈS CRITÈRES

### 1. Fonctionnel

- ✅ **Upload** - Drag & drop fonctionnel
- ✅ **Affichage** - Carousel et galerie visibles
- ✅ **Gestion** - CRUD complet des images
- ✅ **Performance** - Temps de chargement < 3s

### 2. UX

- ✅ **Intuitif** - Interface claire et simple
- ✅ **Responsive** - Fonctionne sur tous les devices
- ✅ **Accessible** - Navigation clavier, screen readers
- ✅ **Feedback** - Messages d'erreur/succès clairs

### 3. Technique

- ✅ **Sécurisé** - RLS, validation, sanitisation
- ✅ **Optimisé** - Compression, cache, CDN
- ✅ **Maintenable** - Code propre, tests, docs
- ✅ **Évolutif** - Support 500+ restaurants

---

**Durée totale estimée : 8-12 jours**
**Priorité : Supabase Storage + react-dropzone + swiper**
**Budget : $1.40/mois pour 500 restaurants**

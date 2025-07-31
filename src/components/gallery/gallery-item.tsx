"use client";

import React, { useState } from "react";
import { GalleryImage } from "@/types/gallery";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Star,
  StarOff,
  Download,
  Copy,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { getThumbnailImageUrl, formatFileSize } from "@/lib/utils/gallery-helpers";

interface GalleryItemProps {
  image: GalleryImage;
  onClick?: (image: GalleryImage) => void;
  onEdit?: (image: GalleryImage) => void;
  onDelete?: (imageId: string) => void;
  onTogglePublic?: (imageId: string, isPublic: boolean) => void;
  onToggleFeatured?: (imageId: string, isFeatured: boolean) => void;
  isEditable?: boolean;
  viewMode?: "grid" | "list";
}

export function GalleryItem({
  image,
  onClick,
  onEdit,
  onDelete,
  onTogglePublic,
  onToggleFeatured,
  isEditable = false,
  viewMode = "grid",
}: GalleryItemProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(image.image_url);
    } catch (error) {
      console.error("Erreur lors de la copie:", error);
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = image.image_url;
    link.download = image.image_name || "image";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(image.id);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePublic = () => {
    onTogglePublic?.(image.id, !image.is_public);
  };

  const handleToggleFeatured = () => {
    onToggleFeatured?.(image.id, !image.is_featured);
  };

  // En mode réorganisation, ne pas afficher les actions
  const showActions = isEditable && onDelete;

  if (viewMode === "list") {
    return (
      <>
        <Card className="transition-shadow hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Thumbnail */}
              <div className="bg-muted relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                {!imageError ? (
                  <img
                    src={getThumbnailImageUrl(image.image_url)}
                    alt={image.alt_text ?? image.image_name}
                    className={`h-full w-full object-cover transition-opacity ${
                      imageLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                ) : (
                  <div className="bg-muted flex h-full w-full items-center justify-center">
                    <span className="text-muted-foreground text-xs">Erreur</span>
                  </div>
                )}
              </div>

              {/* Informations */}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <h4 className="truncate font-medium">{image.image_name || "Image sans nom"}</h4>
                  <div className="flex items-center gap-1">
                    {image.is_public ? (
                      <Badge variant="secondary" className="text-xs">
                        <Eye className="mr-1 h-3 w-3" />
                        Public
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        <EyeOff className="mr-1 h-3 w-3" />
                        Privé
                      </Badge>
                    )}
                    {image.is_featured && (
                      <Badge variant="default" className="text-xs">
                        <Star className="mr-1 h-3 w-3" />
                        En avant
                      </Badge>
                    )}
                  </div>
                </div>

                {image.image_description && (
                  <p className="text-muted-foreground mb-1 truncate text-sm">{image.image_description}</p>
                )}

                <div className="text-muted-foreground flex items-center gap-4 text-xs">
                  <span>Ordre: {image.display_order}</span>
                  {image.file_size && <span>Taille: {formatFileSize(image.file_size)}</span>}
                  <span>Ajouté le {new Date(image.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {showActions && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onClick?.(image)}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Voir
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit?.(image)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleTogglePublic}>
                        {image.is_public ? (
                          <>
                            <EyeOff className="mr-2 h-4 w-4" />
                            Rendre privé
                          </>
                        ) : (
                          <>
                            <Eye className="mr-2 h-4 w-4" />
                            Rendre public
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleToggleFeatured}>
                        {image.is_featured ? (
                          <>
                            <StarOff className="mr-2 h-4 w-4" />
                            Retirer de l&apos;avant
                          </>
                        ) : (
                          <>
                            <Star className="mr-2 h-4 w-4" />
                            Mettre en avant
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCopyUrl}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copier l&apos;URL
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4" />
                        Télécharger
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal de confirmation de suppression */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="text-destructive h-5 w-5" />
                Confirmer la suppression
              </DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir supprimer l'image "{image.image_name || "Image sans nom"}" ? Cette action est
                irréversible et supprimera définitivement l'image.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? "Suppression..." : "Supprimer définitivement"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Mode grille
  return (
    <>
      <Card className="group cursor-pointer transition-all hover:shadow-md">
        <CardContent className="p-0">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden">
            {!imageError ? (
              <img
                src={getThumbnailImageUrl(image.image_url)}
                alt={image.alt_text ?? image.image_name}
                className={`h-full w-full object-cover transition-all group-hover:scale-105 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                onClick={() => onClick?.(image)}
              />
            ) : (
              <div className="bg-muted flex h-full w-full items-center justify-center">
                <span className="text-muted-foreground text-sm">Erreur de chargement</span>
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {!image.is_public && (
                <Badge variant="outline" className="text-xs">
                  <EyeOff className="mr-1 h-3 w-3" />
                  Privé
                </Badge>
              )}
              {image.is_featured && (
                <Badge variant="default" className="text-xs">
                  <Star className="mr-1 h-3 w-3" />
                  En avant
                </Badge>
              )}
            </div>

            {/* Actions au survol */}
            {showActions && (
              <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onClick?.(image)}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Voir
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit?.(image)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleTogglePublic}>
                      {image.is_public ? (
                        <>
                          <EyeOff className="mr-2 h-4 w-4" />
                          Rendre privé
                        </>
                      ) : (
                        <>
                          <Eye className="mr-2 h-4 w-4" />
                          Rendre public
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleToggleFeatured}>
                      {image.is_featured ? (
                        <>
                          <StarOff className="mr-2 h-4 w-4" />
                                                    Retirer de l&apos;avant
                        </>
                      ) : (
                        <>
                          <Star className="mr-2 h-4 w-4" />
                          Mettre en avant
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCopyUrl}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copier l&apos;URL
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownload}>
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Informations */}
          <div className="p-3">
            <h4 className="mb-1 truncate text-sm font-medium">{image.image_name || "Image sans nom"}</h4>

            {image.image_description && (
              <p className="text-muted-foreground mb-2 truncate text-xs">{image.image_description}</p>
            )}

            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>Ordre: {image.display_order}</span>
              {image.file_size && <span>{formatFileSize(image.file_size)}</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive h-5 w-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer l'image "{image.image_name || "Image sans nom"}" ? Cette action est
              irréversible et supprimera définitivement l'image.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? "Suppression..." : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

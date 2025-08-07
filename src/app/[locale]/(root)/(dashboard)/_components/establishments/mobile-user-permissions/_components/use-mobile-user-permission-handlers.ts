"use client";

import type { UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";

import type { MobileUserPermissionFormData } from "@/lib/schemas/mobile-user-permissions-schema";
import type { Database } from "@/lib/supabase/database.types";

type MobileUserPermission = Database["public"]["Tables"]["mobile_user_permissions"]["Row"];
type CreateMobileUserPermissionPayload = Database["public"]["Tables"]["mobile_user_permissions"]["Insert"];

interface UseMobileUserPermissionHandlersProps {
  user: { id: string; email?: string } | null;
  establishmentId: string;
  organizationId?: string;
  createPermissionMutation: UseMutationResult<MobileUserPermission, Error, CreateMobileUserPermissionPayload>;
  deletePermissionMutation: UseMutationResult<void, Error, string>;
  setIsCreateModalOpen: (open: boolean) => void;
  setIsEditModalOpen: (open: boolean) => void;
  setEditingPermission: (permission: MobileUserPermission | null) => void;
}

export function useMobileUserPermissionHandlers({
  user,
  establishmentId,
  organizationId,
  createPermissionMutation,
  deletePermissionMutation,
  setIsCreateModalOpen,
  setIsEditModalOpen,
  setEditingPermission,
}: UseMobileUserPermissionHandlersProps) {
  const handleCreatePermission = (formData: MobileUserPermissionFormData) => {
    // ✅ Utiliser directement les données du formulaire (granted_by déjà inclus)
    const permissionData = {
      mobile_user_id: formData.mobile_user_id,
      permission: formData.permission,
      granted_by: formData.granted_by, // ✅ Utiliser la valeur du formulaire
      organization_id: formData.organization_id,
      establishment_id: formData.establishment_id,
    };

    createPermissionMutation.mutate(permissionData, {
      onSuccess: () => {
        setIsCreateModalOpen(false);
        toast.success("Permission créée avec succès");
      },
      onError: (error) => {
        toast.error(`Erreur lors de la création: ${error.message}`);
      },
    });
  };

  const handleUpdatePermission = (formData: MobileUserPermissionFormData) => {
    // Note: Pour les permissions, on utilise généralement la suppression/recréation
    // plutôt que la mise à jour pour éviter les conflits
    const permissionData = {
      mobile_user_id: formData.mobile_user_id,
      permission: formData.permission,
      granted_by: formData.granted_by, // ✅ Utiliser la valeur du formulaire
      organization_id: formData.organization_id,
      establishment_id: formData.establishment_id,
    };

    createPermissionMutation.mutate(permissionData, {
      onSuccess: () => {
        setIsEditModalOpen(false);
        setEditingPermission(null);
        toast.success("Permission mise à jour avec succès");
      },
      onError: (error) => {
        toast.error(`Erreur lors de la mise à jour: ${error.message}`);
      },
    });
  };

  const handleDeletePermission = (permissionId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette permission ?")) return;

    deletePermissionMutation.mutate(permissionId, {
      onSuccess: () => {
        toast.success("Permission supprimée avec succès");
      },
      onError: (error) => {
        toast.error("Erreur lors de la suppression de la permission");
        console.error(error);
      },
    });
  };

  const openEditModal = (permission: MobileUserPermission) => {
    setEditingPermission(permission);
    setIsEditModalOpen(true);
  };

  return {
    handleCreatePermission,
    handleUpdatePermission,
    handleDeletePermission,
    openEditModal,
  };
}

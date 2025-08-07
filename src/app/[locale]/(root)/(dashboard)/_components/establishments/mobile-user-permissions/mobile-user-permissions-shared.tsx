"use client";

import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useCreateMobileUserPermission,
  useDeleteMobileUserPermission,
} from "@/lib/queries/mobile-user-permissions-mutations";
import { useEstablishmentMobileUserPermissions } from "@/lib/queries/mobile-user-permissions-queries";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Database } from "@/lib/supabase/database.types";

import { useMobileUserPermissionHandlers } from "./_components/use-mobile-user-permission-handlers";
import { MobileUserPermissionModal } from "./mobile-user-permission-modal";
import { PageHeader } from "./page-header";
import { PermissionsList } from "./permissions-list";
import { StatsCards } from "./stats-cards";

type MobileUserPermission = Database["public"]["Tables"]["mobile_user_permissions"]["Row"];

interface MobileUserPermissionsSharedProps {
  establishmentId: string;
  organizationId?: string;
  isAdmin: boolean;
}

export function MobileUserPermissionsShared({
  establishmentId,
  organizationId,
  isAdmin,
}: MobileUserPermissionsSharedProps) {
  const { user } = useAuthStore();
  const { data: permissions = [], isLoading, error } = useEstablishmentMobileUserPermissions(establishmentId);
  const createPermissionMutation = useCreateMobileUserPermission();
  const deletePermissionMutation = useDeleteMobileUserPermission();

  // États pour les modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<MobileUserPermission | null>(null);

  // Handlers extraits dans un hook personnalisé
  const { handleCreatePermission, handleUpdatePermission, handleDeletePermission, openEditModal } =
    useMobileUserPermissionHandlers({
      user,
      establishmentId,
      organizationId,
      createPermissionMutation,
      deletePermissionMutation,
      setIsCreateModalOpen,
      setIsEditModalOpen,
      setEditingPermission,
    });

  // Vérification des permissions
  if (!user) {
    return <div>Non autorisé</div>;
  }

  // Calcul des statistiques
  const totalPermissions = permissions.length;
  const activePermissions = permissions.filter((permission) => !permission.deleted).length;
  const inactivePermissions = permissions.filter((permission) => permission.deleted).length;

  const getPageTitle = () => {
    return isAdmin
      ? `Admin - Permissions Mobile (Établissement: ${establishmentId})`
      : `Permissions Mobile - ${establishmentId}`;
  };

  const getPageDescription = () => {
    return isAdmin
      ? `Gestion des permissions des utilisateurs mobile pour l&apos;établissement ${establishmentId}`
      : `Gestion des permissions de votre application mobile`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        pageTitle={getPageTitle()}
        pageDescription={getPageDescription()}
        onCreateClick={() => setIsCreateModalOpen(true)}
        isCreateLoading={createPermissionMutation.isPending}
      />

      {/* Stats Cards */}
      <StatsCards
        totalPermissions={totalPermissions}
        activePermissions={activePermissions}
        inactivePermissions={inactivePermissions}
      />

      {/* Permissions List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Permissions Mobile</CardTitle>
          <CardDescription>Gérez les permissions de votre application mobile</CardDescription>
        </CardHeader>
        <CardContent>
          <PermissionsList
            permissions={permissions}
            isLoading={isLoading}
            error={error}
            onCreateClick={() => setIsCreateModalOpen(true)}
            onEditClick={openEditModal}
            onDeleteClick={handleDeletePermission}
            isCreateLoading={createPermissionMutation.isPending}
            isUpdateLoading={createPermissionMutation.isPending}
            isDeleteLoading={deletePermissionMutation.isPending}
          />
        </CardContent>
      </Card>

      {/* Debug Info */}
      {isAdmin && organizationId && (
        <Card>
          <CardHeader>
            <CardTitle>Informations de Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Type d&apos;accès:</strong> Admin
              </p>
              <p>
                <strong>Établissement ID:</strong> {establishmentId}
              </p>
              <p>
                <strong>Organisation ID:</strong> {organizationId}
              </p>
              <p>
                <strong>Utilisateur actuel:</strong> {user.email}
              </p>
              <p>
                <strong>Rôle utilisateur:</strong> {user.user_metadata.role ?? "Non défini"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <MobileUserPermissionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreatePermission}
        isEdit={false}
        isLoading={createPermissionMutation.isPending}
        establishmentId={establishmentId}
        organizationId={organizationId}
      />

      <MobileUserPermissionModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingPermission(null);
        }}
        onSubmit={handleUpdatePermission}
        initialData={editingPermission ?? undefined}
        isEdit={true}
        isLoading={createPermissionMutation.isPending}
        establishmentId={establishmentId}
        organizationId={organizationId}
      />
    </div>
  );
}

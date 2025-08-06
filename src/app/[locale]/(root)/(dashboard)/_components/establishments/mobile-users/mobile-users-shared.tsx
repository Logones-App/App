"use client";

import React, { useState } from "react";

import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCreateMobileUser, useUpdateMobileUser, useDeleteMobileUser } from "@/lib/queries/mobile-users-mutations";
import { useMobileUsers } from "@/lib/queries/mobile-users-queries";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Database } from "@/lib/supabase/database.types";

import { MobileUserModal } from "./mobile-user-modal";
import { PageHeader } from "./page-header";
import { StatsCards } from "./stats-cards";
import { UsersList } from "./users-list";

interface MobileUsersSharedProps {
  establishmentId: string;
  organizationId?: string;
  isAdmin: boolean;
}

type MobileUser = Database["public"]["Tables"]["mobile_users"]["Row"];

type MobileUserFormData = {
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  role?: string;
  is_active: boolean;
  password?: string;
};

export function MobileUsersShared({ establishmentId, organizationId, isAdmin }: MobileUsersSharedProps) {
  const { user } = useAuthStore();
  const { data: mobileUsers = [], isLoading, error } = useMobileUsers(establishmentId);
  const createUserMutation = useCreateMobileUser();
  const updateUserMutation = useUpdateMobileUser();
  const deleteUserMutation = useDeleteMobileUser();

  // États pour les modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<MobileUser | null>(null);

  // Vérification des permissions
  if (!user) {
    return <div>Non autorisé</div>;
  }

  // Calcul des statistiques
  const totalUsers = mobileUsers.length;
  const activeUsers = mobileUsers.filter((user) => user.is_active).length;
  const inactiveUsers = mobileUsers.filter((user) => !user.is_active).length;

  // Handlers pour les opérations CRUD
  const handleCreateUser = (formData: MobileUserFormData) => {
    const userData = {
      establishment_id: establishmentId,
      organization_id: organizationId ?? null,
      firstname: formData.firstname,
      lastname: formData.lastname,
      email: formData.email,
      phone: formData.phone ?? "",
      role: formData.role ?? null,
      is_active: formData.is_active,
      password: formData.password ?? "",
    };

    createUserMutation.mutate(userData, {
      onSuccess: () => {
        setIsCreateModalOpen(false);
        toast.success("Utilisateur créé avec succès");
      },
      onError: (error) => {
        toast.error(`Erreur lors de la création: ${error.message}`);
      },
    });
  };

  const handleUpdateUser = (formData: MobileUserFormData) => {
    if (!editingUser) return;

    const updateData: Partial<MobileUser> = {
      firstname: formData.firstname,
      lastname: formData.lastname,
      email: formData.email,
      phone: formData.phone ?? "",
      role: formData.role ?? null,
      is_active: formData.is_active,
    };

    // Only include password if it's provided
    if (formData.password) {
      updateData.password = formData.password;
    }

    updateUserMutation.mutate(
      {
        id: editingUser.id,
        updates: updateData,
      },
      {
        onSuccess: () => {
          setIsEditModalOpen(false);
          setEditingUser(null);
          toast.success("Utilisateur mis à jour avec succès");
        },
        onError: (error) => {
          toast.error(`Erreur lors de la mise à jour: ${error.message}`);
        },
      },
    );
  };

  const handleDeleteUser = (userId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;

    deleteUserMutation.mutate(userId, {
      onSuccess: () => {
        toast.success("Utilisateur mobile supprimé");
      },
      onError: (error) => {
        toast.error("Erreur lors de la suppression de l'utilisateur");
        console.error(error);
      },
    });
  };

  const openEditModal = (user: MobileUser) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const getPageTitle = () => {
    return isAdmin
      ? `Admin - Utilisateurs Mobile (Établissement: ${establishmentId})`
      : `Utilisateurs Mobile - ${establishmentId}`;
  };

  const getPageDescription = () => {
    return isAdmin
      ? `Gestion des utilisateurs de l&apos;application mobile pour l&apos;établissement ${establishmentId}`
      : `Gestion des utilisateurs de votre application mobile`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        pageTitle={getPageTitle()}
        pageDescription={getPageDescription()}
        onCreateClick={() => setIsCreateModalOpen(true)}
        isCreateLoading={createUserMutation.isPending}
      />

      {/* Stats Cards */}
      <StatsCards totalUsers={totalUsers} activeUsers={activeUsers} inactiveUsers={inactiveUsers} />

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Utilisateurs Mobile</CardTitle>
          <CardDescription>Gérez les utilisateurs de votre application mobile</CardDescription>
        </CardHeader>
        <CardContent>
          <UsersList
            mobileUsers={mobileUsers}
            isLoading={isLoading}
            error={error}
            onCreateClick={() => setIsCreateModalOpen(true)}
            onEditClick={openEditModal}
            onDeleteClick={handleDeleteUser}
            isCreateLoading={createUserMutation.isPending}
            isUpdateLoading={updateUserMutation.isPending}
            isDeleteLoading={deleteUserMutation.isPending}
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
      <MobileUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateUser}
        isEdit={false}
        isLoading={createUserMutation.isPending}
      />

      <MobileUserModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
        }}
        onSubmit={handleUpdateUser}
        initialData={editingUser ?? undefined}
        isEdit={true}
        isLoading={updateUserMutation.isPending}
      />
    </div>
  );
}

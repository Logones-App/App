"use client";

import React from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, UserPlus, UserX, UserCheck, Edit, Trash2 } from "lucide-react";
import { useMobileUsers } from "@/lib/queries/mobile-users-queries";
import { useCreateMobileUser, useUpdateMobileUser, useDeleteMobileUser } from "@/lib/queries/mobile-users-mutations";

interface MobileUsersSharedProps {
  establishmentId: string;
  organizationId?: string; // Seulement pour admin
  isAdmin: boolean;
}

// Fonctions utilitaires pour réduire la complexité
function getPageTitle(isAdmin: boolean, establishmentId: string): string {
  return isAdmin
    ? `Admin - Utilisateurs Mobile (Établissement: ${establishmentId})`
    : `Utilisateurs Mobile - ${establishmentId}`;
}

function getPageDescription(isAdmin: boolean, establishmentId: string): string {
  return isAdmin
    ? `Gestion des utilisateurs de l&apos;application mobile pour l&apos;établissement ${establishmentId}`
    : `Gestion des utilisateurs de votre application mobile`;
}

function getStatsCards(mobileUsers: any[]) {
  const totalUsers = mobileUsers.length;
  const activeUsers = mobileUsers.filter((user) => user.is_active).length;
  const inactiveUsers = mobileUsers.filter((user) => !user.is_active).length;

  return { totalUsers, activeUsers, inactiveUsers };
}

export function MobileUsersShared({ establishmentId, organizationId, isAdmin }: MobileUsersSharedProps) {
  const { user } = useAuthStore();

  // Queries
  const { data: mobileUsers = [], isLoading, error } = useMobileUsers(establishmentId);

  // Debug
  console.log("Establishment ID:", establishmentId);
  console.log("Mobile Users:", mobileUsers);

  // Mutations
  const createUserMutation = useCreateMobileUser();
  const updateUserMutation = useUpdateMobileUser();
  const deleteUserMutation = useDeleteMobileUser();

  // Vérification des permissions
  if (!user) {
    return <div>Non autorisé</div>;
  }

  // Logique différente selon le type d'accès
  const pageTitle = getPageTitle(isAdmin, establishmentId);
  const pageDescription = getPageDescription(isAdmin, establishmentId);
  const { totalUsers, activeUsers, inactiveUsers } = getStatsCards(mobileUsers);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{pageTitle}</h1>
          <p className="text-muted-foreground mt-2">{pageDescription}</p>
        </div>
        <Button
          className="flex items-center gap-2"
          onClick={() => {
            // TODO: Ouvrir modal de création
            console.log("Créer un utilisateur");
          }}
          disabled={createUserMutation.isPending}
        >
          <UserPlus className="h-4 w-4" />
          Ajouter un utilisateur
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Utilisateurs</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-muted-foreground text-xs">Utilisateurs enregistrés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs Actifs</CardTitle>
            <UserCheck className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-muted-foreground text-xs">Utilisateurs actifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs Inactifs</CardTitle>
            <UserX className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveUsers}</div>
            <p className="text-muted-foreground text-xs">Utilisateurs inactifs</p>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Utilisateurs Mobile</CardTitle>
          <CardDescription>Gérez les utilisateurs de votre application mobile</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-destructive">Erreur lors du chargement des utilisateurs</div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Chargement...</div>
            </div>
          ) : mobileUsers.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <h3 className="mb-2 text-lg font-semibold">Aucun utilisateur mobile</h3>
              <p className="text-muted-foreground mb-4">
                Commencez par ajouter des utilisateurs pour votre application mobile
              </p>
              <Button
                onClick={() => {
                  // TODO: Ouvrir modal de création
                  console.log("Créer un utilisateur");
                }}
                disabled={createUserMutation.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter le premier utilisateur
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {mobileUsers.map((mobileUser) => (
                <div key={mobileUser.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center space-x-4">
                    <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                      <Users className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {mobileUser.firstname} {mobileUser.lastname}
                      </h3>
                      <p className="text-muted-foreground text-sm">{mobileUser.email}</p>
                      {mobileUser.phone && <p className="text-muted-foreground text-sm">{mobileUser.phone}</p>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={mobileUser.is_active ? "default" : "secondary"}>
                      {mobileUser.is_active ? "Actif" : "Inactif"}
                    </Badge>
                    {mobileUser.role && <Badge variant="outline">{mobileUser.role}</Badge>}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // TODO: Ouvrir modal de modification
                        console.log("Modifier utilisateur:", mobileUser.id);
                      }}
                      disabled={updateUserMutation.isPending}
                    >
                      <Edit className="mr-1 h-4 w-4" />
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) {
                          deleteUserMutation.mutate(mobileUser.id);
                        }
                      }}
                      disabled={deleteUserMutation.isPending}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                <strong>Type d&apos;accès:</strong> {isAdmin ? "Admin" : "Dashboard"}
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
                <strong>Rôle utilisateur:</strong> {user?.user_metadata?.role || "Non défini"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

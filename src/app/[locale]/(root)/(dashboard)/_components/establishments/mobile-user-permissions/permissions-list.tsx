"use client";

import React from "react";

import { Edit, Plus, Trash2, Users, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMobileUser } from "@/lib/queries/mobile-users-queries";
import type { Database } from "@/lib/supabase/database.types";

// ✅ UTILISER LE TYPE GÉNÉRÉ AUTOMATIQUEMENT
type MobileUserPermission = Database["public"]["Tables"]["mobile_user_permissions"]["Row"];

interface PermissionsListProps {
  permissions: MobileUserPermission[];
  isLoading: boolean;
  error: Error | null;
  onCreateClick: () => void;
  onEditClick: (permission: MobileUserPermission) => void;
  onDeleteClick: (permissionId: string) => void;
  isCreateLoading: boolean;
  isUpdateLoading: boolean;
  isDeleteLoading: boolean;
}

// Composant pour afficher les informations d'un utilisateur mobile
function MobileUserInfo({ userId }: { userId: string }) {
  // ✅ UTILISER LE CRUD EXISTANT
  const { data: user, isLoading } = useMobileUser(userId);

  if (isLoading) {
    return <span className="text-muted-foreground">Chargement...</span>;
  }

  if (!user) {
    return <span className="text-muted-foreground">Utilisateur non trouvé</span>;
  }

  return (
    <span>
      {user.firstname} {user.lastname} ({user.email})
    </span>
  );
}

export function PermissionsList({
  permissions,
  isLoading,
  error,
  onCreateClick,
  onEditClick,
  onDeleteClick,
  isCreateLoading,
  isUpdateLoading,
  isDeleteLoading,
}: PermissionsListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <div className="text-destructive mb-4">Erreur lors du chargement des permissions</div>
        <Button onClick={onCreateClick} disabled={isCreateLoading}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter la première permission
        </Button>
      </div>
    );
  }

  if (permissions.length === 0) {
    return (
      <div className="py-8 text-center">
        <Users className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
        <h3 className="mb-2 text-lg font-semibold">Aucune permission</h3>
        <p className="text-muted-foreground mb-4">Aucune permission configurée pour cet établissement</p>
        <Button onClick={onCreateClick} disabled={isCreateLoading}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter la première permission
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {permissions.map((permission) => (
        <div key={permission.id} className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center space-x-4">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
              <Shield className="text-primary h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">{permission.permission}</h3>
              <p className="text-muted-foreground text-sm">
                Utilisateur:{" "}
                {permission.mobile_user_id ? (
                  <MobileUserInfo userId={permission.mobile_user_id} />
                ) : (
                  "Utilisateur non défini"
                )}
              </p>
              {permission.granted_at && (
                <p className="text-muted-foreground text-sm">
                  Accordée le: {new Date(permission.granted_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={(permission.deleted ?? false) ? "secondary" : "default"}>
              {(permission.deleted ?? false) ? "Supprimée" : "Active"}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => onEditClick(permission)} disabled={isUpdateLoading}>
              <Edit className="mr-1 h-4 w-4" />
              Modifier
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDeleteClick(permission.id)} disabled={isDeleteLoading}>
              <Trash2 className="mr-1 h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

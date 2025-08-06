"use client";

import React from "react";

import { Users, Plus, Edit, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/supabase/database.types";

type MobileUser = Database["public"]["Tables"]["mobile_users"]["Row"];

interface UsersListProps {
  mobileUsers: MobileUser[];
  isLoading: boolean;
  error: unknown;
  onCreateClick: () => void;
  onEditClick: (user: MobileUser) => void;
  onDeleteClick: (userId: string) => void;
  isCreateLoading: boolean;
  isUpdateLoading: boolean;
  isDeleteLoading: boolean;
}

export function UsersList({
  mobileUsers,
  isLoading,
  error,
  onCreateClick,
  onEditClick,
  onDeleteClick,
  isCreateLoading,
  isUpdateLoading,
  isDeleteLoading,
}: UsersListProps) {
  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-destructive">Erreur lors du chargement des utilisateurs</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (mobileUsers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <h3 className="mb-2 text-lg font-semibold">Aucun utilisateur mobile</h3>
        <p className="text-muted-foreground mb-4">
          Commencez par ajouter des utilisateurs pour votre application mobile
        </p>
        <Button onClick={onCreateClick} disabled={isCreateLoading}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter le premier utilisateur
        </Button>
      </div>
    );
  }

  return (
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
            <Button variant="outline" size="sm" onClick={() => onEditClick(mobileUser)} disabled={isUpdateLoading}>
              <Edit className="mr-1 h-4 w-4" />
              Modifier
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDeleteClick(mobileUser.id)} disabled={isDeleteLoading}>
              <Trash2 className="mr-1 h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

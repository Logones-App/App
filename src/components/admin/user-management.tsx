"use client";

import { useState } from "react";

import { Shield, User, Settings, Plus, Edit, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserMetadata, useUserPermissions } from "@/hooks/use-user-metadata";

interface User {
  id: string;
  email: string;
  app_metadata: any;
  user_metadata: any;
  created_at: string;
  last_sign_in_at: string;
}

export function UserManagement() {
  const { hasPermission } = useUserPermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const t = useTranslations("common");

  // Vérifier les permissions
  if (!hasPermission("manage_users")) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Gestion des Utilisateurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {t("error")}: Vous n&apos;avez pas les permissions nécessaires pour gérer les utilisateurs.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleLoadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs:", error);
      // Feedback UI uniformisé
      alert(t("loadError"));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch("/api/auth/update-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (response.ok) {
        // Recharger les utilisateurs
        await handleLoadUsers();
        setShowEditModal(false);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du rôle:", error);
    }
  };

  const getRoleBadge = (user: User) => {
    const role = user.app_metadata?.role ?? user.user_metadata?.role;
    if (role === "system_admin") {
      return <Badge variant="destructive">System Admin</Badge>;
    } else if (role === "org_admin") {
      return <Badge variant="default">Org Admin</Badge>;
    } else {
      return <Badge variant="secondary">Utilisateur</Badge>;
    }
  };

  const getPermissions = (user: User) => {
    const permissions = user.app_metadata?.permissions ?? [];
    return permissions.map((permission: string) => (
      <Badge key={permission} variant="outline" className="mr-1 mb-1 text-xs">
        {permission}
      </Badge>
    ));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Gestion des Utilisateurs
          </CardTitle>
          <CardDescription>Gérez les rôles et permissions des utilisateurs du système</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <Button onClick={handleLoadUsers} disabled={loading}>
              {loading ? t("loading") : "Charger les utilisateurs"}
            </Button>
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un utilisateur
            </Button>
          </div>

          <div className="space-y-4">
            {users.map((user) => (
              <Card key={user.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{user.email}</span>
                        {getRoleBadge(user)}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        Créé le: {new Date(user.created_at).toLocaleDateString("fr-FR")}
                        {user.last_sign_in_at && (
                          <span className="ml-4">
                            Dernière connexion: {new Date(user.last_sign_in_at).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <span className="text-sm font-medium">Permissions:</span>
                        <div className="mt-1">{getPermissions(user)}</div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowEditModal(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal d'édition */}
      {showEditModal && selectedUser && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Modifier le rôle</CardTitle>
              <CardDescription>Modifier le rôle de {selectedUser.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="role">Rôle</Label>
                <Select
                  defaultValue={selectedUser.app_metadata?.role ?? selectedUser.user_metadata?.role}
                  onValueChange={(value) => {
                    if (selectedUser) {
                      handleUpdateUserRole(selectedUser.id, value);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system_admin">System Admin</SelectItem>
                    <SelectItem value="org_admin">Org Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

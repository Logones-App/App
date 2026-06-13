"use client";

import { useCallback, useEffect, useState } from "react";

import { Loader2, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { ChangeRoleModal } from "./_components/change-role-modal";
import { CreateUserModal, type OrgOption } from "./_components/create-user-modal";
import { ManageOrgsModal } from "./_components/manage-orgs-modal";
import { UsersTable, type UserRow } from "./_components/users-table";

type RoleFilter = "all" | "system_admin" | "commercial" | "org_admin" | "manager" | "employee";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [organizations, setOrganizations] = useState<OrgOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [managingUser, setManagingUser] = useState<UserRow | null>(null);
  const [changingRoleUser, setChangingRoleUser] = useState<UserRow | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = (await res.json()) as { users: UserRow[]; error?: string };
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users);
    } catch {
      toast.error("Impossible de charger les utilisateurs");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
    fetch("/api/admin/organizations")
      .then((r) => r.json())
      .then((d: { organizations: OrgOption[] }) => setOrganizations(d.organizations))
      .catch(() => {});
  }, [fetchUsers]);

  const filtered = users.filter((u) => {
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchSearch =
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.name.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const counts = {
    commercial: users.filter((u) => u.role === "commercial").length,
    org_admin: users.filter((u) => u.role === "org_admin").length,
    manager: users.filter((u) => u.role === "manager").length,
    employee: users.filter((u) => u.role === "employee").length,
  };

  async function handleCreateSuccess() {
    setShowCreate(false);
    await fetchUsers();
    toast.success("Utilisateur créé — un email d'invitation a été envoyé.");
  }

  async function handleManageSuccess() {
    await fetchUsers();
    setManagingUser(null);
  }

  async function handleResend(user: UserRow) {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error);
      toast.success(`Email d'invitation envoyé à ${user.email}`);
    } catch {
      toast.error("Échec de l'envoi de l'email");
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${deletingUser.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error);
      toast.success("Utilisateur supprimé");
      setDeletingUser(null);
      await fetchUsers();
    } catch {
      toast.error("Échec de la suppression");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Users className="h-6 w-6" />
            Gestion des utilisateurs
          </h1>
          <p className="text-muted-foreground text-sm">Commerciaux, admins et managers</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvel utilisateur
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-muted-foreground text-sm font-medium">Commerciaux</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{counts.commercial}</p>
            <Badge variant="default" className="mt-1 text-xs">
              Commercial
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-muted-foreground text-sm font-medium">Org Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{counts.org_admin}</p>
            <Badge variant="secondary" className="mt-1 text-xs">
              Org Admin
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-muted-foreground text-sm font-medium">Managers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{counts.manager}</p>
            <Badge variant="outline" className="mt-1 text-xs">
              Manager
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-muted-foreground text-sm font-medium">Employés</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{counts.employee}</p>
            <Badge variant="outline" className="mt-1 text-xs">
              Employé
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Rechercher par nom ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="system_admin">System Admin</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="org_admin">Org Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="employee">Employé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          ) : (
            <UsersTable
              users={filtered}
              onManageOrgs={(u) => setManagingUser(u)}
              onChangeRole={(u) => setChangingRoleUser(u)}
              onResend={handleResend}
              onDelete={(u) => setDeletingUser(u)}
            />
          )}
        </CardContent>
      </Card>

      <CreateUserModal
        open={showCreate}
        organizations={organizations}
        onClose={() => setShowCreate(false)}
        onSuccess={handleCreateSuccess}
      />

      <ManageOrgsModal
        user={managingUser}
        organizations={organizations}
        onClose={() => setManagingUser(null)}
        onSuccess={handleManageSuccess}
      />

      <ChangeRoleModal
        user={changingRoleUser}
        organizations={organizations}
        onClose={() => setChangingRoleUser(null)}
        onSuccess={fetchUsers}
      />

      <AlertDialog
        open={!!deletingUser}
        onOpenChange={(v) => {
          if (!v) setDeletingUser(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l&apos;utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{deletingUser?.email}</span> sera supprimé définitivement. Cette action est
              irréversible. Ses accès organisations et sa fiche employé seront dissociés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

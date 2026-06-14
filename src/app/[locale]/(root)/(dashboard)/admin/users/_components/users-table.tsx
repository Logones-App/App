"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AtSign, Building2, MailCheck, MoreHorizontal, Settings, Shield, Trash2, Unlink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  appRole: string | null;
  orgRole: string | null;
  organizations: { id: string; name: string; role: string; establishmentId: string | null }[];
  employeeEstablishment: { id: string; name: string } | null;
  createdAt: string;
  lastSignIn: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  system_admin: "System Admin",
  commercial: "Commercial",
  account_manager: "Account Manager",
  org_admin: "Org Admin",
  manager: "Manager",
  employee: "Employé",
  unknown: "Inconnu",
};

const ROLE_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  system_admin: "destructive",
  commercial: "default",
  account_manager: "default",
  org_admin: "secondary",
  manager: "outline",
  employee: "outline",
  unknown: "outline",
};

interface Props {
  users: UserRow[];
  onManageOrgs: (user: UserRow) => void;
  onChangeRole: (user: UserRow) => void;
  onChangeEmail: (user: UserRow) => void;
  onResend: (user: UserRow) => void;
  onDelete: (user: UserRow) => void;
}

export function UsersTable({ users, onManageOrgs, onChangeRole, onChangeEmail, onResend, onDelete }: Props) {
  if (users.length === 0) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        Aucun utilisateur trouvé
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Utilisateur</TableHead>
          <TableHead>Rôle</TableHead>
          <TableHead>Organisations</TableHead>
          <TableHead>Dernière connexion</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>
              <div>
                <p className="font-medium">{user.name || "—"}</p>
                <p className="text-muted-foreground text-xs">{user.email}</p>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={ROLE_VARIANTS[user.role] ?? "outline"}>{ROLE_LABELS[user.role] ?? user.role}</Badge>
            </TableCell>
            <TableCell>
              {user.role === "employee" ? (
                <span className="bg-muted inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs">
                  <Building2 className="h-3 w-3" />
                  {user.employeeEstablishment?.name ?? "Via fiche employé"}
                </span>
              ) : user.organizations.length === 0 ? (
                <span className="text-muted-foreground text-xs">Aucune</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {user.organizations.slice(0, 3).map((o) => (
                    <span key={o.id} className="bg-muted inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs">
                      <Building2 className="h-3 w-3" />
                      {o.name}
                    </span>
                  ))}
                  {user.organizations.length > 3 && (
                    <span className="text-muted-foreground text-xs">+{user.organizations.length - 3}</span>
                  )}
                </div>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {user.lastSignIn ? format(new Date(user.lastSignIn), "dd/MM/yyyy HH:mm", { locale: fr }) : "Jamais"}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {user.role === "employee" ? (
                    <>
                      <DropdownMenuItem onClick={() => onChangeRole(user)}>
                        <Unlink className="mr-2 h-4 w-4" />
                        Changer de rôle
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onChangeEmail(user)}>
                        <AtSign className="mr-2 h-4 w-4" />
                        Changer l&apos;email
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onResend(user)}>
                        <MailCheck className="mr-2 h-4 w-4" />
                        Renvoyer l&apos;invitation
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => onManageOrgs(user)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Gérer les organisations
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onChangeRole(user)}>
                        <Shield className="mr-2 h-4 w-4" />
                        Changer le rôle
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onChangeEmail(user)}>
                        <AtSign className="mr-2 h-4 w-4" />
                        Changer l&apos;email
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onResend(user)}>
                        <MailCheck className="mr-2 h-4 w-4" />
                        Renvoyer l&apos;invitation
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(user)} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

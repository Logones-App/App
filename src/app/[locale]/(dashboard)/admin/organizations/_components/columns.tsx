"use client";

import { useRouter } from "next/navigation";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MoreHorizontal, Edit, Trash2, Users, Building, CheckCircle, Mail } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Database } from "@/lib/supabase/database.types";

// Utiliser le type généré par Supabase
type Organization = Database["public"]["Tables"]["organizations"]["Row"];

export const columns: ColumnDef<Organization>[] = [
  {
    accessorKey: "name",
    header: "Organisation",
    cell: ({ row }) => {
      const organization = row.original;
      return (
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              <span className="text-lg font-semibold">{organization.name.charAt(0).toUpperCase()}</span>
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{organization.name}</div>
            <div className="text-muted-foreground text-sm">{organization.slug}</div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const organization = row.original;
      return (
        <div className="max-w-xs">
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {organization.description || "Aucune description"}
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) => {
      const organization = row.original;
      const isActive = !organization.deleted;

      return <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Actif" : "Inactif"}</Badge>;
    },
  },
  {
    accessorKey: "created_at",
    header: "Créé le",
    cell: ({ row }) => {
      const organization = row.original;
      return (
        <div className="text-muted-foreground text-sm">
          {organization.created_at ? format(new Date(organization.created_at), "dd/MM/yyyy", { locale: fr }) : "N/A"}
        </div>
      );
    },
  },
  {
    accessorKey: "updated_at",
    header: "Modifié le",
    cell: ({ row }) => {
      const organization = row.original;
      return (
        <div className="text-muted-foreground text-sm">
          {organization.updated_at ? format(new Date(organization.updated_at), "dd/MM/yyyy", { locale: fr }) : "N/A"}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const organization = row.original;
      const router = useRouter();

      const handleSelectOrganization = () => {
        router.push(`/admin/organizations/${organization.id}`);
      };

      return (
        <div className="flex items-center gap-2">
          <Button onClick={handleSelectOrganization} variant={"outline"} size="sm" className="h-8">
            <CheckCircle className="mr-2 h-4 w-4" />
            Gérer
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Ouvrir le menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSelectOrganization}>
                <Building className="mr-2 h-4 w-4" />
                Gérer cette organisation
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/admin/organizations/${organization.id}/users`)}>
                <Users className="mr-2 h-4 w-4" />
                Gérer les utilisateurs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/admin/organizations/${organization.id}/messages`)}>
                <Mail className="mr-2 h-4 w-4" />
                Messages
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/admin/organizations/${organization.id}/message1`)}>
                <Mail className="mr-2 h-4 w-4" />
                Message1
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/admin/organizations/${organization.id}/message2`)}>
                <Mail className="mr-2 h-4 w-4" />
                Message2
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/admin/organizations/${organization.id}/establishments`)}>
                <Building className="mr-2 h-4 w-4" />
                Établissements
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

"use client";

import { useState } from "react";

import { LogOut, User, Building, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserMetadata } from "@/hooks/use-user-metadata";
import { useLogout } from "@/lib/queries/auth";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getInitials } from "@/lib/utils";

export function AccountSwitcher() {
  const { user } = useAuthStore();
  const { userMetadata } = useUserMetadata();
  const logoutMutation = useLogout();
  const t = useTranslations("user_menu");

  if (!user) return null;

  const initials = getInitials(user.email ?? "");
  const userName =
    userMetadata?.firstname && userMetadata?.lastname
      ? `${userMetadata.firstname} ${userMetadata.lastname}`
      : user.email;

  const userRole = userMetadata?.role ?? "Utilisateur";
  const organizationName = userRole === "system_admin" ? "Administration Système" : "Organisation";

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast.success(t("logout_success"));
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      toast.error(t("logout_error"));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-1">
              <p className="text-sm leading-none font-medium">{userName}</p>
              <p className="text-muted-foreground text-xs leading-none">{user.email}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Profil</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Building className="mr-2 h-4 w-4" />
          <span>{organizationName}</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Paramètres</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600" disabled={logoutMutation.isPending}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{logoutMutation.isPending ? t("logout_loading") : t("logout")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import { LogOut, User, Building, Settings } from "lucide-react";
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
import { getInitials } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUserMetadata } from "@/hooks/use-user-metadata";
import { useState } from "react";

export function AccountSwitcher() {
  const { user, logout } = useAuthStore();
  const { userMetadata } = useUserMetadata();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) return null;

  const initials = getInitials(user.email || "");
  const userName =
    userMetadata?.firstname && userMetadata?.lastname
      ? `${userMetadata.firstname} ${userMetadata.lastname}`
      : user.email;

  const userRole = userMetadata?.role || "Utilisateur";
  const organizationName = userRole === "system_admin" ? "Administration Système" : "Organisation";

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      setIsLoggingOut(false);
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
        <DropdownMenuItem onClick={handleLogout} className="text-red-600" disabled={isLoggingOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoggingOut ? "Déconnexion..." : "Déconnexion"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

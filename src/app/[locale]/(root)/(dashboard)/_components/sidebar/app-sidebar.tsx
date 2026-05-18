"use client";

import { useEffect } from "react";

import { useParams } from "next/navigation";

import { Command } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useCurrentEstablishmentStore } from "@/lib/stores/current-establishment-store";
import { getSidebarItemsByRole } from "@/navigation/sidebar/sidebar-items";

import { EstablishmentSwitcher } from "./establishment-switcher";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userRole?: string | null;
  locale?: string;
}

const LS_KEY = "current-establishment";

export function AppSidebar({ userRole, locale, ...props }: AppSidebarProps) {
  const { user } = useAuthStore();
  const params = useParams();
  const { establishmentId, setEstablishment } = useCurrentEstablishmentStore();

  // Hydrate le store depuis localStorage au premier rendu client
  useEffect(() => {
    if (establishmentId) return; // déjà initialisé dans cette session
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const { id, name } = JSON.parse(raw) as { id: string; name: string };
        if (id && name) setEstablishment(id, name);
      }
    } catch {
      // localStorage inaccessible ou JSON invalide — on ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finalUserRole = userRole ?? user?.user_metadata?.role ?? user?.app_metadata?.role;
  const finalLocale = locale ?? (params?.locale as string);
  const isOrgAdmin = finalUserRole === "org_admin";

  const sidebarItems = getSidebarItemsByRole(finalUserRole, finalLocale, establishmentId);
  const beforeSwitcher = isOrgAdmin ? sidebarItems.slice(0, 1) : sidebarItems;
  const afterSwitcher = isOrgAdmin ? sidebarItems.slice(1) : [];

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="#">
                <Command />
                <span className="text-base font-semibold">{APP_CONFIG.name}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={beforeSwitcher} />

        {isOrgAdmin && <EstablishmentSwitcher />}

        {/* key force le remount complet quand l'établissement change */}
        {isOrgAdmin && <NavMain key={establishmentId ?? "none"} items={afterSwitcher} />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}

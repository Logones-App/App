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
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useCurrentEstablishmentStore } from "@/lib/stores/current-establishment-store";
import { createClient } from "@/lib/supabase/client";
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
  const organizationId = useOrgaUserOrganizationId();

  // Hydrate le store depuis localStorage au premier rendu client
  useEffect(() => {
    if (establishmentId) return;
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

  const finalUserRole = userRole ?? user?.user_metadata.role ?? user?.app_metadata.role;

  // Auto-sélection de l'établissement pour les managers sans localStorage
  useEffect(() => {
    if (finalUserRole !== "manager") return;
    if (establishmentId) return;
    if (!user?.id) return;

    const supabase = createClient();
    void (async () => {
      const { data } = await supabase
        .from("users_organizations")
        .select("establishment_id, establishments(id, name)")
        .eq("user_id", user.id)
        .eq("deleted", false)
        .not("establishment_id", "is", null)
        .maybeSingle();

      const est = data?.establishments as { id: string; name: string } | null;
      if (est) {
        setEstablishment(est.id, est.name);
        try {
          localStorage.setItem(LS_KEY, JSON.stringify({ id: est.id, name: est.name }));
        } catch {
          // ignore
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, finalUserRole]);

  // Auto-sélection de l'établissement pour les employees (depuis employees.establishment_id)
  useEffect(() => {
    if (finalUserRole !== "employee") return;
    if (establishmentId) return;
    if (!user?.id) return;

    const supabase = createClient();
    void (async () => {
      const { data } = await supabase
        .from("employees")
        .select("establishment_id, establishments(id, name)")
        .eq("auth_user_id", user.id)
        .eq("deleted", false)
        .maybeSingle();

      const est = data?.establishments as { id: string; name: string } | null;
      if (est) {
        setEstablishment(est.id, est.name);
        try {
          localStorage.setItem(LS_KEY, JSON.stringify({ id: est.id, name: est.name }));
        } catch {
          // ignore
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, finalUserRole]);

  const finalLocale = locale ?? (params.locale as string);
  const isOrgAdmin = finalUserRole === "org_admin";

  const sidebarItems = getSidebarItemsByRole(finalUserRole, finalLocale, establishmentId, organizationId);
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

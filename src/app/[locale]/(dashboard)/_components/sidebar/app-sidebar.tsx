"use client";

import { Settings, CircleHelp, Search, Database, ClipboardList, File, Command } from "lucide-react";

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
import { systemAdminSidebarItems } from "@/navigation/sidebar/sidebar-items-system-admin";
import { orgAdminSidebarItems } from "@/navigation/sidebar/sidebar-items-org-admin";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUserMetadata } from "@/hooks/use-user-metadata";

import { NavMain } from "@/app/[locale]/(main)/dashboard1/_components/sidebar/nav-main";
import { NavUser } from "@/app/[locale]/(main)/dashboard1/_components/sidebar/nav-user";

const data = {
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: Settings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: CircleHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: Search,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: Database,
    },
    {
      name: "Reports",
      url: "#",
      icon: ClipboardList,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: File,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuthStore();
  const { role } = useUserMetadata();

  // Sélectionner les sidebar-items selon le rôle
  const getSidebarItems = () => {
    if (role === "system_admin") {
      return systemAdminSidebarItems;
    } else if (role === "org_admin") {
      return orgAdminSidebarItems;
    }
    // Fallback par défaut
    return orgAdminSidebarItems;
  };

  const sidebarItems = getSidebarItems();

  // Créer l'objet user pour NavUser
  const currentUser = user
    ? {
        name:
          `${user.user_metadata?.firstname || ""} ${user.user_metadata?.lastname || ""}`.trim() ||
          user.email ||
          "Utilisateur",
        email: user.email || "",
        avatar: user.user_metadata?.avatar_url || "",
      }
    : {
        name: "Utilisateur",
        email: "",
        avatar: "",
      };

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
        <NavMain items={sidebarItems} />
        {/* <NavDocuments items={data.documents} /> */}
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  );
}

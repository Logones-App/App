import {
  Building2,
  Users,
  Settings,
  BarChart3,
  Shield,
  Home,
  Store,
} from "lucide-react";
import { type NavGroup } from "./sidebar-items";

export const systemAdminSidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Administration",
    items: [
      {
        title: "Dashboard",
        url: "/admin",
        icon: Home,
      },
      {
        title: "Organisations",
        url: "/admin/organizations",
        icon: Building2,
      },
      {
        title: "Utilisateurs",
        url: "/admin/users",
        icon: Users,
      },
      {
        title: "Établissements",
        url: "/admin/establishments",
        icon: Store,
      },
    ],
  },
  {
    id: 2,
    label: "Système",
    items: [
      {
        title: "Statistiques",
        url: "/admin/statistics",
        icon: BarChart3,
      },
      {
        title: "Sécurité",
        url: "/admin/security",
        icon: Shield,
      },
      {
        title: "Paramètres",
        url: "/admin/settings",
        icon: Settings,
      },
    ],
  },
]; 
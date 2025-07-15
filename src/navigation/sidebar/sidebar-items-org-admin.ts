import {
  Store,
  Menu,
  Calendar,
  BarChart3,
  Settings,
  Home,
  Package,
  Users,
} from "lucide-react";
import { type NavGroup } from "./sidebar-items";

export const orgAdminSidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Gestion",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: Home,
      },
      {
        title: "Établissements",
        url: "/dashboard/establishments",
        icon: Store,
      },
      {
        title: "Menus & Produits",
        url: "/dashboard/menus",
        icon: Menu,
      },
      {
        title: "Réservations",
        url: "/dashboard/bookings",
        icon: Calendar,
      },
    ],
  },
  {
    id: 2,
    label: "Opérations",
    items: [
      {
        title: "Stock",
        url: "/dashboard/stock",
        icon: Package,
      },
      {
        title: "Équipe",
        url: "/dashboard/team",
        icon: Users,
      },
      {
        title: "Statistiques",
        url: "/dashboard/statistics",
        icon: BarChart3,
      },
      {
        title: "Paramètres",
        url: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
]; 
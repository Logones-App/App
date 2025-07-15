import {
  Home,
  ChartPie,
  Grid2X2,
  ChartLine,
  ShoppingBag,
  BookA,
  Forklift,
  Mail,
  MessageSquare,
  Calendar,
  Kanban,
  ReceiptText,
  Users,
  Lock,
  Fingerprint,
  SquareArrowUpRight,
  Building2,
  Settings,
  BarChart3,
  UserCheck,
  Store,
  Utensils,
  Clock,
  type LucideIcon,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

// Menus pour system_admin
export const getSystemAdminSidebarItems = (): NavGroup[] => [
  {
    id: 1,
    label: "Administration",
    items: [
      {
        title: "Tableau de bord",
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
        title: "Statistiques",
        url: "/admin/analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    id: 2,
    label: "Gestion",
    items: [
      {
        title: "Paramètres",
        url: "/admin/settings",
        icon: Settings,
      },
      {
        title: "Rôles & Permissions",
        url: "/admin/roles",
        icon: Lock,
      },
      {
        title: "Audit",
        url: "/admin/audit",
        icon: Fingerprint,
        comingSoon: true,
      },
    ],
  },
  {
    id: 3,
    label: "Support",
    items: [
      {
        title: "Support",
        url: "/admin/support",
        icon: MessageSquare,
        comingSoon: true,
      },
      {
        title: "Documentation",
        url: "/admin/docs",
        icon: BookA,
        comingSoon: true,
      },
    ],
  },
];

// Menus pour org_admin
export const getOrgAdminSidebarItems = (): NavGroup[] => [
  {
    id: 1,
    label: "Restaurant",
    items: [
      {
        title: "Tableau de bord",
        url: "/dashboard",
        icon: Home,
      },
      {
        title: "Établissements",
        url: "/dashboard/establishments",
        icon: Store,
      },
      {
        title: "Menus",
        url: "/dashboard/menus",
        icon: Utensils,
      },
      {
        title: "Réservations",
        url: "/dashboard/reservations",
        icon: Calendar,
      },
    ],
  },
  {
    id: 2,
    label: "Gestion",
    items: [
      {
        title: "Équipe",
        url: "/dashboard/team",
        icon: Users,
      },
      {
        title: "Horaires",
        url: "/dashboard/schedule",
        icon: Clock,
      },
      {
        title: "Analytics",
        url: "/dashboard/analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    id: 3,
    label: "Configuration",
    items: [
      {
        title: "Paramètres",
        url: "/dashboard/settings",
        icon: Settings,
      },
      {
        title: "Profil",
        url: "/dashboard/profile",
        icon: UserCheck,
      },
    ],
  },
];

// Menu par défaut (fallback)
export const getDefaultSidebarItems = (): NavGroup[] => [
  {
    id: 1,
    label: "Dashboards",
    items: [
      {
        title: "Dashboards",
        url: "/dashboard",
        icon: Home,
        subItems: [
          { title: "Default", url: "/dashboard/default", icon: ChartPie },
          { title: "CRM", url: "/dashboard", icon: Grid2X2, comingSoon: true },
          { title: "Analytics", url: "/dashboard/analytics", icon: ChartLine, comingSoon: true },
          { title: "eCommerce", url: "/dashboard/e-commerce", icon: ShoppingBag, comingSoon: true },
          { title: "Academy", url: "/dashboard/academy", icon: BookA, comingSoon: true },
          { title: "Logistics", url: "/dashboard/logistics", icon: Forklift, comingSoon: true },
        ],
      },
    ],
  },
  {
    id: 2,
    label: "Pages",
    items: [
      {
        title: "Authentication",
        url: "/auth",
        icon: Fingerprint,
        subItems: [
          { title: "Login", url: "/auth/login", newTab: true },
          { title: "Register", url: "/auth/register", newTab: true },
        ],
      },
      {
        title: "Email",
        url: "/mail",
        icon: Mail,
        comingSoon: true,
      },
      {
        title: "Chat",
        url: "/chat",
        icon: MessageSquare,
        comingSoon: true,
      },
      {
        title: "Calendar",
        url: "/calendar",
        icon: Calendar,
        comingSoon: true,
      },
      {
        title: "Kanban",
        url: "/kanban",
        icon: Kanban,
        comingSoon: true,
      },
      {
        title: "Invoice",
        url: "/invoice",
        icon: ReceiptText,
        comingSoon: true,
      },
      {
        title: "Establishments",
        url: "/dashboard/establishments",
        icon: ShoppingBag,
      },
      {
        title: "Users",
        url: "/dashboard/admin/users",
        icon: Users,
      },
      {
        title: "Roles",
        url: "/roles",
        icon: Lock,
        comingSoon: true,
      },
    ],
  },
  {
    id: 3,
    label: "Misc",
    items: [
      {
        title: "Others",
        url: "/others",
        icon: SquareArrowUpRight,
        comingSoon: true,
      },
    ],
  },
];

// Fonction pour obtenir les items selon le rôle
export const getSidebarItemsByRole = (role?: string): NavGroup[] => {
  switch (role) {
    case "system_admin":
      return getSystemAdminSidebarItems();
    case "org_admin":
      return getOrgAdminSidebarItems();
    default:
      return getDefaultSidebarItems();
  }
};

// Export par défaut pour compatibilité
export const sidebarItems = getDefaultSidebarItems();

import { type LucideIcon } from "lucide-react";

// Import des fonctions depuis les fichiers séparés
import { getCommercialSidebarItems } from "./commercial-items";
import { getDefaultSidebarItems } from "./default-items";
import { getEmployeeSidebarItems } from "./employee-items";
import { getOrgAdminSidebarItems } from "./org-admin-items";
import { getSystemAdminSidebarItems } from "./system-admin-items";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  locked?: boolean;
  lockReason?: string;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  locked?: boolean;
  lockReason?: string;
}

export interface NavGroup {
  id: number;
  label?: string;
  labelUrl?: string;
  items: NavMainItem[];
}

// Fonction pour obtenir les items selon le rôle avec locale
export const getSidebarItemsByRole = (
  role?: string,
  locale?: string,
  establishmentId?: string | null,
  organizationId?: string | null,
): NavGroup[] => {
  switch (role) {
    case "system_admin":
      return getSystemAdminSidebarItems(locale);
    case "commercial":
      return getCommercialSidebarItems(locale);
    case "org_admin":
    case "manager":
      return getOrgAdminSidebarItems(locale, establishmentId, organizationId);
    case "employee":
      return getEmployeeSidebarItems(locale, establishmentId);
    default:
      return getDefaultSidebarItems(locale);
  }
};

// Export par défaut pour compatibilité
export const sidebarItems = getDefaultSidebarItems();

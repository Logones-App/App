import { type LucideIcon } from "lucide-react";

// Import des fonctions depuis les fichiers séparés
import { getSystemAdminSidebarItems } from "./system-admin-items";
import { getOrgAdminSidebarItems } from "./org-admin-items";
import { getDefaultSidebarItems } from "./default-items";

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

// Fonction pour obtenir les items selon le rôle avec locale
export const getSidebarItemsByRole = (role?: string, locale?: string): NavGroup[] => {
  switch (role) {
    case "system_admin":
      return getSystemAdminSidebarItems(locale);
    case "org_admin":
      return getOrgAdminSidebarItems(locale);
    default:
      return getDefaultSidebarItems(locale);
  }
};

// Export par défaut pour compatibilité
export const sidebarItems = getDefaultSidebarItems();

// Ré-export des fonctions pour faciliter l'import
export { getSystemAdminSidebarItems } from "./system-admin-items";
export { getOrgAdminSidebarItems } from "./org-admin-items";
export { getDefaultSidebarItems } from "./default-items";

import { BarChart3, Building2, HeadphonesIcon, Home, Users } from "lucide-react";

import { type NavGroup } from "./sidebar-items";

export const getCommercialSidebarItems = (locale?: string): NavGroup[] => {
  const baseUrl = locale ? `/${locale}` : "";

  return [
    {
      id: 1,
      label: "Tableau de bord",
      items: [
        {
          title: "Vue d'ensemble",
          url: `${baseUrl}/commercial`,
          icon: Home,
        },
        {
          title: "Statistiques",
          url: `${baseUrl}/commercial/analytics`,
          icon: BarChart3,
          comingSoon: true,
        },
      ],
    },
    {
      id: 2,
      label: "Mes clients",
      items: [
        {
          title: "Organisations",
          url: `${baseUrl}/commercial/organizations`,
          icon: Building2,
        },
        {
          title: "Utilisateurs",
          url: `${baseUrl}/commercial/users`,
          icon: Users,
          comingSoon: true,
        },
      ],
    },
    {
      id: 3,
      label: "Support",
      items: [
        {
          title: "Tickets support",
          url: `${baseUrl}/commercial/support`,
          icon: HeadphonesIcon,
          comingSoon: true,
        },
      ],
    },
  ];
};

import { Home, Settings, HelpCircle, User } from "lucide-react";

import { type NavGroup } from "./sidebar-items";

export const getDefaultSidebarItems = (locale?: string): NavGroup[] => {
  const baseUrl = locale ? `/${locale}` : "";

  return [
    {
      id: 1,
      label: "Navigation",
      items: [
        {
          title: "Accueil",
          url: `${baseUrl}/dashboard`,
          icon: Home,
        },
        {
          title: "Profil",
          url: `${baseUrl}/dashboard/profile`,
          icon: User,
        },
        {
          title: "Paramètres",
          url: `${baseUrl}/dashboard/settings`,
          icon: Settings,
        },
        {
          title: "Aide",
          url: `${baseUrl}/dashboard/help`,
          icon: HelpCircle,
        },
      ],
    },
  ];
};

import { CalendarDays, HelpCircle } from "lucide-react";

import { type NavGroup } from "./sidebar-items";

export const getEmployeeSidebarItems = (locale?: string, establishmentId?: string | null): NavGroup[] => {
  const baseUrl = locale ? `/${locale}` : "";
  const est = establishmentId ? `${baseUrl}/dashboard/establishments/${establishmentId}` : null;
  const fallback = `${baseUrl}/dashboard/establishments`;
  const u = (path: string): string => (est !== null ? `${est}/${path}` : fallback);

  return [
    {
      id: 1,
      label: "Planning",
      items: [
        {
          title: "Mon planning",
          url: u("planning"),
          icon: CalendarDays,
        },
      ],
    },
    {
      id: 2,
      label: "Support",
      items: [
        {
          title: "Aide",
          url: `${baseUrl}/dashboard/support`,
          icon: HelpCircle,
        },
      ],
    },
  ];
};

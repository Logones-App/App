import {
  BarChart3,
  Building2,
  Calendar,
  CheckSquare,
  FileText,
  Flag,
  HeadphonesIcon,
  Home,
  Package,
  Receipt,
  RefreshCw,
  Target,
  Users,
} from "lucide-react";

import { type NavGroup } from "./sidebar-items";

export const getCommercialSidebarItems = (locale?: string): NavGroup[] => {
  const baseUrl = locale ? `/${locale}` : "";

  return [
    {
      id: 1,
      label: "Tableau de bord",
      items: [
        { title: "Vue d'ensemble", url: `${baseUrl}/commercial`, icon: Home },
        { title: "Rapports", url: `${baseUrl}/commercial/rapports`, icon: BarChart3 },
      ],
    },
    {
      id: 2,
      label: "Prospection",
      items: [
        { title: "Leads", url: `${baseUrl}/commercial/leads`, icon: Target },
        { title: "Calendrier", url: `${baseUrl}/commercial/calendrier`, icon: Calendar },
      ],
    },
    {
      id: 3,
      label: "Ventes",
      items: [
        { title: "Devis", url: `${baseUrl}/commercial/devis`, icon: FileText },
        { title: "Pré-facturation", url: `${baseUrl}/commercial/pre-facturation`, icon: Receipt },
        { title: "Catalogue produits", url: `${baseUrl}/commercial/produits`, icon: Package },
      ],
    },
    {
      id: 4,
      label: "Clients",
      items: [
        { title: "Organisations", url: `${baseUrl}/commercial/organizations`, icon: Building2 },
        { title: "Abonnements", url: `${baseUrl}/commercial/abonnements`, icon: RefreshCw },
        { title: "Onboarding", url: `${baseUrl}/commercial/onboarding`, icon: CheckSquare },
        { title: "Utilisateurs", url: `${baseUrl}/commercial/users`, icon: Users, comingSoon: true },
      ],
    },
    {
      id: 5,
      label: "Pilotage",
      items: [
        { title: "Objectifs", url: `${baseUrl}/commercial/objectifs`, icon: Flag, comingSoon: true },
        { title: "Support", url: `${baseUrl}/commercial/support`, icon: HeadphonesIcon, comingSoon: true },
      ],
    },
  ];
};

import {
  Home,
  Building2,
  Utensils,
  Calendar,
  Users,
  BarChart3,
  Settings,
  Bell,
  HelpCircle,
  FileText,
  ShoppingCart,
  Clock,
} from "lucide-react";

import { type NavGroup } from "./sidebar-items";

export const getOrgAdminSidebarItems = (locale?: string): NavGroup[] => {
  const baseUrl = locale ? `/${locale}` : "";

  return [
    {
      id: 1,
      label: "Tableau de bord",
      items: [
        {
          title: "Vue d'ensemble",
          url: `${baseUrl}/dashboard`,
          icon: Home,
        },
        {
          title: "Statistiques",
          url: `${baseUrl}/dashboard/analytics`,
          icon: BarChart3,
        },
        {
          title: "Activité récente",
          url: `${baseUrl}/dashboard/activity`,
          icon: Clock,
        },
      ],
    },
    {
      id: 2,
      label: "Gestion restaurant",
      items: [
        {
          title: "Établissements",
          url: `${baseUrl}/dashboard/establishments`,
          icon: Building2,
          subItems: [
            {
              title: "Mes établissements",
              url: `${baseUrl}/dashboard/establishments`,
            },
            {
              title: "Nouvel établissement",
              url: `${baseUrl}/dashboard/establishments/new`,
            },
            {
              title: "Paramètres",
              url: `${baseUrl}/dashboard/establishments/settings`,
            },
          ],
        },
        {
          title: "Menus",
          url: `${baseUrl}/dashboard/menus`,
          icon: Utensils,
          subItems: [
            {
              title: "Tous les menus",
              url: `${baseUrl}/dashboard/menus`,
            },
            {
              title: "Nouveau menu",
              url: `${baseUrl}/dashboard/menus/new`,
            },
            {
              title: "Catégories",
              url: `${baseUrl}/dashboard/menus/categories`,
            },
            {
              title: "Ingrédients",
              url: `${baseUrl}/dashboard/menus/ingredients`,
            },
          ],
        },
        {
          title: "Réservations",
          url: `${baseUrl}/dashboard/reservations`,
          icon: Calendar,
          subItems: [
            {
              title: "Calendrier",
              url: `${baseUrl}/dashboard/reservations/calendar`,
            },
            {
              title: "Liste des réservations",
              url: `${baseUrl}/dashboard/reservations/list`,
            },
            {
              title: "Nouvelle réservation",
              url: `${baseUrl}/dashboard/reservations/new`,
            },
            {
              title: "Paramètres",
              url: `${baseUrl}/dashboard/reservations/settings`,
            },
          ],
        },
        {
          title: "Commandes",
          url: `${baseUrl}/dashboard/orders`,
          icon: ShoppingCart,
          subItems: [
            {
              title: "Commandes en cours",
              url: `${baseUrl}/dashboard/orders/pending`,
            },
            {
              title: "Historique",
              url: `${baseUrl}/dashboard/orders/history`,
            },
            {
              title: "Statistiques",
              url: `${baseUrl}/dashboard/orders/analytics`,
            },
          ],
        },
      ],
    },
    {
      id: 3,
      label: "Gestion équipe",
      items: [
        {
          title: "Équipe",
          url: `${baseUrl}/dashboard/team`,
          icon: Users,
          subItems: [
            {
              title: "Membres de l'équipe",
              url: `${baseUrl}/dashboard/team/members`,
            },
            {
              title: "Inviter un membre",
              url: `${baseUrl}/dashboard/team/invite`,
            },
            {
              title: "Rôles et permissions",
              url: `${baseUrl}/dashboard/team/roles`,
            },
            {
              title: "Planning",
              url: `${baseUrl}/dashboard/team/schedule`,
            },
          ],
        },
        {
          title: "Formation",
          url: `${baseUrl}/dashboard/training`,
          icon: FileText,
          subItems: [
            {
              title: "Modules de formation",
              url: `${baseUrl}/dashboard/training/modules`,
            },
            {
              title: "Suivi des progrès",
              url: `${baseUrl}/dashboard/training/progress`,
            },
            {
              title: "Certifications",
              url: `${baseUrl}/dashboard/training/certifications`,
            },
          ],
        },
      ],
    },
    {
      id: 4,
      label: "Configuration",
      items: [
        {
          title: "Paramètres",
          url: `${baseUrl}/dashboard/settings`,
          icon: Settings,
          subItems: [
            {
              title: "Profil organisation",
              url: `${baseUrl}/dashboard/settings/profile`,
            },
            {
              title: "Préférences",
              url: `${baseUrl}/dashboard/settings/preferences`,
            },
            {
              title: "Notifications",
              url: `${baseUrl}/dashboard/settings/notifications`,
            },
            {
              title: "Intégrations",
              url: `${baseUrl}/dashboard/settings/integrations`,
            },
            {
              title: "Facturation",
              url: `${baseUrl}/dashboard/settings/billing`,
            },
          ],
        },
        {
          title: "Notifications",
          url: `${baseUrl}/dashboard/notifications`,
          icon: Bell,
        },
        {
          title: "Aide et support",
          url: `${baseUrl}/dashboard/support`,
          icon: HelpCircle,
        },
      ],
    },
  ];
};

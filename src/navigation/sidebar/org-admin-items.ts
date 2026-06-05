import {
  Home,
  Building2,
  Truck,
  Utensils,
  Calendar,
  Users,
  BarChart3,
  Settings,
  Bell,
  HelpCircle,
  ShoppingBag,
  Clock,
  Package,
  Monitor,
  Image,
  MapPin,
  Wrench,
  GraduationCap,
  CalendarDays,
  SlidersHorizontal,
  FileText,
  BookOpen,
  FolderOpen,
  UserCheck,
  ClipboardList,
  Receipt,
  KeyRound,
  LayoutGrid,
} from "lucide-react";

import { type NavGroup } from "./sidebar-items";

export const getOrgAdminSidebarItems = (
  locale?: string,
  establishmentId?: string | null,
  organizationId?: string | null,
): NavGroup[] => {
  const baseUrl = locale ? `/${locale}` : "";
  void organizationId; // réservé pour usage futur (multi-orga)
  // Base de l'établissement actif — null si aucun sélectionné
  const est = establishmentId ? `${baseUrl}/dashboard/establishments/${establishmentId}` : null;

  return [
    // ─── Tableau de bord ──────────────────────────────────────────────────────
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
      ],
    },

    // ─── Gestion restaurant (lié à l'établissement actif) ─────────────────────
    {
      id: 3,
      label: "Gestion restaurant",
      items: est
        ? [
            {
              title: "Produits",
              url: `${est}/products`,
              icon: Package,
              subItems: [
                { title: "Catalogue", url: `${est}/products` },
                { title: "Nouveau produit", url: `${est}/products/new` },
                { title: "Options produits", url: `${est}/options`, icon: SlidersHorizontal },
              ],
            },
            {
              title: "Menus",
              url: `${est}/menus`,
              icon: Utensils,
            },
            {
              title: "Réservations",
              url: `${est}/bookings`,
              icon: Calendar,
            },
            {
              title: "Commandes POS",
              url: `${est}/orders`,
              icon: ShoppingBag,
            },
            {
              title: "Rapport journalier",
              url: `${est}/daily-report`,
              icon: BarChart3,
            },
            {
              title: "Horaires",
              url: `${est}/opening-hours`,
              icon: Clock,
            },
            {
              title: "Planning",
              url: `${est}/planning`,
              icon: CalendarDays,
              subItems: [
                { title: "Vue semaine", url: `${est}/planning` },
                { title: "Modèles de créneaux", url: `${est}/planning-templates` },
              ],
            },
            {
              title: "Galerie",
              url: `${est}/gallery`,
              icon: Image,
            },
            {
              title: "Site & domaines",
              url: `${est}/site-configuration`,
              icon: MapPin,
            },
            {
              title: "Stocks",
              url: `${est}/products`,
              icon: Wrench,
            },
            {
              title: "Documents",
              url: `${est}/documents`,
              icon: FileText,
            },
          ]
        : [
            {
              title: "← Sélectionnez un établissement",
              url: `${baseUrl}/dashboard/establishments`,
              icon: Building2,
              comingSoon: false,
            },
          ],
    },

    // ─── Catalogue organisation (transversal) ─────────────────────────────────
    {
      id: 4,
      label: "Catalogue",
      items: [
        {
          title: "Tous les établissements",
          url: `${baseUrl}/dashboard/establishments`,
          icon: Building2,
        },
        {
          title: "Fournisseurs",
          url: `${baseUrl}/dashboard/suppliers`,
          icon: Truck,
        },
        {
          title: "Catalogue achats",
          url: `${baseUrl}/dashboard/catalog-achats`,
          icon: BookOpen,
        },
      ],
    },

    // ─── Ressources Humaines ──────────────────────────────────────────────────
    {
      id: 5,
      label: "Ressources Humaines",
      items: [
        {
          title: "Employés",
          url: `${baseUrl}/dashboard/rh/employees`,
          icon: Users,
        },
        {
          title: "Planning",
          url: est ? `${est}/planning` : `${baseUrl}/dashboard/establishments`,
          icon: CalendarDays,
        },
        {
          title: "Absences",
          url: `${baseUrl}/dashboard/rh/absences`,
          icon: UserCheck,
        },
        {
          title: "Fiches mensuelles",
          url: `${baseUrl}/dashboard/rh/monthly-reports`,
          icon: Receipt,
        },
        {
          title: "Documents RH",
          url: `${baseUrl}/dashboard/rh/documents`,
          icon: FolderOpen,
        },
      ],
    },

    // ─── Gestion équipe (appareils & accès) ───────────────────────────────────
    {
      id: 7,
      label: "Gestion équipe",
      items: est
        ? [
            {
              title: "Appareils",
              url: `${est}/devices`,
              icon: Monitor,
            },
            {
              title: "Modules",
              url: `${est}/modules`,
              icon: LayoutGrid,
            },
            {
              title: "Accès & Permissions",
              url: `${est}/employee-access`,
              icon: KeyRound,
            },
            {
              title: "Permissions (ancien)",
              url: `${est}/mobile-user-permissions`,
              icon: ClipboardList,
            },
            {
              title: "Formation",
              url: `${baseUrl}/dashboard/training`,
              icon: GraduationCap,
            },
          ]
        : [
            {
              title: "← Sélectionnez un établissement",
              url: `${baseUrl}/dashboard/establishments`,
              icon: Building2,
            },
          ],
    },

    // ─── Configuration ─────────────────────────────────────────────────────────
    {
      id: 6,
      label: "Configuration",
      items: [
        {
          title: "Mon abonnement",
          url: `${baseUrl}/dashboard/organization-modules`,
          icon: LayoutGrid,
        },
        {
          title: "Paramètres",
          url: `${baseUrl}/dashboard/settings`,
          icon: Settings,
        },
        {
          title: "Notifications",
          url: `${baseUrl}/dashboard/notifications`,
          icon: Bell,
        },
        {
          title: "Aide",
          url: `${baseUrl}/dashboard/support`,
          icon: HelpCircle,
        },
      ],
    },
  ];
};

import {
  Home,
  Building2,
  Truck,
  Calendar,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  ShoppingBag,
  Package,
  Monitor,
  Image,
  MapPin,
  CalendarDays,
  KeyRound,
  LayoutGrid,
  CreditCard,
  Warehouse,
  ClipboardCheck,
  BookMarked,
  Thermometer,
  PackageCheck,
  AlertTriangle,
  ShieldAlert,
  ListChecks,
  Tag,
  GraduationCap,
} from "lucide-react";

import { type NavGroup } from "./sidebar-items";

export const getOrgAdminSidebarItems = (
  locale?: string,
  establishmentId?: string | null,
  organizationId?: string | null,
): NavGroup[] => {
  const baseUrl = locale ? `/${locale}` : "";
  void organizationId;
  const est = establishmentId ? `${baseUrl}/dashboard/establishments/${establishmentId}` : null;
  const fallback = `${baseUrl}/dashboard/establishments`;
  const u = (path: string): string => (est !== null ? `${est}/${path}` : fallback);

  return [
    // ─── Tableau de bord (avant le switcher) ──────────────────────────────────
    {
      id: 1,
      label: "Tableau de bord",
      items: [
        {
          title: "Vue d'ensemble",
          url: `${baseUrl}/dashboard`,
          icon: Home,
        },
      ],
    },

    // ─── Caisse ───────────────────────────────────────────────────────────────
    {
      id: 2,
      label: "Caisse",
      labelUrl: u("caisse"),
      items: [
        { title: "Dashboard", url: u("caisse"), icon: CreditCard },
        { title: "Commandes POS", url: u("orders"), icon: ShoppingBag },
        { title: "Rapport journalier", url: u("daily-report"), icon: BarChart3 },
        { title: "Appareils", url: u("devices"), icon: Monitor },
      ],
    },

    // ─── Réservations ─────────────────────────────────────────────────────────
    {
      id: 3,
      label: "Réservations",
      labelUrl: u("reservations"),
      items: [
        { title: "Dashboard", url: u("reservations"), icon: Calendar },
        {
          title: "Réservations",
          url: u("bookings"),
          icon: BookMarked,
          subItems: [
            { title: "Liste réservations", url: u("bookings") },
            { title: "Exceptions", url: u("booking-exceptions") },
          ],
        },
        {
          title: "Configuration",
          url: u("opening-hours"),
          icon: Settings,
          subItems: [
            { title: "Horaires", url: u("opening-hours") },
            { title: "Créneaux", url: u("slots") },
          ],
        },
      ],
    },

    // ─── RH ───────────────────────────────────────────────────────────────────
    {
      id: 4,
      label: "RH",
      labelUrl: u("rh"),
      items: [
        { title: "Dashboard", url: u("rh"), icon: Users },
        {
          title: "Planning",
          url: u("planning"),
          icon: CalendarDays,
          subItems: [
            { title: "Planning", url: u("planning") },
            { title: "Modèles créneaux", url: u("planning-templates") },
          ],
        },
        {
          title: "Équipe",
          url: `${baseUrl}/dashboard/rh/employees`,
          icon: Users,
          subItems: [
            { title: "Employés", url: `${baseUrl}/dashboard/rh/employees` },
            { title: "Absences", url: `${baseUrl}/dashboard/rh/absences` },
            { title: "Fiches mensuelles", url: `${baseUrl}/dashboard/rh/monthly-reports` },
            { title: "Documents RH", url: `${baseUrl}/dashboard/rh/documents` },
          ],
        },
        { title: "Accès & permissions", url: u("employee-access"), icon: KeyRound },
      ],
    },

    // ─── Stock ────────────────────────────────────────────────────────────────
    {
      id: 5,
      label: "Stock",
      labelUrl: u("stock"),
      items: [
        { title: "Dashboard", url: u("stock"), icon: Warehouse },
        {
          title: "Catalogue",
          url: u("products"),
          icon: Package,
          subItems: [
            { title: "Produits", url: u("products") },
            { title: "Options", url: u("options") },
            { title: "Menus", url: u("menus") },
          ],
        },
        {
          title: "Achats",
          url: `${baseUrl}/dashboard/suppliers`,
          icon: Truck,
          subItems: [
            { title: "Fournisseurs", url: `${baseUrl}/dashboard/suppliers` },
            { title: "Catalogue achats", url: `${baseUrl}/dashboard/catalog-achats` },
            { title: "Documents achats", url: u("documents") },
          ],
        },
      ],
    },

    // ─── HACCP ────────────────────────────────────────────────────────────────
    {
      id: 6,
      label: "HACCP",
      labelUrl: u("haccp"),
      items: [
        { title: "Dashboard", url: u("haccp"), icon: ClipboardCheck },
        {
          title: "Contrôles",
          url: u("haccp/temperatures"),
          icon: Thermometer,
          subItems: [
            { title: "Températures équipements", url: u("haccp/temperatures") },
            { title: "Températures produit", url: u("haccp/temperatures-produit") },
            { title: "Nettoyage", url: u("haccp/nettoyage") },
            { title: "Checklists", url: u("haccp/checklists") },
            { title: "Huiles", url: u("haccp/huiles") },
          ],
        },
        {
          title: "Réceptions & Traçabilité",
          url: u("haccp/receptions"),
          icon: PackageCheck,
          subItems: [
            { title: "Réceptions", url: u("haccp/receptions") },
            { title: "Traçabilité", url: u("haccp/tracabilite") },
          ],
        },
        { title: "Non-conformités", url: u("haccp/non-conformites"), icon: AlertTriangle },
        { title: "Allergènes", url: u("haccp/allergenes"), icon: ShieldAlert },
        {
          title: "Ressources",
          url: u("haccp/employes"),
          icon: GraduationCap,
          subItems: [
            { title: "Employés & formations", url: u("haccp/employes") },
            { title: "Fournisseurs", url: u("haccp/fournisseurs") },
            { title: "Documents HACCP", url: u("haccp/documents") },
          ],
        },
        { title: "Étiqueteuse DLC", url: u("haccp/etiqueteuse"), icon: Tag },
        { title: "Planning des tâches", url: u("haccp/planning"), icon: ListChecks },
      ],
    },

    // ─── Reporting ────────────────────────────────────────────────────────────
    {
      id: 8,
      label: "Reporting",
      labelUrl: u("reporting"),
      items: [{ title: "FIFO & Food cost", url: u("reporting"), icon: BarChart3 }],
    },

    // ─── Configuration ────────────────────────────────────────────────────────
    {
      id: 7,
      label: "Configuration",
      items: [
        {
          title: "Établissements",
          url: fallback,
          icon: Building2,
        },
        ...(est
          ? [
              { title: "Fiche établissement", url: est, icon: Building2 },
              { title: "Galerie", url: `${est}/gallery`, icon: Image },
              { title: "Site & domaines", url: `${est}/site-configuration`, icon: MapPin },
              { title: "Modules activés", url: `${est}/modules`, icon: LayoutGrid },
            ]
          : []),
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
          title: "Aide",
          url: `${baseUrl}/dashboard/support`,
          icon: HelpCircle,
        },
      ],
    },
  ];
};

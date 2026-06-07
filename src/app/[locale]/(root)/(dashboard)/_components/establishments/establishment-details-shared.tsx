"use client";

import { usePathname } from "next/navigation";

import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  Clock,
  FileText,
  Image,
  KeyRound,
  LayoutGrid,
  MapPin,
  Monitor,
  Package,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Tag,
  Users,
  Utensils,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCodeDialog } from "@/components/ui/qr-code-dialog";
import { Link } from "@/i18n/navigation";
import { useEstablishment } from "@/lib/queries/establishments";
import { cn } from "@/lib/utils";

// ─── Config ───────────────────────────────────────────────────────────────────

type SectionItem = {
  label: string;
  section: string;
  icon: React.ElementType;
  description: string;
};

type SectionGroup = {
  key: string;
  label: string;
  icon: React.ElementType;
  items: SectionItem[];
};

const SECTION_GROUPS: SectionGroup[] = [
  {
    key: "catalogue",
    label: "Catalogue",
    icon: Utensils,
    items: [
      { label: "Produits", section: "products", icon: Package, description: "Fiches produit, stocks, prix" },
      { label: "Menus", section: "menus", icon: Utensils, description: "Grilles POS et menus actifs" },
      { label: "Catégories", section: "categories", icon: Tag, description: "Groupements et imprimantes" },
      {
        label: "Options produits",
        section: "options",
        icon: SlidersHorizontal,
        description: "Modificateurs et suppléments",
      },
      { label: "Carte publique", section: "carte-publique", icon: BookOpen, description: "Menu numérique client" },
    ],
  },
  {
    key: "service",
    label: "Service",
    icon: Calendar,
    items: [
      { label: "Réservations", section: "bookings", icon: Calendar, description: "Gestion des réservations" },
      { label: "Créneaux", section: "slots", icon: CalendarRange, description: "Créneaux et capacités" },
      { label: "Commandes POS", section: "orders", icon: ShoppingBag, description: "Historique des commandes" },
      { label: "Rapport journalier", section: "daily-report", icon: BarChart3, description: "Bilan de caisse du jour" },
    ],
  },
  {
    key: "equipe",
    label: "Équipe",
    icon: Users,
    items: [
      { label: "Planning", section: "planning", icon: CalendarDays, description: "Shifts et créneaux équipe" },
      { label: "Appareils", section: "devices", icon: Monitor, description: "Terminaux POS et postes" },
      { label: "Modules", section: "modules", icon: LayoutGrid, description: "Activation des fonctions" },
      { label: "Accès employés", section: "employee-access", icon: KeyRound, description: "Droits et permissions" },
    ],
  },
  {
    key: "config",
    label: "Configuration",
    icon: Settings,
    items: [
      { label: "Horaires d'ouverture", section: "opening-hours", icon: Clock, description: "Jours et plages horaires" },
      { label: "Galerie photo", section: "gallery", icon: Image, description: "Photos de l'établissement" },
      {
        label: "Site & domaine",
        section: "site-configuration",
        icon: MapPin,
        description: "Site web et domaine custom",
      },
      { label: "Documents", section: "documents", icon: FileText, description: "Documents et contrats" },
    ],
  },
];

// ─── SectionRow ───────────────────────────────────────────────────────────────

function SectionRow({ item, href, active }: { item: SectionItem; href: string; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 px-4 py-3 transition-colors",
        active ? "bg-primary/5" : "hover:bg-muted/50",
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
          active
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", active && "text-primary")}>{item.label}</p>
        <p className="text-muted-foreground truncate text-xs">{item.description}</p>
      </div>
      <ChevronRight
        className={cn(
          "h-4 w-4 shrink-0 transition-all",
          active ? "text-primary" : "text-muted-foreground opacity-0 group-hover:opacity-100",
        )}
      />
    </Link>
  );
}

// ─── GroupCard ────────────────────────────────────────────────────────────────

function GroupCard({
  group,
  getLink,
  activeSection,
}: {
  group: SectionGroup;
  getLink: (s: string) => string;
  activeSection: string;
}) {
  const Icon = group.icon;
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30 border-b px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="text-muted-foreground h-4 w-4" />
          {group.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {group.items.map((item) => (
          <SectionRow
            key={item.section}
            item={item}
            href={getLink(item.section)}
            active={activeSection === item.section}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// ─── EstablishmentDetailsShared ───────────────────────────────────────────────

export function EstablishmentDetailsShared({
  establishmentId,
  organizationId,
}: {
  establishmentId: string;
  organizationId: string;
}) {
  const { data: establishment, isLoading, error } = useEstablishment(establishmentId);
  const pathname = usePathname();

  const isSystemAdmin = pathname.includes("/admin/organizations/");

  const getLink = (section: string) =>
    isSystemAdmin
      ? `/admin/organizations/${organizationId}/establishments/${establishmentId}/${section}`
      : `/dashboard/establishments/${establishmentId}/${section}`;

  const backHref = isSystemAdmin
    ? `/admin/organizations/${organizationId}/establishments`
    : `/dashboard/establishments`;

  const activeSection = pathname.split(`/${establishmentId}/`)[1]?.split("/")[0] ?? "";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="bg-muted h-24 animate-pulse rounded-xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-muted h-48 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error ?? !establishment) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Building2 className="h-4 w-4" />
        <span className="text-destructive">Établissement introuvable.</span>
      </div>
    );
  }

  const initial = establishment.name.charAt(0).toUpperCase();

  return (
    <div className="space-y-5">
      {/* ── Breadcrumb ── */}
      <nav className="text-muted-foreground flex items-center gap-1.5 text-sm">
        <Link href={backHref} className="hover:text-foreground transition-colors">
          Établissements
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{establishment.name}</span>
      </nav>

      {/* ── Hero card ── */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold">
              {initial}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg leading-tight font-bold">{establishment.name}</h1>
                <Badge variant={establishment.deleted ? "destructive" : "default"} className="text-xs">
                  {establishment.deleted ? "Supprimé" : "Actif"}
                </Badge>
              </div>
              {(establishment.address ?? establishment.description) && (
                <p className="text-muted-foreground mt-0.5 text-sm">
                  {establishment.address ?? establishment.description}
                </p>
              )}
              {establishment.slug && (
                <p className="text-muted-foreground/70 mt-0.5 font-mono text-xs">{establishment.slug}</p>
              )}
            </div>
          </div>

          {establishment.slug && (
            <div className="shrink-0">
              <QrCodeDialog
                url={`${typeof window !== "undefined" ? window.location.origin : ""}/fr/${establishment.slug}/menu`}
                label="QR Code"
                description={`Carte numérique de ${establishment.name}`}
              />
            </div>
          )}
        </div>
      </Card>

      {/* ── Groupes ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SECTION_GROUPS.map((group) => (
          <GroupCard key={group.key} group={group} getLink={getLink} activeSection={activeSection} />
        ))}
      </div>
    </div>
  );
}

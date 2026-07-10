import React from "react";

import Link from "next/link";

import {
  AlertTriangle,
  ChevronRight,
  Droplets,
  ListChecks,
  PackageCheck,
  Route,
  Smartphone,
  Sparkles,
  Tag,
  Thermometer,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import { NcOpenKpiCard, NcRecentCard } from "./_components/nc-dashboard";
import { RecentCleaning, RecentTemperatures } from "./_components/registers-recent";
import { TasksTodayKpiCard } from "./_components/tasks-today-kpi";

const SECTIONS = [
  { label: "Températures", href: "haccp/temperatures", icon: Thermometer },
  { label: "T° produit à cœur", href: "haccp/temperatures-produit", icon: Thermometer },
  { label: "Huiles", href: "haccp/huiles", icon: Droplets },
  { label: "Nettoyage", href: "haccp/nettoyage", icon: Sparkles },
  { label: "Réceptions", href: "haccp/receptions", icon: PackageCheck },
  { label: "Traçabilité", href: "haccp/tracabilite", icon: Route },
  { label: "Étiquettes DLC", href: "haccp/etiqueteuse", icon: Tag },
  { label: "Checklists", href: "haccp/checklists", icon: ListChecks },
  { label: "Non-conformités", href: "haccp/non-conformites", icon: AlertTriangle },
];

export default function HaccpPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = React.use(params);
  const base = `/${locale}/dashboard/establishments/${id}`;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">HACCP</h1>
          <p className="text-muted-foreground text-sm">Plan de maîtrise sanitaire</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
          <Smartphone className="h-3.5 w-3.5" />
          Saisies terrain via l&apos;app mobile
        </div>
      </div>

      {/* KPI temps réel */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NcOpenKpiCard establishmentId={id} />
        <TasksTodayKpiCard establishmentId={id} base={base} />
      </div>

      {/* Accès aux registres */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link key={s.label} href={`${base}/${s.href}`}>
            <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
              <CardContent className="flex items-center gap-2 py-4">
                <s.icon className="text-muted-foreground h-4 w-4 shrink-0" />
                <span className="text-sm font-semibold">{s.label}</span>
                <ChevronRight className="text-muted-foreground ml-auto h-4 w-4" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentTemperatures establishmentId={id} base={base} />
        <RecentCleaning establishmentId={id} base={base} />
      </div>

      <NcRecentCard establishmentId={id} base={base} />
    </div>
  );
}

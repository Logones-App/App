import React from "react";

import Link from "next/link";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  PackageCheck,
  Smartphone,
  Sparkles,
  Thermometer,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { NcOpenKpiCard, NcRecentCard } from "./_components/nc-dashboard";

const KpiCard = ({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) => (
  <Card className={alert ? "border-red-200 bg-red-50" : ""}>
    <CardHeader className="pb-2">
      <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className={`text-2xl font-bold ${alert ? "text-red-600" : ""}`}>{value}</p>
      {sub && <p className="text-muted-foreground mt-1 text-xs">{sub}</p>}
    </CardContent>
  </Card>
);

const RELEVES_JOUR = [
  { zone: "Chambre froide positive", heure: "07:00", temp: "3,2 °C", limite: "0–4 °C", statut: "ok" },
  { zone: "Chambre froide positive", heure: "13:00", temp: "4,1 °C", limite: "0–4 °C", statut: "alerte" },
  { zone: "Chambre froide négative", heure: "07:00", temp: "-18,5 °C", limite: "< -18 °C", statut: "ok" },
  { zone: "Chambre froide négative", heure: "13:00", temp: "—", limite: "< -18 °C", statut: "manquant" },
  { zone: "Plonge", heure: "12:30", temp: "82 °C", limite: "> 80 °C", statut: "ok" },
  { zone: "Bain-marie sauces", heure: "12:00", temp: "63 °C", limite: "> 63 °C", statut: "ok" },
];

const SECTIONS = [
  { label: "Températures", href: "haccp/temperatures", icon: Thermometer, ok: 4, total: 6 },
  { label: "Réceptions", href: "haccp/receptions", icon: PackageCheck, ok: 3, total: 3 },
  { label: "Nettoyage", href: "haccp/nettoyage", icon: Sparkles, ok: 2, total: 5 },
  { label: "Non-conformités", href: "haccp/non-conformites", icon: AlertTriangle, ok: 0, total: 1 },
];

const statutBadge: Record<string, "default" | "secondary" | "destructive"> = {
  ok: "default",
  alerte: "destructive",
  manquant: "secondary",
};

export default function HaccpPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = React.use(params);
  const base = `/${locale}/dashboard/establishments/${id}`;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">HACCP</h1>
          <p className="text-muted-foreground text-sm">Plan de maîtrise sanitaire · lundi 22 juin 2026</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
          <Smartphone className="h-3.5 w-3.5" />
          Saisies terrain via l&apos;app mobile
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Contrôles du jour" value="5 / 6" sub="1 relevé manquant" />
        <KpiCard label="Conformité du jour" value="83 %" sub="1 alerte température" alert />
        <NcOpenKpiCard establishmentId={id} />
        <KpiCard label="Prochaine échéance" value="19:00" sub="Relevé soir — chambre froide" />
      </div>

      {/* Vue d'ensemble sections */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map((s) => (
          <Link key={s.label} href={`${base}/${s.href}`}>
            <Card className="cursor-pointer transition-colors hover:bg-gray-50">
              <CardContent className="pt-4">
                <div className="mb-3 flex items-center gap-2">
                  <s.icon className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm font-semibold">{s.label}</span>
                  <ChevronRight className="text-muted-foreground ml-auto h-4 w-4" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{s.ok}</span>
                  <span className="text-muted-foreground text-sm">/ {s.total}</span>
                </div>
                <p className="text-muted-foreground text-xs">conformes aujourd&apos;hui</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Relevés du jour */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Relevés de température du jour</CardTitle>
          <Link href={`${base}/haccp/temperatures`} className="text-primary text-xs hover:underline">
            Voir tout →
          </Link>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {RELEVES_JOUR.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground w-10 font-mono text-xs">{r.heure}</span>
                  <div>
                    <p className="font-medium">{r.zone}</p>
                    <p className="text-muted-foreground text-xs">Limite : {r.limite}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold">{r.temp}</span>
                  <Badge variant={statutBadge[r.statut]}>{r.statut}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Non-conformités récentes (réelles) */}
      <NcRecentCard establishmentId={id} base={base} />

      {/* Checklist du jour nettoyage */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Plan de nettoyage — aujourd&apos;hui</CardTitle>
          <Link href={`${base}/haccp/nettoyage`} className="text-primary text-xs hover:underline">
            Voir tout →
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { zone: "Plan de travail cuisine", done: true, agent: "Marie D." },
            { zone: "Frigos (joints + clayettes)", done: true, agent: "Marie D." },
            { zone: "Sols cuisine + plonge", done: false, agent: null },
            { zone: "Hottes et filtres", done: false, agent: null },
            { zone: "WC personnel", done: false, agent: null },
          ].map((t, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              {t.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
              ) : (
                <div className="h-4 w-4 shrink-0 rounded-full border-2 border-gray-300" />
              )}
              <span className={t.done ? "text-muted-foreground line-through" : "font-medium"}>{t.zone}</span>
              {t.agent && <span className="text-muted-foreground ml-auto text-xs">{t.agent}</span>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

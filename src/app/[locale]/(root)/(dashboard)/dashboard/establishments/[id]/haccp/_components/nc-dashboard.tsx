"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type HaccpNonConformity,
  ncCategoryLabel,
  ncSeverityLabel,
  ncStatusLabel,
  useHaccpNcRealtime,
  useHaccpNonConformities,
} from "@/lib/queries/haccp-nc-queries";

const statusVariant = (s: string): "outline" | "default" | "secondary" =>
  s === "ouvert" ? "outline" : s === "en_cours" ? "default" : "secondary";
const severityVariant = (s: string): "destructive" | "default" | "secondary" =>
  s === "critique" ? "destructive" : s === "majeure" ? "default" : "secondary";
const isOpen = (nc: HaccpNonConformity) => nc.status !== "cloture";

/** KPI « Non-conformités ouvertes » alimenté en temps réel. */
export function NcOpenKpiCard({ establishmentId }: { establishmentId: string }) {
  useHaccpNcRealtime(establishmentId);
  const { data: ncs = [], isLoading } = useHaccpNonConformities(establishmentId);
  const open = ncs.filter(isOpen).length;
  const alert = open > 0;

  return (
    <Card className={alert ? "border-red-200 bg-red-50" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">Non-conformités ouvertes</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${alert ? "text-red-600" : ""}`}>{isLoading ? "…" : open}</p>
        <p className="text-muted-foreground mt-1 text-xs">{open === 0 ? "aucune à traiter" : "à traiter"}</p>
      </CardContent>
    </Card>
  );
}

/** Liste des non-conformités les plus récentes (réelles). */
export function NcRecentCard({ establishmentId, base }: { establishmentId: string; base: string }) {
  useHaccpNcRealtime(establishmentId);
  const { data: ncs = [], isLoading } = useHaccpNonConformities(establishmentId);
  const recent = ncs.slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Non-conformités récentes</CardTitle>
        <Link href={`${base}/haccp/non-conformites`} className="text-primary text-xs hover:underline">
          Voir tout →
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Chargement…</p>
        ) : recent.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune non-conformité enregistrée.</p>
        ) : (
          recent.map((nc) => (
            <div key={nc.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{nc.title ?? ncCategoryLabel(nc.category)}</p>
                <p className="text-muted-foreground truncate text-xs">{nc.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-muted-foreground text-xs">{nc.detected_at.slice(0, 10)}</span>
                <Badge variant={severityVariant(nc.severity)} className="text-xs">
                  {ncSeverityLabel(nc.severity)}
                </Badge>
                <Badge variant={statusVariant(nc.status)} className="text-xs">
                  {ncStatusLabel(nc.status)}
                </Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

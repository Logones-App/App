"use client";

import { useParams } from "next/navigation";

import { Loader2, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type HaccpLabel, fmtDate, useHaccpLabels } from "@/lib/queries/haccp-registers-queries";

type DlcStatus = "ok" | "attention" | "expire";
const dlcVariant = (s: DlcStatus): "default" | "secondary" | "destructive" =>
  s === "expire" ? "destructive" : s === "attention" ? "secondary" : "default";

function dlcInfo(useByIso: string | null): { status: DlcStatus; label: string } | null {
  if (!useByIso) return null;
  const days = Math.floor((new Date(useByIso).getTime() - Date.now()) / 86400000);
  if (days < 0) return { status: "expire", label: "expirée" };
  if (days <= 1) return { status: "attention", label: days === 0 ? "expire aujourd'hui" : "expire demain" };
  return { status: "ok", label: `J-${days}` };
}

function LabelRow({ l }: { l: HaccpLabel }) {
  const dlc = dlcInfo(l.use_by_at);
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{l.product_label}</span>
          {l.quantity_label && <span className="text-muted-foreground text-xs">{l.quantity_label}</span>}
          {l.allergens.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {l.allergens.length} allergène(s)
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Ouvert le {fmtDate(l.produced_at)}
          {l.use_by_at ? ` · DLC ${fmtDate(l.use_by_at)}` : ""}
          {l.recorded_by_label ? ` · ${l.recorded_by_label}` : ""}
        </p>
      </div>
      {dlc && <Badge variant={dlcVariant(dlc.status)}>{dlc.label}</Badge>}
    </div>
  );
}

export default function EtiqueteusePage() {
  const params = useParams();
  const establishmentId = params.id as string;

  const { data: labels = [], isLoading } = useHaccpLabels(establishmentId);
  const expired = labels.filter((l) => dlcInfo(l.use_by_at)?.status === "expire").length;

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Chargement…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Étiquettes DLC</h1>
          <p className="text-muted-foreground text-sm">
            {labels.length} étiquette{labels.length > 1 ? "s" : ""}
            {expired > 0 ? ` · ${expired} expirée${expired > 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
          <Smartphone className="h-3.5 w-3.5" />
          Étiquettes imprimées via l&apos;app mobile
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Étiquettes récentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {labels.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">Aucune étiquette enregistrée.</p>
          ) : (
            labels.map((l) => <LabelRow key={l.id} l={l} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}

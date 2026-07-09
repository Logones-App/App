"use client";

import { useParams } from "next/navigation";

import { Loader2, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type HaccpProductTempControl,
  fmtDate,
  fmtTime,
  useHaccpProductTempControls,
} from "@/lib/queries/haccp-registers-queries";

const CONTROL_LABELS: { value: string; label: string }[] = [
  { value: "cuisson", label: "Cuisson" },
  { value: "remise_en_chauffe", label: "Remise en chauffe" },
  { value: "maintien_chaud", label: "Maintien chaud" },
];
const controlLabel = (v: string) => CONTROL_LABELS.find((c) => c.value === v)?.label ?? v;
const fmtTemp = (v: number) => `${v.toLocaleString("fr-FR")} °C`;

function ControlRow({ c }: { c: HaccpProductTempControl }) {
  const alert = !c.conform;
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{c.product_label}</span>
          <Badge variant="outline" className="text-xs">
            {controlLabel(c.control_type)}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {fmtDate(c.measured_at)} {fmtTime(c.measured_at)}
          {c.min_temp_c != null ? ` · seuil ≥ ${c.min_temp_c.toLocaleString("fr-FR")} °C` : ""}
          {c.recorded_by_label ? ` · ${c.recorded_by_label}` : ""}
        </p>
        {c.corrective_action && (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Action : {c.corrective_action}</p>
        )}
        {c.note && <p className="text-muted-foreground mt-0.5 text-xs">{c.note}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`font-mono text-sm font-semibold ${alert ? "text-red-600" : ""}`}>
          {fmtTemp(c.temperature_c)}
        </span>
        <Badge variant={alert ? "destructive" : "default"}>{alert ? "non conforme" : "conforme"}</Badge>
      </div>
    </div>
  );
}

export default function TemperaturesProduitPage() {
  const params = useParams();
  const establishmentId = params.id as string;

  const { data: controls = [], isLoading } = useHaccpProductTempControls(establishmentId);
  const nonConform = controls.filter((c) => !c.conform).length;

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
          <h1 className="text-2xl font-bold">Température produit à cœur</h1>
          <p className="text-muted-foreground text-sm">
            Cuisson / remise en chauffe / maintien chaud · {controls.length} contrôle{controls.length > 1 ? "s" : ""}
            {nonConform > 0 ? ` · ${nonConform} non conforme${nonConform > 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
          <Smartphone className="h-3.5 w-3.5" />
          Contrôles saisis via l&apos;app mobile
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Historique des contrôles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {controls.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">Aucun contrôle enregistré.</p>
          ) : (
            controls.map((c) => <ControlRow key={c.id} c={c} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}

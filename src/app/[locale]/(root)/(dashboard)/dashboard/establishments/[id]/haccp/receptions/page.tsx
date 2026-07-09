"use client";

import { useParams } from "next/navigation";

import { Loader2, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type HaccpReception, fmtDate, fmtTime, useHaccpReceptions } from "@/lib/queries/haccp-registers-queries";

const itemsCount = (items: HaccpReception["items"]) => (Array.isArray(items) ? items.length : 0);

function ReceptionRow({ r }: { r: HaccpReception }) {
  const alert = !r.overall_conform;
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{r.supplier_label ?? "Fournisseur non renseigné"}</span>
          {r.bl_number && <span className="text-muted-foreground text-xs">BL {r.bl_number}</span>}
          {r.storage_types.map((s) => (
            <Badge key={s} variant="outline" className="text-xs">
              {s}
            </Badge>
          ))}
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {fmtDate(r.received_at)} {fmtTime(r.received_at)}
          {r.cold_temp_c != null ? ` · ${r.cold_temp_c.toLocaleString("fr-FR")} °C` : ""}
          {itemsCount(r.items) > 0 ? ` · ${itemsCount(r.items)} ligne(s)` : ""}
          {r.received_by_label ? ` · ${r.received_by_label}` : ""}
        </p>
        {r.reserve && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Réserve : {r.reserve}</p>}
      </div>
      <Badge variant={alert ? "destructive" : "default"}>{alert ? "réserve / NC" : "conforme"}</Badge>
    </div>
  );
}

export default function ReceptionsPage() {
  const params = useParams();
  const establishmentId = params.id as string;

  const { data: receptions = [], isLoading } = useHaccpReceptions(establishmentId);
  const nonConform = receptions.filter((r) => !r.overall_conform).length;

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
          <h1 className="text-2xl font-bold">Réceptions marchandises</h1>
          <p className="text-muted-foreground text-sm">
            {receptions.length} réception{receptions.length > 1 ? "s" : ""}
            {nonConform > 0 ? ` · ${nonConform} avec réserve/NC` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
          <Smartphone className="h-3.5 w-3.5" />
          Réceptions saisies via l&apos;app mobile
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Historique des réceptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {receptions.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">Aucune réception enregistrée.</p>
          ) : (
            receptions.map((r) => <ReceptionRow key={r.id} r={r} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}

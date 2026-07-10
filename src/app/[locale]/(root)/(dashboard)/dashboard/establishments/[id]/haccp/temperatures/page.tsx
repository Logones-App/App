"use client";

import { useParams } from "next/navigation";

import { Loader2, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type HaccpProbe, useHaccpProbes, useHaccpZones } from "@/lib/queries/haccp-config-queries";
import {
  type HaccpTemperatureReading,
  type TempStatus,
  formatTemperatureTarget,
  temperatureStatus,
  useHaccpTemperatureReadings,
} from "@/lib/queries/haccp-registers-queries";

import { TemperatureCadence } from "./_components/temperature-cadence";

const statBadgeVariant = (s: TempStatus): "default" | "destructive" => (s === "alerte" ? "destructive" : "default");

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const fmtTemp = (v: number) => `${v.toLocaleString("fr-FR")} °C`;

function EquipmentCard({
  probe,
  zoneName,
  last,
}: {
  probe: HaccpProbe;
  zoneName: string;
  last: HaccpTemperatureReading | undefined;
}) {
  const status = last ? temperatureStatus(last.value_c, probe.min_c, probe.max_c) : null;
  const alert = status === "alerte";
  return (
    <Card className={alert ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30" : ""}>
      <CardContent className="pt-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{probe.label}</p>
            <p className="text-muted-foreground text-xs">{zoneName}</p>
          </div>
          {status && <Badge variant={statBadgeVariant(status)}>{status}</Badge>}
        </div>
        <div className="flex items-end justify-between">
          <div>
            {last ? (
              <p className={`font-mono text-2xl font-bold ${alert ? "text-red-600" : ""}`}>{fmtTemp(last.value_c)}</p>
            ) : (
              <p className="text-muted-foreground font-mono text-2xl font-bold">—</p>
            )}
            <p className="text-muted-foreground text-xs">Cible : {formatTemperatureTarget(probe.min_c, probe.max_c)}</p>
          </div>
          <span className="text-muted-foreground text-xs">
            {last ? `${fmtDate(last.recorded_at)} ${fmtTime(last.recorded_at)}` : "aucun relevé"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TemperaturesPage() {
  const params = useParams();
  const establishmentId = params.id as string;

  const { data: probes = [], isLoading: lp } = useHaccpProbes(establishmentId);
  const { data: zones = [] } = useHaccpZones(establishmentId);
  const { data: readings = [], isLoading: lr } = useHaccpTemperatureReadings(establishmentId);

  const zoneName = (id: string | null) => (id ? (zones.find((z) => z.id === id)?.name ?? "—") : "—");
  const probeById = new Map(probes.map((p) => [p.id, p]));
  // Relevés déjà triés desc → le premier par sonde est le dernier relevé.
  const lastByProbe = new Map<string, HaccpTemperatureReading>();
  for (const r of readings) if (!lastByProbe.has(r.probe_id)) lastByProbe.set(r.probe_id, r);

  const statuses = probes
    .map((p) => {
      const last = lastByProbe.get(p.id);
      return last ? temperatureStatus(last.value_c, p.min_c, p.max_c) : null;
    })
    .filter(Boolean) as TempStatus[];
  const okCount = statuses.filter((s) => s === "ok").length;
  const alerteCount = statuses.filter((s) => s === "alerte").length;

  if (lp || lr) {
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
          <h1 className="text-2xl font-bold">Températures</h1>
          <p className="text-muted-foreground text-sm">
            {okCount} conforme{okCount > 1 ? "s" : ""} · {alerteCount} alerte{alerteCount > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
          <Smartphone className="h-3.5 w-3.5" />
          Saisie des relevés via l&apos;app mobile
        </div>
      </div>

      {probes.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed py-10 text-center text-sm">
          Aucun équipement de température configuré (voir Paramétrage → Équipements).
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {probes.map((p) => (
            <EquipmentCard key={p.id} probe={p} zoneName={zoneName(p.zone_id)} last={lastByProbe.get(p.id)} />
          ))}
        </div>
      )}

      {probes.length > 0 && <TemperatureCadence probes={probes} readings={readings} zones={zones} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Historique des relevés</CardTitle>
        </CardHeader>
        <CardContent>
          {readings.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">Aucun relevé enregistré.</p>
          ) : (
            <div className="divide-y">
              {readings.map((r) => {
                const probe = probeById.get(r.probe_id);
                const status = temperatureStatus(r.value_c, probe?.min_c ?? null, probe?.max_c ?? null);
                return (
                  <div key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div className="flex items-center gap-4">
                      <div className="text-muted-foreground w-20 text-xs">
                        <p>{fmtDate(r.recorded_at)}</p>
                        <p className="font-mono">{fmtTime(r.recorded_at)}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{probe?.label ?? "Équipement supprimé"}</p>
                        {r.recorded_by_label && (
                          <p className="text-muted-foreground text-xs">par {r.recorded_by_label}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold">{fmtTemp(r.value_c)}</span>
                      <Badge variant={statBadgeVariant(status)}>{status}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHaccpProbes, useHaccpSurfaces } from "@/lib/queries/haccp-config-queries";
import {
  fmtDate,
  fmtTime,
  temperatureStatus,
  useHaccpCleaningValidations,
  useHaccpTemperatureReadings,
} from "@/lib/queries/haccp-registers-queries";

export function RecentTemperatures({ establishmentId, base }: { establishmentId: string; base: string }) {
  const { data: probes = [] } = useHaccpProbes(establishmentId);
  const { data: readings = [] } = useHaccpTemperatureReadings(establishmentId, 8);
  const probeById = new Map(probes.map((p) => [p.id, p]));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Derniers relevés de température</CardTitle>
        <Link href={`${base}/haccp/temperatures`} className="text-primary text-xs hover:underline">
          Voir tout →
        </Link>
      </CardHeader>
      <CardContent>
        {readings.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">Aucun relevé.</p>
        ) : (
          <div className="divide-y">
            {readings.map((r) => {
              const probe = probeById.get(r.probe_id);
              const status = temperatureStatus(r.value_c, probe?.min_c ?? null, probe?.max_c ?? null);
              return (
                <div key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground w-24 font-mono text-xs">
                      {fmtDate(r.recorded_at)} {fmtTime(r.recorded_at)}
                    </span>
                    <span className="font-medium">{probe?.label ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{r.value_c.toLocaleString("fr-FR")} °C</span>
                    <Badge variant={status === "alerte" ? "destructive" : "default"}>{status}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentCleaning({ establishmentId, base }: { establishmentId: string; base: string }) {
  const { data: surfaces = [] } = useHaccpSurfaces(establishmentId);
  const { data: validations = [] } = useHaccpCleaningValidations(establishmentId, 8);
  const surfaceById = new Map(surfaces.map((s) => [s.id, s]));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Derniers nettoyages</CardTitle>
        <Link href={`${base}/haccp/nettoyage`} className="text-primary text-xs hover:underline">
          Voir tout →
        </Link>
      </CardHeader>
      <CardContent>
        {validations.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">Aucune validation.</p>
        ) : (
          <div className="divide-y">
            {validations.map((v) => (
              <div key={v.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium">{surfaceById.get(v.surface_id)?.label ?? "—"}</span>
                <span className="text-muted-foreground text-xs">
                  {fmtDate(v.validated_at)} {fmtTime(v.validated_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

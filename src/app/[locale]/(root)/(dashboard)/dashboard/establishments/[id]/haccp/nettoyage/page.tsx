"use client";

import { useParams } from "next/navigation";

import { ImageIcon, Loader2, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type HaccpSurface, useHaccpSurfaces, useHaccpZones } from "@/lib/queries/haccp-config-queries";
import {
  type HaccpCleaningValidation,
  fmtDate,
  fmtTime,
  useHaccpCleaningValidations,
} from "@/lib/queries/haccp-registers-queries";

const freqLabel = (f: string) => f.charAt(0).toUpperCase() + f.slice(1);

function SurfaceCard({
  surface,
  zoneName,
  last,
}: {
  surface: HaccpSurface;
  zoneName: string;
  last: HaccpCleaningValidation | undefined;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-semibold">{surface.label}</p>
          <Badge variant="outline" className="shrink-0 text-xs">
            {freqLabel(surface.frequency)}
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs">{zoneName}</p>
        <p className="mt-2 text-sm">
          {last ? (
            <>
              Dernier nettoyage : <span className="font-medium">{fmtDate(last.validated_at)}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Jamais validé</span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

export default function NettoyagePage() {
  const params = useParams();
  const establishmentId = params.id as string;

  const { data: surfaces = [], isLoading: ls } = useHaccpSurfaces(establishmentId);
  const { data: zones = [] } = useHaccpZones(establishmentId);
  const { data: validations = [], isLoading: lv } = useHaccpCleaningValidations(establishmentId);

  const zoneName = (id: string | null) => (id ? (zones.find((z) => z.id === id)?.name ?? "—") : "—");
  const surfaceById = new Map(surfaces.map((s) => [s.id, s]));
  const lastBySurface = new Map<string, HaccpCleaningValidation>();
  for (const v of validations) if (!lastBySurface.has(v.surface_id)) lastBySurface.set(v.surface_id, v);

  if (ls || lv) {
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
          <h1 className="text-2xl font-bold">Plan de nettoyage</h1>
          <p className="text-muted-foreground text-sm">
            {surfaces.length} surface{surfaces.length > 1 ? "s" : ""} · {validations.length} validation
            {validations.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
          <Smartphone className="h-3.5 w-3.5" />
          Validations saisies via l&apos;app mobile
        </div>
      </div>

      {surfaces.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed py-10 text-center text-sm">
          Aucune surface configurée (voir Paramétrage → Zones &amp; surfaces).
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {surfaces.map((s) => (
            <SurfaceCard key={s.id} surface={s} zoneName={zoneName(s.zone_id)} last={lastBySurface.get(s.id)} />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Historique des validations</CardTitle>
        </CardHeader>
        <CardContent>
          {validations.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">Aucune validation enregistrée.</p>
          ) : (
            <div className="divide-y">
              {validations.map((v) => (
                <div key={v.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-4">
                    <div className="text-muted-foreground w-20 text-xs">
                      <p>{fmtDate(v.validated_at)}</p>
                      <p className="font-mono">{fmtTime(v.validated_at)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {surfaceById.get(v.surface_id)?.label ?? "Surface supprimée"}
                      </p>
                      {v.recorded_by_label && (
                        <p className="text-muted-foreground text-xs">par {v.recorded_by_label}</p>
                      )}
                    </div>
                  </div>
                  {v.photo_path && <ImageIcon className="text-muted-foreground h-4 w-4" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

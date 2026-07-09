"use client";

import { useParams } from "next/navigation";

import { ImageIcon, Loader2, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type HaccpTraceDetailed,
  fmtDate,
  fmtTime,
  useHaccpTraceDetailed,
  useHaccpTraceSimple,
} from "@/lib/queries/haccp-registers-queries";

const linesCount = (lines: HaccpTraceDetailed["lines"]) => (Array.isArray(lines) ? lines.length : 0);

export default function TracabilitePage() {
  const params = useParams();
  const establishmentId = params.id as string;

  const { data: detailed = [], isLoading: ld } = useHaccpTraceDetailed(establishmentId);
  const { data: simple = [], isLoading: ls } = useHaccpTraceSimple(establishmentId);

  if (ld || ls) {
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
          <h1 className="text-2xl font-bold">Traçabilité</h1>
          <p className="text-muted-foreground text-sm">
            {detailed.length} relevé{detailed.length > 1 ? "s" : ""} détaillé{detailed.length > 1 ? "s" : ""} ·{" "}
            {simple.length} photo{simple.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
          <Smartphone className="h-3.5 w-3.5" />
          Saisie via l&apos;app mobile
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Traçabilité détaillée (produits / lots)</CardTitle>
        </CardHeader>
        <CardContent>
          {detailed.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">Aucun relevé détaillé.</p>
          ) : (
            <div className="divide-y">
              {detailed.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-4">
                    <div className="text-muted-foreground w-20 text-xs">
                      <p>{fmtDate(t.recorded_at)}</p>
                      <p className="font-mono">{fmtTime(t.recorded_at)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium">{t.bl_number ? `BL ${t.bl_number}` : "Relevé"}</p>
                      {t.recorded_by_label && (
                        <p className="text-muted-foreground text-xs">par {t.recorded_by_label}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {linesCount(t.lines)} ligne(s)
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Traçabilité simple (photos d&apos;étiquettes)</CardTitle>
        </CardHeader>
        <CardContent>
          {simple.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">Aucune photo enregistrée.</p>
          ) : (
            <div className="divide-y">
              {simple.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-4">
                    <div className="text-muted-foreground w-20 text-xs">
                      <p>{fmtDate(t.recorded_at)}</p>
                      <p className="font-mono">{fmtTime(t.recorded_at)}</p>
                    </div>
                    {t.recorded_by_label && (
                      <span className="text-muted-foreground text-xs">par {t.recorded_by_label}</span>
                    )}
                  </div>
                  {t.photo_path && <ImageIcon className="text-muted-foreground h-4 w-4" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

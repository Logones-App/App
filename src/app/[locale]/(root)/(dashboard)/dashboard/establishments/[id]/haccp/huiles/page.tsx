"use client";

import { useParams } from "next/navigation";

import { Loader2, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type HaccpOilBath, useHaccpOilBaths } from "@/lib/queries/haccp-config-queries";
import { type HaccpOilTest, fmtDate, fmtTime, useHaccpOilTests } from "@/lib/queries/haccp-registers-queries";

const conformVariant = (conform: boolean): "default" | "destructive" => (conform ? "default" : "destructive");
const fmtPct = (v: number | null) => (v != null ? `${v.toLocaleString("fr-FR")} %` : "—");

function BathCard({ bath, last }: { bath: HaccpOilBath; last: HaccpOilTest | undefined }) {
  const alert = last ? !last.conform : false;
  return (
    <Card className={alert ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30" : ""}>
      <CardContent className="pt-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{bath.label}</p>
            <p className="text-muted-foreground text-xs">
              {[bath.oil_type, bath.capacity_l != null ? `${bath.capacity_l} L` : null].filter(Boolean).join(" · ") ||
                "—"}
            </p>
          </div>
          {last && <Badge variant={conformVariant(last.conform)}>{last.conform ? "conforme" : "non conforme"}</Badge>}
        </div>
        {last ? (
          <div className="flex items-end justify-between">
            <div>
              <p className={`font-mono text-2xl font-bold ${alert ? "text-red-600" : ""}`}>
                {fmtPct(last.polarity_pct)}
              </p>
              <p className="text-muted-foreground text-xs">
                Polarité{last.changed ? " · huile changée" : ""}
                {last.organoleptic_ok === false ? " · organoleptique KO" : ""}
              </p>
            </div>
            <span className="text-muted-foreground text-xs">
              {fmtDate(last.tested_at)} {fmtTime(last.tested_at)}
            </span>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Aucun test</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function HuilesPage() {
  const params = useParams();
  const establishmentId = params.id as string;

  const { data: baths = [], isLoading: lb } = useHaccpOilBaths(establishmentId);
  const { data: tests = [], isLoading: lt } = useHaccpOilTests(establishmentId);

  const bathById = new Map(baths.map((b) => [b.id, b]));
  const lastByBath = new Map<string, HaccpOilTest>();
  for (const t of tests) if (t.bath_id && !lastByBath.has(t.bath_id)) lastByBath.set(t.bath_id, t);

  const nonConform = tests.filter((t) => !t.conform).length;

  if (lb || lt) {
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
          <h1 className="text-2xl font-bold">Huiles de friture</h1>
          <p className="text-muted-foreground text-sm">
            {baths.length} bain{baths.length > 1 ? "s" : ""} · {tests.length} test{tests.length > 1 ? "s" : ""}
            {nonConform > 0 ? ` · ${nonConform} non conforme${nonConform > 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
          <Smartphone className="h-3.5 w-3.5" />
          Tests saisis via l&apos;app mobile
        </div>
      </div>

      {baths.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed py-10 text-center text-sm">
          Aucun bain de friture configuré (voir Paramétrage → Équipements).
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {baths.map((b) => (
            <BathCard key={b.id} bath={b} last={lastByBath.get(b.id)} />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Historique des tests</CardTitle>
        </CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">Aucun test enregistré.</p>
          ) : (
            <div className="divide-y">
              {tests.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-4">
                    <div className="text-muted-foreground w-20 text-xs">
                      <p>{fmtDate(t.tested_at)}</p>
                      <p className="font-mono">{fmtTime(t.tested_at)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{bathById.get(t.bath_id ?? "")?.label ?? "Bain supprimé"}</p>
                      {t.recorded_by_label && (
                        <p className="text-muted-foreground text-xs">par {t.recorded_by_label}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {t.changed && (
                      <Badge variant="secondary" className="text-xs">
                        changée
                      </Badge>
                    )}
                    <span className="font-mono text-sm font-semibold">{fmtPct(t.polarity_pct)}</span>
                    <Badge variant={conformVariant(t.conform)}>{t.conform ? "ok" : "alerte"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

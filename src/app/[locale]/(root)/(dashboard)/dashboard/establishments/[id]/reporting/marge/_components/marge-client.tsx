"use client";

import { useMemo, useState } from "react";

import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMarginByProduct, type MarginRow } from "@/lib/queries/margin-reporting-queries";

import { MargeTopProductsChart } from "./marge-top-products-chart";

const PERIODS = [
  { label: "7 jours", days: 7 },
  { label: "30 jours", days: 30 },
  { label: "90 jours", days: 90 },
] as const;

type Period = (typeof PERIODS)[number]["days"];

function getPeriodRange(days: Period) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: from.toISOString(), to: to.toISOString() };
}

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Marge brute % : 🟢 ≥ 70 % / 🟡 ≥ 60 % / 🔴 < 60 % (équivaut food cost 🟢 ≤ 30 % / 🟡 ≤ 40 %).
function MarginBadge({ row }: { row: MarginRow }) {
  if (!row.costTracked) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        coût non suivi
      </Badge>
    );
  }
  if (row.marginPct === null) return <span className="text-muted-foreground text-xs">—</span>;
  const variant = row.marginPct >= 70 ? "default" : row.marginPct >= 60 ? "secondary" : "destructive";
  return <Badge variant={variant}>{row.marginPct.toFixed(1)} %</Badge>;
}

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return <p className="text-muted-foreground p-4 text-sm">Chargement…</p>;
}

function MarginTable({ rows }: { rows: MarginRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Produit</TableHead>
          <TableHead className="text-right">Qté</TableHead>
          <TableHead className="text-right">CA HT</TableHead>
          <TableHead className="text-right">Coût matière</TableHead>
          <TableHead className="text-right">Marge brute</TableHead>
          <TableHead className="text-right">Marge %</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.recipeProductId}>
            <TableCell className="font-medium">{r.recipeName}</TableCell>
            <TableCell className="text-right">{r.qtySold}</TableCell>
            <TableCell className="text-right">{fmt(r.revenueHt)} €</TableCell>
            <TableCell className="text-right">{r.costTracked ? `${fmt(r.cogs)} €` : "—"}</TableCell>
            <TableCell className="text-right font-semibold">{r.costTracked ? `${fmt(r.marginEur)} €` : "—"}</TableCell>
            <TableCell className="text-right">
              <MarginBadge row={r} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function MargeClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const [period, setPeriod] = useState<Period>(30);
  const { from, to } = useMemo(() => getPeriodRange(period), [period]);

  const marginQ = useMarginByProduct(establishmentId, from, to);
  const rows = marginQ.data ?? [];

  const tracked = rows.filter((r) => r.costTracked);
  const totalRevenueHt = rows.reduce((s, r) => s + r.revenueHt, 0);
  const totalCogs = tracked.reduce((s, r) => s + r.cogs, 0);
  const trackedRevenueHt = tracked.reduce((s, r) => s + r.revenueHt, 0);
  const totalMargin = tracked.reduce((s, r) => s + r.marginEur, 0);
  const globalMarginPct = trackedRevenueHt > 0 ? (totalMargin / trackedRevenueHt) * 100 : null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Marge & rentabilité</h1>
            <Badge variant="secondary">Montants HT</Badge>
          </div>
          <p className="text-muted-foreground text-sm">CA HT croisé au coût matière FIFO, par produit</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <Button
              key={p.days}
              size="sm"
              variant={period === p.days ? "default" : "outline"}
              onClick={() => setPeriod(p.days)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="CA HT" value={`${fmt(totalRevenueHt)} €`} hint={`ventes POS — ${period} jours`} />
        <StatCard title="Coût matière (FIFO)" value={`${fmt(totalCogs)} €`} hint="produits à coût suivi" />
        <StatCard title="Marge brute" value={`${fmt(totalMargin)} €`} hint="CA HT − coût matière" />
        <StatCard
          title="Marge brute %"
          value={globalMarginPct === null ? "—" : `${globalMarginPct.toFixed(1)} %`}
          hint="sur produits à coût suivi"
        />
      </div>

      {marginQ.isPending ? (
        <Card>
          <CardContent className="p-0">
            <LoadingState />
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-muted-foreground p-4 text-sm">
              Aucune vente sur la période — la rentabilité apparaîtra dès les premières commandes POS.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <MargeTopProductsChart rows={rows} />
          <Card>
            <CardHeader className="gap-1">
              <CardTitle className="text-sm font-medium">
                Rentabilité par produit — seuils marge : 🟢 ≥ 70 % / 🟡 ≥ 60 % / 🔴 &lt; 60 %
              </CardTitle>
              <p className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
                <Badge variant="outline" className="text-muted-foreground">
                  coût non suivi
                </Badge>
                = produit vendu sans coût matière FIFO enregistré → marge non calculable (à brancher sur le FIFO).
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <MarginTable rows={rows} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

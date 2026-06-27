"use client";

import { useMemo, useState } from "react";

import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import { useEstablishmentOrders } from "@/lib/queries/orders-queries";
import {
  computeRevenueByPaymentMethod,
  computeSalesByDay,
  computeSalesByProduct,
  computeSalesKPIs,
} from "@/lib/queries/sales-reporting-queries";

import { VentesRevenueChart } from "./ventes-revenue-chart";

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

export function VentesClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const organizationId = useOrgaUserOrganizationId() ?? "";
  const [period, setPeriod] = useState<Period>(30);
  const { from, to } = useMemo(() => getPeriodRange(period), [period]);

  const ordersQ = useEstablishmentOrders(establishmentId, organizationId, from, to);
  const orders = useMemo(() => ordersQ.data ?? [], [ordersQ.data]);

  const kpis = useMemo(() => computeSalesKPIs(orders), [orders]);
  const byDay = useMemo(() => computeSalesByDay(orders), [orders]);
  const byProduct = useMemo(() => computeSalesByProduct(orders, 20), [orders]);
  const byMethod = useMemo(() => computeRevenueByPaymentMethod(orders), [orders]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Ventes & chiffre d&apos;affaires</h1>
            <Badge variant="secondary">Montants HT</Badge>
          </div>
          <p className="text-muted-foreground text-sm">CA HT, panier moyen et ventes par produit (hors pourboires)</p>
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
        <StatCard title="CA HT" value={`${fmt(kpis.revenueHt)} €`} hint={`${period} jours`} />
        <StatCard title="Commandes" value={String(kpis.orderCount)} hint={`${kpis.itemCount} articles vendus`} />
        <StatCard title="Panier moyen HT" value={`${fmt(kpis.avgBasketHt)} €`} hint="CA HT / commande" />
        <StatCard title="CA TTC" value={`${fmt(kpis.revenueTtc)} €`} hint="ventes lignes TTC" />
      </div>

      {ordersQ.isPending ? (
        <Card>
          <CardContent>
            <p className="text-muted-foreground p-4 text-sm">Chargement…</p>
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-muted-foreground p-4 text-sm">
              Aucune vente sur la période — le CA apparaîtra dès les premières commandes POS.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <VentesRevenueChart rows={byDay} />

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Ventes par produit</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead className="text-right">Qté</TableHead>
                      <TableHead className="text-right">CA HT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byProduct.map((r) => (
                      <TableRow key={r.productName}>
                        <TableCell className="font-medium">{r.productName}</TableCell>
                        <TableCell className="text-right">{r.quantity}</TableCell>
                        <TableCell className="text-right">{fmt(r.revenueHt)} €</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Encaissements par mode (TTC)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mode</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byMethod.map((r) => (
                      <TableRow key={r.method}>
                        <TableCell className="font-medium">{r.method}</TableCell>
                        <TableCell className="text-right">{fmt(r.amount)} €</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";

import { format, parseISO, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronDown, ChevronRight, ShoppingBag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  computeOrderKPIs,
  computeTopProducts,
  type OrderWithDetails,
  useEstablishmentOrders,
} from "@/lib/queries/orders-queries";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

// ─── Sélecteur de période ─────────────────────────────────────────────────────

type Period = "today" | "7d" | "30d";

function periodRange(p: Period): { from: string; to: string } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  if (p === "today") {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    return { from, to };
  }
  const days = p === "7d" ? 7 : 30;
  return { from: subDays(now, days).toISOString(), to };
}

// ─── Ligne commande expansible ────────────────────────────────────────────────

function OrderRow({ order }: { order: OrderWithDetails }) {
  const [expanded, setExpanded] = useState(false);

  const products = order.order_products.filter((p) => !p.cancelled && !p.deleted);
  const orderTotal = products.reduce((s, p) => s + p.total_price, 0);
  const settlements = order.order_payments.flatMap((p) => p.order_payment_settlements.filter((s) => !s.deleted));
  const paidTotal = settlements.reduce((s, r) => s + r.amount, 0);
  const isPaid = paidTotal > 0;
  const methods = [...new Set(settlements.map((s) => s.payment_method_name ?? "Autre"))];

  return (
    <>
      <TableRow className="hover:bg-muted/50 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <TableCell className="w-6">
          {expanded ? (
            <ChevronDown className="text-muted-foreground h-4 w-4" />
          ) : (
            <ChevronRight className="text-muted-foreground h-4 w-4" />
          )}
        </TableCell>
        <TableCell className="text-sm tabular-nums">
          {order.created_at ? format(parseISO(order.created_at), "HH:mm", { locale: fr }) : "—"}
        </TableCell>
        <TableCell className="text-muted-foreground text-sm">
          {order.description ?? `Commande #${order.id.slice(0, 6)}`}
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {products.length} article{products.length > 1 ? "s" : ""}
        </TableCell>
        <TableCell className="text-right font-medium tabular-nums">{eur.format(orderTotal)}</TableCell>
        <TableCell className="text-right text-green-600 tabular-nums">
          {paidTotal > 0 ? eur.format(paidTotal) : "—"}
        </TableCell>
        <TableCell>
          {isPaid ? (
            <div className="flex flex-wrap gap-1">
              {methods.map((m) => (
                <Badge key={m} variant="secondary" className="text-xs">
                  {m}
                </Badge>
              ))}
            </div>
          ) : (
            <Badge variant="outline" className="text-xs text-yellow-600">
              Non encaissé
            </Badge>
          )}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/20 p-0">
            <div className="px-8 py-3">
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">Produits</p>
              <div className="space-y-1">
                {products.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span>
                      {p.quantity}× {p.product_name}
                    </span>
                    <span className="tabular-nums">{eur.format(p.total_price)}</span>
                  </div>
                ))}
                {products.length === 0 && <p className="text-muted-foreground text-sm">Aucun article.</p>}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function EstablishmentOrdersClient({
  establishmentId,
  organizationId,
}: {
  establishmentId: string;
  organizationId: string;
}) {
  const [period, setPeriod] = useState<Period>("today");
  const { from, to } = useMemo(() => periodRange(period), [period]);

  const { data: orders = [], isLoading } = useEstablishmentOrders(establishmentId, organizationId, from, to);

  const kpis = useMemo(() => computeOrderKPIs(orders), [orders]);
  const topProducts = useMemo(() => computeTopProducts(orders, 5), [orders]);

  // Grouper par jour
  const byDay = useMemo(() => {
    const map = new Map<string, OrderWithDetails[]>();
    for (const o of orders) {
      const day = o.created_at ? format(parseISO(o.created_at), "yyyy-MM-dd") : "inconnu";
      const arr = map.get(day) ?? [];
      arr.push(o);
      map.set(day, arr);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [orders]);

  return (
    <div className="space-y-6 p-6">
      {/* En-tête + période */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Commandes POS</h1>
          <p className="text-muted-foreground text-sm">Données issues de la caisse mobile</p>
        </div>
        <div className="flex gap-2">
          {(["today", "7d", "30d"] as Period[]).map((p) => (
            <Button key={p} variant={period === p ? "default" : "outline"} size="sm" onClick={() => setPeriod(p)}>
              {p === "today" ? "Aujourd'hui" : p === "7d" ? "7 jours" : "30 jours"}
            </Button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>CA encaissé TTC</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{eur.format(kpis.revenueTTC)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Commandes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis.orderCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Articles vendus</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis.itemCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Panier moyen TTC</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{eur.format(kpis.averageBasket)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Liste commandes */}
        <div className="space-y-4 lg:col-span-2">
          {isLoading ? (
            <Card>
              <CardContent className="text-muted-foreground py-12 text-center">Chargement…</CardContent>
            </Card>
          ) : byDay.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingBag className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
                <p className="text-muted-foreground">Aucune commande sur cette période.</p>
              </CardContent>
            </Card>
          ) : (
            byDay.map(([day, dayOrders]) => (
              <Card key={day}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {format(parseISO(day), "EEEE d MMMM yyyy", { locale: fr })}
                  </CardTitle>
                  <CardDescription>
                    {dayOrders.length} commande{dayOrders.length > 1 ? "s" : ""} —{" "}
                    {eur.format(computeOrderKPIs(dayOrders).revenueTTC)} encaissés
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-6" />
                        <TableHead>Heure</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Articles</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Encaissé</TableHead>
                        <TableHead>Méthode</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dayOrders.map((o) => (
                        <OrderRow key={o.id} order={o} />
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Sidebar : top produits + méthodes */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top produits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topProducts.length === 0 ? (
                <p className="text-muted-foreground text-sm">—</p>
              ) : (
                topProducts.map((p, i) => (
                  <div key={p.product_name} className="flex items-center justify-between text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-muted-foreground w-4 shrink-0 tabular-nums">{i + 1}.</span>
                      <span className="truncate">{p.product_name}</span>
                    </div>
                    <div className="ml-2 shrink-0 text-right">
                      <p className="font-medium tabular-nums">{eur.format(p.revenue)}</p>
                      <p className="text-muted-foreground text-xs">{p.quantity} vdus</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {kpis.revenueByMethod.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Encaissements par méthode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {kpis.revenueByMethod.map((m) => (
                  <div key={m.method} className="flex items-center justify-between text-sm">
                    <span>{m.method}</span>
                    <span className="font-medium tabular-nums">{eur.format(m.amount)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">{eur.format(kpis.revenueTTC)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

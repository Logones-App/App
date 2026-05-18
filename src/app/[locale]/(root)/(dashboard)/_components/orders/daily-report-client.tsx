"use client";

import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { format, parseISO, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { computeOrderKPIs, computeTopProducts, useEstablishmentOrders } from "@/lib/queries/orders-queries";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function useDailyFound(establishmentId: string, organizationId: string, date: string) {
  return useQuery({
    queryKey: ["daily-found", establishmentId, date],
    queryFn: async () => {
      const supabase = createClient();
      const from = new Date(date).toISOString();
      const to = new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("daily_found")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .gte("opened_at", from)
        .lt("opened_at", to)
        .order("opened_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Tables<"daily_found">[];
    },
    enabled: !!establishmentId && !!organizationId && !!date,
  });
}

export function DailyReportClient({
  establishmentId,
  organizationId,
}: {
  establishmentId: string;
  organizationId: string;
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const from = `${date}T00:00:00.000Z`;
  const to = `${date}T23:59:59.999Z`;

  const { data: orders = [], isLoading: ordersLoading } = useEstablishmentOrders(
    establishmentId,
    organizationId,
    from,
    to,
  );
  const { data: sessions = [], isLoading: sessionsLoading } = useDailyFound(establishmentId, organizationId, date);

  const kpis = useMemo(() => computeOrderKPIs(orders), [orders]);
  const topProducts = useMemo(() => computeTopProducts(orders, 10), [orders]);

  const isLoading = ordersLoading || sessionsLoading;

  const prevDay = () => setDate((d) => subDays(new Date(d), 1).toISOString().slice(0, 10));
  const nextDay = () => {
    const next = new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000);
    if (next <= new Date()) setDate(next.toISOString().slice(0, 10));
  };
  const isToday = date === new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Rapport journalier</h1>
          <p className="text-muted-foreground text-sm">Résumé de caisse et ventes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevDay}>
            ←
          </Button>
          <div className="relative">
            <Calendar className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-40 pl-8"
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={nextDay} disabled={isToday}>
            →
          </Button>
        </div>
      </div>

      <div className="text-muted-foreground text-sm font-medium">
        {format(parseISO(date), "EEEE d MMMM yyyy", { locale: fr })}
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sessions caisse */}
        <Card>
          <CardHeader>
            <CardTitle>Sessions caisse</CardTitle>
            <CardDescription>Ouvertures/clôtures de caisse (daily_found)</CardDescription>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <p className="text-muted-foreground text-sm">Chargement…</p>
            ) : sessions.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">Aucune session caisse ce jour.</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((s) => (
                  <div key={s.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <p className="font-medium">
                          {s.opened_at ? format(parseISO(s.opened_at), "HH:mm", { locale: fr }) : "—"} →{" "}
                          {s.closed_at_at ? format(parseISO(s.closed_at_at), "HH:mm", { locale: fr }) : "En cours"}
                        </p>
                        {s.opening_cash_amount != null && (
                          <p className="text-muted-foreground text-xs">
                            Fond d&apos;ouverture : {eur.format(s.opening_cash_amount)}
                          </p>
                        )}
                      </div>
                      <Badge variant={s.opened ? "outline" : "secondary"}>{s.opened ? "En cours" : "Clôturée"}</Badge>
                    </div>
                    {!s.opened && s.closing_cash_count != null && (
                      <div className="mt-2 border-t pt-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Fond de clôture</span>
                          <span className="font-medium tabular-nums">{eur.format(s.closing_cash_count)}</span>
                        </div>
                        {s.closing_cash_to_keep != null && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">À conserver</span>
                            <span className="tabular-nums">{eur.format(s.closing_cash_to_keep)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Encaissements par méthode */}
        <Card>
          <CardHeader>
            <CardTitle>Encaissements</CardTitle>
            <CardDescription>Répartition par méthode de paiement</CardDescription>
          </CardHeader>
          <CardContent>
            {kpis.revenueByMethod.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">Aucun encaissement.</p>
            ) : (
              <div className="space-y-2">
                {kpis.revenueByMethod.map((m) => (
                  <div key={m.method} className="flex items-center justify-between">
                    <span className="text-sm">{m.method}</span>
                    <span className="font-medium tabular-nums">{eur.format(m.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Total TTC</span>
                  <span className="tabular-nums">{eur.format(kpis.revenueTTC)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top produits */}
      <Card>
        <CardHeader>
          <CardTitle>Ventes par produit</CardTitle>
          <CardDescription>Classement du jour</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Chargement…</p>
          ) : topProducts.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">Aucune vente ce jour.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Qté</TableHead>
                    <TableHead className="text-right">CA TTC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((p, i) => (
                    <TableRow key={p.product_name}>
                      <TableCell className="text-muted-foreground w-8 tabular-nums">{i + 1}</TableCell>
                      <TableCell className="font-medium">{p.product_name}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">{eur.format(p.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";

import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useFifoCOGSByPeriod,
  useFifoFoodCostByRecipe,
  useFifoIngredientCostHistory,
  useFifoStockValuation,
  type FoodCostRow,
} from "@/lib/queries/fifo-reporting-queries";

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

function FoodCostBadge({ row }: { row: FoodCostRow }) {
  if (row.foodCostPct === null) return <span className="text-muted-foreground text-xs">—</span>;
  const variant = row.foodCostPct <= 28 ? "default" : row.foodCostPct <= 35 ? "secondary" : "destructive";
  return <Badge variant={variant}>{row.foodCostPct.toFixed(1)} %</Badge>;
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-muted-foreground p-4 text-sm">{message}</p>;
}

function LoadingState() {
  return <p className="text-muted-foreground p-4 text-sm">Chargement…</p>;
}

export function ReportingClient() {
  const params = useParams();
  const establishmentId = params.id as string;
  const [period, setPeriod] = useState<Period>(30);
  const { from, to } = useMemo(() => getPeriodRange(period), [period]);

  const cogsQ = useFifoCOGSByPeriod(establishmentId, from, to);
  const foodQ = useFifoFoodCostByRecipe(establishmentId, from, to);
  const purchQ = useFifoIngredientCostHistory(establishmentId, from, to);
  const stockQ = useFifoStockValuation(establishmentId);

  const totalCogs = (cogsQ.data ?? []).reduce((s, r) => s + r.cogs, 0);
  const totalStock = (stockQ.data ?? []).reduce((s, r) => s + r.stockValue, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reporting FIFO</h1>
          <p className="text-muted-foreground text-sm">Valorisation réelle des ventes et du stock</p>
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

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">COGS période</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(totalCogs)} €</p>
            <p className="text-muted-foreground mt-1 text-xs">coût matière FIFO — {period} jours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Valeur stock actuel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(totalStock)} €</p>
            <p className="text-muted-foreground mt-1 text-xs">lots restants valorisés en FIFO</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Recettes suivies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{foodQ.data?.length ?? 0}</p>
            <p className="text-muted-foreground mt-1 text-xs">plats avec food cost calculé</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="cogs">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 sm:w-fit">
          <TabsTrigger value="cogs">COGS par jour</TabsTrigger>
          <TabsTrigger value="recipes">Food cost recettes</TabsTrigger>
          <TabsTrigger value="purchases">{"Prix d'achat"}</TabsTrigger>
          <TabsTrigger value="valuation">Valorisation stock</TabsTrigger>
        </TabsList>

        <TabsContent value="cogs">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Coût matière journalier (FIFO)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {cogsQ.isPending ? (
                <LoadingState />
              ) : !cogsQ.data?.length ? (
                <EmptyState message="Aucune donnée — les ventes POS valorisées apparaîtront ici." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">COGS</TableHead>
                      <TableHead className="text-right">Commandes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cogsQ.data.map((r) => (
                      <TableRow key={r.date}>
                        <TableCell className="font-medium">{r.date}</TableCell>
                        <TableCell className="text-right">{fmt(r.cogs)} €</TableCell>
                        <TableCell className="text-right">{r.orderCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recipes">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Food cost par recette — seuils : 🟢 ≤ 28 % / 🟡 ≤ 35 % / 🔴 &gt; 35 %
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {foodQ.isPending ? (
                <LoadingState />
              ) : !foodQ.data?.length ? (
                <EmptyState message="Aucune donnée — nécessite recipe_product_id peuplé par le POS." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recette</TableHead>
                      <TableHead className="text-right">COGS</TableHead>
                      <TableHead className="text-right">CA</TableHead>
                      <TableHead className="text-right">Food cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {foodQ.data.map((r) => (
                      <TableRow key={r.recipeProductId}>
                        <TableCell className="font-medium">{r.recipeName}</TableCell>
                        <TableCell className="text-right">{fmt(r.cogs)} €</TableCell>
                        <TableCell className="text-right">{fmt(r.revenue)} €</TableCell>
                        <TableCell className="text-right">
                          <FoodCostBadge row={r} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Historique des réceptions fournisseurs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {purchQ.isPending ? (
                <LoadingState />
              ) : !purchQ.data?.length ? (
                <EmptyState message="Aucune réception enregistrée sur la période." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingrédient</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Quantité</TableHead>
                      <TableHead className="text-right">Prix unitaire</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchQ.data.map((r, i) => (
                      <TableRow key={`${r.productId}-${r.purchaseDate}-${i}`}>
                        <TableCell className="font-medium">{r.productName}</TableCell>
                        <TableCell>{r.purchaseDate}</TableCell>
                        <TableCell className="text-right">
                          {r.quantity} {r.unit ?? ""}
                        </TableCell>
                        <TableCell className="text-right">{fmt(r.unitCost)} €</TableCell>
                        <TableCell className="text-right">{fmt(r.totalCost)} €</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="valuation">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Valorisation FIFO du stock — total {fmt(totalStock)} €
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {stockQ.isPending ? (
                <LoadingState />
              ) : !stockQ.data?.length ? (
                <EmptyState message="Aucun lot d'achat en stock avec coût FIFO disponible." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingrédient</TableHead>
                      <TableHead className="text-right">Qté restante</TableHead>
                      <TableHead className="text-right">Coût FIFO / unité</TableHead>
                      <TableHead className="text-right">Valeur</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockQ.data.map((r) => (
                      <TableRow key={r.productId}>
                        <TableCell className="font-medium">{r.productName}</TableCell>
                        <TableCell className="text-right">
                          {r.remainingQty} {r.unit ?? ""}
                        </TableCell>
                        <TableCell className="text-right">{fmt(r.fifoUnitCost)} €</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(r.stockValue)} €</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

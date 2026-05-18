"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, Building2, ShoppingBag, TrendingUp, Utensils } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrgaUserOrganizationId } from "@/hooks/use-orga-user-organization-id";
import { useOrganizationEstablishments } from "@/lib/queries/establishments-queries";
import { computeTopProducts, useDashboardMonthlyStats, useDashboardRecentOrders } from "@/lib/queries/orders-queries";
import { useUserOrganizations } from "@/lib/queries/organizations";
import { useAuthStore } from "@/lib/stores/auth-store";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

// eslint-disable-next-line complexity
export default function DashboardPage() {
  const { user } = useAuthStore();
  const params = useParams();
  const locale = (params.locale as string) ?? "fr";
  const t = useTranslations("dashboard");

  const organizationId = useOrgaUserOrganizationId() ?? "";
  const { data: organizations = [] } = useUserOrganizations(user?.id);
  const { data: establishments = [] } = useOrganizationEstablishments(organizationId);

  const { data: monthlyStats, isLoading: statsLoading } = useDashboardMonthlyStats(organizationId);
  const { data: recentOrders = [], isLoading: ordersLoading } = useDashboardRecentOrders(organizationId, 5);

  const topProducts = computeTopProducts(
    recentOrders.map((o) => ({
      ...o,
      order_products: o.order_products ?? [],
      order_payments: o.order_payments ?? [],
    })),
    5,
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("welcome")}</p>
      </div>

      {/* KPIs principaux */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CA du mois (TTC)</CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold tabular-nums">{eur.format(monthlyStats?.revenueTTC ?? 0)}</div>
                <p className="text-muted-foreground text-xs">
                  {monthlyStats?.orderCount ?? 0} commande{(monthlyStats?.orderCount ?? 0) > 1 ? "s" : ""} ce mois
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Établissements</CardTitle>
            <Building2 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{establishments.length}</div>
            <p className="text-muted-foreground text-xs">
              {organizations.length} organisation{organizations.length > 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commandes récentes</CardTitle>
            <ShoppingBag className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{recentOrders.length}</div>
                <p className="text-muted-foreground text-xs">dernières chargées</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top produit</CardTitle>
            <Utensils className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            {topProducts[0] ? (
              <>
                <div className="truncate text-lg font-bold">{topProducts[0].product_name}</div>
                <p className="text-muted-foreground text-xs">
                  {topProducts[0].quantity} vendus — {eur.format(topProducts[0].revenue)}
                </p>
              </>
            ) : (
              <div className="text-muted-foreground text-sm">—</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dernières commandes */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Dernières commandes</CardTitle>
              <CardDescription>Issues de la caisse mobile</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">Aucune commande récente.</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((o) => {
                  const products = (o.order_products ?? []).filter((p) => !p.cancelled && !p.deleted);
                  const total = products.reduce((s, p) => s + p.total_price, 0);
                  const paid = (o.order_payments ?? [])
                    .flatMap((p) => (p.order_payment_settlements ?? []).filter((s) => !s.deleted))
                    .reduce((s, r) => s + r.amount, 0);

                  return (
                    <div key={o.id} className="flex items-center justify-between rounded-md border p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {o.description ?? `Commande #${o.id.slice(0, 6)}`}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {o.created_at ? format(parseISO(o.created_at), "d MMM à HH:mm", { locale: fr }) : "—"}
                          {" · "}
                          {products.length} article{products.length > 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="ml-3 shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums">{eur.format(total)}</p>
                        {paid > 0 ? (
                          <Badge variant="secondary" className="text-xs text-green-600">
                            Encaissé
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-yellow-600">
                            En cours
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top produits + établissements */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top produits</CardTitle>
              <CardDescription>Sur les dernières commandes chargées</CardDescription>
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
                      <p className="text-muted-foreground text-xs">{p.quantity} vendus</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mes établissements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {establishments.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucun établissement.</p>
              ) : (
                establishments.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded-md border p-2">
                    <p className="truncate text-sm font-medium">{e.name}</p>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/${locale}/dashboard/establishments/${e.id}/orders`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

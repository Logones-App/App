"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MenuProductPricingJoin } from "@/lib/queries/product-establishment-dashboard";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

const STRATEGY_LABEL: Record<string, string> = {
  catalog_only: "Prix catalogue",
  menu_price_fallback_catalog: "Menu ou catalogue",
  menu_price_required: "Prix menu requis",
};

export function PrixPanel({ menuProductPricing }: { menuProductPricing: MenuProductPricingJoin[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Prix par menu</CardTitle>
        <CardDescription>
          Récapitulatif des prix de vente enregistrés pour ce produit. Pour ajouter ou modifier un prix, rendez-vous sur
          la page du menu concerné.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {menuProductPricing.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Ce produit n&apos;est associé à aucun menu. Rendez-vous sur la page du menu pour l&apos;ajouter.
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Menu</TableHead>
                  <TableHead>Stratégie</TableHead>
                  <TableHead className="text-right">Prix TTC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuProductPricing.map((mpEntry) => {
                  const strategy = mpEntry.menu?.pricing_strategy ?? "menu_price_fallback_catalog";
                  return (
                    <TableRow key={mpEntry.menuProduct.id}>
                      <TableCell className="font-medium">{mpEntry.menu?.name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {STRATEGY_LABEL[strategy] ?? strategy}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {mpEntry.menuProduct.price !== null && mpEntry.menuProduct.price !== undefined ? (
                          eur.format(mpEntry.menuProduct.price)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

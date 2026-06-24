"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MenuProductPricingJoin } from "@/lib/queries/product-establishment-dashboard";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

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
                  <TableHead className="text-right">Prix TTC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuProductPricing.map((mpEntry) => (
                  <TableRow key={mpEntry.menuProduct.id}>
                    <TableCell className="font-medium">{mpEntry.menu?.name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {mpEntry.menuProduct.price !== null ? (
                        eur.format(mpEntry.menuProduct.price)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

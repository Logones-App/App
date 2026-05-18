"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import { ArrowLeft, Mail, MapPin, Phone, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSupplier, useSupplierProducts } from "@/lib/queries/supplier-queries";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function SupplierDetailClient() {
  const params = useParams();
  const pathname = usePathname();
  const supplierId = params.supplierId as string;

  const { data: supplier, isLoading: supplierLoading } = useSupplier(supplierId);
  const { data: products = [], isLoading: productsLoading } = useSupplierProducts(supplierId);

  const backHref = pathname.replace(/\/[^/]+\/?$/, "");
  const preferred = products.filter((p) => p.is_preferred);
  const others = products.filter((p) => !p.is_preferred);

  if (supplierLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Fournisseur introuvable.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3">
        <Button variant="outline" size="sm" asChild className="w-fit">
          <Link href={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux fournisseurs
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{supplier.name}</h1>
          {!supplier.is_active && <Badge variant="secondary">Inactif</Badge>}
        </div>
        {supplier.notes && <p className="text-muted-foreground text-sm">{supplier.notes}</p>}
      </div>

      {/* Coordonnées */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {supplier.contact_name && (
          <Card>
            <CardContent className="flex items-start gap-3 pt-4">
              <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                <span className="text-xs font-medium">{supplier.contact_name.slice(0, 2).toUpperCase()}</span>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Contact</p>
                <p className="font-medium">{supplier.contact_name}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {supplier.email && (
          <Card>
            <CardContent className="flex items-start gap-3 pt-4">
              <Mail className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <a href={`mailto:${supplier.email}`} className="font-medium hover:underline">
                  {supplier.email}
                </a>
              </div>
            </CardContent>
          </Card>
        )}
        {supplier.phone && (
          <Card>
            <CardContent className="flex items-start gap-3 pt-4">
              <Phone className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Téléphone</p>
                <a href={`tel:${supplier.phone}`} className="font-medium hover:underline">
                  {supplier.phone}
                </a>
              </div>
            </CardContent>
          </Card>
        )}
        {supplier.address && (
          <Card className="sm:col-span-2">
            <CardContent className="flex items-start gap-3 pt-4">
              <MapPin className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Adresse</p>
                <p className="font-medium">{supplier.address}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Produits */}
      <Card>
        <CardHeader>
          <CardTitle>
            Produits approvisionnés
            <span className="text-muted-foreground ml-2 text-sm font-normal">({products.length})</span>
          </CardTitle>
          <CardDescription>
            Tous les produits du catalogue liés à ce fournisseur. L&apos;étoile ★ indique les produits pour lesquels ce
            fournisseur est le préféré.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {productsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">Aucun produit associé à ce fournisseur.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Réf. article</TableHead>
                    <TableHead>Nom fournisseur</TableHead>
                    <TableHead>Unité / Qté min</TableHead>
                    <TableHead className="text-right">Délai</TableHead>
                    <TableHead className="text-right">Prix vente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preferred.length > 0 && others.length > 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-muted-foreground bg-yellow-50/50 py-1.5 text-xs font-medium dark:bg-yellow-950/20"
                      >
                        <Star className="mr-1 inline h-3 w-3 fill-yellow-400 text-yellow-400" />
                        Fournisseur préféré pour ces produits
                      </TableCell>
                    </TableRow>
                  )}
                  {[...preferred, ...(preferred.length > 0 && others.length > 0 ? [null] : []), ...others].map(
                    (row) => {
                      if (row === null) {
                        return (
                          <TableRow key="separator">
                            <TableCell
                              colSpan={6}
                              className="text-muted-foreground bg-muted/30 py-1.5 text-xs font-medium"
                            >
                              Autres produits
                            </TableCell>
                          </TableRow>
                        );
                      }
                      return (
                        <TableRow key={row.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {row.is_preferred && (
                                <Star className="h-3.5 w-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
                              )}
                              <span className="font-medium">{row.product?.name ?? "—"}</span>
                            </div>
                            {row.product?.description && (
                              <p className="text-muted-foreground max-w-[220px] truncate text-xs">
                                {row.product.description}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {row.supplier_product_ref ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {row.supplier_product_name ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {row.order_unit
                              ? `${row.order_quantity ?? 1} ${row.order_unit}`
                              : (row.order_quantity ?? "—")}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {row.lead_time_days != null ? `${row.lead_time_days} j` : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.product?.price != null ? eur.format(row.product.price) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    },
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

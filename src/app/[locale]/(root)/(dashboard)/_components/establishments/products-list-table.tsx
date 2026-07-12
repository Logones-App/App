"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRestoreProduct } from "@/lib/queries/product-archive";
import type { Tables } from "@/lib/supabase/database.types";

import { ArchiveProductDialog } from "./archive-product-dialog";
import { CatalogEntryButtons } from "./catalog-entry-buttons";
import { CATALOG_SECTION_KEYS, type RecipeEdge, buildCatalogSections, filterCatalogSections } from "./catalog-grouping";
import { ProductListRow } from "./product-list-row";
import { useProductInlineEdit } from "./use-product-inline-edit";

type ProductRow = Tables<"products">;

function ArchivedProductsSection({
  products,
  organizationId,
  basePath,
}: {
  products: ProductRow[];
  organizationId: string;
  basePath: string;
}) {
  const restore = useRestoreProduct(organizationId);

  if (!products.length) return null;

  return (
    <div className="mt-6 space-y-2">
      <h3 className="text-muted-foreground text-sm font-medium">Archivés ({products.length})</h3>
      <div className="rounded-md border border-dashed">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead className="w-[80px] text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id} className="opacity-60">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Archivé
                    </Badge>
                    <Link href={`${basePath}/${p.id}`} className="hover:underline">
                      {p.name}
                    </Link>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground hidden max-w-[280px] truncate md:table-cell">
                  {p.description ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Restaurer ce produit"
                    disabled={restore.isPending}
                    onClick={() => restore.mutate(p.id)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

type Props = {
  products: ProductRow[];
  archivedProducts: ProductRow[];
  organizationId: string;
  basePath: string;
  /** Arêtes BOM (recette → ingrédient) pour regrouper les formats sous leur matière. */
  recipeEdges: RecipeEdge[];
};

export function ProductsListTable({ products, archivedProducts, organizationId, basePath, recipeEdges }: Props) {
  const [q, setQ] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(CATALOG_SECTION_KEYS));
  const [showArchived, setShowArchived] = useState(false);
  const [archiveDialogId, setArchiveDialogId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("products-list-expanded-groups");
      if (raw != null) setExpandedIds(new Set(JSON.parse(raw) as string[]));
    } catch {
      // localStorage indisponible
    }
  }, []);

  const edit = useProductInlineEdit(organizationId);
  const normalizedBase = basePath.replace(/\/$/, "");

  const toggleGroup = (key: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem("products-list-expanded-groups", JSON.stringify([...next]));
      } catch {
        // localStorage indisponible
      }
      return next;
    });
  };

  const searchActive = q.trim().length > 0;

  const sections = useMemo(
    () => filterCatalogSections(buildCatalogSections(products, recipeEdges), q),
    [products, recipeEdges, q],
  );

  const totalFilteredProducts = sections.reduce((n, s) => n + s.count, 0);

  const dialogProduct = archiveDialogId ? products.find((p) => p.id === archiveDialogId) : null;

  const row = (p: ProductRow, opts?: { indent?: boolean; badge?: string }) => (
    <ProductListRow
      key={p.id}
      product={p}
      edit={edit}
      normalizedBase={normalizedBase}
      onArchive={setArchiveDialogId}
      indent={opts?.indent}
      badge={opts?.badge}
    />
  );

  if (products.length === 0 && archivedProducts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end gap-2">
          <CatalogEntryButtons base={normalizedBase} />
        </div>
        <div className="rounded-md border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">Aucun produit pour cet établissement.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dialogProduct && (
        <ArchiveProductDialog
          productId={dialogProduct.id}
          productName={dialogProduct.name}
          organizationId={organizationId}
          open={!!archiveDialogId}
          onOpenChange={(v) => {
            if (!v) setArchiveDialogId(null);
          }}
          onArchived={() => setArchiveDialogId(null)}
        />
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <Input
          autoFocus
          placeholder="Rechercher par nom ou description…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-md"
        />
        <div className="flex items-center gap-2">
          {archivedProducts.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowArchived((v) => !v)}
              className="text-muted-foreground"
            >
              {showArchived ? "Masquer les archivés" : `Archivés (${archivedProducts.length})`}
            </Button>
          )}
          <CatalogEntryButtons base={normalizedBase} />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-[132px] text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {searchActive && totalFilteredProducts === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                  Aucun résultat pour cette recherche.
                </TableCell>
              </TableRow>
            ) : (
              sections.flatMap((section) => {
                const isOpen = expandedIds.has(section.key);
                return [
                  <TableRow key={`sec-${section.key}`} className="bg-muted/60">
                    <TableCell colSpan={4} className="p-0">
                      <button
                        type="button"
                        className="hover:bg-muted/80 flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left font-semibold"
                        onClick={() => toggleGroup(section.key)}
                        aria-expanded={isOpen}
                      >
                        {isOpen ? (
                          <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
                        )}
                        <span>{section.emoji}</span>
                        <span className="truncate">{section.label}</span>
                        <Badge variant="secondary" className="shrink-0 font-normal">
                          {section.count} produit{section.count > 1 ? "s" : ""}
                        </Badge>
                      </button>
                    </TableCell>
                  </TableRow>,
                  ...(isOpen
                    ? section.entries.flatMap((entry) =>
                        entry.kind === "matiere"
                          ? [
                              row(entry.matiere, { badge: "matière" }),
                              ...entry.formats.map((f) => row(f, { indent: true, badge: "format" })),
                            ]
                          : [row(entry.product)],
                      )
                    : []),
                ];
              })
            )}
          </TableBody>
        </Table>
      </div>

      {showArchived && (
        <ArchivedProductsSection
          products={archivedProducts}
          organizationId={organizationId}
          basePath={normalizedBase}
        />
      )}
    </div>
  );
}

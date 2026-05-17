"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Tables } from "@/lib/supabase/database.types";

import {
  CategoryDeleteBlockedDialog,
  CategoryDeleteConfirmDialog,
  CategoryUpsertDialog,
} from "./product-category-dialogs";

type ProductRow = Tables<"products">;
type CategoryRow = Tables<"categories">;

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

const ORPHAN_KEY = "__orphan__";

function groupKeyForProduct(p: ProductRow, categoryById: Map<string, string>): string {
  return categoryById.has(p.category_id) ? p.category_id : ORPHAN_KEY;
}

function labelForGroup(categoryId: string, categoryById: Map<string, string>): string {
  if (categoryId === ORPHAN_KEY) return "Sans catégorie";
  return categoryById.get(categoryId) ?? "Sans catégorie";
}

function countProductsInCategory(products: ProductRow[], categoryId: string): number {
  return products.filter((p) => p.category_id === categoryId).length;
}

type Props = {
  products: ProductRow[];
  establishmentCategories: CategoryRow[];
  categoryById: Map<string, string>;
  establishmentId: string;
  organizationId: string;
  /** Ex. `/fr/dashboard/establishments/…/products` — les liens pointent vers `${basePath}/${id}`. */
  basePath: string;
};

export function ProductsListTable({
  products,
  establishmentCategories,
  categoryById,
  establishmentId,
  organizationId,
  basePath,
}: Props) {
  const [q, setQ] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const [upsertOpen, setUpsertOpen] = useState(false);
  const [upsertCategory, setUpsertCategory] = useState<CategoryRow | null>(null);
  const [deleteBlockedOpen, setDeleteBlockedOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const normalizedBase = basePath.replace(/\/$/, "");

  const toggleCategory = (categoryId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const searchActive = q.trim().length > 0;

  const groups = useMemo(() => {
    const t = q.trim().toLowerCase();
    const productList = !t
      ? products
      : products.filter((p) => {
          const name = p.name.toLowerCase();
          const desc = (p.description ?? "").toLowerCase();
          return name.includes(t) || desc.includes(t);
        });

    const byKey = new Map<string, ProductRow[]>();
    for (const p of productList) {
      const key = groupKeyForProduct(p, categoryById);
      const arr = byKey.get(key);
      if (arr) arr.push(p);
      else byKey.set(key, [p]);
    }

    if (!searchActive) {
      for (const cat of establishmentCategories) {
        if (!byKey.has(cat.id)) {
          byKey.set(cat.id, []);
        }
      }
    }

    let entries = [...byKey.entries()].map(([categoryId, prods]) => ({
      categoryId,
      label: labelForGroup(categoryId, categoryById),
      products: [...prods].sort((a, b) => a.name.localeCompare(b.name, "fr")),
    }));

    if (searchActive) {
      entries = entries.filter((e) => e.products.length > 0);
    }

    entries.sort((a, b) => a.label.localeCompare(b.label, "fr"));
    return entries;
  }, [products, q, categoryById, establishmentCategories, searchActive]);

  const openCreateCategory = () => {
    setUpsertCategory(null);
    setUpsertOpen(true);
  };

  const openEditCategory = (categoryId: string) => {
    const row = establishmentCategories.find((c) => c.id === categoryId) ?? null;
    if (!row) return;
    setUpsertCategory(row);
    setUpsertOpen(true);
  };

  const openDeleteCategory = (categoryId: string, label: string) => {
    const n = countProductsInCategory(products, categoryId);
    if (n > 0) {
      setDeleteBlockedOpen(true);
      return;
    }
    setDeleteConfirm({ id: categoryId, name: label });
  };

  const totalFilteredProducts = groups.reduce((n, g) => n + g.products.length, 0);
  const hasAnyCategories = establishmentCategories.length > 0;
  const hasAnyProducts = products.length > 0;
  const showEmptyOrg = !hasAnyProducts && !hasAnyCategories;

  if (showEmptyOrg) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Button type="button" variant="secondary" size="sm" onClick={openCreateCategory}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle catégorie
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`${normalizedBase}/new`}>Nouveau produit</Link>
          </Button>
        </div>
        <div className="space-y-4 rounded-md border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Aucune catégorie ni produit pour cet établissement. Créez d&apos;abord une catégorie ou un produit.
          </p>
        </div>

        <CategoryUpsertDialog
          open={upsertOpen}
          onOpenChange={setUpsertOpen}
          category={upsertCategory}
          establishmentId={establishmentId}
          organizationId={organizationId}
        />
        <CategoryDeleteBlockedDialog open={deleteBlockedOpen} onOpenChange={setDeleteBlockedOpen} />
        <CategoryDeleteConfirmDialog
          open={deleteConfirm !== null}
          onOpenChange={(open) => !open && setDeleteConfirm(null)}
          categoryName={deleteConfirm?.name ?? ""}
          categoryId={deleteConfirm?.id ?? ""}
          organizationId={organizationId}
          establishmentId={establishmentId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <Input
          placeholder="Rechercher par nom ou description…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-md"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={openCreateCategory}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle catégorie
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`${normalizedBase}/new`}>Nouveau produit</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-[100px] text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {searchActive && totalFilteredProducts === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                  Aucun résultat pour cette recherche.
                </TableCell>
              </TableRow>
            ) : (
              groups.flatMap((group) => {
                const isOpen = expandedIds.has(group.categoryId);
                const isOrphan = group.categoryId === ORPHAN_KEY;
                const canManageCategory = !isOrphan;

                return [
                  <TableRow key={`cat-${group.categoryId}`} className="bg-muted/60">
                    <TableCell colSpan={5} className="p-0">
                      <div className="flex w-full min-w-0 items-stretch gap-1">
                        <button
                          type="button"
                          className="hover:bg-muted/80 flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-4 py-2.5 text-left font-semibold"
                          onClick={() => toggleCategory(group.categoryId)}
                          aria-expanded={isOpen}
                          aria-label={`${isOpen ? "Replier" : "Déplier"} la catégorie ${group.label}`}
                        >
                          {isOpen ? (
                            <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden />
                          ) : (
                            <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden />
                          )}
                          <span className="truncate">{group.label}</span>
                          <Badge variant="secondary" className="shrink-0 font-normal">
                            {group.products.length} produit{group.products.length > 1 ? "s" : ""}
                          </Badge>
                        </button>
                        {canManageCategory ? (
                          <div className="flex shrink-0 items-center gap-0.5 pr-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              aria-label={`Modifier ${group.label}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditCategory(group.categoryId);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive h-9 w-9"
                              aria-label={`Supprimer ${group.label}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteCategory(group.categoryId, group.label);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>,
                  ...(isOpen
                    ? group.products.length > 0
                      ? group.products.map((p) => (
                          <TableRow key={p.id} className="border-l-primary/25 border-l-2 md:border-l-[3px]">
                            <TableCell className="pl-4 font-medium md:pl-6">{p.name}</TableCell>
                            <TableCell className="text-muted-foreground hidden max-w-[280px] truncate md:table-cell">
                              {p.description ?? "—"}
                            </TableCell>
                            <TableCell>{eur.format(p.price)}</TableCell>
                            <TableCell>
                              <Badge variant={p.is_available ? "default" : "secondary"}>
                                {p.is_available ? "Disponible" : "Indisponible"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" asChild aria-label={`Ouvrir ${p.name}`}>
                                <Link href={`${normalizedBase}/${p.id}`}>
                                  <ChevronRight className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      : [
                          <TableRow key={`empty-${group.categoryId}`}>
                            <TableCell
                              colSpan={5}
                              className="text-muted-foreground bg-muted/20 py-6 pl-8 text-sm italic md:pl-10"
                            >
                              Aucun produit dans cette catégorie.
                            </TableCell>
                          </TableRow>,
                        ]
                    : []),
                ];
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CategoryUpsertDialog
        open={upsertOpen}
        onOpenChange={setUpsertOpen}
        category={upsertCategory}
        establishmentId={establishmentId}
        organizationId={organizationId}
      />
      <CategoryDeleteBlockedDialog open={deleteBlockedOpen} onOpenChange={setDeleteBlockedOpen} />
      {deleteConfirm ? (
        <CategoryDeleteConfirmDialog
          open
          onOpenChange={(open) => !open && setDeleteConfirm(null)}
          categoryName={deleteConfirm.name}
          categoryId={deleteConfirm.id}
          organizationId={organizationId}
          establishmentId={establishmentId}
        />
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import { Check, ChevronDown, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AllergenBadges, LabelBadges } from "@/components/ui/product-attribute-pickers";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Tables } from "@/lib/supabase/database.types";

import {
  CategoryDeleteBlockedDialog,
  CategoryDeleteConfirmDialog,
  CategoryUpsertDialog,
} from "./product-category-dialogs";
import { type EditableField, useProductInlineEdit } from "./use-product-inline-edit";

type ProductRow = Tables<"products">;
type CategoryRow = Tables<"categories">;

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

// ─── Cellule texte éditable ──────────────────────────────────────────────────

function InlineTextCell({
  value,
  placeholder,
  isActive,
  onActivate,
  onSave,
  onCancel,
  onTabNext,
  className,
}: {
  value: string | null;
  placeholder?: string;
  isActive: boolean;
  onActivate: () => void;
  onSave: (v: string) => void;
  onCancel: () => void;
  onTabNext: () => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isActive) {
      setDraft(value ?? "");
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isActive, value]);

  if (isActive) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onSave(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSave(draft);
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
          if (e.key === "Tab") {
            e.preventDefault();
            onSave(draft);
            onTabNext();
          }
        }}
        className={`h-7 px-2 text-sm ${className ?? ""}`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onFocus={onActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onActivate();
      }}
      className={`hover:bg-muted/60 focus:ring-ring block cursor-text rounded px-1 py-0.5 focus:ring-1 focus:outline-none ${className ?? ""}`}
      title="Cliquer pour modifier"
    >
      {value ?? <span className="text-muted-foreground italic">{placeholder ?? "—"}</span>}
    </span>
  );
}

// ─── Props et composant principal ────────────────────────────────────────────

type Props = {
  products: ProductRow[];
  establishmentCategories: CategoryRow[];
  categoryById: Map<string, string>;
  establishmentId: string;
  organizationId: string;
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

  const edit = useProductInlineEdit(organizationId);
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
        if (!byKey.has(cat.id)) byKey.set(cat.id, []);
      }
    }

    let entries = [...byKey.entries()].map(([categoryId, prods]) => ({
      categoryId,
      label: labelForGroup(categoryId, categoryById),
      products: [...prods].sort((a, b) => a.name.localeCompare(b.name, "fr")),
    }));

    if (searchActive) entries = entries.filter((e) => e.products.length > 0);
    entries.sort((a, b) => a.label.localeCompare(b.label, "fr"));
    return entries;
  }, [products, q, categoryById, establishmentCategories, searchActive]);

  const isCell = (productId: string, field: EditableField) =>
    edit.activeCell?.productId === productId && edit.activeCell.field === field;

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
    if (countProductsInCategory(products, categoryId) > 0) {
      setDeleteBlockedOpen(true);
      return;
    }
    setDeleteConfirm({ id: categoryId, name: label });
  };

  const hasAnyCategories = establishmentCategories.length > 0;
  const hasAnyProducts = products.length > 0;
  const totalFilteredProducts = groups.reduce((n, g) => n + g.products.length, 0);

  const renderProductRow = (p: ProductRow) => {
    const isRowEdit = edit.editingRowId === p.id;

    if (isRowEdit) {
      return (
        <TableRow key={p.id} className="border-l-primary bg-muted/20 border-l-2 md:border-l-[3px]">
          <TableCell className="pl-4 md:pl-6">
            <Input
              autoFocus
              value={edit.rowDraft.name ?? ""}
              onChange={(e) => edit.patchRowDraft({ name: e.target.value })}
              className="h-7 px-2 text-sm"
              placeholder="Nom"
            />
          </TableCell>
          <TableCell className="hidden max-w-[280px] md:table-cell">
            <Input
              value={edit.rowDraft.description ?? ""}
              onChange={(e) => edit.patchRowDraft({ description: e.target.value || null })}
              className="h-7 px-2 text-sm"
              placeholder="Description"
            />
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Switch
                checked={edit.rowDraft.is_available ?? true}
                onCheckedChange={(v) => edit.patchRowDraft({ is_available: v })}
                id={`row-avail-${p.id}`}
              />
              <label htmlFor={`row-avail-${p.id}`} className="cursor-pointer text-sm">
                {edit.rowDraft.is_available ? "Dispo" : "Indispo"}
              </label>
            </div>
          </TableCell>
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-green-600 hover:text-green-700"
                onClick={() => edit.confirmRowEdit(p.id)}
                disabled={edit.isPending}
                aria-label="Confirmer"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive h-7 w-7"
                onClick={edit.cancelRowEdit}
                aria-label="Annuler"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    return (
      <TableRow key={p.id} className="border-l-primary/25 border-l-2 md:border-l-[3px]">
        <TableCell className="pl-4 font-medium md:pl-6">
          <InlineTextCell
            value={p.name}
            isActive={isCell(p.id, "name")}
            onActivate={() => edit.activateCell(p.id, "name")}
            onSave={(v) => edit.saveCell(p.id, "name", v)}
            onCancel={edit.deactivateCell}
            onTabNext={() => edit.tabToNext(p.id, "name")}
          />
        </TableCell>
        <TableCell className="text-muted-foreground hidden max-w-[280px] md:table-cell">
          <InlineTextCell
            value={p.description}
            placeholder="—"
            isActive={isCell(p.id, "description")}
            onActivate={() => edit.activateCell(p.id, "description")}
            onSave={(v) => edit.saveCell(p.id, "description", v || null)}
            onCancel={edit.deactivateCell}
            onTabNext={() => edit.tabToNext(p.id, "description")}
            className="truncate"
          />
          {(() => {
            const allergens = p.allergens as string[] | null;
            const lbls = p.labels as string[] | null;
            if (!allergens?.length && !lbls?.length) return null;
            return (
              <div className="mt-1 space-y-1">
                <AllergenBadges allergens={allergens ?? []} />
                <LabelBadges labels={lbls ?? []} />
              </div>
            );
          })()}
        </TableCell>
        <TableCell>
          <button
            type="button"
            onClick={() => edit.saveCell(p.id, "is_available", !p.is_available)}
            className="focus:ring-ring rounded focus:ring-1 focus:outline-none"
            title="Cliquer pour basculer"
          >
            <Badge variant={p.is_available ? "default" : "secondary"}>
              {p.is_available ? "Disponible" : "Indisponible"}
            </Badge>
          </button>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => edit.startRowEdit(p)}
              aria-label={`Éditer ${p.name}`}
              title="Éditer toute la ligne"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild aria-label={`Ouvrir ${p.name}`}>
              <Link href={`${normalizedBase}/${p.id}`}>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  if (!hasAnyProducts && !hasAnyCategories) {
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
          onOpenChange={(o) => !o && setDeleteConfirm(null)}
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
                return [
                  <TableRow key={`cat-${group.categoryId}`} className="bg-muted/60">
                    <TableCell colSpan={5} className="p-0">
                      <div className="flex w-full min-w-0 items-stretch gap-1">
                        <button
                          type="button"
                          className="hover:bg-muted/80 flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-4 py-2.5 text-left font-semibold"
                          onClick={() => toggleCategory(group.categoryId)}
                          aria-expanded={isOpen}
                        >
                          {isOpen ? (
                            <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
                          ) : (
                            <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
                          )}
                          <span className="truncate">{group.label}</span>
                          <Badge variant="secondary" className="shrink-0 font-normal">
                            {group.products.length} produit{group.products.length > 1 ? "s" : ""}
                          </Badge>
                        </button>
                        {!isOrphan ? (
                          <div className="flex shrink-0 items-center gap-0.5 pr-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
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
                      ? group.products.map(renderProductRow)
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
          onOpenChange={(o) => !o && setDeleteConfirm(null)}
          categoryName={deleteConfirm.name}
          categoryId={deleteConfirm.id}
          organizationId={organizationId}
          establishmentId={establishmentId}
        />
      ) : null}
    </div>
  );
}

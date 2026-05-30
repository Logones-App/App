"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import { Check, ChevronDown, ChevronRight, Pencil, RotateCcw, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AllergenBadges, LabelBadges } from "@/components/ui/product-attribute-pickers";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PRODUCT_TYPES, resolveProductBehaviors } from "@/lib/constants/product-attributes";
import { useRestoreProduct } from "@/lib/queries/product-archive";
import type { Tables } from "@/lib/supabase/database.types";

import { ArchiveProductDialog } from "./archive-product-dialog";
import { type EditableField, useProductInlineEdit } from "./use-product-inline-edit";

type ProductRow = Tables<"products">;

const NONE_KEY = "__none__";
const TYPE_ORDER = [...PRODUCT_TYPES.map((t) => t.key), NONE_KEY];

function labelForType(key: string): { label: string; emoji: string } {
  if (key === NONE_KEY) return { label: "Non classé", emoji: "📦" };
  const found = PRODUCT_TYPES.find((t) => t.key === key);
  return found ? { label: found.label, emoji: found.emoji } : { label: key, emoji: "📦" };
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

// ─── Section produits archivés ────────────────────────────────────────────────

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

// ─── Props et composant principal ────────────────────────────────────────────

type Props = {
  products: ProductRow[];
  archivedProducts: ProductRow[];
  organizationId: string;
  basePath: string;
};

export function ProductsListTable({ products, archivedProducts, organizationId, basePath }: Props) {
  const [q, setQ] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(TYPE_ORDER));
  const [showArchived, setShowArchived] = useState(false);
  const [archiveDialogId, setArchiveDialogId] = useState<string | null>(null);

  const edit = useProductInlineEdit(organizationId);
  const normalizedBase = basePath.replace(/\/$/, "");

  const toggleGroup = (key: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const searchActive = q.trim().length > 0;

  const groups = useMemo(() => {
    const t = q.trim().toLowerCase();
    const productList = !t
      ? products
      : products.filter((p) => p.name.toLowerCase().includes(t) || (p.description ?? "").toLowerCase().includes(t));

    const byKey = new Map<string, ProductRow[]>();
    for (const p of productList) {
      const types = (p.product_type as string[] | null) ?? [];
      const keys = types.length > 0 ? types : [NONE_KEY];
      for (const key of keys) {
        const arr = byKey.get(key) ?? [];
        arr.push(p);
        byKey.set(key, arr);
      }
    }

    let entries = [...byKey.entries()].map(([typeKey, prods]) => ({
      typeKey,
      ...labelForType(typeKey),
      products: [...prods].sort((a, b) => a.name.localeCompare(b.name, "fr")),
    }));

    if (searchActive) entries = entries.filter((e) => e.products.length > 0);

    entries.sort((a, b) => {
      const ia = TYPE_ORDER.indexOf(a.typeKey);
      const ib = TYPE_ORDER.indexOf(b.typeKey);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    return entries;
  }, [products, q, searchActive]);

  const isCell = (productId: string, field: EditableField) =>
    edit.activeCell?.productId === productId && edit.activeCell.field === field;

  const totalFilteredProducts = groups.reduce((n, g) => n + g.products.length, 0);

  const dialogProduct = archiveDialogId ? products.find((p) => p.id === archiveDialogId) : null;

  const renderProductRow = (p: ProductRow) => {
    const isRowEdit = edit.editingRowId === p.id;

    if (isRowEdit) {
      return (
        <TableRow key={p.id} className="border-l-primary bg-muted/20 border-l-2 md:border-l-[3px]">
          <TableCell className="pl-4 font-medium md:pl-6">
            <Link href={`${normalizedBase}/${p.id}`} className="hover:underline">
              {p.name}
            </Link>
          </TableCell>
          <TableCell className="hidden max-w-[280px] md:table-cell">
            <Input
              autoFocus
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
          <Link href={`${normalizedBase}/${p.id}`} className="hover:underline">
            {p.name}
          </Link>
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
          <div className="flex flex-wrap gap-1">
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
            {(() => {
              const types = (p.product_type as string[] | null) ?? [];
              const behavior = resolveProductBehaviors(types);
              if (!behavior.isForSale && types.length > 0)
                return (
                  <Badge variant="outline" className="text-muted-foreground text-xs">
                    Non vendu
                  </Badge>
                );
              if (!behavior.showInPOS && behavior.isForSale)
                return (
                  <Badge variant="outline" className="text-muted-foreground text-xs">
                    Hors POS
                  </Badge>
                );
              return null;
            })()}
          </div>
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive h-8 w-8"
              aria-label={`Archiver ${p.name}`}
              title="Archiver ce produit"
              onClick={() => setArchiveDialogId(p.id)}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
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

  if (products.length === 0 && archivedProducts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link href={`${normalizedBase}/new`}>Nouveau produit</Link>
          </Button>
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
              groups.flatMap((group) => {
                const isOpen = expandedIds.has(group.typeKey);
                return [
                  <TableRow key={`type-${group.typeKey}`} className="bg-muted/60">
                    <TableCell colSpan={4} className="p-0">
                      <button
                        type="button"
                        className="hover:bg-muted/80 flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left font-semibold"
                        onClick={() => toggleGroup(group.typeKey)}
                        aria-expanded={isOpen}
                      >
                        {isOpen ? (
                          <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
                        )}
                        <span>{group.emoji}</span>
                        <span className="truncate">{group.label}</span>
                        <Badge variant="secondary" className="shrink-0 font-normal">
                          {group.products.length} produit{group.products.length > 1 ? "s" : ""}
                        </Badge>
                      </button>
                    </TableCell>
                  </TableRow>,
                  ...(isOpen ? group.products.map(renderProductRow) : []),
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

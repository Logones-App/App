"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import { Check, ExternalLink, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrganizationProducts } from "@/lib/queries/establishments";
import type {
  MenuProductPricingJoin,
  ProductCompositionRow,
  ProductWithCategoryName,
} from "@/lib/queries/product-establishment-dashboard";
import {
  getCurrentPurchasePrice,
  useComponentCurrentPurchasePrices,
  useProductPurchasePriceHistory,
} from "@/lib/queries/purchase-price-queries";
import { compositionLineCost } from "@/lib/utils/unit-conversion";

import { CompositionEditModal } from "./composition-edit-modal";
import { ProductMargePanel } from "./product-dashboard-marge-panel";
import { useCompositionInlineEdit } from "./use-composition-inline-edit";

function MargeCard({
  selfPurchasePrice,
  technicalLines,
  componentPrices,
}: {
  selfPurchasePrice: number | null;
  technicalLines: ProductCompositionRow[];
  componentPrices: Map<string, number>;
}) {
  const recipeCostHT = technicalLines
    .filter((c) => c.composition_kind === "recipe")
    .reduce((sum, c) => {
      const uc = componentPrices.get(c.component_product_id);
      const cost = compositionLineCost(c.default_quantity, c.quantity_unit, uc, c.component?.portion_unit);
      return cost != null ? sum + cost : sum;
    }, 0);

  const hasComponentPrices = technicalLines.some((c) => componentPrices.has(c.component_product_id));
  const costHT = hasComponentPrices ? recipeCostHT : selfPurchasePrice;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coût matière HT</CardTitle>
        <CardDescription>
          {hasComponentPrices
            ? "Somme Σ (qté recette × prix d'achat HT du composant)."
            : "Prix d'achat HT du produit (aucun ingrédient). Consultez l'onglet Marge pour les marges par menu."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">
            {hasComponentPrices ? "Coût matière HT (recette)" : "Prix d'achat HT"}
          </p>
          {costHT != null ? (
            <p className="text-2xl font-semibold tabular-nums">{eur.format(costHT)}</p>
          ) : (
            <>
              <p className="text-muted-foreground text-lg">—</p>
              <p className="text-muted-foreground text-xs">
                Renseignez les prix d&apos;achat dans l&apos;onglet dédié.
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

const KIND_OPTIONS = [
  { value: "recipe", label: "Recette (BOM)" },
  { value: "modifier", label: "Modificateur" },
];

// ─── Cellule select Kind ─────────────────────────────────────────────────────

function InlineKindCell({
  value,
  isActive,
  onActivate,
  onSave,
  onTabNext,
}: {
  value: string;
  isActive: boolean;
  onActivate: () => void;
  onSave: (v: string) => void;
  onTabNext: () => void;
}) {
  if (isActive) {
    return (
      <Select
        value={value}
        onValueChange={(v) => {
          onSave(v);
          onTabNext();
        }}
        open
        onOpenChange={(o) => {
          if (!o) onTabNext();
        }}
      >
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {KIND_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  const label = KIND_OPTIONS.find((o) => o.value === value)?.label ?? value;
  return (
    <button
      type="button"
      onClick={onActivate}
      className="text-muted-foreground hover:bg-muted/60 focus:ring-ring rounded px-1 py-0.5 text-sm focus:ring-1 focus:outline-none"
    >
      {label}
    </button>
  );
}

// ─── Cellule nombre éditable ─────────────────────────────────────────────────

function InlineNumberCell({
  value,
  nullable,
  isActive,
  onActivate,
  onSave,
  onTabNext,
}: {
  value: number | null;
  nullable?: boolean;
  isActive: boolean;
  onActivate: () => void;
  onSave: (v: number | null) => void;
  onTabNext: () => void;
}) {
  const [draft, setDraft] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isActive) {
      setDraft(value != null ? String(value) : "");
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isActive, value]);

  const commit = () => {
    const t = draft.trim().replace(",", ".");
    if (nullable && t === "") {
      onSave(null);
      return;
    }
    const n = parseFloat(t);
    onSave(Number.isFinite(n) ? n : value);
  };

  if (isActive) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
            onTabNext();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onTabNext();
          }
          if (e.key === "Tab") {
            e.preventDefault();
            commit();
            onTabNext();
          }
        }}
        inputMode="decimal"
        className="h-7 w-20 px-2 text-sm tabular-nums"
        placeholder={nullable ? "—" : "0"}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onActivate}
      className="hover:bg-muted/60 focus:ring-ring w-full rounded px-1 py-0.5 text-right tabular-nums focus:ring-1 focus:outline-none"
    >
      {value ?? <span className="text-muted-foreground">—</span>}
    </button>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────

export function ProductFicheTechniquePanel({
  product,
  compositions,
  establishmentId,
  organizationId,
  menuProductPricing = [],
  newProductHref,
}: {
  product: ProductWithCategoryName;
  compositions: ProductCompositionRow[];
  establishmentId: string;
  organizationId: string;
  menuProductPricing?: MenuProductPricingJoin[];
  newProductHref?: string;
}) {
  const edit = useCompositionInlineEdit({
    productId: product.id,
    establishmentId,
    organizationId,
  });

  const [editingComposition, setEditingComposition] = useState<string | null>(null);
  const compositionQueryKey = ["product-establishment-dashboard", product.id, establishmentId, organizationId];

  const { data: orgProducts = [] } = useOrganizationProducts(organizationId || undefined);
  const availableComponents = orgProducts.filter((p) => p.id !== product.id);

  const technicalLines = compositions.filter((c) => c.main_product_id !== c.component_product_id);
  const componentIds = technicalLines.map((c) => c.component_product_id);
  const { data: componentPrices } = useComponentCurrentPurchasePrices(componentIds, organizationId);
  const { data: selfHistory = [] } = useProductPurchasePriceHistory(product.id, organizationId);
  const selfPurchasePrice = getCurrentPurchasePrice(selfHistory)?.unit_cost ?? null;

  const totalCostHT = technicalLines
    .filter((c) => c.composition_kind === "recipe")
    .reduce((sum, c) => {
      const uc = componentPrices?.get(c.component_product_id);
      const cost = compositionLineCost(c.default_quantity, c.quantity_unit, uc, c.component?.portion_unit);
      return cost != null ? sum + cost : sum;
    }, 0);

  const renderExistingRow = (c: ProductCompositionRow) => {
    const unitCost = componentPrices?.get(c.component_product_id) ?? null;
    const lineCost =
      c.composition_kind === "recipe"
        ? compositionLineCost(c.default_quantity, c.quantity_unit, unitCost, c.component?.portion_unit)
        : null;
    const pct = lineCost != null && totalCostHT > 0 ? lineCost / totalCostHT : null;
    return (
      <TableRow key={c.id}>
        <TableCell className="font-medium">{c.component?.name ?? "—"}</TableCell>
        <TableCell>
          <InlineKindCell
            value={c.composition_kind}
            isActive={edit.isCell(c.id, "composition_kind")}
            onActivate={() => edit.setActiveCell({ id: c.id, field: "composition_kind" })}
            onSave={(v) => edit.saveCell(c.id, "composition_kind", v)}
            onTabNext={() => edit.tabToNext(c.id, "composition_kind")}
          />
        </TableCell>
        <TableCell className="text-right">
          <InlineNumberCell
            value={c.default_quantity}
            isActive={edit.isCell(c.id, "default_quantity")}
            onActivate={() => edit.setActiveCell({ id: c.id, field: "default_quantity" })}
            onSave={(v) => edit.saveCell(c.id, "default_quantity", v)}
            onTabNext={() => edit.tabToNext(c.id, "default_quantity")}
          />
        </TableCell>
        <TableCell className="text-muted-foreground text-right text-sm tabular-nums">
          {lineCost != null ? eur.format(lineCost) : <span className="opacity-40">—</span>}
        </TableCell>
        <TableCell className="text-right text-sm tabular-nums">
          {pct != null ? (
            <span className={pct > 0.4 ? "text-red-600" : pct > 0.25 ? "text-yellow-600" : "text-muted-foreground"}>
              {new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 }).format(pct)}
            </span>
          ) : (
            <span className="opacity-40">—</span>
          )}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setEditingComposition(c.id)}
              aria-label="Modifier"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive h-7 w-7"
              onClick={() => edit.deleteRow(c.id)}
              disabled={edit.isPending}
              aria-label="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const renderNewRow = () => (
    <TableRow className="bg-muted/20">
      <TableCell>
        <Select
          value={edit.newDraft.component_product_id || undefined}
          onValueChange={(v) => edit.patchNewDraft({ component_product_id: v })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Choisir un ingrédient…" />
          </SelectTrigger>
          <SelectContent>
            {availableComponents.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select
          value={edit.newDraft.composition_kind}
          onValueChange={(v) => edit.patchNewDraft({ composition_kind: v as "recipe" | "modifier" })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KIND_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          value={String(edit.newDraft.default_quantity)}
          onChange={(e) => {
            const n = parseFloat(e.target.value.replace(",", "."));
            edit.patchNewDraft({ default_quantity: Number.isFinite(n) ? n : 1 });
          }}
          inputMode="decimal"
          className="h-7 w-20 px-2 text-sm tabular-nums"
          placeholder="1"
        />
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">—</TableCell>
      <TableCell className="text-muted-foreground text-sm">—</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-green-600 hover:text-green-700"
            onClick={edit.confirmAdd}
            disabled={edit.isPending || !edit.newDraft.component_product_id}
            aria-label="Confirmer"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive h-7 w-7"
            onClick={edit.cancelAdd}
            aria-label="Annuler"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fiche technique — recette</CardTitle>
          <CardDescription>
            Ingrédients et quantités pour documenter la recette. Les lignes <span className="font-medium">Recette</span>{" "}
            participent au BOM caisse ; <span className="font-medium">Modificateur</span>, ce sont des suppléments
            client. Cliquez sur une cellule pour la modifier directement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingrédient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qté</TableHead>
                  <TableHead className="text-right">Coût HT</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {technicalLines.length === 0 && !edit.isAddingRow ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground h-16 text-center text-sm">
                      Aucun ingrédient. Cliquez sur &quot;Ajouter un ingrédient&quot; pour commencer.
                    </TableCell>
                  </TableRow>
                ) : (
                  technicalLines.map(renderExistingRow)
                )}
                {edit.isAddingRow && renderNewRow()}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={edit.startAddRow}
              disabled={edit.isAddingRow || edit.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un ingrédient
            </Button>
            {newProductHref && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={newProductHref} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                  Créer un nouveau produit
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <MargeCard
        selfPurchasePrice={selfPurchasePrice}
        technicalLines={technicalLines}
        componentPrices={componentPrices ?? new Map()}
      />

      {menuProductPricing.length > 0 && (
        <ProductMargePanel
          product={product}
          compositions={compositions}
          menuProductPricing={menuProductPricing}
          organizationId={organizationId}
        />
      )}

      {editingComposition !== null &&
        (() => {
          const comp = technicalLines.find((c) => c.id === editingComposition);
          if (!comp) return null;
          return (
            <CompositionEditModal
              composition={comp}
              componentName={comp.component?.name ?? "—"}
              currentUnitCost={componentPrices?.get(comp.component_product_id) ?? null}
              organizationId={organizationId}
              queryKey={compositionQueryKey}
              onClose={() => setEditingComposition(null)}
            />
          );
        })()}
    </div>
  );
}

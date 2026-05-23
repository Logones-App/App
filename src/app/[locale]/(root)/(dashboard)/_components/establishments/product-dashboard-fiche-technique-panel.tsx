"use client";

import { useEffect, useRef, useState } from "react";

import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

import { CompositionAddModal } from "./composition-add-modal";
import { CompositionEditModal } from "./composition-edit-modal";
import { ProductFournisseursPrixPanel } from "./product-dashboard-fournisseurs-prix-panel";
import { ProductMargePanel } from "./product-dashboard-marge-panel";
import { InlineIngredientAddRow } from "./product-fiche-ingredient-inline-row";
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
}: {
  product: ProductWithCategoryName;
  compositions: ProductCompositionRow[];
  establishmentId: string;
  organizationId: string;
  menuProductPricing?: MenuProductPricingJoin[];
}) {
  const edit = useCompositionInlineEdit({
    productId: product.id,
    establishmentId,
    organizationId,
  });

  const [editingComposition, setEditingComposition] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const compositionQueryKey = ["product-establishment-dashboard", product.id, establishmentId, organizationId];

  const { data: allProducts = [] } = useOrganizationProducts(organizationId || undefined);
  const ingredientList = allProducts.filter(
    (p) => p.id !== product.id && (p.product_type as string[] | null)?.includes("ingredient"),
  );

  // Seulement les ingrédients BOM (recette)
  const technicalLines = compositions.filter(
    (c) => c.main_product_id !== c.component_product_id && c.composition_kind === "recipe",
  );
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
    const lineCost = compositionLineCost(c.default_quantity, c.quantity_unit, unitCost, c.component?.portion_unit);
    const pct = lineCost != null && totalCostHT > 0 ? lineCost / totalCostHT : null;
    return (
      <TableRow key={c.id}>
        <TableCell className="font-medium">{c.component?.name ?? "—"}</TableCell>
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

  return (
    <div className="space-y-6">
      {/* Achat Direct — fournisseurs & prix du produit recette */}
      <ProductFournisseursPrixPanel
        productId={product.id}
        organizationId={organizationId}
        portionUnit={product.portion_unit ?? null}
        title="Achat direct"
        description="Prix d'achat si ce plat est acheté prêt à l'emploi (plutôt que cuisiné)."
      />

      <Card>
        <CardHeader>
          <CardTitle>Ingrédients de la recette</CardTitle>
          <CardDescription>
            Compositions BOM. Cliquez sur ✏️ pour modifier une ligne (type, quantité, unité, prix).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingrédient</TableHead>
                  <TableHead className="text-right">Qté</TableHead>
                  <TableHead className="text-right">Coût HT</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {technicalLines.length === 0 && !showInlineAdd ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground h-16 text-center text-sm">
                      Aucun ingrédient. Cliquez sur &quot;Ajouter&quot; pour commencer.
                    </TableCell>
                  </TableRow>
                ) : (
                  technicalLines.map(renderExistingRow)
                )}
                {showInlineAdd && (
                  <InlineIngredientAddRow
                    ingredients={ingredientList}
                    organizationId={organizationId}
                    isPending={edit.isPending}
                    colSpan={5}
                    onAdd={({ componentId, quantity, quantityUnit }) =>
                      edit.insertMutation.mutate(
                        {
                          component_product_id: componentId,
                          composition_kind: "recipe",
                          default_quantity: quantity,
                          max_quantity: null,
                          show_in_customization: false,
                          quantity_unit: quantityUnit,
                        },
                        { onSuccess: () => setShowInlineAdd(false) },
                      )
                    }
                    onCancel={() => setShowInlineAdd(false)}
                  />
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap gap-2">
            {!showInlineAdd && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowInlineAdd(true)}
                disabled={edit.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un ingrédient
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddModal(true)}
              disabled={edit.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              Créer un ingrédient
            </Button>
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

      {showAddModal && (
        <CompositionAddModal
          productId={product.id}
          establishmentId={establishmentId}
          organizationId={organizationId}
          queryKey={compositionQueryKey}
          onClose={() => setShowAddModal(false)}
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

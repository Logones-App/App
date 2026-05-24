"use client";

import { useEffect, useRef, useState } from "react";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type PortionUnit } from "@/lib/constants/product-attributes";
import { useOrganizationProducts } from "@/lib/queries/establishments";
import {
  PRODUCT_DASHBOARD_QUERY_KEY,
  type MenuProductPricingJoin,
  type ProductCompositionRow,
  type ProductWithCategoryName,
} from "@/lib/queries/product-establishment-dashboard";
import { useComponentCurrentPurchasePrices } from "@/lib/queries/purchase-price-queries";
import { compositionLineCost } from "@/lib/utils/unit-conversion";

import { CompositionAddModal } from "./composition-add-modal";
import { CompositionEditModal } from "./composition-edit-modal";
import { ProductFournisseursPrixPanel } from "./product-dashboard-fournisseurs-prix-panel";
import { ProductMargePanel } from "./product-dashboard-marge-panel";
import { InlineIngredientAddRow } from "./product-fiche-ingredient-inline-row";
import { useCompositionInlineEdit } from "./use-composition-inline-edit";

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
  const t = useTranslations("units");
  const isRecipe = (product.product_type as string[] | null)?.includes("recipe") ?? false;
  const edit = useCompositionInlineEdit({
    productId: product.id,
    establishmentId,
    organizationId,
  });

  const [editingComposition, setEditingComposition] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const compositionQueryKey = [PRODUCT_DASHBOARD_QUERY_KEY, product.id, establishmentId, organizationId];

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

  const totalCostHT = technicalLines
    .filter((c) => c.composition_kind === "recipe")
    .reduce((sum, c) => {
      const uc = componentPrices?.get(c.component_product_id);
      const cost = compositionLineCost(c.default_quantity, c.quantity_unit, uc, c.component?.portion_unit);
      return cost != null ? sum + cost : sum;
    }, 0);

  const renderExistingRow = (c: ProductCompositionRow) => {
    const isArchived = c.component?.deleted === true;
    const unitCost = componentPrices?.get(c.component_product_id) ?? null;
    const lineCost = compositionLineCost(c.default_quantity, c.quantity_unit, unitCost, c.component?.portion_unit);
    const pct = lineCost != null && totalCostHT > 0 ? lineCost / totalCostHT : null;
    return (
      <TableRow key={c.id} className={isArchived ? "opacity-50" : undefined}>
        <TableCell className="font-medium">
          {c.component?.name ?? "—"}
          {isArchived && <span className="text-destructive ml-2 text-xs font-normal">(archivé)</span>}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <InlineNumberCell
              value={c.default_quantity}
              isActive={edit.isCell(c.id, "default_quantity")}
              onActivate={() => edit.setActiveCell({ id: c.id, field: "default_quantity" })}
              onSave={(v) => edit.saveCell(c.id, "default_quantity", v)}
              onTabNext={() => edit.tabToNext(c.id, "default_quantity")}
            />
            <span className="text-muted-foreground shrink-0 text-xs">{t(c.quantity_unit as PortionUnit)}</span>
          </div>
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
      <ProductFournisseursPrixPanel
        productId={product.id}
        organizationId={organizationId}
        portionUnit={product.portion_unit ?? null}
        title="Achat direct"
        description={
          isRecipe
            ? "Prix d'achat si ce plat est acheté prêt à l'emploi (plutôt que cuisiné)."
            : "Prix d'achat de ce produit auprès des fournisseurs."
        }
      />

      {isRecipe && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Ingrédients de la recette</CardTitle>
                <CardDescription>
                  Cliquez sur une quantité pour l&apos;éditer en ligne, sur ✏️ pour modifier unité ou type.
                </CardDescription>
              </div>
              <div className="flex shrink-0 gap-2">
                {!showInlineAdd && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInlineAdd(true)}
                    disabled={edit.isPending}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter
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
                  Créer
                </Button>
              </div>
            </div>
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

            {menuProductPricing.length > 0 && (
              <ProductMargePanel
                product={product}
                compositions={compositions}
                menuProductPricing={menuProductPricing}
                organizationId={organizationId}
              />
            )}
          </CardContent>
        </Card>
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

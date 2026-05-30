"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { PORTION_UNITS } from "@/lib/constants/product-attributes";
import { isModifierCompositionKind, isRecipeCompositionKind } from "@/lib/product-composition-stock-tracking";
import type { CompositionStockRow, ProductCompositionRow } from "@/lib/queries/product-establishment-dashboard";
import type { Tables } from "@/lib/supabase/database.types";

import { ProductStockQuickAdjust } from "./product-stock-quick-adjust";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function StockQuantities({ stock }: { stock: Tables<"product_stocks"> }) {
  return (
    <p className="text-sm tabular-nums">
      {stock.current_stock} <span className="text-muted-foreground">(min {stock.min_stock}</span>
      <span className="text-muted-foreground"> / max {stock.max_stock ?? "∞"}</span>
      <span className="text-muted-foreground"> {stock.unit})</span>
    </p>
  );
}

export function TrackedSwitch({
  id,
  label,
  checked,
  disabled,
  pending,
  onCheckedChange,
  helper,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  pending: boolean;
  onCheckedChange: (v: boolean) => void;
  helper?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Switch
          id={id}
          checked={checked}
          disabled={disabled || pending}
          onCheckedChange={(v) => onCheckedChange(Boolean(v))}
        />
        <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
          {label}
        </Label>
      </div>
      {helper ? <p className="text-muted-foreground text-xs">{helper}</p> : null}
    </div>
  );
}

export function CompositionMetaGrid({ row }: { row: ProductCompositionRow }) {
  return (
    <div className="text-muted-foreground grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
      <span>Qté défaut : {row.default_quantity ?? "—"}</span>
      <span>Qté max : {row.max_quantity ?? "—"}</span>
      <span>
        Supplément unitaire : {row.unit_supplement_price != null ? eur.format(row.unit_supplement_price) : "—"}
      </span>
      <span>Multiplicateur prix : {row.price_multiplier ?? "—"}</span>
      <span>Personnalisation : {row.show_in_customization ? "Oui" : "Non"}</span>
      <span>Ordre : {row.display_order ?? "—"}</span>
    </div>
  );
}

export function CompositionLineHeader({
  row,
  isSelfComposition,
}: {
  row: ProductCompositionRow;
  isSelfComposition: boolean;
}) {
  return (
    <CardHeader className="pb-2">
      <div className="flex flex-wrap items-center gap-2">
        {isSelfComposition ? (
          <Badge>Article vendu à l&apos;unité</Badge>
        ) : (
          <Badge variant="secondary">{row.composition_kind === "modifier" ? "Supplément" : "Ingrédient"}</Badge>
        )}
        <span className="font-medium">{row.component?.name ?? "Produit inconnu"}</span>
        {row.is_required && <Badge variant="destructive">Requis</Badge>}
      </div>
    </CardHeader>
  );
}

export function CompositionLineCatalogCard({
  row,
  isSelfComposition,
}: {
  row: ProductCompositionRow;
  isSelfComposition: boolean;
}) {
  return (
    <Card>
      <CompositionLineHeader row={row} isSelfComposition={isSelfComposition} />
      <CardContent>
        <CompositionMetaGrid row={row} />
      </CardContent>
    </Card>
  );
}

type StockCardProps = {
  row: ProductCompositionRow;
  isSelfComposition: boolean;
  lineStock: CompositionStockRow["lineStock"];
  componentIdentityStock: CompositionStockRow["componentIdentityStock"];
  /** Carte self uniquement : avertissement si l’activation du self coupe des suivis recette. */
  selfActivationHelper?: string;
  /** Ingrédient : interrupteur ligne recette figé car self suivi (recette non débitée en parallèle). */
  lineSwitchLockedBySelf: boolean;
  /** Ingrédient : interrupteur pool figé car self suivi et pas de modifier sur ce composant. */
  poolSwitchLockedBySelf: boolean;
  selfTracked: boolean;
  pending: boolean;
  productId: string;
  establishmentId: string;
  organizationId: string;
  /** Self sans fiche stock : création de `product_stocks` avec quantité et unité initiales. */
  onCreateSelfLineStock?: (compositionId: string, initialQuantity: number, unit: string) => void;
  createSelfLineStockPending?: boolean;
  onSelfTrackedChange: (v: boolean) => void;
  onIngredientTrackedChange: (stockId: string, tracked: boolean) => void;
};

export function CompositionStockCard({
  row,
  isSelfComposition,
  lineStock,
  componentIdentityStock,
  selfActivationHelper,
  lineSwitchLockedBySelf,
  poolSwitchLockedBySelf,
  selfTracked,
  pending,
  productId,
  establishmentId,
  organizationId,
  onCreateSelfLineStock,
  createSelfLineStockPending,
  onSelfTrackedChange,
  onIngredientTrackedChange,
}: StockCardProps) {
  const [initQty, setInitQty] = useState("0");
  const [initUnit, setInitUnit] = useState("piece");
  const lineIngredientHelper = lineSwitchLockedBySelf
    ? "Désactivé : l’unité de vente est suivie ; la caisse ne débite pas les lignes recette en parallèle du self."
    : selfTracked && isModifierCompositionKind(row.composition_kind)
      ? "Peut rester suivie avec le self (suppléments / mode hybride)."
      : undefined;

  const poolIngredientHelper = poolSwitchLockedBySelf
    ? "Désactivé : ce pool ne sert qu’à des recettes sans ligne modifier sur ce composant tant que le self est suivi."
    : selfTracked && !poolSwitchLockedBySelf && componentIdentityStock
      ? "Pool utilisable pour les suppléments (modifier) en parallèle du self."
      : undefined;

  return (
    <Card>
      <CompositionLineHeader row={row} isSelfComposition={isSelfComposition} />
      <CardContent className="space-y-4">
        <CompositionMetaGrid row={row} />
        <Separator />
        {isSelfComposition ? (
          <div className="space-y-3">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Stock (ligne recette / SKU)
            </p>
            {lineStock ? (
              <div className="space-y-2">
                <StockQuantities stock={lineStock} />
                <TrackedSwitch
                  id={`stock-self-${lineStock.id}`}
                  label="Suivre l’inventaire sur cette unité (produit fini)"
                  checked={Boolean(lineStock.inventory_tracked)}
                  disabled={false}
                  pending={pending}
                  onCheckedChange={onSelfTrackedChange}
                  helper={selfActivationHelper}
                />
                <ProductStockQuickAdjust
                  stock={lineStock}
                  productId={productId}
                  establishmentId={establishmentId}
                  organizationId={organizationId}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  Aucun stock défini pour ce produit. Saisissez le stock initial pour activer le suivi.
                </p>
                {onCreateSelfLineStock ? (
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                      <Label htmlFor={`csc-qty-${row.id}`}>Quantité initiale</Label>
                      <Input
                        id={`csc-qty-${row.id}`}
                        value={initQty}
                        onChange={(e) => setInitQty(e.target.value)}
                        inputMode="decimal"
                        className="w-24 tabular-nums"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Unité</Label>
                      <Select value={initUnit} onValueChange={setInitUnit}>
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PORTION_UNITS.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u === "piece" ? "pièce" : u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      disabled={createSelfLineStockPending}
                      onClick={() => {
                        const qty = parseFloat(initQty.replace(",", ".")) || 0;
                        onCreateSelfLineStock(row.id, qty, initUnit || "u");
                      }}
                    >
                      {createSelfLineStockPending ? "Initialisation…" : "Initialiser le stock"}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {isRecipeCompositionKind(row.composition_kind) ? "Ingrédient de recette" : "Supplément"}
              </p>
              {lineStock ? (
                <>
                  <StockQuantities stock={lineStock} />
                  <TrackedSwitch
                    id={`stock-line-${lineStock.id}`}
                    label={
                      isRecipeCompositionKind(row.composition_kind)
                        ? "Suivre le stock de cet ingrédient"
                        : "Suivre le stock de ce supplément"
                    }
                    checked={Boolean(lineStock.inventory_tracked)}
                    disabled={lineSwitchLockedBySelf}
                    pending={pending}
                    onCheckedChange={(v) => onIngredientTrackedChange(lineStock.id, v)}
                    helper={lineIngredientHelper}
                  />
                  <ProductStockQuickAdjust
                    stock={lineStock}
                    productId={productId}
                    establishmentId={establishmentId}
                    organizationId={organizationId}
                    label={
                      isRecipeCompositionKind(row.composition_kind)
                        ? "Stock réel (ligne recette)"
                        : "Stock réel (ligne modifier)"
                    }
                  />
                </>
              ) : (
                <p className="text-muted-foreground text-sm">Aucune fiche stock sur cette ligne.</p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Stock du composant (identité)
              </p>
              {componentIdentityStock ? (
                <>
                  <StockQuantities stock={componentIdentityStock} />
                  <TrackedSwitch
                    id={`stock-id-${componentIdentityStock.id}`}
                    label="Suivre sur le pool du composant (self)"
                    checked={Boolean(componentIdentityStock.inventory_tracked)}
                    disabled={poolSwitchLockedBySelf}
                    pending={pending}
                    onCheckedChange={(v) => onIngredientTrackedChange(componentIdentityStock.id, v)}
                    helper={poolIngredientHelper}
                  />
                  <ProductStockQuickAdjust
                    stock={componentIdentityStock}
                    productId={productId}
                    establishmentId={establishmentId}
                    organizationId={organizationId}
                    label="Stock réel (pool composant)"
                  />
                </>
              ) : (
                <p className="text-muted-foreground text-sm">Pas de composition self / stock pour ce composant.</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

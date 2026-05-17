"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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
        {isSelfComposition ? <Badge>Article / unité de vente</Badge> : <Badge variant="secondary">Ingrédient</Badge>}
        <span className="font-medium">{row.component?.name ?? "Produit inconnu"}</span>
        <Badge variant="outline">{row.composition_kind}</Badge>
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
  /** Self sans fiche stock : création de `product_stocks` sur cette composition. */
  onCreateSelfLineStock?: (compositionId: string) => void;
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
                  Aucune fiche <span className="font-medium">product_stocks</span> sur cette composition self — créez-en
                  une pour pouvoir suivre le stock au niveau produit fini.
                </p>
                {onCreateSelfLineStock ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={createSelfLineStockPending}
                    onClick={() => onCreateSelfLineStock(row.id)}
                  >
                    {createSelfLineStockPending ? "Création…" : "Créer la fiche stock (unité de vente)"}
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Ligne de composition ({isRecipeCompositionKind(row.composition_kind) ? "recette" : "modifier"})
              </p>
              {lineStock ? (
                <>
                  <StockQuantities stock={lineStock} />
                  <TrackedSwitch
                    id={`stock-line-${lineStock.id}`}
                    label={
                      isRecipeCompositionKind(row.composition_kind)
                        ? "Suivre sur cette ligne (recette)"
                        : "Suivre sur cette ligne (modifier)"
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

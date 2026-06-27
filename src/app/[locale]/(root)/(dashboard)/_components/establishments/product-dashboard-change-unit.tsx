"use client";

import { useState } from "react";

import { AlertTriangle, ArrowRight, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PORTION_UNITS } from "@/lib/constants/product-attributes";
import {
  useActiveFifoLotsCount,
  useChangeProductStockUnit,
  useRecipesUsingIngredient,
} from "@/lib/queries/stock-movement-queries";
import { areUnitsCompatible } from "@/lib/utils/unit-conversion";

type Props = {
  productId: string;
  organizationId: string;
  establishmentId: string;
  stockId: string;
  currentUnit: string;
  currentQty: number;
  suggestedUnit?: string;
  suggestedFactor?: number;
};

type RecipeEntry = { id: string; recipeName: string; quantity: number | null; quantityUnit: string | null };

function AffectedRecipesList({ compositions, toUnit }: { compositions: RecipeEntry[]; toUnit: string }) {
  if (compositions.length === 0) return null;
  const s = compositions.length > 1 ? "s" : "";
  return (
    <div className="rounded border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
      <div className="mb-1 flex items-center gap-1.5 font-medium">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        {compositions.length} recette{s} utilisent cet ingrédient
      </div>
      <ul className="mb-1 list-inside list-disc space-y-0.5">
        {compositions.map((c) => {
          const incompatible = c.quantityUnit != null && !areUnitsCompatible(c.quantityUnit, toUnit);
          return (
            <li key={c.id}>
              <span className="font-medium">{c.recipeName}</span>
              {c.quantityUnit && (
                <span className="ml-1">
                  — {c.quantity} {c.quantityUnit}
                  {incompatible && (
                    <span className="ml-1 font-semibold text-red-600"> ✕ incompatible avec {toUnit}</span>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {compositions.some((c) => c.quantityUnit != null && !areUnitsCompatible(c.quantityUnit, toUnit)) && (
        <p className="mt-1 text-red-700 dark:text-red-400">
          Après la conversion, mettez à jour les quantités dans les fiches recettes concernées.
        </p>
      )}
    </div>
  );
}

export function ChangeStockUnitSection(props: Props) {
  const [open, setOpen] = useState(false);
  const { data: activeLots = 0 } = useActiveFifoLotsCount(props.stockId);

  // Verrou FIFO : tant que des lots sont en stock, l'unité est figée. On masque l'action
  // (au lieu d'afficher un mur d'erreur) et on explique brièvement pourquoi.
  if (activeLots > 0) {
    return (
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Lock className="h-3 w-3 shrink-0" />
        Unité de stock verrouillée — soldez le stock pour pouvoir la modifier.
      </p>
    );
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="text-muted-foreground h-7 text-xs" onClick={() => setOpen(true)}>
        Changer l&apos;unité de stock
      </Button>
    );
  }

  return <ChangeUnitEditor {...props} onClose={() => setOpen(false)} />;
}

function ChangeUnitEditor({
  productId,
  organizationId,
  establishmentId,
  stockId,
  currentUnit,
  currentQty,
  suggestedUnit,
  suggestedFactor,
  onClose,
}: Props & { onClose: () => void }) {
  const [toUnit, setToUnit] = useState<string>(suggestedUnit ?? PORTION_UNITS.find((u) => u !== currentUnit) ?? "g");
  const [factorStr, setFactorStr] = useState(suggestedFactor != null ? String(suggestedFactor) : "");

  const mutation = useChangeProductStockUnit(productId, organizationId, establishmentId);
  const { data: affectedCompositions = [] } = useRecipesUsingIngredient(productId);

  // Le facteur ne sert que s'il y a une quantité à reconvertir (stock non-FIFO, ex : recette
  // « produit fini »). À stock soldé (= 0), on choisit simplement la nouvelle unité.
  const needsFactor = currentQty > 0;
  const factor = parseFloat(factorStr.replace(",", "."));
  const factorValid = Number.isFinite(factor) && factor > 0;
  const isValid = toUnit !== currentUnit && (!needsFactor || factorValid);
  const newQty = needsFactor && factorValid ? Math.round(currentQty * factor * 1000) / 1000 : currentQty;
  const canSubmit = isValid && !mutation.isPending;

  return (
    <div className="space-y-3 rounded border border-orange-200 bg-orange-50/40 p-3">
      <p className="text-sm font-medium">Changer l&apos;unité de stock</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Actuel</Label>
          <p className="font-mono text-sm">
            {currentQty} {currentUnit === "piece" ? "pièce(s)" : currentUnit}
          </p>
        </div>
        <ArrowRight className="text-muted-foreground mb-1 h-4 w-4" />
        <div className="space-y-1">
          <Label className="text-xs">Nouvelle unité</Label>
          <Select value={toUnit} onValueChange={setToUnit}>
            <SelectTrigger className="h-8 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PORTION_UNITS.filter((u) => u !== currentUnit).map((u) => (
                <SelectItem key={u} value={u}>
                  {u === "piece" ? "pièce" : u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {needsFactor && (
          <div className="space-y-1">
            <Label className="text-xs">
              1 {currentUnit === "piece" ? "pièce" : currentUnit} = ? {toUnit}
            </Label>
            <Input
              value={factorStr}
              onChange={(e) => setFactorStr(e.target.value)}
              placeholder="ex : 250"
              className="h-8 w-24 text-xs tabular-nums"
              inputMode="decimal"
            />
          </div>
        )}
        {needsFactor && newQty !== currentQty && (
          <p className="text-sm font-medium text-blue-700">
            → {newQty} {toUnit}
          </p>
        )}
      </div>
      {!needsFactor && (
        <p className="text-muted-foreground text-xs">Stock à 0 — choisissez simplement la nouvelle unité.</p>
      )}
      <AffectedRecipesList compositions={affectedCompositions} toUnit={toUnit} />
      <p className="text-muted-foreground text-xs">
        L&apos;historique des mouvements conserve les anciennes unités. Un mouvement d&apos;ajustement de conversion
        sera enregistré.
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={!canSubmit}
          onClick={() =>
            mutation.mutate(
              {
                productStockId: stockId,
                fromUnit: currentUnit,
                toUnit,
                currentQty,
                conversionFactor: needsFactor && factorValid ? factor : 1,
              },
              { onSuccess: onClose },
            )
          }
        >
          {mutation.isPending ? "Conversion…" : "Confirmer"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

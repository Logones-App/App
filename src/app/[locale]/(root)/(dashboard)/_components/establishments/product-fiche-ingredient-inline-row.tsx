"use client";

import { useState } from "react";

import { Check, ChevronsUpDown, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { PORTION_UNITS, type PortionUnit } from "@/lib/constants/product-attributes";
import { cn } from "@/lib/utils";
import { areUnitsCompatible, compatibleUnits } from "@/lib/utils/unit-conversion";

type Ingredient = { id: string; name: string; portion_unit: string | null };

function IngredientUnitHints({
  needsConversion,
  unitIncompatibleWithStock,
  stockUnit,
  ingredientId,
  selectedPortionUnit,
  unit,
  conversionFactor,
  onConversionChange,
  t,
}: {
  needsConversion: boolean;
  unitIncompatibleWithStock: boolean;
  stockUnit: string | null;
  ingredientId: string;
  selectedPortionUnit: string | null | undefined;
  unit: string;
  conversionFactor: string;
  onConversionChange: (v: string) => void;
  t: (key: PortionUnit) => string;
}) {
  return (
    <>
      {needsConversion && (
        <>
          <span className="text-muted-foreground text-xs">
            1 {selectedPortionUnit === "piece" ? "pièce" : selectedPortionUnit} =
          </span>
          <Input
            value={conversionFactor}
            onChange={(e) => onConversionChange(e.target.value)}
            inputMode="decimal"
            placeholder="ex : 450"
            className="h-7 w-20 text-xs tabular-nums"
          />
          <span className="text-muted-foreground text-xs">{unit}</span>
        </>
      )}
      {unitIncompatibleWithStock && stockUnit && (
        <span className="w-full text-xs text-amber-600">
          ⚠ Stock géré en <strong>{t(stockUnit as PortionUnit)}</strong> — la quantité doit être dans cette unité.
        </span>
      )}
      {stockUnit && !unitIncompatibleWithStock && ingredientId && (
        <span className="text-muted-foreground text-xs">Stock : {t(stockUnit as PortionUnit)}</span>
      )}
    </>
  );
}

type Props = {
  ingredients: Ingredient[];
  stockUnits: Map<string, string>;
  isPending: boolean;
  colSpan?: number;
  onAdd: (payload: { componentId: string; quantity: number; quantityUnit: string; conversionFactor?: number }) => void;
  onCancel: () => void;
};

export function InlineIngredientAddRow({ ingredients, stockUnits, isPending, colSpan = 6, onAdd, onCancel }: Props) {
  const t = useTranslations("units");
  const [open, setOpen] = useState(false);
  const [ingredientId, setIngredientId] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("g");
  const [conversionFactor, setConversionFactor] = useState("");

  const selected = ingredients.find((p) => p.id === ingredientId);
  const stockUnit = ingredientId ? (stockUnits.get(ingredientId) ?? null) : null;
  // Les unités proposées doivent être compatibles avec l'unité de stock (référence POS)
  const allowedUnits = compatibleUnits(stockUnit ?? selected?.portion_unit, PORTION_UNITS);
  const unitIncompatibleWithStock = !!stockUnit && !areUnitsCompatible(unit, stockUnit);
  const needsConversion =
    !!selected &&
    !!selected.portion_unit &&
    !areUnitsCompatible(unit, selected.portion_unit) &&
    !unitIncompatibleWithStock;

  const handleSelectIngredient = (id: string) => {
    const ing = ingredients.find((p) => p.id === id);
    setIngredientId(id);
    setOpen(false);
    const sUnit = stockUnits.get(id) ?? null;
    const refUnit = sUnit ?? ing?.portion_unit ?? null;
    if (refUnit && !areUnitsCompatible(unit, refUnit)) {
      setUnit(refUnit);
    }
  };

  const handleAdd = () => {
    const qtyNum = parseFloat(qty.replace(",", "."));
    if (!ingredientId || !Number.isFinite(qtyNum) || qtyNum <= 0) return;
    const factorNum = parseFloat(conversionFactor.replace(",", "."));
    onAdd({
      componentId: ingredientId,
      quantity: qtyNum,
      quantityUnit: unit,
      conversionFactor: needsConversion && Number.isFinite(factorNum) && factorNum > 0 ? factorNum : undefined,
    });
  };

  return (
    <TableRow className="bg-muted/20">
      <TableCell colSpan={colSpan}>
        <div className="flex flex-wrap items-center gap-2 py-0.5">
          {/* Combobox ingrédient */}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="h-7 w-52 justify-between text-xs font-normal"
              >
                <span className="truncate">{selected?.name ?? "Rechercher un ingrédient…"}</span>
                <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command>
                <CommandInput placeholder="Rechercher…" className="h-8 text-xs" />
                <CommandList>
                  <CommandEmpty className="text-muted-foreground py-3 text-center text-xs">
                    Aucun ingrédient trouvé.
                  </CommandEmpty>
                  <CommandGroup>
                    {ingredients.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={p.name}
                        onSelect={() => handleSelectIngredient(p.id)}
                        className="text-xs"
                      >
                        <Check className={cn("mr-2 h-3 w-3", ingredientId === p.id ? "opacity-100" : "opacity-0")} />
                        {p.name}
                        {p.portion_unit && <span className="text-muted-foreground ml-1">({p.portion_unit})</span>}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Quantité */}
          <Input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            inputMode="decimal"
            placeholder="Qté"
            className="h-7 w-20 text-xs tabular-nums"
          />

          {/* Unité */}
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger className="h-7 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowedUnits.map((u) => (
                <SelectItem key={u} value={u} className="text-xs">
                  {t(u as PortionUnit)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <IngredientUnitHints
            needsConversion={needsConversion}
            unitIncompatibleWithStock={unitIncompatibleWithStock}
            stockUnit={stockUnit}
            ingredientId={ingredientId}
            selectedPortionUnit={selected?.portion_unit}
            unit={unit}
            conversionFactor={conversionFactor}
            onConversionChange={setConversionFactor}
            t={t}
          />

          {/* Actions */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-green-600 hover:text-green-700"
            onClick={handleAdd}
            disabled={isPending || !ingredientId || !qty || unitIncompatibleWithStock}
            aria-label="Confirmer"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive h-7 w-7"
            onClick={onCancel}
            aria-label="Annuler"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

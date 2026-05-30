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

type Props = {
  ingredients: Ingredient[];
  isPending: boolean;
  colSpan?: number;
  onAdd: (payload: { componentId: string; quantity: number; quantityUnit: string }) => void;
  onCancel: () => void;
};

export function InlineIngredientAddRow({ ingredients, isPending, colSpan = 6, onAdd, onCancel }: Props) {
  const t = useTranslations("units");
  const [open, setOpen] = useState(false);
  const [ingredientId, setIngredientId] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("g");

  const selected = ingredients.find((p) => p.id === ingredientId);
  const allowedUnits = compatibleUnits(selected?.portion_unit, PORTION_UNITS);

  const handleSelectIngredient = (id: string) => {
    const ing = ingredients.find((p) => p.id === id);
    setIngredientId(id);
    setOpen(false);
    if (ing?.portion_unit && !areUnitsCompatible(unit, ing.portion_unit)) {
      setUnit(ing.portion_unit);
    }
  };

  const handleAdd = () => {
    const qtyNum = parseFloat(qty.replace(",", "."));
    if (!ingredientId || !Number.isFinite(qtyNum) || qtyNum <= 0) return;
    onAdd({ componentId: ingredientId, quantity: qtyNum, quantityUnit: unit });
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

          {/* Actions */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-green-600 hover:text-green-700"
            onClick={handleAdd}
            disabled={isPending || !ingredientId || !qty}
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

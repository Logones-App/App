"use client";

import { useState } from "react";

import { CheckCircle2, ChevronLeft } from "lucide-react";

import type { Formula, FormulaProduct, FormulaSlot } from "@/app/api/table-order/formulas/route";
import { Button } from "@/components/ui/button";

import { formatPrice } from "../../menu/_components/menu-utils";

interface Props {
  formula: Formula;
  onConfirm: (selections: Partial<Record<string, FormulaProduct>>) => void;
  onClose: () => void;
}

export function FormulaPicker({ formula, onConfirm, onClose }: Props) {
  const [selections, setSelections] = useState<Partial<Record<string, FormulaProduct>>>({});

  const supplementTotal = formula.slots.reduce((s, slot) => s + (selections[slot.id]?.supplement_price ?? 0), 0);
  const totalPrice = formula.price + supplementTotal;
  const allSelected = formula.slots.every((slot) => slot.id in selections);

  function selectProduct(slot: FormulaSlot, product: FormulaProduct) {
    setSelections((prev) => ({ ...prev, [slot.id]: product }));
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-100">
      <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-gray-900">{formula.name}</h2>
          <p className="text-sm text-gray-500">Choisissez vos plats</p>
        </div>
        <span className="font-bold text-gray-900">{formatPrice(totalPrice)}</span>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {formula.slots.map((slot) => (
          <div key={slot.id}>
            <h3 className="mb-2 text-sm font-bold text-gray-700">{slot.name}</h3>
            <div className="space-y-2">
              {slot.products.map((product) => {
                const selected = selections[slot.id]?.product_id === product.product_id;
                const tileCls = selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-gray-200 bg-white text-gray-900";
                return (
                  <button
                    key={product.product_id}
                    type="button"
                    onClick={() => selectProduct(slot, product)}
                    className={`flex w-full items-center gap-2 rounded-xl border px-4 py-3 text-left transition-colors ${tileCls}`}
                  >
                    <span className="flex-1 font-medium">{product.product_name}</span>
                    {(product.supplement_price ?? 0) > 0 && (
                      <span
                        className={`shrink-0 text-sm font-semibold ${selected ? "text-primary-foreground/80" : "text-gray-500"}`}
                      >
                        +{formatPrice(product.supplement_price ?? 0)}
                      </span>
                    )}
                    {selected && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 bg-white p-4">
        <Button className="w-full" disabled={!allSelected} onClick={() => onConfirm(selections)}>
          Ajouter la formule — {formatPrice(totalPrice)}
        </Button>
      </div>
    </div>
  );
}

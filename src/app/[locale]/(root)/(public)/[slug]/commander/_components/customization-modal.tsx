"use client";

import { useEffect, useState } from "react";

import { Minus, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import { formatPrice, type PublicProduct } from "../../menu/_components/menu-utils";

import {
  type CartItemSelections,
  type CustomizationData,
  type ModifierComposition,
  type OptionGroup,
  type OptionValue,
  buildInitialSelections,
  computeUnitPrice,
  formatSupplementPrice,
  validateSelections,
} from "./customization-utils";

// ─── Tuile option ─────────────────────────────────────────────────────────────

function OptionTile({
  value,
  group,
  qty,
  onToggle,
  onQty,
  disabled,
}: {
  value: OptionValue;
  group: OptionGroup;
  qty: number;
  onToggle: () => void;
  onQty: (delta: number) => void;
  disabled: boolean;
}) {
  const selected = qty > 0;
  const price = value.option_price === 0 ? "Inclus" : `+${value.option_price.toFixed(2).replace(".", ",")}€`;
  const tileCls = selected
    ? "border-primary bg-primary text-primary-foreground"
    : "border-gray-200 bg-white text-gray-900";
  const disabledCls = disabled && !selected ? " opacity-40" : "";
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled && !selected}
        className={`relative rounded-xl border-2 p-3 text-left transition-all ${tileCls}${disabledCls}`}
      >
        {group.is_required && <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />}
        <p className="text-sm leading-snug font-semibold">{value.option_value}</p>
        <p className={`mt-0.5 text-xs font-medium ${selected ? "text-primary-foreground/80" : "text-gray-500"}`}>
          {price}
        </p>
        {selected && qty > 0 && (
          <span className="bg-primary-foreground text-primary absolute right-2 bottom-2 rounded-full px-1.5 py-0.5 text-xs font-bold">
            {qty}
          </span>
        )}
      </button>
      {group.allow_quantity && selected && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onQty(-1)}
            disabled={(value.min_quantity ?? 0) >= qty}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-gray-800 disabled:opacity-40"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-5 text-center text-sm font-bold text-gray-900">{qty}</span>
          <button
            type="button"
            onClick={() => onQty(1)}
            disabled={value.max_quantity !== null && qty >= value.max_quantity}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-gray-800 disabled:opacity-40"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tuile supplément ─────────────────────────────────────────────────────────

function CompositionTile({
  comp,
  name,
  price,
  qty,
  onQty,
}: {
  comp: ModifierComposition;
  name: string;
  price: string;
  qty: number;
  onQty: (delta: number) => void;
}) {
  const selected = qty > 0;
  const minQty = comp.is_required ? 1 : 0;
  return (
    <div
      className={`relative rounded-xl border-2 p-3 transition-all ${
        selected ? "border-primary bg-primary text-primary-foreground" : "border-gray-200 bg-white text-gray-900"
      }`}
    >
      {comp.is_required && <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />}
      <p className="text-sm leading-snug font-semibold">{name}</p>
      <p className={`mt-0.5 text-xs font-medium ${selected ? "text-primary-foreground/80" : "text-gray-500"}`}>
        {price}
      </p>
      {selected && (
        <span className="bg-primary-foreground text-primary absolute right-2 bottom-2 rounded-full px-1.5 py-0.5 text-xs font-bold">
          {qty}
        </span>
      )}
      <div className="mt-2 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => onQty(-1)}
          disabled={qty <= minQty}
          className={`flex h-7 w-7 items-center justify-center rounded-full disabled:opacity-40 ${
            selected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-gray-200 text-gray-800"
          }`}
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className={`w-5 text-center text-sm font-bold ${selected ? "text-primary-foreground" : "text-gray-900"}`}>
          {qty}
        </span>
        <button
          type="button"
          onClick={() => onQty(1)}
          disabled={comp.max_quantity !== null && qty >= comp.max_quantity}
          className={`flex h-7 w-7 items-center justify-center rounded-full disabled:opacity-40 ${
            selected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-gray-200 text-gray-800"
          }`}
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Modale principale ────────────────────────────────────────────────────────

interface Props {
  product: PublicProduct;
  establishmentId: string;
  initialSelections?: CartItemSelections;
  onConfirm: (selections: CartItemSelections, unitPrice: number) => void;
  onClose: () => void;
}

export function CustomizationModal({ product, establishmentId, initialSelections, onConfirm, onClose }: Props) {
  const [data, setData] = useState<CustomizationData | null>(null);
  const [selections, setSelections] = useState<CartItemSelections>(
    initialSelections ?? { options: {}, compositions: {} },
  );
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const url = `/api/table-order/customization?product_id=${product.productId}&est=${establishmentId}&menus_id=${product.menusId}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        const parsed = d as CustomizationData;
        setData(parsed);
        if (!initialSelections) setSelections(buildInitialSelections());
      })
      .catch(() =>
        setData({ optionGroups: [], optionValues: [], compositions: [], componentNames: {}, componentPrices: {} }),
      );
  }, [product.productId, product.menusId, establishmentId, initialSelections]);

  function handleOptionToggle(group: OptionGroup, value: OptionValue) {
    setSelections((prev) => {
      const next = { ...prev, options: { ...prev.options } };
      const current = next.options[value.id]?.quantity ?? 0;
      if (group.selection_type === "unique") {
        if (current > 0) {
          delete next.options[value.id];
        } else {
          const vals = data?.optionValues.filter((v) => v.option_group_id === group.id) ?? [];
          for (const v of vals) delete next.options[v.id];
          next.options[value.id] = {
            option: {
              id: value.id,
              option_group: group.name,
              option_value: value.option_name,
              option_price: value.option_price,
              selection_type: group.selection_type,
              allow_quantity: group.allow_quantity,
              is_required: group.is_required,
              min_quantity: value.min_quantity,
              max_quantity: value.max_quantity,
            },
            quantity: 1,
          };
        }
      } else {
        if (current > 0) {
          delete next.options[value.id];
        } else {
          next.options[value.id] = {
            option: {
              id: value.id,
              option_group: group.name,
              option_value: value.option_name,
              option_price: value.option_price,
              selection_type: group.selection_type,
              allow_quantity: group.allow_quantity,
              is_required: group.is_required,
              min_quantity: value.min_quantity,
              max_quantity: value.max_quantity,
            },
            quantity: 1,
          };
        }
      }
      return next;
    });
  }

  function handleOptionQty(group: OptionGroup, value: OptionValue, delta: number) {
    setSelections((prev) => {
      const next = { ...prev, options: { ...prev.options } };
      const current = next.options[value.id]?.quantity ?? 0;
      const newQty = Math.max(value.min_quantity ?? 0, current + delta);
      if (newQty <= 0) {
        delete next.options[value.id];
      } else {
        next.options[value.id] = {
          option: {
            id: value.id,
            option_group: group.name,
            option_value: value.option_name,
            option_price: value.option_price,
            selection_type: group.selection_type,
            allow_quantity: group.allow_quantity,
            is_required: group.is_required,
            min_quantity: value.min_quantity,
            max_quantity: value.max_quantity,
          },
          quantity: newQty,
        };
      }
      return next;
    });
  }

  function handleCompositionQty(comp: ModifierComposition, delta: number) {
    setSelections((prev) => {
      const next = { ...prev, compositions: { ...prev.compositions } };
      const current = next.compositions[comp.component_product_id]?.quantity ?? 0;
      const minQty = comp.is_required ? 1 : 0;
      const newQty = Math.max(minQty, current + delta);
      if (newQty <= 0) {
        delete next.compositions[comp.component_product_id];
      } else {
        next.compositions[comp.component_product_id] = {
          composition: {
            id: comp.id,
            component_product_id: comp.component_product_id,
            composition_kind: "modifier",
            unit_supplement_price: comp.unit_supplement_price,
            price_multiplier: comp.price_multiplier,
          },
          quantity: newQty,
        };
      }
      return next;
    });
  }

  function handleConfirm() {
    if (!data) return;
    const errs = validateSelections(data, selections);
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    const unitPrice = computeUnitPrice(product.price ?? 0, selections, data);
    onConfirm(selections, unitPrice);
  }

  function handleReset() {
    setErrors([]);
    setSelections(buildInitialSelections());
  }

  const unitPrice = data ? computeUnitPrice(product.price ?? 0, selections, data) : (product.price ?? 0);
  const extrasPrice = unitPrice - (product.price ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-100">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div>
          <p className="font-bold text-gray-900">{product.name}</p>
          <p className="text-sm font-semibold text-gray-600">{formatPrice(unitPrice)}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
          <X className="h-5 w-5 text-gray-700" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 pb-32">
        {!data && <p className="text-center text-sm text-gray-500">Chargement…</p>}

        {data && errors.length > 0 && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
            {errors.map((e) => (
              <p key={e} className="text-sm font-medium text-red-700">
                {e}
              </p>
            ))}
          </div>
        )}

        {data?.optionGroups.map((group) => {
          const vals = data.optionValues.filter((v) => v.option_group_id === group.id);
          const selectedCount = vals.filter((v) => (selections.options[v.id]?.quantity ?? 0) > 0).length;
          const limitReached =
            group.selection_type === "limited" &&
            group.max_selections !== null &&
            selectedCount >= group.max_selections;
          return (
            <div key={group.id} className="mb-6">
              <div className="mb-2 flex items-center gap-2">
                <h3 className="font-bold text-gray-900">{group.name}</h3>
                {group.is_required && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                    Obligatoire
                  </span>
                )}
                {group.selection_type === "limited" && group.max_selections !== null && (
                  <span className="text-xs font-medium text-gray-500">
                    ({selectedCount}/{group.max_selections})
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {vals.map((val) => (
                  <OptionTile
                    key={val.id}
                    value={val}
                    group={group}
                    qty={selections.options[val.id]?.quantity ?? 0}
                    onToggle={() => handleOptionToggle(group, val)}
                    onQty={(d) => handleOptionQty(group, val, d)}
                    disabled={limitReached}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {data && data.compositions.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-2 font-bold text-gray-900">Suppléments</h3>
            <div className="grid grid-cols-2 gap-2">
              {data.compositions.map((comp) => (
                <CompositionTile
                  key={comp.id}
                  comp={comp}
                  name={data.componentNames[comp.component_product_id] ?? "?"}
                  price={formatSupplementPrice(comp, data.componentPrices[comp.component_product_id] ?? 0)}
                  qty={selections.compositions[comp.component_product_id]?.quantity ?? 0}
                  onQty={(d) => handleCompositionQty(comp, d)}
                />
              ))}
            </div>
          </div>
        )}

        {data && (
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-sm">
            <p className="mb-2 font-bold text-gray-900">Récapitulatif</p>
            <div className="flex justify-between">
              <span className="text-gray-600">Prix de base</span>
              <span className="font-medium text-gray-900">{formatPrice(product.price ?? 0)}</span>
            </div>
            {extrasPrice > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Options & suppléments</span>
                <span className="font-medium text-gray-900">+{formatPrice(extrasPrice)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 font-bold text-gray-900">
              <span>Total unitaire</span>
              <span>{formatPrice(unitPrice)}</span>
            </div>
          </div>
        )}
      </div>

      <footer className="fixed right-0 bottom-0 left-0 border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Annuler
          </Button>
          <Button className="flex-1" onClick={handleConfirm} disabled={!data}>
            Confirmer →
          </Button>
        </div>
        <button type="button" onClick={handleReset} className="mt-2 w-full text-center text-xs text-gray-500 underline">
          Réinitialiser les choix
        </button>
      </footer>
    </div>
  );
}

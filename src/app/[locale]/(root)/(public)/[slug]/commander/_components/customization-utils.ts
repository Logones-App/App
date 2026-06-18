// ─── Types données API ────────────────────────────────────────────────────────

export type OptionGroup = {
  id: string;
  name: string;
  selection_type: "unique" | "multiple" | "limited";
  is_required: boolean;
  max_selections: number | null;
  allow_quantity: boolean;
};

export type OptionValue = {
  id: string;
  option_group_id: string;
  option_name: string;
  option_value: string;
  option_price: number;
  display_order: number;
  min_quantity: number | null;
  max_quantity: number | null;
};

export type ModifierComposition = {
  id: string;
  component_product_id: string;
  is_required: boolean | null;
  default_quantity: number | null;
  max_quantity: number | null;
  unit_supplement_price: number | null;
  price_multiplier: number | null;
};

export type CustomizationData = {
  optionGroups: OptionGroup[];
  optionValues: OptionValue[];
  compositions: ModifierComposition[];
  componentNames: Partial<Record<string, string>>;
  componentPrices: Partial<Record<string, number>>;
};

// ─── Types panier ─────────────────────────────────────────────────────────────

export type OptionSelection = {
  option: {
    id: string;
    option_group: string;
    option_value: string;
    option_price: number;
    selection_type: "unique" | "multiple" | "limited";
    allow_quantity: boolean;
    is_required: boolean;
    min_quantity: number | null;
    max_quantity: number | null;
  };
  quantity: number;
};

export type CompositionSelection = {
  composition: {
    id: string;
    component_product_id: string;
    composition_kind: string;
    unit_supplement_price: number | null;
    price_multiplier: number | null;
  };
  quantity: number;
};

export type CartItemSelections = {
  options: Partial<Record<string, OptionSelection>>;
  compositions: Partial<Record<string, CompositionSelection>>;
};

// ─── Calcul prix supplément ───────────────────────────────────────────────────

export function getSupplementPrice(
  comp: Pick<ModifierComposition, "unit_supplement_price" | "price_multiplier">,
  componentMenuPrice: number,
): number {
  if (comp.unit_supplement_price != null && isFinite(comp.unit_supplement_price)) {
    return Math.max(0, Math.round(comp.unit_supplement_price * 100) / 100);
  }
  if (comp.price_multiplier != null && isFinite(comp.price_multiplier)) {
    return Math.max(0, Math.round(componentMenuPrice * comp.price_multiplier * 100) / 100);
  }
  return Math.max(0, Math.round(componentMenuPrice * 100) / 100);
}

export function formatSupplementPrice(
  comp: Pick<ModifierComposition, "unit_supplement_price" | "price_multiplier">,
  componentMenuPrice: number,
): string {
  if (comp.unit_supplement_price === 0) return "Inclus";
  const price = getSupplementPrice(comp, componentMenuPrice);
  if (comp.unit_supplement_price != null && comp.unit_supplement_price > 0)
    return `+${price.toFixed(2).replace(".", ",")}€`;
  if (comp.price_multiplier != null) return `×${comp.price_multiplier} → ${price.toFixed(2).replace(".", ",")}€`;
  if (componentMenuPrice > 0) return `${price.toFixed(2).replace(".", ",")}€`;
  return "Prix non disponible";
}

// ─── Calcul prix unitaire total ───────────────────────────────────────────────

export function computeUnitPrice(basePrice: number, selections: CartItemSelections, data: CustomizationData): number {
  let unit = basePrice;
  for (const [, sel] of Object.entries(selections.options)) {
    if (sel) unit += sel.option.option_price * sel.quantity;
  }
  for (const [componentId, sel] of Object.entries(selections.compositions)) {
    // eslint-disable-next-line security/detect-object-injection
    if (sel) unit += getSupplementPrice(sel.composition, data.componentPrices[componentId] ?? 0) * sel.quantity;
  }
  return Math.round(unit * 100) / 100;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateSelections(data: CustomizationData, selections: CartItemSelections): string[] {
  const errors: string[] = [];
  for (const group of data.optionGroups) {
    if (!group.is_required) continue;
    const hasSelection = data.optionValues
      .filter((v) => v.option_group_id === group.id)
      .some((v) => (selections.options[v.id]?.quantity ?? 0) > 0);
    if (!hasSelection) errors.push(`"${group.name}" : veuillez sélectionner une option`);
  }
  for (const comp of data.compositions) {
    if (!comp.is_required) continue;
    if ((selections.compositions[comp.component_product_id]?.quantity ?? 0) <= 0)
      errors.push(`Supplément obligatoire : "${data.componentNames[comp.component_product_id] ?? "?"}"`);
  }
  return errors;
}

// ─── Sélections initiales ─────────────────────────────────────────────────────

export function buildInitialSelections(): CartItemSelections {
  return { options: {}, compositions: {} };
}

// ─── Payload JSONB pour table_order_requests.items ────────────────────────────

export type OrderItem = {
  product_id: string;
  name: string;
  quantity: 1;
  unit_price: number;
  vat_rate: number | null;
  note?: string | null;
  options?: Partial<Record<string, OptionSelection>>;
  compositions?: Partial<Record<string, CompositionSelection>>;
};

export function buildOrderItem(params: {
  productId: string;
  name: string;
  unitPrice: number;
  vatRate: number | null;
  note?: string;
  selections: CartItemSelections;
}): OrderItem {
  const hasOptions = Object.keys(params.selections.options).length > 0;
  const hasCompositions = Object.keys(params.selections.compositions).length > 0;
  return {
    product_id: params.productId,
    name: params.name,
    quantity: 1,
    unit_price: params.unitPrice,
    vat_rate: params.vatRate,
    ...(params.note ? { note: params.note } : {}),
    ...(hasOptions && { options: params.selections.options }),
    ...(hasCompositions && { compositions: params.selections.compositions }),
  };
}

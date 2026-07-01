import { PORTION_UNITS } from "@/lib/constants/product-attributes";
import { compatibleUnits, convertUnit } from "@/lib/utils/unit-conversion";

export type Mode = "reception" | "price";

export const NEW = "__new__";

// ─── Modèle « phrase » d'ajout de référence : [conditionnement] de [contenance] [unité] ──
/** Conditionnement « en vrac » (achat au poids/volume, sans emballage). */
export const VRAC = "__vrac__";
/** Conditionnement « à la pièce » (pas de sous-contenu). */
export const A_LA_PIECE = "__piece__";
/** Base de prix = le conditionnement lui-même (par opposition à une unité de mesure). */
export const BASIS_PACK = "__pack__";

/** Liste fermée de conditionnements (extensible au fil des cas réels). */
export const PACKAGINGS = [
  "Bouteille",
  "Cubi",
  "Bidon",
  "Fût",
  "Brique",
  "Canette",
  "Sac",
  "Sachet",
  "Plaquette",
  "Boîte",
  "Pot",
  "Barquette",
  "Plateau",
  "Filet",
  "Carton",
  "Caisse",
  "Colis",
] as const;

const round5 = (n: number) => Math.round(n * 100000) / 100000;

export type ReferenceUnits = {
  orderUnit: string;
  conversionFactor: number;
  unitPrice: number; // par order_unit (ce que stocke supplier_references.unit_price)
  unitCost: number; // par unité de stock (source de vérité food cost)
  packaging: string | null;
};

/**
 * Traduit la « phrase » (conditionnement de [contenance] [unité de stock]) + le prix
 * (valeur + base) en valeurs à stocker + coût normalisé.
 * - `priceBasis = BASIS_PACK` → prix au conditionnement ; sinon = unité de mesure compatible.
 * - En **vrac**, la base EST l'unité de commande (prix au kg, au L…).
 */
export function computeReferenceUnits(input: {
  packaging: string; // VRAC | A_LA_PIECE | nom de conditionnement
  contenance: number; // contenu du conditionnement, en unité de stock
  stockUnit: string;
  priceValue: number;
  priceBasis: string; // BASIS_PACK | unité de mesure
}): ReferenceUnits {
  const { packaging, contenance, stockUnit, priceValue, priceBasis } = input;
  const isVrac = packaging === VRAC;
  const isPiece = packaging === A_LA_PIECE;
  const packSize = isVrac || isPiece ? 1 : contenance; // unités de stock par pack

  // Coût par unité de stock (source de vérité).
  let unitCost: number;
  if (!isVrac && priceBasis === BASIS_PACK) {
    unitCost = priceValue / (packSize > 0 ? packSize : 1);
  } else {
    // base = unité de mesure (kg, L…) — y compris le cas vrac
    const k = convertUnit(1, priceBasis, stockUnit) ?? 1;
    unitCost = priceValue / (k > 0 ? k : 1);
  }

  const orderUnit = isVrac ? priceBasis : "piece";
  const conversionFactor = isVrac ? (convertUnit(1, priceBasis, stockUnit) ?? 1) : packSize;
  const packagingStore = isVrac ? null : isPiece ? "piece" : packaging;

  return {
    orderUnit,
    conversionFactor,
    unitPrice: round5(unitCost * conversionFactor),
    unitCost: round5(unitCost),
    packaging: packagingStore,
  };
}

/** Libellé de l'unité de quantité reçue selon le conditionnement (pour la réception). */
export function qtyOrderLabel(packaging: string, orderUnit: string): string {
  if (packaging === VRAC) return orderUnit;
  if (packaging === A_LA_PIECE) return "pièce";
  return packaging;
}

export type Ref = {
  id: string;
  supplier_id: string;
  supplier_product_name: string | null;
  supplier_product_ref: string | null;
  order_unit: string | null;
  conversion_factor: number;
  unit_price: number | null;
  packaging: string | null;
};

/** Valeurs de la « phrase » (état du formulaire) issues d'une référence stockée — pour l'édition. */
export type PhraseForm = {
  packaging: string;
  contenanceStr: string;
  priceStr: string;
  priceBasis: string;
};

/** Reverse-mapping : reconstruit la phrase depuis une référence existante. */
export function referenceToForm(ref: Ref): PhraseForm {
  const pkg = ref.packaging;
  let packaging: string;
  if (pkg && pkg !== "piece") packaging = pkg;
  else if (pkg === "piece") packaging = A_LA_PIECE;
  else packaging = ref.order_unit && ref.order_unit !== "piece" ? VRAC : A_LA_PIECE;

  const isVrac = packaging === VRAC;
  return {
    packaging,
    contenanceStr: isVrac ? "1" : String(ref.conversion_factor),
    priceStr: ref.unit_price != null ? String(ref.unit_price) : "",
    priceBasis: isVrac ? (ref.order_unit ?? "") : BASIS_PACK,
  };
}

export function parsePositive(s: string): number | null {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function refLabel(r: Ref): string {
  const name = r.supplier_product_name ?? r.supplier_product_ref ?? "Référence";
  const unit = r.order_unit ? ` — ${r.order_unit}` : "";
  const factor = r.conversion_factor !== 1 ? ` (×${r.conversion_factor})` : "";
  return `${name}${unit}${factor}`;
}

/**
 * Déduit l'unité de gestion du stock impliquée par une référence existante,
 * à partir de son couple (order_unit, conversion_factor).
 * Retourne `null` si indéductible (unité de commande absente ou facteur non dimensionnel).
 */
export function stockUnitFromRef(ref: Ref | null): string | null {
  if (!ref || !ref.order_unit) return null;
  const factor = ref.conversion_factor;
  for (const u of compatibleUnits(ref.order_unit, PORTION_UNITS)) {
    const f = convertUnit(1, ref.order_unit, u);
    if (f != null && Math.abs(f - factor) < 1e-9) return u;
  }
  return null;
}

/** Unité de stock effective : prop figée > choix utilisateur > déduction de la référence. */
export function resolveStockUnit(stockUnit: string | null, gestionUnit: string, derived: string | null): string {
  if (stockUnit != null) return stockUnit;
  if (gestionUnit !== "") return gestionUnit;
  return derived ?? "";
}

export type Derived = {
  isNewSupplier: boolean;
  hasSupplier: boolean;
  supplierRefs: Ref[];
  isNewRef: boolean;
  selectedRef: Ref | null;
  factor: number;
  effectiveOrderUnit: string | null;
  showRefSelect: boolean;
  showNewRef: boolean;
};

export function deriveState(
  refs: Ref[],
  supplierId: string,
  refId: string,
  contenanceStr: string,
  orderUnit: string,
): Derived {
  const isNewSupplier = supplierId === NEW;
  const hasSupplier = supplierId !== "";
  const supplierRefs = hasSupplier && !isNewSupplier ? refs.filter((r) => r.supplier_id === supplierId) : [];
  const hasExistingRefs = supplierRefs.length > 0;
  // « Nouvelle référence » : nouveau fournisseur, choix explicite (+ Nouvelle), ou fournisseur sans aucune référence.
  // On NE crée PAS de nouvelle référence tant que rien n'est choisi si des références existent déjà.
  const isNewRef = isNewSupplier || refId === NEW || (hasSupplier && !hasExistingRefs);
  const selectedRef = isNewRef ? null : (supplierRefs.find((r) => r.id === refId) ?? null);
  const factor = selectedRef ? selectedRef.conversion_factor : (parsePositive(contenanceStr) ?? 1);
  return {
    isNewSupplier,
    hasSupplier,
    supplierRefs,
    isNewRef,
    selectedRef,
    factor,
    effectiveOrderUnit: selectedRef ? selectedRef.order_unit : orderUnit || null,
    showRefSelect: hasSupplier && !isNewSupplier && hasExistingRefs,
    showNewRef: hasSupplier && isNewRef,
  };
}

export function computeCanSubmit(
  d: Derived,
  args: {
    mode: Mode;
    manageStock: boolean;
    busy: boolean;
    qty: number | null;
    pu: number | null;
    newSupplierName: string;
    designation: string;
    effectiveStockUnit: string;
  },
): boolean {
  const supplierOk = d.isNewSupplier ? args.newSupplierName.trim() !== "" : d.hasSupplier;
  const refOk = d.isNewRef ? args.designation.trim() !== "" : d.selectedRef != null;
  const qtyOk = args.mode === "price" || args.qty != null;
  const unitOk = !args.manageStock || args.effectiveStockUnit !== "";
  return !args.busy && args.pu != null && qtyOk && supplierOk && refOk && unitOk;
}

/** Validité du formulaire « phrase » (ajout de prix, nouvelle référence). */
export function canSubmitPhrase(
  d: Derived,
  args: {
    busy: boolean;
    pu: number | null;
    newSupplierName: string;
    packaging: string;
    contenanceStr: string;
    priceBasis: string;
    stockUnit: string;
  },
): boolean {
  const supplierOk = d.isNewSupplier ? args.newSupplierName.trim() !== "" : d.hasSupplier;
  const needsContenance = args.packaging !== VRAC && args.packaging !== A_LA_PIECE;
  const contenanceOk = !needsContenance || parsePositive(args.contenanceStr) != null;
  const phraseOk = args.packaging !== "" && args.stockUnit !== "" && contenanceOk && args.priceBasis !== "";
  return !args.busy && args.pu != null && supplierOk && phraseOk;
}

/** Validité du bouton, tous cas confondus (nouvelle référence « phrase » ou référence existante). */
export function canSubmitAll(
  d: Derived,
  args: {
    isPrice: boolean;
    mode: Mode;
    manageStock: boolean;
    busy: boolean;
    qty: number | null;
    pu: number | null;
    newSupplierName: string;
    packaging: string;
    contenanceStr: string;
    priceBasis: string;
    effectiveStockUnit: string;
  },
): boolean {
  if (d.showNewRef) {
    const phraseValid = canSubmitPhrase(d, {
      busy: args.busy,
      pu: args.pu,
      newSupplierName: args.newSupplierName,
      packaging: args.packaging,
      contenanceStr: args.contenanceStr,
      priceBasis: args.priceBasis,
      stockUnit: args.effectiveStockUnit,
    });
    return phraseValid && (args.isPrice || args.qty != null);
  }
  return computeCanSubmit(d, {
    mode: args.mode,
    manageStock: args.manageStock,
    busy: args.busy,
    qty: args.qty,
    pu: args.pu,
    newSupplierName: args.newSupplierName,
    designation: "",
    effectiveStockUnit: args.effectiveStockUnit,
  });
}

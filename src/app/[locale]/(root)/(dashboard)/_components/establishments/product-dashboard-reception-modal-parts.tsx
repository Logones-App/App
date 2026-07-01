import { PORTION_UNITS, type PortionUnit } from "@/lib/constants/product-attributes";
import type { useCreateSupplier, useCreateSupplierReference } from "@/lib/queries/supplier-queries";
import { compatibleUnits, convertUnit, unitCategory } from "@/lib/utils/unit-conversion";

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

/** Désignation lisible construite depuis la phrase (stockée dans supplier_product_name). */
export function refDesignation(packaging: string, contenance: number, stockUnit: string): string | null {
  if (packaging === VRAC) return null;
  if (packaging === A_LA_PIECE) return "À la pièce";
  return `${packaging} de ${contenance} ${stockUnit}`;
}

/** Verrou de contenance (conservé pour l'ancien formulaire de réception). */
export function isContenanceLocked(orderUnit: string, stockUnit: string): boolean {
  const dim = orderUnit !== "" && stockUnit !== "" ? convertUnit(1, orderUnit, stockUnit) : null;
  return dim != null && dim > 0;
}

export type Ref = {
  id: string;
  supplier_id: string;
  supplier_product_name: string | null;
  supplier_product_ref: string | null;
  order_unit: string | null;
  conversion_factor: number;
  unit_price: number | null;
};

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

export async function resolveSupplierAndRef(args: {
  d: Derived;
  organizationId: string;
  newSupplierName: string;
  supplierId: string;
  orderUnit: string;
  designation: string;
  refArticle: string;
  pu: number;
  createSupplier: ReturnType<typeof useCreateSupplier>;
  createRef: ReturnType<typeof useCreateSupplierReference>;
}): Promise<{ supId: string; refId: string }> {
  const {
    d,
    organizationId,
    newSupplierName,
    supplierId,
    orderUnit,
    designation,
    refArticle,
    pu,
    createSupplier,
    createRef,
  } = args;
  const supId = d.isNewSupplier
    ? await createSupplier.mutateAsync({ name: newSupplierName.trim(), is_active: true })
    : supplierId;
  if (d.selectedRef) return { supId, refId: d.selectedRef.id };
  const refId = await createRef.mutateAsync({
    supplier_id: supId,
    organization_id: organizationId,
    order_unit: orderUnit !== "" ? orderUnit : null,
    conversion_factor: d.factor,
    unit_price: pu,
    supplier_product_ref: refArticle.trim() !== "" ? refArticle.trim() : null,
    supplier_product_name: designation.trim() !== "" ? designation.trim() : null,
  });
  return { supId, refId };
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

/**
 * Unités de commande cohérentes avec une unité de gestion (stock) déjà figée :
 * même catégorie (masse↔masse, volume↔volume) + « piece » (achat au colis/à la pièce, facteur manuel).
 * Stock à la pièce → commande à la pièce uniquement. Unité inconnue → toutes autorisées.
 */
export function orderUnitsForStock(stockUnit: string): readonly PortionUnit[] {
  const cat = unitCategory(stockUnit);
  if (cat == null) return PORTION_UNITS;
  if (cat === "unit") return ["piece"];
  return PORTION_UNITS.filter((u) => unitCategory(u) === cat || u === "piece");
}

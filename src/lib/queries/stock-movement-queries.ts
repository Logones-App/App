"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

export type StockMovementRow = Tables<"stock_movements">;

// Valeurs autorisées par la contrainte CHECK stock_movements_movement_type_check
export type MovementType =
  | "purchase"
  | "sale"
  | "adjustment"
  | "transfer"
  | "waste"
  | "production"
  | "reservation"
  | "unreservation";

export const MOVEMENT_TYPES: {
  key: MovementType;
  label: string;
  sign: "positive" | "negative" | "both";
  emoji: string;
}[] = [
  { key: "purchase", label: "Réception fournisseur", sign: "positive", emoji: "📦" },
  { key: "adjustment", label: "Ajustement inventaire", sign: "both", emoji: "📋" },
  { key: "waste", label: "Perte / casse", sign: "negative", emoji: "🗑️" },
  { key: "production", label: "Production / fabrication", sign: "positive", emoji: "🏭" },
  { key: "transfer", label: "Transfert / retour", sign: "both", emoji: "🔄" },
];

/**
 * Retourne l'unité de stock (product_stocks.unit) pour une liste d'ingrédients.
 * Utilisé pour valider la cohérence entre l'unité de composition et l'unité de stock.
 */
export function useIngredientStockUnits(productIds: string[], establishmentId: string) {
  return useQuery({
    queryKey: ["ingredient-stock-units", productIds.sort().join(","), establishmentId],
    queryFn: async () => {
      if (productIds.length === 0) return new Map<string, string>();
      const supabase = createClient();

      const { data: comps, error: cErr } = await supabase
        .from("product_compositions")
        .select("id, main_product_id, component_product_id")
        .in("main_product_id", productIds)
        .eq("establishment_id", establishmentId)
        .eq("deleted", false);
      if (cErr) throw cErr;

      const selfComps = comps.filter((c) => c.main_product_id === c.component_product_id);
      if (selfComps.length === 0) return new Map<string, string>();

      const { data: stocks, error: sErr } = await supabase
        .from("product_stocks")
        .select("product_composition_id, unit")
        .in(
          "product_composition_id",
          selfComps.map((c) => c.id),
        )
        .eq("establishment_id", establishmentId)
        .eq("deleted", false);
      if (sErr) throw sErr;

      const compIdToProductId = new Map(selfComps.map((c) => [c.id, c.main_product_id]));
      const map = new Map<string, string>();
      for (const s of stocks) {
        const productId = compIdToProductId.get(s.product_composition_id);
        if (productId) map.set(productId, s.unit);
      }
      return map;
    },
    enabled: productIds.length > 0 && !!establishmentId,
  });
}

export function stockMovementsQueryKey(productId: string, organizationId: string, establishmentId: string) {
  return ["stock-movements", productId, organizationId, establishmentId] as const;
}

export type NeedsReviewMovement = Pick<
  StockMovementRow,
  "id" | "product_id" | "movement_type" | "quantity" | "unit" | "created_at"
> & { product: { id: string; name: string } | null };

/**
 * Mouvements signalés par le trigger FIFO comme nécessitant une revue manuelle
 * (lots épuisés au moment d'une vente, ou restore arrivé avant sa vente en offline).
 */
export function useNeedsReviewMovements(establishmentId: string) {
  return useQuery({
    queryKey: ["stock-movements-needs-review", establishmentId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("stock_movements")
        .select("id, product_id, movement_type, quantity, unit, created_at, product:products(id, name)")
        .eq("establishment_id", establishmentId)
        .eq("needs_review", true)
        .eq("deleted", false)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as NeedsReviewMovement[];
    },
    enabled: !!establishmentId,
  });
}

export function useProductStockMovements(productId: string, organizationId: string, establishmentId: string) {
  return useQuery({
    queryKey: stockMovementsQueryKey(productId, organizationId, establishmentId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*")
        .eq("product_id", productId)
        .eq("organization_id", organizationId)
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as StockMovementRow[];
    },
    enabled: !!productId && !!organizationId && !!establishmentId,
  });
}

export function useAddStockMovement(
  productId: string,
  organizationId: string,
  establishmentId: string,
  productStockId: string | null,
  unit: string | null,
) {
  const queryClient = useQueryClient();
  const qk = stockMovementsQueryKey(productId, organizationId, establishmentId);

  return useMutation({
    mutationFn: async ({
      movementType,
      quantity,
      notes,
      currentStock,
      totalPrice,
      supplierRefId,
      referenceType,
      referenceId,
    }: {
      movementType: MovementType;
      quantity: number;
      notes: string;
      currentStock: number;
      totalPrice?: number;
      supplierRefId?: string;
      conversionFactor?: number;
      supplierId?: string;
      referenceType?: string;
      referenceId?: string;
    }) => {
      if (!productStockId) throw new Error("Pas de fiche stock — impossible de créer un mouvement.");

      const supabase = createClient();

      const quantityAfter = currentStock + quantity;
      const unitCost =
        totalPrice != null && quantity !== 0 ? Math.round((totalPrice / Math.abs(quantity)) * 100000) / 100000 : null;

      const { error } = await supabase.from("stock_movements").insert({
        product_id: productId,
        organization_id: organizationId,
        establishment_id: establishmentId,
        product_stock_id: productStockId,
        supplier_reference_id: supplierRefId ?? null,
        movement_type: movementType,
        quantity,
        quantity_before: currentStock,
        quantity_after: quantityAfter,
        unit: unit ?? null,
        unit_cost: unitCost,
        notes: notes.trim() !== "" ? notes.trim() : null,
        reference_type: referenceType ?? null,
        reference_id: referenceId ?? null,
        created_by: null,
        deleted: false,
      });
      if (error) throw new Error(`DB: ${error.message} (${error.code})`);

      const { error: stockErr } = await supabase
        .from("product_stocks")
        .update({ current_stock: quantityAfter })
        .eq("id", productStockId);
      if (stockErr) throw new Error(`Stock update: ${stockErr.message}`);

      // Snapshot prix + MAJ supplier_references.unit_price : centralisés dans le trigger
      // serveur fn_snapshot_purchase_price (INSERT purchase). Ne plus écrire ici.

      return quantityAfter;
    },
    onSuccess: () => {
      toast.success("Mouvement enregistré");
      void queryClient.invalidateQueries({ queryKey: qk });
      void queryClient.invalidateQueries({ queryKey: ["product-establishment-dashboard"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement"),
  });
}

export function defaultProductStockInsert(
  productCompositionId: string,
  establishmentId: string,
  organizationId: string,
) {
  return {
    product_composition_id: productCompositionId,
    establishment_id: establishmentId,
    organization_id: organizationId,
    current_stock: 0,
    min_stock: 0,
    max_stock: null,
    reserved_stock: 0,
    unit: "piece",
    inventory_tracked: false,
    deleted: false,
    low_stock_threshold: null,
    critical_stock_threshold: null,
  };
}

export function useChangeProductStockUnit(productId: string, organizationId: string, establishmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productStockId,
      fromUnit,
      toUnit,
      currentQty,
      conversionFactor,
    }: {
      productStockId: string;
      fromUnit: string;
      toUnit: string;
      currentQty: number;
      conversionFactor: number;
    }) => {
      const supabase = createClient();

      const { count, error: lotsErr } = await supabase
        .from("stock_movements")
        .select("id", { count: "exact", head: true })
        .eq("product_stock_id", productStockId)
        .eq("movement_type", "purchase")
        .gt("remaining_quantity", 0)
        .eq("deleted", false);
      if (lotsErr) throw lotsErr;
      if (count && count > 0) {
        throw new Error(
          `Impossible de changer l'unité : ${count} lot${count > 1 ? "s" : ""} FIFO actif${count > 1 ? "s" : ""} en stock. Soldez le stock avant de changer d'unité.`,
        );
      }

      const newQty = currentQty * conversionFactor;
      const { error: stockErr } = await supabase
        .from("product_stocks")
        .update({ unit: toUnit, current_stock: newQty })
        .eq("id", productStockId);
      if (stockErr) throw stockErr;
      const { error: prodErr } = await supabase.from("products").update({ portion_unit: toUnit }).eq("id", productId);
      if (prodErr) throw prodErr;
      await supabase.from("stock_movements").insert({
        product_id: productId,
        organization_id: organizationId,
        establishment_id: establishmentId,
        product_stock_id: productStockId,
        movement_type: "adjustment",
        quantity: newQty - currentQty,
        quantity_before: currentQty,
        quantity_after: newQty,
        unit: toUnit,
        notes: `Conversion d'unité : ${currentQty} ${fromUnit} → ${newQty} ${toUnit}`,
        created_by: null,
        deleted: false,
      });
    },
    onSuccess: () => {
      toast.success("Unité de stock mise à jour.");
      void queryClient.invalidateQueries({
        queryKey: stockMovementsQueryKey(productId, organizationId, establishmentId),
      });
      void queryClient.invalidateQueries({ queryKey: ["product-establishment-dashboard"] });
      void queryClient.invalidateQueries({
        queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
      });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la conversion"),
  });
}

export function useActiveFifoLotsCount(productStockId: string | null) {
  return useQuery({
    queryKey: ["active-fifo-lots", productStockId],
    queryFn: async () => {
      const supabase = createClient();
      const { count, error } = await supabase
        .from("stock_movements")
        .select("id", { count: "exact", head: true })
        .eq("product_stock_id", productStockId!)
        .eq("movement_type", "purchase")
        .gt("remaining_quantity", 0)
        .eq("deleted", false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!productStockId,
  });
}

/**
 * Retourne toutes les lignes de composition (recettes) qui utilisent ce produit comme ingrédient.
 * Utilisé pour avertir l'utilisateur avant un changement d'unité de stock.
 */
export function useRecipesUsingIngredient(componentProductId: string) {
  return useQuery({
    queryKey: ["recipes-using-ingredient", componentProductId],
    queryFn: async () => {
      const supabase = createClient();
      const { data: comps, error: compErr } = await supabase
        .from("product_compositions")
        .select("id, default_quantity, quantity_unit, main_product_id")
        .eq("component_product_id", componentProductId)
        .neq("main_product_id", componentProductId)
        .eq("deleted", false);
      if (compErr) throw compErr;
      if (comps.length === 0) return [];
      const recipeIds = [...new Set(comps.map((c) => c.main_product_id))];
      const { data: products, error: prodErr } = await supabase.from("products").select("id, name").in("id", recipeIds);
      if (prodErr) throw prodErr;
      const productMap = new Map(products.map((p) => [p.id, p.name]));
      return comps.map((c) => ({
        id: c.id,
        quantity: c.default_quantity,
        quantityUnit: c.quantity_unit,
        recipeName: productMap.get(c.main_product_id) ?? "—",
      }));
    },
    enabled: !!componentProductId,
  });
}

export async function insertInitialMovement(
  productId: string,
  organizationId: string,
  establishmentId: string,
  productStockId: string,
  quantity: number,
  unit: string,
) {
  if (quantity <= 0) return;
  const supabase = createClient();
  await supabase.from("stock_movements").insert({
    product_id: productId,
    organization_id: organizationId,
    establishment_id: establishmentId,
    product_stock_id: productStockId,
    movement_type: "adjustment",
    quantity,
    quantity_before: 0,
    quantity_after: quantity,
    unit,
    notes: "Stock initial",
    created_by: null,
    deleted: false,
  });
}

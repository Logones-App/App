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

export function stockMovementsQueryKey(productId: string, organizationId: string, establishmentId: string) {
  return ["stock-movements", productId, organizationId, establishmentId] as const;
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
    }: {
      movementType: MovementType;
      quantity: number;
      notes: string;
      currentStock: number;
    }) => {
      if (!productStockId) throw new Error("Pas de fiche stock — impossible de créer un mouvement.");

      const supabase = createClient();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw new Error(`Session: ${sessionError.message}`);
      const userId = session?.user.id;
      if (!userId) throw new Error("Non authentifié — rechargez la page.");

      const quantityAfter = currentStock + quantity;

      const { error } = await supabase.from("stock_movements").insert({
        product_id: productId,
        organization_id: organizationId,
        establishment_id: establishmentId,
        product_stock_id: productStockId,
        movement_type: movementType,
        quantity,
        quantity_before: currentStock,
        quantity_after: quantityAfter,
        unit: unit ?? null,
        notes: notes.trim() || null,
        created_by: userId,
        deleted: false,
      });
      if (error) throw new Error(`DB: ${error.message} (${error.code})`);
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
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return;
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
    created_by: authData.user.id,
    deleted: false,
  });
}

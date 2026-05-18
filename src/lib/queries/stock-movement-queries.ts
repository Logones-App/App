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

export function stockMovementsQueryKey(productId: string, organizationId: string) {
  return ["stock-movements", productId, organizationId] as const;
}

export function useProductStockMovements(productId: string, organizationId: string) {
  return useQuery({
    queryKey: stockMovementsQueryKey(productId, organizationId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*")
        .eq("product_id", productId)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as StockMovementRow[];
    },
    enabled: !!productId && !!organizationId,
  });
}

export function useAddStockMovement(productId: string, organizationId: string) {
  const queryClient = useQueryClient();
  const qk = stockMovementsQueryKey(productId, organizationId);

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
      const supabase = createClient();

      // getSession() est en cache côté browser, plus fiable que getUser()
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw new Error(`Session: ${sessionError.message}`);
      const userId = session?.user?.id;
      if (!userId) throw new Error("Non authentifié — rechargez la page.");

      const quantityAfter = currentStock + quantity;

      const { error } = await supabase.from("stock_movements").insert({
        product_id: productId,
        organization_id: organizationId,
        movement_type: movementType,
        quantity,
        quantity_before: currentStock,
        quantity_after: quantityAfter,
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
      // Invalider aussi le stock pour que les chiffres se mettent à jour
      void queryClient.invalidateQueries({ queryKey: ["product-establishment-dashboard"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement"),
  });
}

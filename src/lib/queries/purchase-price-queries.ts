"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert } from "@/lib/supabase/database.types";

export type SupplierPriceSnapshotRow = Tables<"supplier_price_snapshots">;
export type SupplierPriceSnapshotInsert = TablesInsert<"supplier_price_snapshots">;

export function purchasePriceQueryKey(productId: string, organizationId: string) {
  return ["purchase-price-history", productId, organizationId] as const;
}

/** Historique complet trié du plus récent au plus ancien. */
export function useProductPurchasePriceHistory(productId: string, organizationId: string) {
  return useQuery({
    queryKey: purchasePriceQueryKey(productId, organizationId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("supplier_price_snapshots")
        .select("*")
        .eq("product_id", productId)
        .eq("organization_id", organizationId)
        .order("effective_from", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SupplierPriceSnapshotRow[];
    },
    enabled: !!productId && !!organizationId,
  });
}

/** Prix courant = entrée la plus récente par effective_from. */
export function getCurrentPurchasePrice(history: SupplierPriceSnapshotRow[]): SupplierPriceSnapshotRow | null {
  return history[0] ?? null;
}

/** Prix courant par product_id (dernière entrée par effective_from puis created_at desc). */
export function useComponentCurrentPurchasePrices(componentProductIds: string[], organizationId: string) {
  return useQuery({
    queryKey: ["component-purchase-prices", componentProductIds.sort().join(","), organizationId],
    queryFn: async () => {
      if (componentProductIds.length === 0) return new Map<string, number>();
      const supabase = createClient();
      const { data, error } = await supabase
        .from("supplier_price_snapshots")
        .select("product_id, unit_cost, effective_from, created_at")
        .in("product_id", componentProductIds)
        .eq("organization_id", organizationId)
        .order("effective_from", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of data ?? []) {
        if (!map.has(row.product_id)) map.set(row.product_id, row.unit_cost);
      }
      return map;
    },
    enabled: componentProductIds.length > 0 && !!organizationId,
  });
}

/** Ajouter un snapshot de prix d'achat. */
export function useAddPurchasePrice(productId: string, organizationId: string) {
  const queryClient = useQueryClient();
  const qk = purchasePriceQueryKey(productId, organizationId);
  return useMutation({
    mutationFn: async (values: {
      unit_cost: number;
      effective_from: string;
      supplier_reference_id?: string;
      supplier_id?: string;
      supplier_ref?: string;
      notes?: string;
      currency?: string;
    }) => {
      const supabase = createClient();
      const { error } = await supabase.from("supplier_price_snapshots").insert({
        product_id: productId,
        organization_id: organizationId,
        unit_cost: values.unit_cost,
        effective_from: values.effective_from,
        supplier_reference_id: values.supplier_reference_id ?? null,
        supplier_id: values.supplier_id ?? null,
        supplier_ref: values.supplier_ref?.trim() !== "" ? values.supplier_ref?.trim() : null,
        notes: values.notes?.trim() !== "" ? values.notes?.trim() : null,
        currency: values.currency ?? "EUR",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prix d'achat enregistré");
      void queryClient.invalidateQueries({ queryKey: qk });
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });
}

/** Supprimer un snapshot (hard delete — historique). */
export function useDeletePurchasePrice(productId: string, organizationId: string) {
  const queryClient = useQueryClient();
  const qk = purchasePriceQueryKey(productId, organizationId);
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("supplier_price_snapshots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entrée supprimée");
      void queryClient.invalidateQueries({ queryKey: qk });
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });
}

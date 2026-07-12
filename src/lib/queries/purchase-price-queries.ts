"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert } from "@/lib/supabase/database.types";

import { PRODUCT_DASHBOARD_QUERY_KEY } from "./product-establishment-dashboard";
import { supplierReferenceQueryKey } from "./supplier-queries";

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
      // Le prix a pu créer la fiche stock (ensureSelfStock) → rafraîchir la fiche produit
      // pour que l'onglet Stock reflète l'unité (sinon bouton « Définir l'unité » périmé).
      void queryClient.invalidateQueries({ queryKey: [PRODUCT_DASHBOARD_QUERY_KEY, productId] });
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });
}

/**
 * Recale le cache `supplier_references.unit_price` sur le snapshot restant le plus récent
 * de la même référence (× conversion_factor), ou le vide s'il n'y en a plus, pour éviter un
 * prix « fantôme ». Partagé entre la suppression d'un snapshot et la suppression d'une réception
 * (qui retire aussi le snapshot qu'elle avait créé).
 */
export async function repriceReferenceFromLatestSnapshot(
  supabase: ReturnType<typeof createClient>,
  refId: string,
): Promise<void> {
  const [{ data: latest }, { data: ref }] = await Promise.all([
    supabase
      .from("supplier_price_snapshots")
      .select("unit_cost")
      .eq("supplier_reference_id", refId)
      .order("effective_from", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("supplier_references").select("conversion_factor").eq("id", refId).single(),
  ]);
  const factor = ref?.conversion_factor && ref.conversion_factor > 0 ? ref.conversion_factor : 1;
  const nextUnitPrice = latest ? Math.round(latest.unit_cost * factor * 10000) / 10000 : null;
  await supabase.from("supplier_references").update({ unit_price: nextUnitPrice }).eq("id", refId);
}

/**
 * Supprimer un snapshot (hard delete — historique).
 * Recale le cache `supplier_references.unit_price` sur le snapshot restant le plus récent
 * de la même référence (ou le vide s'il n'y en a plus) pour éviter un prix « fantôme ».
 */
export function useDeletePurchasePrice(productId: string, organizationId: string) {
  const queryClient = useQueryClient();
  const qk = purchasePriceQueryKey(productId, organizationId);
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();

      const { data: snap, error: readErr } = await supabase
        .from("supplier_price_snapshots")
        .select("supplier_reference_id")
        .eq("id", id)
        .single();
      if (readErr) throw readErr;

      const { error } = await supabase.from("supplier_price_snapshots").delete().eq("id", id);
      if (error) throw error;

      if (snap.supplier_reference_id) await repriceReferenceFromLatestSnapshot(supabase, snap.supplier_reference_id);
    },
    onSuccess: () => {
      toast.success("Entrée supprimée");
      void queryClient.invalidateQueries({ queryKey: qk });
      void queryClient.invalidateQueries({ queryKey: supplierReferenceQueryKey(productId) });
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });
}

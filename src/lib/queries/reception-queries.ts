"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";

import { purchasePriceQueryKey, repriceReferenceFromLatestSnapshot } from "./purchase-price-queries";
import { createReceptionAsDelta, SAAS_RECEPTION_DOC_TYPE } from "./reception-delta";
import { stockMovementsQueryKey } from "./stock-movement-queries";
import { supplierReferenceQueryKey } from "./supplier-queries";

export type ReceptionRow = {
  id: string;
  created_at: string | null;
  quantity: number;
  quantity_before: number;
  unit: string | null;
  unit_cost: number | null;
  remaining_quantity: number | null;
  supplier_reference_id: string | null;
  supplier_reference: {
    order_unit: string | null;
    conversion_factor: number;
    supplier_product_name: string | null;
    supplier: { name: string } | null;
  } | null;
};

export function receptionsQueryKey(productId: string, establishmentId: string) {
  return ["product-receptions", productId, establishmentId] as const;
}

/**
 * Garantit l'existence de la fiche stock (self-composition + product_stocks) d'un ingrédient.
 * Si elle n'existe pas, la crée avec `desiredUnit` comme unité de gestion (source de vérité)
 * et aligne `products.portion_unit`. L'unité n'est définie qu'ici, à la 1ère référence.
 */
export async function ensureSelfStock(
  supabase: ReturnType<typeof createClient>,
  args: { productId: string; establishmentId: string; organizationId: string; desiredUnit: string },
): Promise<{ productStockId: string; currentStock: number }> {
  const { productId, establishmentId, organizationId, desiredUnit } = args;

  let { data: comp } = await supabase
    .from("product_compositions")
    .select("id")
    .eq("main_product_id", productId)
    .eq("component_product_id", productId)
    .eq("establishment_id", establishmentId)
    .eq("deleted", false)
    .maybeSingle();

  if (!comp) {
    const { data: created, error } = await supabase
      .from("product_compositions")
      .insert({
        main_product_id: productId,
        component_product_id: productId,
        establishment_id: establishmentId,
        organization_id: organizationId,
        composition_kind: "recipe",
        default_quantity: 1,
        show_in_customization: false,
        is_required: false,
        deleted: false,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Création composition : ${error.message}`);
    comp = created;
  }

  const { data: stock } = await supabase
    .from("product_stocks")
    .select("id, current_stock")
    .eq("product_composition_id", comp.id)
    .eq("establishment_id", establishmentId)
    .maybeSingle();

  if (stock) return { productStockId: stock.id, currentStock: stock.current_stock };

  const { data: created, error } = await supabase
    .from("product_stocks")
    .insert({
      product_composition_id: comp.id,
      establishment_id: establishmentId,
      organization_id: organizationId,
      current_stock: 0,
      min_stock: 0,
      reserved_stock: 0,
      unit: desiredUnit,
      inventory_tracked: true,
      deleted: false,
    })
    .select("id, current_stock")
    .single();
  if (error) throw new Error(`Création stock : ${error.message}`);
  // Aligne portion_unit (miroir de l'unité de gestion).
  await supabase.from("products").update({ portion_unit: desiredUnit }).eq("id", productId);
  return { productStockId: created.id, currentStock: created.current_stock };
}

/** Historique des réceptions (mouvements purchase) avec fournisseur + référence joints. */
export function useProductReceptions(productId: string, establishmentId: string) {
  return useQuery({
    queryKey: receptionsQueryKey(productId, establishmentId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("stock_movements")
        .select(
          "id, created_at, quantity, quantity_before, unit, unit_cost, remaining_quantity, supplier_reference_id, supplier_reference:supplier_references(order_unit, conversion_factor, supplier_product_name, supplier:suppliers(name))",
        )
        .eq("product_id", productId)
        .eq("establishment_id", establishmentId)
        .eq("movement_type", "purchase")
        .eq("deleted", false)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as ReceptionRow[];
    },
    enabled: !!productId && !!establishmentId,
  });
}

export function pendingReceptionsQueryKey(productId: string, establishmentId: string) {
  return ["product-pending-receptions", productId, establishmentId] as const;
}

export type PendingReceptionRow = {
  id: string;
  quantite: number | null;
  unite: string | null;
  prix_unitaire: number | null;
  supplier_reference_id: string | null;
  doc: { id: string; date_livraison: string | null; created_at: string; supplier: { name: string } | null } | null;
};

/**
 * Réceptions SaaS (mode `'pos'`) **en attente de validation caisse** : lignes `doc_import` synthétiques
 * non encore appliquées par le POS (`applied_at IS NULL`, `apply_stock ≠ false`). Le mouvement de stock
 * n'existe pas tant que le POS n'a pas validé → on les affiche à part, en attente.
 */
export function useProductPendingReceptions(productId: string, establishmentId: string) {
  return useQuery({
    queryKey: pendingReceptionsQueryKey(productId, establishmentId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("doc_import_lines")
        .select(
          "id, quantite, unite, prix_unitaire, supplier_reference_id, doc:doc_imports!inner(id, date_livraison, created_at, establishment_id, doc_type, supplier:suppliers(name))",
        )
        .eq("product_id", productId)
        .is("applied_at", null)
        .neq("apply_stock", false)
        .eq("doc.establishment_id", establishmentId)
        .eq("doc.doc_type", SAAS_RECEPTION_DOC_TYPE)
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as PendingReceptionRow[];
    },
    enabled: !!productId && !!establishmentId,
  });
}

// Un lot est « intact » (non entamé par des ventes) si sa quantité restante == quantité reçue.
function isLotIntact(quantity: number, remainingQuantity: number | null): boolean {
  return remainingQuantity != null && Math.abs(remainingQuantity - quantity) < 0.001;
}

function receptionInvalidate(
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string,
  organizationId: string,
  establishmentId: string,
) {
  void queryClient.invalidateQueries({ queryKey: receptionsQueryKey(productId, establishmentId) });
  void queryClient.invalidateQueries({ queryKey: pendingReceptionsQueryKey(productId, establishmentId) });
  void queryClient.invalidateQueries({
    queryKey: stockMovementsQueryKey(productId, organizationId, establishmentId),
  });
  void queryClient.invalidateQueries({ queryKey: ["product-establishment-dashboard"] });
  void queryClient.invalidateQueries({
    queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
  });
  // Une réception écrit/retire aussi un snapshot de prix (trigger + suppression liée) → historique & prix catalogue.
  void queryClient.invalidateQueries({ queryKey: purchasePriceQueryKey(productId, organizationId) });
  void queryClient.invalidateQueries({ queryKey: supplierReferenceQueryKey(productId) });
}

/**
 * Enregistre une réception (mouvement purchase). Crée la fiche stock à la volée si elle
 * n'existe pas encore (1ère référence) en figeant l'unité de gestion `stockUnit`.
 * En `stock_owner='pos'`, délègue à `createReceptionAsDelta` (prix immédiat + stock en delta).
 */
export function useCreateReception(productId: string, organizationId: string, establishmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      productStockId: string | null;
      stockUnit: string;
      supplierRefId: string;
      supplierId: string;
      orderQty: number;
      unitPrice: number;
      conversionFactor: number;
      notes: string;
      stockOwner: "pos" | "saas";
    }) => {
      const supabase = createClient();
      const {
        productStockId,
        stockUnit,
        supplierRefId,
        supplierId,
        orderQty,
        unitPrice,
        conversionFactor,
        notes,
        stockOwner,
      } = args;
      const f = conversionFactor > 0 ? conversionFactor : 1;

      // Mode 'pos' : le SaaS n'écrit jamais current_stock → prix immédiat (owned SaaS) + stock
      // émis en delta via un doc_import synthétique que le POS applique.
      if (stockOwner === "pos") {
        await createReceptionAsDelta(supabase, {
          productId,
          organizationId,
          establishmentId,
          supplierRefId,
          supplierId,
          orderQty,
          unitPrice,
          factor: f,
          notes,
        });
        return;
      }

      // Mode 'saas' (établissement sans caisse) : écriture directe.
      // Résoudre / créer la fiche stock + connaître le stock courant.
      let stockId = productStockId;
      let currentStock = 0;
      if (stockId) {
        const { data, error } = await supabase
          .from("product_stocks")
          .select("current_stock")
          .eq("id", stockId)
          .single();
        if (error) throw error;
        currentStock = data.current_stock;
      } else {
        const ensured = await ensureSelfStock(supabase, {
          productId,
          establishmentId,
          organizationId,
          desiredUnit: stockUnit,
        });
        stockId = ensured.productStockId;
        currentStock = ensured.currentStock;
      }

      const stockQty = Math.round(orderQty * f * 1000) / 1000;
      const unitCost = Math.round((unitPrice / f) * 100000) / 100000;
      const quantityAfter = Math.round((currentStock + stockQty) * 1000) / 1000;

      const { error: mvtErr } = await supabase.from("stock_movements").insert({
        product_id: productId,
        organization_id: organizationId,
        establishment_id: establishmentId,
        product_stock_id: stockId,
        supplier_reference_id: supplierRefId,
        movement_type: "purchase",
        quantity: stockQty,
        quantity_before: currentStock,
        quantity_after: quantityAfter,
        unit: stockUnit,
        unit_cost: unitCost,
        notes: notes.trim() !== "" ? notes.trim() : null,
        created_by: null,
        deleted: false,
      });
      if (mvtErr) throw new Error(`DB: ${mvtErr.message} (${mvtErr.code})`);

      const { error: stockErr } = await supabase
        .from("product_stocks")
        .update({ current_stock: quantityAfter })
        .eq("id", stockId);
      if (stockErr) throw stockErr;

      // Snapshot prix (supplier_price_snapshots) + MAJ supplier_references.unit_price :
      // désormais centralisés dans le trigger serveur fn_snapshot_purchase_price (INSERT purchase),
      // cohérent SaaS + mobile, online + offline. Ne plus écrire ici.
    },
    onSuccess: () => {
      toast.success("Réception enregistrée");
      receptionInvalidate(queryClient, productId, organizationId, establishmentId);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement"),
  });
}

/**
 * Supprime une réception. En `'saas'` : soft-delete du mouvement + `current_stock` (lot intact requis).
 * En `'pos'` : émet un ajustement `-orderQty` (le POS applique la déplétion) — sans muter le mouvement.
 */
export function useDeleteReception(productId: string, organizationId: string, establishmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      movementId,
      productStockId,
      quantity,
      remainingQuantity,
      supplierReferenceId,
      createdAt,
      alsoDeletePrice,
      stockOwner,
    }: {
      movementId: string;
      productStockId: string;
      quantity: number;
      remainingQuantity: number | null;
      supplierReferenceId?: string | null;
      createdAt?: string | null;
      alsoDeletePrice?: boolean;
      stockOwner: "pos" | "saas";
      factor?: number;
    }) => {
      const supabase = createClient();

      // Mode 'pos' : une réception VALIDÉE est possédée par le POS → correction sur la caisse
      // (l'UI met ces réceptions en lecture seule ; garde défensive ici, le SaaS n'émet plus d'ajustement).
      if (stockOwner === "pos") {
        throw new Error("Réception validée : la correction se fait sur la caisse.");
      }

      // Mode 'saas' : soft-delete direct (lot intact requis).
      if (!isLotIntact(quantity, remainingQuantity)) {
        throw new Error("Réception déjà entamée par des ventes — corrigez via un ajustement de stock.");
      }
      const { data: stock, error: readErr } = await supabase
        .from("product_stocks")
        .select("current_stock")
        .eq("id", productStockId)
        .single();
      if (readErr) throw readErr;

      const { error: delErr } = await supabase
        .from("stock_movements")
        .update({ deleted: true, remaining_quantity: 0 })
        .eq("id", movementId);
      if (delErr) throw delErr;

      const next = Math.round((stock.current_stock - quantity) * 1000) / 1000;
      const { error: stockErr } = await supabase
        .from("product_stocks")
        .update({ current_stock: next })
        .eq("id", productStockId);
      if (stockErr) throw stockErr;

      // Le snapshot de prix créé par cette réception (fn_snapshot_purchase_price) porte
      // `effective_from == stock_movements.created_at` → on le retrouve par (référence, date)
      // puis on recale le prix catalogue sur le snapshot restant le plus récent.
      if (alsoDeletePrice && supplierReferenceId && createdAt) {
        const { error: snapErr } = await supabase
          .from("supplier_price_snapshots")
          .delete()
          .eq("supplier_reference_id", supplierReferenceId)
          .eq("effective_from", createdAt);
        if (snapErr) throw snapErr;
        await repriceReferenceFromLatestSnapshot(supabase, supplierReferenceId);
      }
    },
    onSuccess: () => {
      toast.success("Réception supprimée");
      receptionInvalidate(queryClient, productId, organizationId, establishmentId);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la suppression"),
  });
}

/** Édite une réception (qté + prix unitaire) — uniquement si le lot est intact. */
export function useUpdateReception(productId: string, organizationId: string, establishmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      movementId,
      productStockId,
      quantityBefore,
      oldQuantity,
      remainingQuantity,
      factor,
      newOrderQty,
      newUnitPrice,
      stockOwner,
    }: {
      movementId: string;
      productStockId: string;
      quantityBefore: number;
      oldQuantity: number;
      remainingQuantity: number | null;
      factor: number;
      newOrderQty: number;
      newUnitPrice: number;
      stockOwner: "pos" | "saas";
      supplierReferenceId?: string | null;
    }) => {
      const f = factor > 0 ? factor : 1;
      const supabase = createClient();

      // Mode 'pos' : une réception VALIDÉE est possédée par le POS → correction sur la caisse
      // (l'UI met ces réceptions en lecture seule ; garde défensive, le SaaS n'émet plus d'ajustement).
      if (stockOwner === "pos") {
        throw new Error("Réception validée : la correction se fait sur la caisse.");
      }

      // Mode 'saas' : édition directe du mouvement (lot intact requis).
      if (!isLotIntact(oldQuantity, remainingQuantity)) {
        throw new Error("Réception déjà entamée par des ventes — corrigez via un ajustement de stock.");
      }
      const newQty = Math.round(newOrderQty * f * 1000) / 1000;
      const newUnitCost = Math.round((newUnitPrice / f) * 100000) / 100000;

      const { data: stock, error: readErr } = await supabase
        .from("product_stocks")
        .select("current_stock")
        .eq("id", productStockId)
        .single();
      if (readErr) throw readErr;

      const { error: mvtErr } = await supabase
        .from("stock_movements")
        .update({
          quantity: newQty,
          quantity_after: Math.round((quantityBefore + newQty) * 1000) / 1000,
          unit_cost: newUnitCost,
          remaining_quantity: newQty,
        })
        .eq("id", movementId);
      if (mvtErr) throw mvtErr;

      const next = Math.round((stock.current_stock - oldQuantity + newQty) * 1000) / 1000;
      const { error: stockErr } = await supabase
        .from("product_stocks")
        .update({ current_stock: next })
        .eq("id", productStockId);
      if (stockErr) throw stockErr;
    },
    onSuccess: () => {
      toast.success("Réception modifiée");
      receptionInvalidate(queryClient, productId, organizationId, establishmentId);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur lors de la modification"),
  });
}

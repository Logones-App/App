"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";

import { PRODUCT_DASHBOARD_QUERY_KEY } from "./product-establishment-dashboard";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BlockingSlot = {
  slotId: string;
  slotName: string;
  formulaId: string;
  formulaName: string;
  establishmentId: string;
  establishmentName: string;
};

export type AffectedRecipe = {
  compositionId: string;
  recipeProductId: string;
  recipeName: string;
  establishmentId: string;
  establishmentName: string;
};

export type ArchivePrecheckResult = {
  blockingSlots: BlockingSlot[];
  affectedRecipes: AffectedRecipe[];
};

export type FormulaReplacement = {
  slotId: string;
  formulaId: string;
  establishmentId: string;
  replacementProductId: string | null;
};

// ─── Precheck ─────────────────────────────────────────────────────────────────

export function useArchivePrecheck(productId: string, organizationId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["archive-precheck", productId, organizationId],
    staleTime: 0,
    enabled: enabled && !!productId && !!organizationId,
    queryFn: async (): Promise<ArchivePrecheckResult> => {
      const supabase = createClient();

      // ── Slots de formule qui deviendraient vides ──────────────────────────
      const { data: myFPs } = await supabase
        .from("formula_products")
        .select("slot_id, formula_id, establishment_id")
        .eq("product_id", productId)
        .eq("organization_id", organizationId)
        .eq("deleted", false);

      const slotIds = [...new Set((myFPs ?? []).map((f) => f.slot_id))];
      let blockingSlots: BlockingSlot[] = [];

      if (slotIds.length > 0) {
        const { data: allInSlots } = await supabase
          .from("formula_products")
          .select("slot_id")
          .in("slot_id", slotIds)
          .eq("organization_id", organizationId)
          .eq("deleted", false);

        const countPerSlot = new Map<string, number>();
        for (const fp of allInSlots ?? []) {
          countPerSlot.set(fp.slot_id, (countPerSlot.get(fp.slot_id) ?? 0) + 1);
        }
        const emptySlotIds = slotIds.filter((id) => countPerSlot.get(id) === 1);

        if (emptySlotIds.length > 0) {
          const { data: slotDetails } = await supabase
            .from("formula_slots")
            .select(
              `id, name,
               formula:formulas!formula_slots_formula_id_fkey(
                 id, name, establishment_id,
                 establishment:establishments!formulas_establishment_id_fkey(id, name)
               )`,
            )
            .in("id", emptySlotIds);

          type EstRow = { id: string; name: string };
          type FormulaRow = {
            id: string;
            name: string;
            establishment_id: string;
            establishment: EstRow | EstRow[] | null;
          };
          type SlotRow = { id: string; name: string; formula: FormulaRow | FormulaRow[] | null };

          blockingSlots = (slotDetails ?? []).map((s) => {
            const row = s as unknown as SlotRow;
            const formula = Array.isArray(row.formula) ? row.formula[0] : row.formula;
            const est = formula
              ? Array.isArray(formula.establishment)
                ? formula.establishment[0]
                : formula.establishment
              : null;
            return {
              slotId: row.id,
              slotName: row.name,
              formulaId: formula?.id ?? "",
              formulaName: formula?.name ?? "",
              establishmentId: formula?.establishment_id ?? "",
              establishmentName: est?.name ?? "",
            };
          });
        }
      }

      // ── Recettes actives utilisant ce produit comme ingrédient ────────────
      const { data: comps } = await supabase
        .from("product_compositions")
        .select(
          `id, main_product_id, establishment_id,
           recipe:products!product_compositions_main_product_id_fkey(id, name, deleted),
           establishment:establishments!product_compositions_establishment_id_fkey(id, name)`,
        )
        .eq("component_product_id", productId)
        .eq("organization_id", organizationId)
        .eq("deleted", false);

      type ProdRow = { id: string; name: string; deleted: boolean | null };
      type EstRowB = { id: string; name: string };
      type CompRow = {
        id: string;
        main_product_id: string;
        establishment_id: string;
        recipe: ProdRow | ProdRow[] | null;
        establishment: EstRowB | EstRowB[] | null;
      };

      const affectedRecipes: AffectedRecipe[] = (comps ?? [])
        .map((c) => {
          const row = c as unknown as CompRow;
          const recipe = Array.isArray(row.recipe) ? row.recipe[0] : row.recipe;
          const est = Array.isArray(row.establishment) ? row.establishment[0] : row.establishment;
          return { row, recipe, est };
        })
        .filter(({ recipe }) => recipe?.deleted === false)
        .map(({ row, recipe, est }) => ({
          compositionId: row.id,
          recipeProductId: row.main_product_id,
          recipeName: recipe?.name ?? "",
          establishmentId: row.establishment_id,
          establishmentName: est?.name ?? "",
        }));

      return { blockingSlots, affectedRecipes };
    },
  });
}

// ─── Produits disponibles pour remplacement ───────────────────────────────────

export function useReplacementProducts(organizationId: string, excludeProductId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["replacement-products", organizationId, excludeProductId],
    enabled: enabled && !!organizationId,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .neq("id", excludeProductId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── Archive (cascade correcte par type) ──────────────────────────────────────

export function useArchiveProduct(organizationId: string, onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      formulaReplacements = [],
    }: {
      productId: string;
      formulaReplacements?: FormulaReplacement[];
    }) => {
      const supabase = createClient();

      // 1. Insérer les remplacements de slot AVANT la cascade
      const withReplacement = formulaReplacements.filter((r) => r.replacementProductId);
      if (withReplacement.length > 0) {
        await Promise.all(
          withReplacement.map((r) =>
            supabase.from("formula_products").insert({
              formula_id: r.formulaId,
              slot_id: r.slotId,
              establishment_id: r.establishmentId,
              organization_id: organizationId,
              product_id: r.replacementProductId as string,
              is_default: false,
            }),
          ),
        );
      }

      // 2. Récupérer les IDs menus_products pour cascader public_menu_items
      const { data: mpRows, error: mpIdErr } = await supabase
        .from("menus_products")
        .select("id")
        .eq("products_id", productId)
        .eq("organization_id", organizationId)
        .eq("deleted", false);
      if (mpIdErr) throw mpIdErr;
      const mpIds = (mpRows ?? []).map((r) => r.id);

      // 3. HARD DELETE — config pure sans valeur historique ni référence externe
      await Promise.all([
        supabase.from("category_grid_items").delete().eq("product_id", productId),
        supabase.from("formula_products").delete().eq("product_id", productId).eq("organization_id", organizationId),
        supabase.from("product_options").delete().eq("product_id", productId).eq("organization_id", organizationId),
        ...(mpIds.length > 0
          ? [
              supabase
                .from("public_menu_items")
                .delete()
                .in("menus_product_id", mpIds)
                .eq("organization_id", organizationId),
            ]
          : []),
      ]);

      // 4. SOFT DELETE — données avec valeur historique ou restaurables
      const softResults = await Promise.all([
        supabase.from("products").update({ deleted: true }).eq("id", productId).eq("organization_id", organizationId),
        supabase
          .from("menus_products")
          .update({ deleted: true })
          .eq("products_id", productId)
          .eq("organization_id", organizationId),
        supabase
          .from("product_compositions")
          .update({ deleted: true })
          .eq("component_product_id", productId)
          .eq("organization_id", organizationId)
          .eq("deleted", false),
        supabase
          .from("product_compositions")
          .update({ deleted: true })
          .eq("main_product_id", productId)
          .eq("organization_id", organizationId)
          .eq("deleted", false),
        supabase
          .from("product_suppliers")
          .update({ deleted: true })
          .eq("product_id", productId)
          .eq("organization_id", organizationId),
      ]);
      for (const r of softResults) {
        if (r.error) throw r.error;
      }
    },
    onSuccess: () => {
      toast.success("Produit archivé.");
      void queryClient.invalidateQueries({ queryKey: ["organization-products"] });
      void queryClient.invalidateQueries({ queryKey: ["menu-category-grid-items"] });
      void queryClient.invalidateQueries({ queryKey: ["menu-products"] });
      void queryClient.invalidateQueries({ queryKey: [PRODUCT_DASHBOARD_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: ["public-menu-sections"] });
      onSuccess?.();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Archivage impossible."),
  });
}

// ─── Restauration ─────────────────────────────────────────────────────────────

export function useRestoreProduct(organizationId: string, onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => {
      const supabase = createClient();
      const results = await Promise.all([
        supabase.from("products").update({ deleted: false }).eq("id", productId).eq("organization_id", organizationId),
        // La recette et les liens fournisseurs sont intrinsèques au produit → restaurés avec lui
        supabase
          .from("product_compositions")
          .update({ deleted: false })
          .eq("main_product_id", productId)
          .eq("organization_id", organizationId),
        supabase
          .from("product_suppliers")
          .update({ deleted: false })
          .eq("product_id", productId)
          .eq("organization_id", organizationId),
      ]);
      for (const r of results) {
        if (r.error) throw r.error;
      }
    },
    onSuccess: () => {
      toast.success("Produit restauré. Pensez à le remettre dans vos menus si nécessaire.");
      void queryClient.invalidateQueries({ queryKey: ["organization-products"] });
      void queryClient.invalidateQueries({ queryKey: [PRODUCT_DASHBOARD_QUERY_KEY] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Restauration impossible."),
  });
}

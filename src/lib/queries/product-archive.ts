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

// ─── Garde au changement de type de produit ───────────────────────────────────

export type ProductTypeGuard = {
  componentRecipes: string[]; // recettes qui utilisent ce produit comme ingrédient
  onMenuOrFormula: boolean; // présent sur un menu ou un slot de formule
  hasBom: boolean; // possède une fiche technique (compositions de type recipe)
  hasActiveStock: boolean; // lots FIFO actifs (remaining_quantity > 0)
};

export function useProductTypeGuard(productId: string, organizationId: string) {
  return useQuery({
    queryKey: ["product-type-guard", productId, organizationId],
    staleTime: 0,
    enabled: !!productId && !!organizationId,
    queryFn: async (): Promise<ProductTypeGuard> => {
      const supabase = createClient();

      const compsP = supabase
        .from("product_compositions")
        .select("main_product_id, recipe:products!product_compositions_main_product_id_fkey(name, deleted)")
        .eq("component_product_id", productId)
        .eq("organization_id", organizationId)
        .eq("deleted", false);
      const menusP = supabase
        .from("menus_products")
        .select("id", { count: "exact", head: true })
        .eq("product_id", productId)
        .eq("deleted", false);
      const formulaP = supabase
        .from("formula_products")
        .select("id", { count: "exact", head: true })
        .eq("product_id", productId)
        .eq("deleted", false);
      const bomP = supabase
        .from("product_compositions")
        .select("id", { count: "exact", head: true })
        .eq("main_product_id", productId)
        .eq("composition_kind", "recipe")
        .neq("component_product_id", productId)
        .eq("deleted", false);
      const lotsP = supabase
        .from("stock_movements")
        .select("id", { count: "exact", head: true })
        .eq("product_id", productId)
        .eq("movement_type", "purchase")
        .gt("remaining_quantity", 0)
        .eq("deleted", false);

      const [{ data: comps }, { count: menuCount }, { count: formulaCount }, { count: bomCount }, { count: lotCount }] =
        await Promise.all([compsP, menusP, formulaP, bomP, lotsP]);

      type CompRow = { main_product_id: string; recipe: { name: string; deleted: boolean | null } | null };
      const names = new Set<string>();
      for (const c of (comps ?? []) as unknown as CompRow[]) {
        if (c.main_product_id !== productId && c.recipe && c.recipe.deleted === false) names.add(c.recipe.name);
      }

      return {
        componentRecipes: [...names],
        onMenuOrFormula: (menuCount ?? 0) + (formulaCount ?? 0) > 0,
        hasBom: (bomCount ?? 0) > 0,
        hasActiveStock: (lotCount ?? 0) > 0,
      };
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
        supabase.from("product_option_group_products").update({ deleted: true }).eq("product_id", productId),
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
          .from("supplier_references")
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
      void queryClient.invalidateQueries({ queryKey: ["organization-products-archived"] });
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

      // Produit + fournisseurs : restore simple
      const [productRes, suppliersRes] = await Promise.all([
        supabase.from("products").update({ deleted: false }).eq("id", productId).eq("organization_id", organizationId),
        supabase
          .from("supplier_references")
          .update({ deleted: false })
          .eq("product_id", productId)
          .eq("organization_id", organizationId),
      ]);
      if (productRes.error) throw productRes.error;
      if (suppliersRes.error) throw suppliersRes.error;

      // Compositions : la contrainte unique (main+component+establishment) n'inclut pas `deleted`.
      // Si une ligne active existe déjà pour la même clé, le UPDATE 409-erait → on purge le doublon archivé.
      const { data: archived, error: fetchErr } = await supabase
        .from("product_compositions")
        .select("id, component_product_id, establishment_id, composition_kind")
        .eq("main_product_id", productId)
        .eq("organization_id", organizationId)
        .eq("deleted", true);
      if (fetchErr) throw fetchErr;
      if (!archived?.length) return;

      const { data: active, error: activeErr } = await supabase
        .from("product_compositions")
        .select("component_product_id, establishment_id, composition_kind")
        .eq("main_product_id", productId)
        .eq("organization_id", organizationId)
        .eq("deleted", false);
      if (activeErr) throw activeErr;

      // Clé unique réelle : component + composition_kind + establishment
      const activeKeys = new Set(
        (active ?? []).map((c) => `${c.component_product_id}:${c.composition_kind}:${c.establishment_id}`),
      );

      // Parmi les archivées, dédupliquer aussi entre elles (doublons deleted=true avec même clé)
      const seenKeys = new Set<string>();
      const toRestore: string[] = [];
      const toPurge: string[] = [];
      for (const c of archived) {
        const key = `${c.component_product_id}:${c.composition_kind}:${c.establishment_id}`;
        if (activeKeys.has(key) || seenKeys.has(key)) {
          toPurge.push(c.id);
        } else {
          seenKeys.add(key);
          toRestore.push(c.id);
        }
      }

      if (toRestore.length > 0) {
        const { error } = await supabase.from("product_compositions").update({ deleted: false }).in("id", toRestore);
        if (error) throw error;
      }
      if (toPurge.length > 0) {
        const { error } = await supabase.from("product_compositions").delete().in("id", toPurge);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Produit restauré. Pensez à le remettre dans vos menus si nécessaire.");
      void queryClient.invalidateQueries({ queryKey: ["organization-products"] });
      void queryClient.invalidateQueries({ queryKey: ["organization-products-archived"] });
      void queryClient.invalidateQueries({ queryKey: [PRODUCT_DASHBOARD_QUERY_KEY] });
      onSuccess?.();
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Restauration impossible.");
    },
  });
}

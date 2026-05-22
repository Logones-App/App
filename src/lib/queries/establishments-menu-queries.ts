import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type FormulaRow = Database["public"]["Tables"]["formulas"]["Row"];
type FormulaSlotRow = Database["public"]["Tables"]["formula_slots"]["Row"];
type FormulaProductRow = Database["public"]["Tables"]["formula_products"]["Row"];

export type FormulaProductWithProduct = FormulaProductRow & {
  product: { id: string; name: string } | null;
};

/** Libellés issus de `public.categories` (palette, listes). */
export type MenuPaletteCategory = Pick<CategoryRow, "id" | "name">;

// Query pour récupérer les menus d'un établissement
export const useEstablishmentMenus = (establishmentId?: string, organizationId?: string) => {
  return useQuery({
    queryKey: ["establishment-menus", establishmentId, organizationId],
    queryFn: async () => {
      if (!establishmentId || !organizationId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("menus")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!establishmentId && !!organizationId,
  });
};

/** Formules rattachées à un menu (`formulas.menu_id`). */
export const useMenuFormulas = (menuId?: string, establishmentId?: string, organizationId?: string) => {
  return useQuery({
    queryKey: ["menu-formulas", menuId, establishmentId, organizationId],
    queryFn: async (): Promise<FormulaRow[]> => {
      if (!menuId || !establishmentId || !organizationId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("formulas")
        .select("*")
        .eq("menu_id", menuId)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FormulaRow[];
    },
    enabled: !!menuId && !!establishmentId && !!organizationId,
  });
};

/** Emplacements (slots) d'une formule. */
export const useFormulaSlots = (formulaId?: string, establishmentId?: string, organizationId?: string) => {
  return useQuery({
    queryKey: ["formula-slots", formulaId, establishmentId, organizationId],
    queryFn: async (): Promise<FormulaSlotRow[]> => {
      if (!formulaId || !establishmentId || !organizationId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("formula_slots")
        .select("*")
        .eq("formula_id", formulaId)
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("slot_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as FormulaSlotRow[];
      const byId = new Map<string, FormulaSlotRow>();
      for (const r of rows) {
        if (r?.id && !byId.has(r.id)) byId.set(r.id, r);
      }
      return Array.from(byId.values());
    },
    enabled: !!formulaId && !!establishmentId && !!organizationId,
  });
};

/** Produits candidats par emplacement pour une formule. */
export const useFormulaProductsByFormula = (formulaId?: string, establishmentId?: string, organizationId?: string) => {
  return useQuery({
    queryKey: ["formula-products", formulaId, establishmentId, organizationId],
    queryFn: async (): Promise<FormulaProductWithProduct[]> => {
      if (!formulaId || !establishmentId || !organizationId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("formula_products")
        .select(
          `
          *,
          product:products(id, name)
        `,
        )
        .eq("formula_id", formulaId)
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as FormulaProductWithProduct[];
      const byId = new Map<string, FormulaProductWithProduct>();
      for (const r of rows) {
        if (r?.id && !byId.has(r.id)) byId.set(r.id, r);
      }
      return Array.from(byId.values());
    },
    enabled: !!formulaId && !!establishmentId && !!organizationId,
  });
};

// Query pour récupérer les produits d'un menu (avec prix spécifique)
export const useMenuProducts = (menuId?: string) => {
  return useQuery({
    queryKey: ["menu-products", menuId],
    queryFn: async () => {
      if (!menuId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("menus_products")
        .select("*, product:products(*)")
        .eq("menus_id", menuId)
        .eq("deleted", false)
        .order("id", { ascending: true });
      if (error) throw error;
      // Une même fiche produit peut apparaître sur plusieurs lignes menus_products (grille, doublons) :
      // on ne garde qu’une entrée par product.id pour les listes / clés React.
      const rows = (data ?? []).map((row: any) => ({
        ...row.product,
        menu_price: row.price,
        menus_products_id: row.id,
      }));
      const byProductId = new Map<string,(typeof rows)[number]>();
      for (const r of rows) {
        if (r?.id && !byProductId.has(r.id)) byProductId.set(r.id, r);
      }
      return Array.from(byProductId.values());
    },
    enabled: !!menuId,
  });
};

// Query pour récupérer les produits en stock dans l'établissement mais non associés à un menu
export const useEstablishmentProductsNotInMenus = (establishmentId?: string, organizationId?: string) => {
  return useQuery({
    queryKey: ["establishment-products-not-in-menus", establishmentId, organizationId],
    queryFn: async () => {
      if (!establishmentId || !organizationId) return [];
      const supabase = createClient();
      // Récupérer tous les produits en stock dans l'établissement
      const { data: stocks, error: stocksError } = await supabase
        .from("product_stocks")
        .select("* , product:products(*)")
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .eq("product.deleted", false);
      if (stocksError) throw stocksError;
      // Récupérer tous les menus de l'établissement
      const { data: menus, error: menusError } = await supabase
        .from("menus")
        .select("id")
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false);
      if (menusError) throw menusError;
      const menuIds = (menus ?? []).map((m: any) => m.id);
      // Récupérer tous les produits associés à un menu
      let productsInMenus: string[] = [];
      if (menuIds.length > 0) {
        const { data: menusProducts, error: mpError } = await supabase
          .from("menus_products")
          .select("products_id")
          .in("menus_id", menuIds)
          .eq("deleted", false);
        if (mpError) throw mpError;
        productsInMenus = (menusProducts ?? []).map((mp: any) => mp.products_id);
      }
      // Retourner les produits en stock qui ne sont dans aucun menu
      return (stocks ?? [])
        .filter((s: any) => s.product && !productsInMenus.includes(s.product_id))
        .map((s: any) => ({ ...s.product, stock: s }));
    },
    enabled: !!establishmentId && !!organizationId,
  });
};

// Query pour récupérer les menus avec leurs plannings
export const useEstablishmentMenusWithSchedules = (establishmentId?: string, organizationId?: string) => {
  return useQuery({
    queryKey: ["establishment-menus-with-schedules", establishmentId, organizationId],
    queryFn: async () => {
      if (!establishmentId || !organizationId) return [];
      const supabase = createClient();

      // Récupérer les menus
      const { data: menus, error: menusError } = await supabase
        .from("menus")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("display_order", { ascending: true });

      if (menusError) throw menusError;

      // Récupérer les plannings pour tous les menus
      const menuIds = (menus ?? []).map((m: any) => m.id);
      let schedules: any[] = [];

      if (menuIds.length > 0) {
        const { data: schedulesData, error: schedulesError } = await supabase
          .from("menu_schedules")
          .select("*")
          .in("menu_id", menuIds)
          .eq("deleted", false);

        if (schedulesError) throw schedulesError;
        schedules = schedulesData ?? [];
      }

      // Associer les plannings aux menus
      const result = (menus ?? []).map((menu: any) => ({
        ...menu,
        schedules: schedules.filter((s: any) => s.menu_id === menu.id),
      }));

      return result;
    },
    enabled: !!establishmentId && !!organizationId,
  });
};

/** Tuiles de grille menu (`category_grid_items`). `parentItemId: null` = niveau racine. */
export const useMenuCategoryGridItems = (
  menuId?: string,
  establishmentId?: string,
  organizationId?: string,
  parentItemId: string | null = null,
) => {
  return useQuery({
    queryKey: ["menu-category-grid-items", menuId, establishmentId, organizationId, parentItemId],
    queryFn: async () => {
      if (!menuId || !establishmentId || !organizationId) return [];

      const supabase = createClient();
      let q = supabase
        .from("category_grid_items")
        .select("*, product:product_id(is_available)")
        .eq("menu_id", menuId)
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false);

      if (parentItemId === null) {
        q = q.is("parent_item_id", null);
      } else {
        q = q.eq("parent_item_id", parentItemId);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!menuId && !!establishmentId && !!organizationId,
  });
};

/**
 * Catégories + produits (liste plate) + prix menus pour la palette menu.
 */
export const useMenuPaletteCatalog = (establishmentId?: string, organizationId?: string, menuId?: string) => {
  return useQuery({
    queryKey: ["menu-palette-catalog", establishmentId, organizationId, menuId],
    queryFn: async (): Promise<{
      categories: MenuPaletteCategory[];
      products: ProductRow[];
      priceByProductId: Record<string, number>;
    }> => {
      if (!establishmentId || !organizationId) {
        return { categories: [], products: [], priceByProductId: {} };
      }

      const supabase = createClient();

      const [{ data: categoriesRaw, error: catError }, { data: productsRaw, error: prodError }] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name")
          .eq("organization_id", organizationId)
          .eq("establishment_id", establishmentId)
          .eq("deleted", false)
          .order("name", { ascending: true }),
        supabase
          .from("products")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("deleted", false)
          .order("name", { ascending: true }),
      ]);

      if (catError) throw catError;
      if (prodError) throw prodError;

      const categories: MenuPaletteCategory[] = ((categoriesRaw ?? []) as CategoryRow[]).map((c) => ({
        id: c.id,
        name: c.name,
      }));

      const products = (productsRaw ?? []) as ProductRow[];

      const priceByProductId: Record<string, number> = {};
      if (menuId) {
        const { data: mpRaw } = await supabase
          .from("menus_products")
          .select("products_id, price")
          .eq("menus_id", menuId)
          .eq("establishment_id", establishmentId)
          .eq("deleted", false);
        for (const row of mpRaw ?? []) {
          if (row.products_id != null) priceByProductId[row.products_id] = row.price ?? 0;
        }
      }

      return { categories, products, priceByProductId };
    },
    enabled: !!establishmentId && !!organizationId,
  });
};

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

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

// Query pour récupérer les produits d'un menu (avec prix spécifique)
export const useMenuProducts = (menuId?: string) => {
  return useQuery({
    queryKey: ["menu-products", menuId],
    queryFn: async () => {
      if (!menuId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("menus_products")
        .select(
          `
          *,
          product:products(*)
        `,
        )
        .eq("menus_id", menuId)
        .eq("deleted", false);
      if (error) throw error;
      // On retourne les infos du produit + le prix spécifique au menu
      return (data ?? []).map((row: any) => ({
        ...row.product,
        menu_price: row.price,
        menus_products_id: row.id,
      }));
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
        .select("*")
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
 * Catégories + produits pour la palette menu.
 * Pas de JOIN SQL : deux requêtes (`categories`, puis `products` org), puis regroupement en mémoire
 * où `products.category_id` = `categories.id` (FK `fk_products_category_id`).
 */
export const useMenuPaletteCatalog = (establishmentId?: string, organizationId?: string) => {
  return useQuery({
    queryKey: ["menu-palette-catalog", establishmentId, organizationId],
    queryFn: async (): Promise<{
      categories: MenuPaletteCategory[];
      productsByCategoryId: Record<string, ProductRow[]>;
      /** Produits dont `category_id` ne correspond à aucune catégorie chargée */
      orphanProducts: ProductRow[];
    }> => {
      if (!establishmentId || !organizationId) {
        return { categories: [], productsByCategoryId: {}, orphanProducts: [] };
      }

      const supabase = createClient();

      const [{ data: categoriesRaw, error: catError }, { data: productsRaw, error: prodError }] = await Promise.all([
        supabase
          .from("categories")
          .select("*")
          .eq("organization_id", organizationId)
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

      const list: MenuPaletteCategory[] = ((categoriesRaw ?? []) as CategoryRow[]).map((c) => ({
        id: c.id,
        name: c.name,
      }));
      const allProducts = productsRaw ?? [];

      const productsByCategoryId: Record<string, ProductRow[]> = {};
      for (const c of list) {
        productsByCategoryId[c.id] = [];
      }
      const orphanProducts: ProductRow[] = [];

      for (const p of allProducts) {
        if (Object.prototype.hasOwnProperty.call(productsByCategoryId, p.category_id)) {
          productsByCategoryId[p.category_id].push(p);
        } else {
          orphanProducts.push(p);
        }
      }

      return { categories: list, productsByCategoryId, orphanProducts };
    },
    enabled: !!establishmentId && !!organizationId,
  });
};

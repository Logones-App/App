"use client";

import { useQuery } from "@tanstack/react-query";

export const PRODUCT_DASHBOARD_QUERY_KEY = "product-establishment-dashboard" as const;

import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

type SupabaseBrowserClient = ReturnType<typeof createClient>;

export type ProductWithCategoryName = Tables<"products"> & {
  category: { name: string } | null;
  vat_rate: { value: number | null } | null;
};

/** Convertit un prix TTC en HT selon le taux TVA du produit. */
export function ttcToHt(ttc: number, vatRate: { value: number | null } | null): number {
  const rate = vatRate?.value;
  if (!rate) return ttc;
  return ttc / (1 + rate / 100);
}

export type ProductCompositionRow = Tables<"product_compositions"> & {
  component: { id: string; name: string; portion_unit: string | null; deleted: boolean | null } | null;
};

export type CompositionStockRow = {
  composition: ProductCompositionRow;
  /** main_product_id === component_product_id : article vendu / recette “unitaire” */
  isSelfComposition: boolean;
  /** Stock sur cette ligne de composition (lien product_stocks.product_composition_id) */
  lineStock: Tables<"product_stocks"> | null;
  /**
   * Pour un ingrédient : stock du composant via sa composition identité (même produit en main et component),
   * autre mode de suivi que la ligne recette.
   */
  componentIdentityStock: Tables<"product_stocks"> | null;
  /**
   * Compositions / stocks du composant (même logique que la fiche établissement de ce sous-produit),
   * jusqu’à une profondeur max avec détection de cycle.
   */
  nestedCompositionStockRows?: CompositionStockRow[];
};

/** Profondeur d’expansion sous chaque ingrédient (ex. plat → sous-plat → ingrédients). */
const MAX_COMPOSITION_STOCK_NEST_DEPTH = 2;

export type MenuProductPricingJoin = {
  menuProduct: Tables<"menus_products">;
  menu: Pick<Tables<"menus">, "id" | "name" | "deleted"> | null;
};

type MenuEmbedForFilter = Pick<Tables<"menus">, "id" | "name" | "deleted"> & {
  establishment_id: string | null;
};

export type ProductEstablishmentDashboardData = {
  product: ProductWithCategoryName | null;
  compositions: ProductCompositionRow[];
  compositionStockRows: CompositionStockRow[];
  menuProductPricing: MenuProductPricingJoin[];
};

function normalizeMenuEmbed(menu: MenuEmbedForFilter | MenuEmbedForFilter[] | null): MenuEmbedForFilter | null {
  if (!menu) return null;
  if (Array.isArray(menu)) return menu[0] ?? null;
  return menu;
}

function collectMenuProductPricing(
  menuRows:
    | (Tables<"menus_products"> & { menu: MenuEmbedForFilter | MenuEmbedForFilter[] | null })[]
    | null
    | undefined,
  establishmentId: string,
): MenuProductPricingJoin[] {
  const out: MenuProductPricingJoin[] = [];
  if (!menuRows) return out;
  for (const row of menuRows) {
    const m = normalizeMenuEmbed(row.menu);
    if (!m || m.deleted) continue;
    if (m.establishment_id && m.establishment_id !== establishmentId) continue;
    out.push({
      menuProduct: row,
      menu: {
        id: m.id,
        name: m.name,
        deleted: m.deleted,
      },
    });
  }
  return out;
}

async function fetchProductCompositions(
  supabase: SupabaseBrowserClient,
  mainProductId: string,
  establishmentId: string,
  organizationId: string,
): Promise<ProductCompositionRow[]> {
  const { data, error } = await supabase
    .from("product_compositions")
    .select(
      `
            *,
            component:products!product_compositions_component_product_id_fkey(id, name, portion_unit, deleted)
          `,
    )
    .eq("main_product_id", mainProductId)
    .eq("establishment_id", establishmentId)
    .eq("organization_id", organizationId)
    .eq("deleted", false)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return data as ProductCompositionRow[];
}

async function buildCompositionStockRows(
  supabase: SupabaseBrowserClient,
  compositions: ProductCompositionRow[],
  establishmentId: string,
  organizationId: string,
): Promise<CompositionStockRow[]> {
  const mainCompositionIds = compositions.map((c) => c.id);
  const ingredientProductIds = [
    ...new Set(
      compositions.filter((c) => c.main_product_id !== c.component_product_id).map((c) => c.component_product_id),
    ),
  ];

  let selfCompositionRows: Pick<Tables<"product_compositions">, "id" | "main_product_id" | "component_product_id">[] =
    [];

  if (ingredientProductIds.length > 0) {
    const { data: compRows, error: compErr } = await supabase
      .from("product_compositions")
      .select("id, main_product_id, component_product_id")
      .eq("establishment_id", establishmentId)
      .eq("organization_id", organizationId)
      .eq("deleted", false)
      .in("main_product_id", ingredientProductIds);
    if (compErr) throw compErr;
    const rows = (Array.isArray(compRows) ? compRows : []) as Pick<
      Tables<"product_compositions">,
      "id" | "main_product_id" | "component_product_id"
    >[];
    selfCompositionRows = rows.filter((r) => r.main_product_id === r.component_product_id);
  }

  const selfCompositionIds = selfCompositionRows.map((r) => r.id);
  const allCompositionIdsForStocks = [...new Set([...mainCompositionIds, ...selfCompositionIds])];

  let stocks: Tables<"product_stocks">[] = [];
  if (allCompositionIdsForStocks.length > 0) {
    const { data: stocksData, error: stocksError } = await supabase
      .from("product_stocks")
      .select("*")
      .eq("establishment_id", establishmentId)
      .eq("organization_id", organizationId)
      .eq("deleted", false)
      .in("product_composition_id", allCompositionIdsForStocks);
    if (stocksError) throw stocksError;
    if (Array.isArray(stocksData)) {
      stocks = stocksData as Tables<"product_stocks">[];
    }
  }

  const stockByCompositionId = new Map(stocks.map((s) => [s.product_composition_id, s]));
  const selfCompositionIdByProductId = new Map(selfCompositionRows.map((r) => [r.main_product_id, r.id]));

  return compositions.map((row) => {
    const isSelfComposition = row.main_product_id === row.component_product_id;
    const lineStock = stockByCompositionId.get(row.id) ?? null;
    let componentIdentityStock: Tables<"product_stocks"> | null = null;
    if (!isSelfComposition) {
      const selfId = selfCompositionIdByProductId.get(row.component_product_id);
      if (selfId) {
        componentIdentityStock = stockByCompositionId.get(selfId) ?? null;
      }
    }
    return {
      composition: row,
      isSelfComposition,
      lineStock,
      componentIdentityStock,
    };
  });
}

async function buildCompositionStockRowsWithNested(
  supabase: SupabaseBrowserClient,
  mainProductId: string,
  compositions: ProductCompositionRow[],
  establishmentId: string,
  organizationId: string,
  remainingDepth: number,
  ancestorProductIds: readonly string[],
): Promise<CompositionStockRow[]> {
  if (ancestorProductIds.includes(mainProductId)) {
    return [];
  }

  const rows = await buildCompositionStockRows(supabase, compositions, establishmentId, organizationId);

  if (remainingDepth <= 0) {
    return rows.map((r) => ({ ...r, nestedCompositionStockRows: undefined }));
  }

  const nextAncestors = [...ancestorProductIds, mainProductId];

  return Promise.all(
    rows.map(async (r) => {
      if (r.isSelfComposition) {
        return { ...r, nestedCompositionStockRows: undefined };
      }
      const componentId = r.composition.component_product_id;
      const subCompositions = await fetchProductCompositions(supabase, componentId, establishmentId, organizationId);
      const nested = await buildCompositionStockRowsWithNested(
        supabase,
        componentId,
        subCompositions,
        establishmentId,
        organizationId,
        remainingDepth - 1,
        nextAncestors,
      );
      return {
        ...r,
        nestedCompositionStockRows: nested.length > 0 ? nested : undefined,
      };
    }),
  );
}

export function useProductEstablishmentDashboard(
  productId: string | undefined,
  establishmentId: string | undefined,
  organizationId: string | undefined,
) {
  return useQuery({
    queryKey: ["product-establishment-dashboard", productId, establishmentId, organizationId],
    enabled: Boolean(productId && establishmentId && organizationId),
    queryFn: async (): Promise<ProductEstablishmentDashboardData> => {
      const supabase = createClient();
      const pid = productId as string;
      const eid = establishmentId as string;
      const oid = organizationId as string;

      const [productRes, menuProductsRes] = await Promise.all([
        supabase
          .from("products")
          .select(
            `
            *,
            category:categories(name),
            vat_rate:vat_rate(value)
          `,
          )
          .eq("id", pid)
          .eq("organization_id", oid)
          .maybeSingle(),
        supabase
          .from("menus_products")
          .select(
            `
            *,
            menu:menus(id, name, deleted, establishment_id)
          `,
          )
          .eq("products_id", pid)
          .eq("establishment_id", eid)
          .eq("organization_id", oid)
          .eq("deleted", false),
      ]);

      if (productRes.error) throw productRes.error;
      if (menuProductsRes.error) throw menuProductsRes.error;

      const product = productRes.data as ProductWithCategoryName | null;
      const compositions = await fetchProductCompositions(supabase, pid, eid, oid);

      const rawMenuRows = menuProductsRes.data as
        | (Tables<"menus_products"> & { menu: MenuEmbedForFilter | MenuEmbedForFilter[] | null })[]
        | null;
      const menuProductPricing = collectMenuProductPricing(rawMenuRows, eid);
      const compositionStockRows = await buildCompositionStockRowsWithNested(
        supabase,
        pid,
        compositions,
        eid,
        oid,
        MAX_COMPOSITION_STOCK_NEST_DEPTH,
        [],
      );

      return {
        product,
        compositions,
        compositionStockRows,
        menuProductPricing,
      };
    },
  });
}

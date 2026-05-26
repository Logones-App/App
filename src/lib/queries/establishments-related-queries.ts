import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { ProductStockListItem, ProductWithStock } from "@/lib/types/database-extensions";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type ProductStockRow = Database["public"]["Tables"]["product_stocks"]["Row"];

type StockWithComposition = ProductStockRow & {
  product_compositions: {
    main_product_id: string;
    component_product_id: string;
  } | null;
};

function toStockRow(s: StockWithComposition): ProductStockRow {
  const { product_compositions: _pc, ...rest } = s;
  return rest;
}

function pickRepresentativeStock(lines: ProductStockListItem[]): ProductStockRow | null {
  if (lines.length === 0) return null;
  const selfTracked = lines.find((l) => l.isSelfCompositionLine && l.stock.inventory_tracked);
  if (selfTracked) return selfTracked.stock;
  const selfAny = lines.find((l) => l.isSelfCompositionLine);
  if (selfAny) return selfAny.stock;
  const tracked = lines.find((l) => l.stock.inventory_tracked);
  if (tracked) return tracked.stock;
  return lines[0].stock;
}

/**
 * Produits dont au moins une fiche `product_stocks` est liée à une composition
 * dont `main_product_id` est ce produit (`product_composition_id`).
 * Plusieurs fiches par produit sont conservées (self, lignes recette, pool composant).
 */
export async function fetchEstablishmentProductsWithStocks(
  establishmentId: string,
  organizationId: string,
): Promise<ProductWithStock[]> {
  const supabase = createClient();

  const { data: stocksRaw, error: stocksError } = await supabase
    .from("product_stocks")
    .select(
      `
      *,
      product_compositions ( main_product_id, component_product_id )
    `,
    )
    .eq("establishment_id", establishmentId)
    .eq("organization_id", organizationId)
    .eq("deleted", false);

  if (stocksError) throw stocksError;

  const stocks = (stocksRaw ?? []) as StockWithComposition[];

  const byMainProduct = new Map<string, StockWithComposition[]>();
  for (const s of stocks) {
    const mainId = s.product_compositions?.main_product_id;
    if (!mainId) continue;
    const list = byMainProduct.get(mainId) ?? [];
    list.push(s);
    byMainProduct.set(mainId, list);
  }

  const productIds = [...byMainProduct.keys()];

  if (productIds.length === 0) return [];

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("*")
    .in("id", productIds)
    .eq("deleted", false)
    .order("name", { ascending: true });

  if (productsError) throw productsError;

  return (products ?? []).map((product) => {
    const rawLines = byMainProduct.get(product.id) ?? [];
    const stockLines: ProductStockListItem[] = rawLines.map((row) => {
      const comp = row.product_compositions;
      const isSelfCompositionLine = Boolean(comp && comp.main_product_id === comp.component_product_id);
      return { stock: toStockRow(row), isSelfCompositionLine };
    });
    stockLines.sort((a, b) => {
      if (a.isSelfCompositionLine !== b.isSelfCompositionLine) {
        return a.isSelfCompositionLine ? -1 : 1;
      }
      return a.stock.current_stock - b.stock.current_stock;
    });
    const stock = pickRepresentativeStock(stockLines);
    return { ...product, stockLines, stock };
  });
}

/**
 * Catalogue catégories d’une organisation — requête directe sur `categories`.
 * (Même filtre RLS `categories_select_universal` : `organization_id` ∈ orgs de l’utilisateur.)
 */
export const useOrganizationCategories = (organizationId?: string) => {
  return useQuery({
    queryKey: ["organization-categories", organizationId],
    queryFn: async (): Promise<CategoryRow[]> => {
      if (!organizationId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CategoryRow[];
    },
    enabled: !!organizationId,
  });
};

/** Catégories catalogue rattachées à un établissement (écran Produits, grilles menu, etc.). */
export const useEstablishmentCategories = (establishmentId?: string, organizationId?: string) => {
  return useQuery({
    queryKey: ["establishment-categories", establishmentId, organizationId],
    queryFn: async (): Promise<CategoryRow[]> => {
      if (!establishmentId || !organizationId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CategoryRow[];
    },
    enabled: !!establishmentId && !!organizationId,
  });
};

// Query pour récupérer les horaires d'ouverture d'un établissement
export const useEstablishmentOpeningHours = (establishmentId?: string) => {
  return useQuery({
    queryKey: ["establishment-opening-hours", establishmentId],
    queryFn: async () => {
      if (!establishmentId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("opening_hours")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("day_of_week", { ascending: true })
        .order("open_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!establishmentId,
  });
};

// Query pour récupérer les créneaux de réservation d'un établissement
export const useEstablishmentBookingSlots = (establishmentId?: string) => {
  return useQuery({
    queryKey: ["establishment-booking-slots", establishmentId],
    queryFn: async () => {
      if (!establishmentId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("booking_slots")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!establishmentId,
  });
};

// Query pour récupérer les produits d'une organisation
export const useEstablishmentVatRates = (establishmentId?: string) => {
  return useQuery({
    queryKey: ["establishment-vat-rates", establishmentId],
    queryFn: async () => {
      if (!establishmentId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("vat_rate")
        .select("id, name, value")
        .eq("establishment_id", establishmentId)
        .eq("deleted", false)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!establishmentId,
  });
};

export const useEstablishmentPrinters = (establishmentId?: string, organizationId?: string) => {
  return useQuery({
    queryKey: ["establishment-printers", establishmentId, organizationId],
    queryFn: async () => {
      if (!establishmentId || !organizationId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("printers")
        .select("id, name, establishment_id")
        .eq("organization_id", organizationId)
        .eq("establishment_id", establishmentId)
        .eq("deleted", false);
      if (error) throw error;
      const rows = data ?? [];
      return [...rows].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    },
    enabled: !!establishmentId && !!organizationId,
  });
};

export const useOrganizationProducts = (organizationId?: string) => {
  return useQuery({
    queryKey: ["organization-products", organizationId],
    refetchOnMount: true,
    queryFn: async () => {
      if (!organizationId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!organizationId,
  });
};

export const useOrganizationArchivedProducts = (organizationId?: string) => {
  return useQuery({
    queryKey: ["organization-products-archived", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("deleted", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!organizationId,
  });
};

// Query pour récupérer les stocks d'un établissement
export const useEstablishmentStocks = (establishmentId?: string, organizationId?: string) => {
  return useQuery({
    queryKey: ["establishment-stocks", establishmentId, organizationId],
    queryFn: async () => {
      if (!establishmentId || !organizationId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("product_stocks")
        .select(
          `
          *,
          product_compositions (
            main_product_id,
            product:products!product_compositions_main_product_id_fkey (
              id,
              name,
              description,
              price,
              is_available,
              organization_id,
              vat_rate_id
            )
          )
        `,
        )
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("current_stock", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!establishmentId && !!organizationId,
  });
};

// Query pour récupérer les produits avec leurs stocks pour un établissement
export const useEstablishmentProductsWithStocks = (establishmentId?: string, organizationId?: string) => {
  return useQuery({
    queryKey: ["establishment-products-with-stocks", establishmentId, organizationId],
    queryFn: async (): Promise<ProductWithStock[]> => {
      if (!establishmentId || !organizationId) return [];
      return fetchEstablishmentProductsWithStocks(establishmentId, organizationId);
    },
    enabled: !!establishmentId && !!organizationId,
  });
};

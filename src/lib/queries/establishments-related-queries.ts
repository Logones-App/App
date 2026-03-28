import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type ProductStockRow = Database["public"]["Tables"]["product_stocks"]["Row"];

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
export const useOrganizationProducts = (organizationId?: string) => {
  return useQuery({
    queryKey: ["organization-products", organizationId],
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
          products (
            id,
            name,
            description,
            price,
            vat_rate,
            is_available,
            organization_id
          )
        `,
        )
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .order("products(name)", { ascending: true });
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
    queryFn: async () => {
      if (!establishmentId || !organizationId) return [];

      const supabase = createClient();

      // Récupérer les stocks pour cet établissement spécifique
      const { data: stocksRaw, error: stocksError } = await supabase
        .from("product_stocks")
        .select(
          `
          *,
          product_compositions ( main_product_id )
        `,
        )
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false);

      if (stocksError) throw stocksError;

      type StockWithComposition = ProductStockRow & {
        product_compositions: { main_product_id: string } | null;
      };
      const stocks = (stocksRaw ?? []) as StockWithComposition[];

      const productIds = [
        ...new Set(
          stocks.map((s) => s.product_compositions?.main_product_id).filter((id): id is string => Boolean(id)),
        ),
      ];

      if (productIds.length === 0) {
        return [];
      }

      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("*")
        .in("id", productIds)
        .eq("deleted", false)
        .order("name", { ascending: true });

      if (productsError) throw productsError;

      const productsWithStocks = (products ?? []).map((product) => {
        const stock = stocks.find((s) => s.product_compositions?.main_product_id === product.id);
        return {
          ...product,
          stock: stock
            ? {
                id: stock.id,
                product_id: product.id,
                product_composition_id: stock.product_composition_id,
                establishment_id: stock.establishment_id,
                organization_id: stock.organization_id,
                current_stock: stock.current_stock,
                min_stock: stock.min_stock,
                max_stock: stock.max_stock,
                low_stock_threshold: stock.low_stock_threshold,
                critical_stock_threshold: stock.critical_stock_threshold,
                reserved_stock: stock.reserved_stock,
                unit: stock.unit,
                deleted: stock.deleted,
                last_updated_by: stock.last_updated_by,
                created_at: stock.created_at,
                updated_at: stock.updated_at,
              }
            : null,
        };
      });

      return productsWithStocks;
    },
    enabled: !!establishmentId && !!organizationId,
  });
};

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type Establishment = Database["public"]["Tables"]["establishments"]["Row"];

// Query pour récupérer les établissements d'une organisation
export const useOrganizationEstablishments = (organizationId?: string) => {
  return useQuery({
    queryKey: ["organization-establishments", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const supabase = createClient();
      const { data, error } = await supabase
        .from("establishments")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });
};

// Query pour récupérer un établissement spécifique
export const useEstablishment = (establishmentId?: string) => {
  return useQuery({
    queryKey: ["establishment", establishmentId],
    queryFn: async () => {
      if (!establishmentId) return null;

      const supabase = createClient();
      const { data, error } = await supabase
        .from("establishments")
        .select("*")
        .eq("id", establishmentId)
        .eq("deleted", false)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!establishmentId,
  });
};

// Query pour récupérer un établissement par slug
export const useEstablishmentBySlug = (slug?: string) => {
  return useQuery({
    queryKey: ["establishment-by-slug", slug],
    queryFn: async () => {
      if (!slug) return null;

      const supabase = createClient();
      const { data, error } = await supabase
        .from("establishments")
        .select("*")
        .eq("slug", slug)
        .eq("deleted", false)
        .eq("is_public", true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
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
      return data || [];
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
      return data || [];
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
      return data || [];
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
      return data || [];
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
      const { data: stocks, error: stocksError } = await supabase
        .from("product_stocks")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false);

      if (stocksError) throw stocksError;

      // Récupérer seulement les produits qui ont un stock associé
      const productIds = stocks.map((stock) => stock.product_id);

      if (productIds.length === 0) {
        return []; // Aucun produit associé
      }

      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("*")
        .in("id", productIds)
        .eq("deleted", false)
        .order("name", { ascending: true });

      if (productsError) throw productsError;

      // Combiner les produits avec leurs stocks
      const productsWithStocks = products.map((product) => {
        const stock = stocks.find((s) => s.product_id === product.id);
        return {
          ...product,
          stock: stock
            ? {
                id: stock.id,
                product_id: stock.product_id,
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
        .eq("establishments_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data || [];
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
        .select(`
          *,
          product:products(*)
        `)
        .eq("menus_id", menuId)
        .eq("deleted", false);
      if (error) throw error;
      // On retourne les infos du produit + le prix spécifique au menu
      return (data || []).map((row: any) => ({
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
        .eq("establishments_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false);
      if (menusError) throw menusError;
      const menuIds = (menus || []).map((m: any) => m.id);
      // Récupérer tous les produits associés à un menu
      let productsInMenus: string[] = [];
      if (menuIds.length > 0) {
        const { data: menusProducts, error: mpError } = await supabase
          .from("menus_products")
          .select("products_id")
          .in("menus_id", menuIds)
          .eq("deleted", false);
        if (mpError) throw mpError;
        productsInMenus = (menusProducts || []).map((mp: any) => mp.products_id);
      }
      // Retourner les produits en stock qui ne sont dans aucun menu
      return (stocks || [])
        .filter((s: any) => s.product && !productsInMenus.includes(s.product_id))
        .map((s: any) => ({ ...s.product, stock: s }));
    },
    enabled: !!establishmentId && !!organizationId,
  });
};

// Mutation pour créer un établissement
export const useCreateEstablishment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (establishment: {
      name: string;
      slug: string;
      organization_id: string;
      user_id: string;
      description?: string;
      address?: string;
      phone?: string;
      email?: string;
      website?: string;
      logo_url?: string;
      cover_image_url?: string;
      seo_title?: string;
      seo_description?: string;
      is_public?: boolean;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase.from("establishments").insert(establishment).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalider les queries liées aux établissements
      queryClient.invalidateQueries({
        queryKey: ["organization-establishments", data.organization_id],
      });
    },
  });
};

// Mutation pour mettre à jour un établissement
export const useUpdateEstablishment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      slug?: string;
      description?: string;
      address?: string;
      phone?: string;
      email?: string;
      website?: string;
      logo_url?: string;
      cover_image_url?: string;
      seo_title?: string;
      seo_description?: string;
      is_public?: boolean;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase.from("establishments").update(updates).eq("id", id).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalider les queries liées aux établissements
      queryClient.invalidateQueries({
        queryKey: ["organization-establishments", data.organization_id],
      });
      queryClient.invalidateQueries({ queryKey: ["establishment", data.id] });
      queryClient.invalidateQueries({ queryKey: ["establishment-by-slug", data.slug] });
    },
  });
};

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
        .eq("establishments_id", establishmentId)
        .eq("organization_id", organizationId)
        .eq("deleted", false)
        .order("display_order", { ascending: true });
      
      if (menusError) throw menusError;
      
      // Récupérer les plannings pour tous les menus
      const menuIds = (menus || []).map((m: any) => m.id);
      let schedules: any[] = [];
      
      if (menuIds.length > 0) {
        const { data: schedulesData, error: schedulesError } = await supabase
          .from("menu_schedules")
          .select("*")
          .in("menu_id", menuIds)
          .eq("deleted", false);
        
        if (schedulesError) throw schedulesError;
        schedules = schedulesData || [];
      }
      
      // Associer les plannings aux menus
      const result = (menus || []).map((menu: any) => ({
        ...menu,
        schedules: schedules.filter((s: any) => s.menu_id === menu.id)
      }));
      
      return result;
    },
    enabled: !!establishmentId && !!organizationId,
  });
};

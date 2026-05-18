import { ALLERGENS, LABELS } from "@/lib/constants/product-attributes";
import { createClient } from "@/lib/supabase/client";

export type PublicProduct = {
  menuProductId: string;
  productId: string;
  name: string;
  description: string | null;
  price: number | null;
  allergens: string[];
  labels: string[];
  productType: string | null;
  portionWeight: number | null;
  portionUnit: string | null;
  categoryId: string;
  categoryName: string;
  isAvailable: boolean;
};

export type PublicMenu = {
  id: string;
  name: string;
  description: string | null;
  categories: { id: string; name: string }[];
  productsByCategory: Record<string, PublicProduct[]>;
};

export type PublicEstablishment = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
};

export async function getPublicEstablishmentBySlug(slug: string): Promise<PublicEstablishment | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("establishments")
    .select("id, name, slug, description, address, phone, email, website, logo_url")
    .eq("slug", slug)
    .eq("deleted", false)
    .eq("is_public", true)
    .single();
  if (error || !data) return null;
  return data as PublicEstablishment;
}

export async function getPublicMenus(establishmentId: string): Promise<PublicMenu[]> {
  const supabase = createClient();

  // 1. Récupérer les menus actifs
  const { data: menus, error: menusError } = await supabase
    .from("menus")
    .select("id, name, description")
    .eq("establishment_id", establishmentId)
    .eq("deleted", false)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (menusError || !menus?.length) return [];

  // 2. Pour chaque menu, récupérer les produits avec catégories + attributs
  const results: PublicMenu[] = [];

  for (const menu of menus) {
    const { data: menuProducts, error: mpError } = await supabase
      .from("menus_products")
      .select(
        `
        id,
        price,
        product:products(
          id, name, description, is_available,
          allergens, labels, product_type,
          portion_weight, portion_unit,
          category:categories(id, name)
        )
      `,
      )
      .eq("menus_id", menu.id)
      .eq("deleted", false);

    if (mpError || !menuProducts) continue;

    const categoryMap = new Map<string, { id: string; name: string }>();
    const productsByCategory: Record<string, PublicProduct[]> = {};

    for (const mp of menuProducts) {
      const product = mp.product as {
        id: string;
        name: string;
        description: string | null;
        is_available: boolean | null;
        allergens: unknown;
        labels: unknown;
        product_type: string | null;
        portion_weight: number | null;
        portion_unit: string | null;
        category: { id: string; name: string } | null;
      } | null;

      if (!product) continue;
      if (product.is_available === false) continue;

      const cat = product.category;
      const catId = cat?.id ?? "other";
      const catName = cat?.name ?? "Autres";

      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, { id: catId, name: catName });
        productsByCategory[catId] = [];
      }

      productsByCategory[catId].push({
        menuProductId: mp.id,
        productId: product.id,
        name: product.name,
        description: product.description,
        price: mp.price,
        allergens: (product.allergens as string[] | null) ?? [],
        labels: (product.labels as string[] | null) ?? [],
        productType: product.product_type,
        portionWeight: product.portion_weight,
        portionUnit: product.portion_unit,
        categoryId: catId,
        categoryName: catName,
        isAvailable: product.is_available ?? true,
      });
    }

    results.push({
      id: menu.id,
      name: menu.name,
      description: menu.description,
      categories: [...categoryMap.values()],
      productsByCategory,
    });
  }

  return results;
}

// ─── Helpers affichage ────────────────────────────────────────────────────────

export function allergenInfo(key: string) {
  return ALLERGENS.find((a) => a.key === key);
}

export function labelInfo(key: string) {
  return LABELS.find((l) => l.key === key);
}

export function formatPrice(price: number | null): string {
  if (price === null) return "";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

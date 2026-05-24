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
  isAvailable: boolean;
};

export type PublicSection = {
  id: string;
  name: string;
  items: PublicProduct[];
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

export async function getPublicCarteSections(establishmentId: string): Promise<PublicSection[]> {
  const supabase = createClient();

  const { data: sections, error: secError } = await supabase
    .from("public_menu_sections")
    .select("id, name")
    .eq("establishment_id", establishmentId)
    .eq("deleted", false)
    .order("display_order", { ascending: true });

  if (secError || !sections?.length) return [];

  const sectionIds = sections.map((s) => s.id);
  const sectionNameById = new Map(sections.map((s) => [s.id, s.name]));

  const { data: items, error: itemError } = await supabase
    .from("public_menu_items")
    .select(
      `id, section_id,
      menus_product:menus_products(
        id, price,
        product:products(id, name, description, allergens, labels, product_type, portion_unit, portion_weight, is_available)
      )`,
    )
    .in("section_id", sectionIds)
    .eq("deleted", false)
    .eq("is_visible", true)
    .order("display_order", { ascending: true });

  if (itemError) return [];

  type RawProduct = {
    id: string;
    name: string;
    description: string | null;
    allergens: unknown;
    labels: unknown;
    product_type: string | null;
    portion_unit: string | null;
    portion_weight: number | null;
    is_available: boolean | null;
  };
  type RawItem = {
    id: string;
    section_id: string;
    menus_product: { id: string; price: number | null; product: RawProduct | null } | null;
  };

  const itemsBySection = new Map<string, PublicProduct[]>();

  for (const raw of (items ?? []) as RawItem[]) {
    const mp = raw.menus_product;
    if (!mp?.product) continue;
    if (mp.product.is_available === false) continue;

    const list = itemsBySection.get(raw.section_id) ?? [];
    list.push({
      menuProductId: mp.id,
      productId: mp.product.id,
      name: mp.product.name,
      description: mp.product.description,
      price: mp.price,
      allergens: (mp.product.allergens as string[] | null) ?? [],
      labels: (mp.product.labels as string[] | null) ?? [],
      productType: mp.product.product_type,
      portionWeight: mp.product.portion_weight,
      portionUnit: mp.product.portion_unit,
      isAvailable: mp.product.is_available ?? true,
    });
    itemsBySection.set(raw.section_id, list);
  }

  return sections.map((s) => ({
    id: s.id,
    name: sectionNameById.get(s.id) ?? s.name,
    items: itemsBySection.get(s.id) ?? [],
  }));
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

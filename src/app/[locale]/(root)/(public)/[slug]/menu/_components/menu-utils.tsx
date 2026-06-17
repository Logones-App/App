import { ALLERGENS, LABELS } from "@/lib/constants/product-attributes";
import { createClient } from "@/lib/supabase/client";

export type PublicProduct = {
  menuProductId: string;
  productId: string;
  name: string;
  description: string | null;
  note: string | null;
  price: number | null;
  vatRate: number | null;
  allergens: string[];
  labels: string[];
  productType: string | null;
  portionWeight: number | null;
  portionUnit: string | null;
  isAvailable: boolean;
  isOutOfStock: boolean;
};

export type PublicSection = {
  id: string;
  name: string;
  description: string | null;
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
  if (error) return null;
  return data as PublicEstablishment;
}

export async function getPublicCarteSections(establishmentId: string): Promise<PublicSection[]> {
  const supabase = createClient();

  const { data: sections, error: secError } = await supabase
    .from("public_menu_sections")
    .select("id, name, description")
    .eq("establishment_id", establishmentId)
    .eq("deleted", false)
    .order("display_order", { ascending: true });

  if (secError || !sections.length) return [];

  const sectionIds = sections.map((s) => s.id);

  const { data: items, error: itemError } = await supabase
    .from("public_menu_items")
    .select(
      `id, section_id, note,
      menus_product:menus_products(
        id, price,
        product:products(id, name, description, allergens, labels, product_type, portion_unit, portion_weight, is_available, vat_rate_entry:vat_rate_id(value))
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
    vat_rate_entry: { value: number | null } | null;
  };
  type RawItem = {
    id: string;
    section_id: string;
    note: string | null;
    menus_product: { id: string; price: number | null; product: RawProduct | null } | null;
  };

  const itemsBySection = new Map<string, PublicProduct[]>();

  for (const raw of items as RawItem[]) {
    const mp = raw.menus_product;
    if (!mp?.product) continue;
    if (mp.product.is_available === false) continue;

    const list = itemsBySection.get(raw.section_id) ?? [];
    list.push({
      menuProductId: mp.id,
      productId: mp.product.id,
      name: mp.product.name,
      description: mp.product.description,
      note: raw.note,
      price: mp.price,
      vatRate: mp.product.vat_rate_entry?.value ?? null,
      allergens: (mp.product.allergens as string[] | null) ?? [],
      labels: (mp.product.labels as string[] | null) ?? [],
      productType: mp.product.product_type,
      portionWeight: mp.product.portion_weight,
      portionUnit: mp.product.portion_unit,
      isAvailable: mp.product.is_available ?? true,
      isOutOfStock: false,
    });
    itemsBySection.set(raw.section_id, list);
  }

  return sections.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description ?? null,
    items: itemsBySection.get(s.id) ?? [],
  }));
}

export async function getPublicCarteSectionsWithStock(establishmentId: string): Promise<PublicSection[]> {
  type StockMap = Partial<Record<string, { current_stock: number }>>;
  const [sections, stockRes] = await Promise.all([
    getPublicCarteSections(establishmentId),
    fetch(`/api/table-order/stock?est=${establishmentId}`)
      .then((r) => r.json())
      .then((d) => d as StockMap)
      .catch((): StockMap => ({})),
  ]);
  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      isOutOfStock: (stockRes[item.productId]?.current_stock ?? 1) <= 0,
    })),
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

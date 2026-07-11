import { ALLERGENS, LABELS } from "@/lib/constants/product-attributes";
import { pickLocalized } from "@/lib/i18n/localized";
import { createClient } from "@/lib/supabase/client";

export type PublicProduct = {
  menuProductId: string;
  productId: string;
  name: string;
  /** Nom en langue primaire (fr), non traduit — à envoyer en cuisine/commande. */
  baseName: string;
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
  isCustomizable: boolean;
  menusId: string;
  /** JSONB `products.translations` (name/description par locale). */
  productTranslations: unknown;
  /** JSONB `public_menu_items.translations` (note par locale). */
  noteTranslations: unknown;
};

export type PublicSection = {
  id: string;
  name: string;
  description: string | null;
  items: PublicProduct[];
  subsections: PublicSection[];
  /** Carte (menu) à laquelle la section appartient ; null = commune à toutes les cartes. */
  menuId: string | null;
  /** JSONB `public_menu_sections.translations` (name/description par locale). */
  translations: unknown;
};

/** Carte publique = un menu public de l'établissement. */
export type PublicMenuCard = { id: string; name: string | null };

/** Menus publics de l'établissement = les cartes sélectionnables (Midi, Soir…). */
export async function getPublicMenus(establishmentId: string): Promise<PublicMenuCard[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("menus")
    .select("id, name")
    .eq("establishment_id", establishmentId)
    .eq("is_public", true)
    .eq("deleted", false)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  if (error) return [];
  return data;
}

/**
 * Sections d'une carte donnée : celles propres au menu `cardMenuId` + les communes (menuId null).
 * Les sous-sections héritant du menu de leur parent, filtrer au niveau racine suffit.
 */
export function filterSectionsByCard(sections: PublicSection[], cardMenuId: string | null): PublicSection[] {
  return sections.filter((s) => s.menuId === cardMenuId || s.menuId === null);
}

/** Plage horaire d'un menu. `day_of_week` : 1=lundi … 7=dimanche ; null = tous les jours. */
export type MenuSchedule = {
  menu_id: string;
  day_of_week: number | null;
  start_time: string | null;
  end_time: string | null;
  valid_from: string | null;
  valid_until: string | null;
};

export async function getMenuSchedules(menuIds: string[]): Promise<MenuSchedule[]> {
  if (menuIds.length === 0) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("menu_schedules")
    .select("menu_id, day_of_week, start_time, end_time, valid_from, valid_until")
    .in("menu_id", menuIds)
    .eq("deleted", false);
  if (error) return [];
  return data;
}

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/**
 * Carte active selon l'heure locale (le client QR est sur place) : on cherche un menu dont une
 * plage `menu_schedules` couvre maintenant (jour + heure + fenêtre de validité). Repli sur la 1ʳᵉ carte.
 */
export function pickCurrentCardId(cards: PublicMenuCard[], schedules: MenuSchedule[], now: Date): string | null {
  if (cards.length === 0) return null;
  const jsDay = now.getDay(); // 0=dim … 6=sam
  const schedDay = jsDay === 0 ? 7 : jsDay; // 1=lun … 7=dim
  const hm = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  const dateStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

  const activeMenuIds = new Set(
    schedules
      .filter((s) => {
        if (s.day_of_week != null && s.day_of_week !== schedDay) return false;
        if (s.start_time && hm < s.start_time) return false;
        if (s.end_time && hm > s.end_time) return false;
        if (s.valid_from && dateStr < s.valid_from) return false;
        if (s.valid_until && dateStr > s.valid_until) return false;
        return true;
      })
      .map((s) => s.menu_id),
  );

  return cards.find((c) => activeMenuIds.has(c.id))?.id ?? cards[0].id;
}

/** Aplatit tous les produits d'un arbre de sections (tous niveaux). */
export function flattenSectionItems(sections: PublicSection[]): PublicProduct[] {
  return sections.flatMap((s) => [...s.items, ...flattenSectionItems(s.subsections)]);
}

/** Vrai si la section (ou l'un de ses descendants) contient au moins un produit. */
export function sectionHasContent(section: PublicSection): boolean {
  return section.items.length > 0 || section.subsections.some(sectionHasContent);
}

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
  /** Langues proposées sur la carte (1ʳᵉ = primaire = contenu des colonnes de base). */
  locales: string[];
};

export async function getPublicEstablishmentBySlug(slug: string): Promise<PublicEstablishment | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("establishments")
    .select("id, name, slug, description, address, phone, email, website, logo_url, public_menu_locales")
    .eq("slug", slug)
    .eq("deleted", false)
    .eq("is_public", true)
    .single();
  if (error) return null;
  const { public_menu_locales, ...rest } = data;
  return { ...rest, locales: public_menu_locales.length ? public_menu_locales : ["fr"] } as PublicEstablishment;
}

export async function getPublicCarteSections(establishmentId: string): Promise<PublicSection[]> {
  const supabase = createClient();

  const { data: sections, error: secError } = await supabase
    .from("public_menu_sections")
    .select("id, name, description, parent_id, display_order, menu_id, translations")
    .eq("establishment_id", establishmentId)
    .eq("deleted", false)
    .order("display_order", { ascending: true });

  if (secError || !sections.length) return [];

  const sectionIds = sections.map((s) => s.id);

  const { data: items, error: itemError } = await supabase
    .from("public_menu_items")
    .select(
      `id, section_id, note, translations,
      menus_product:menus_products(
        id, menus_id, price,
        product:products(id, name, description, translations, allergens, labels, product_type, portion_unit, portion_weight, is_available, vat_rate_entry:vat_rate_id(value))
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
    translations: unknown;
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
    translations: unknown;
    menus_product: { id: string; menus_id: string; price: number | null; product: RawProduct | null } | null;
  };
  type RawSection = {
    id: string;
    name: string;
    description: string | null;
    parent_id: string | null;
    menu_id: string | null;
    translations: unknown;
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
      baseName: mp.product.name,
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
      isCustomizable: false,
      menusId: mp.menus_id,
      productTranslations: mp.product.translations,
      noteTranslations: raw.translations,
    });
    itemsBySection.set(raw.section_id, list);
  }

  // Arbre par parent_id (l'ordre display_order est préservé au sein de chaque groupe).
  const ROOT = "__root__";
  const childrenByParent = new Map<string, RawSection[]>();
  for (const s of sections as RawSection[]) {
    const key = s.parent_id ?? ROOT;
    const arr = childrenByParent.get(key) ?? [];
    arr.push(s);
    childrenByParent.set(key, arr);
  }

  const build = (s: RawSection): PublicSection => ({
    id: s.id,
    name: s.name,
    description: s.description ?? null,
    items: itemsBySection.get(s.id) ?? [],
    subsections: (childrenByParent.get(s.id) ?? []).map(build),
    menuId: s.menu_id,
    translations: s.translations,
  });

  return (childrenByParent.get(ROOT) ?? []).map(build);
}

// ─── Localisation (résolution client-side selon la langue choisie) ──────────────

function localizeProduct(p: PublicProduct, locale: string, primary: string): PublicProduct {
  return {
    ...p,
    name: pickLocalized(p.name, p.productTranslations, locale, "name", primary) ?? p.name,
    description: pickLocalized(p.description, p.productTranslations, locale, "description", primary),
    note: pickLocalized(p.note, p.noteTranslations, locale, "note", primary),
  };
}

function localizeSection(s: PublicSection, locale: string, primary: string): PublicSection {
  return {
    ...s,
    name: pickLocalized(s.name, s.translations, locale, "name", primary) ?? s.name,
    description: pickLocalized(s.description, s.translations, locale, "description", primary),
    items: s.items.map((p) => localizeProduct(p, locale, primary)),
    subsections: s.subsections.map((sub) => localizeSection(sub, locale, primary)),
  };
}

/** Applique les traductions à tout l'arbre pour la locale choisie (repli sur la langue primaire). */
export function localizeSections(sections: PublicSection[], locale: string, primary: string): PublicSection[] {
  if (locale === primary) return sections;
  return sections.map((s) => localizeSection(s, locale, primary));
}

export async function getPublicCarteSectionsWithStock(establishmentId: string): Promise<PublicSection[]> {
  type StockMap = Partial<Record<string, { current_stock: number }>>;
  type CustomizableSet = Set<string>;
  const [sections, stockRes, customizableRes] = await Promise.all([
    getPublicCarteSections(establishmentId),
    fetch(`/api/table-order/stock?est=${establishmentId}`)
      .then((r) => r.json())
      .then((d) => d as StockMap)
      .catch((): StockMap => ({})),
    fetch(`/api/table-order/customizable?est=${establishmentId}`)
      .then((r) => r.json())
      .then((d) => new Set<string>((d as { ids: string[] }).ids))
      .catch((): CustomizableSet => new Set()),
  ]);

  const enrich = (section: PublicSection): PublicSection => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      isOutOfStock: (stockRes[item.productId]?.current_stock ?? 1) <= 0,
      isCustomizable: customizableRes.has(item.productId),
    })),
    subsections: section.subsections.map(enrich),
  });

  return sections.map(enrich);
}

// ─── Helpers affichage ────────────────────────────────────────────────────────

export function allergenInfo(key: string) {
  return ALLERGENS.find((a) => a.key === key);
}

export function labelInfo(key: string) {
  return LABELS.find((l) => l.key === key);
}

export function formatPrice(price: number | null, locale = "fr"): string {
  if (price === null) return "";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

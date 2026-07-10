/**
 * Traductions de contenu stockées en JSONB sur les tables (products, public_menu_sections,
 * public_menu_items…) : { "<locale>": { "<field>": "<valeur>" } }.
 * La colonne de base (name/description/note) reste la **langue primaire** de l'établissement
 * (première entrée de `establishments.public_menu_locales`, fr par défaut).
 */
export type LocalizedContent = Record<string, Record<string, string>>;

/** Lecture d'une clé dynamique sur un objet inconnu sans bracket-indexing (évite object-injection). */
function readKey(obj: unknown, key: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  return Object.entries(obj as Record<string, unknown>).find(([k]) => k === key)?.[1];
}

/**
 * Retourne le texte du champ `field` pour `locale`, avec repli sur la valeur de base
 * (langue primaire) si la traduction est absente ou vide.
 */
export function pickLocalized(
  base: string | null,
  translations: unknown,
  locale: string,
  field: string,
  primaryLocale = "fr",
): string | null {
  if (!locale || locale === primaryLocale) return base;
  const value = readKey(readKey(translations, locale), field);
  return typeof value === "string" && value.trim().length > 0 ? value : base;
}

/** Réécrit `key` → `value` dans un objet plat sans assignation par index dynamique. */
function withKey(obj: Record<string, string>, key: string, value: string | null): Record<string, string> {
  const entries = Object.entries(obj).filter(([k]) => k !== key);
  if (value && value.trim().length > 0) entries.push([key, value.trim()]);
  return Object.fromEntries(entries);
}

/**
 * Fusionne une valeur de champ traduit dans le JSONB (usage éditeur). Renvoie un nouvel objet ;
 * une valeur vide supprime la clé (et la locale si elle devient vide).
 */
export function setLocalized(
  translations: unknown,
  locale: string,
  field: string,
  value: string | null,
): LocalizedContent {
  const root = (translations && typeof translations === "object" ? translations : {}) as LocalizedContent;
  const bucket = withKey((readKey(root, locale) as Record<string, string> | undefined) ?? {}, field, value);
  const entries = Object.entries(root).filter(([k]) => k !== locale);
  if (Object.keys(bucket).length > 0) entries.push([locale, bucket]);
  return Object.fromEntries(entries) as LocalizedContent;
}

/** Valeur traduite BRUTE (sans repli sur la base) pour l'édition ; "" si absente. */
export function rawLocalized(translations: unknown, locale: string, field: string): string {
  const value = readKey(readKey(translations, locale), field);
  return typeof value === "string" ? value : "";
}

/** Locales disponibles pour un établissement (première = primaire). Repli sur ["fr"]. */
export function establishmentLocales(list: string[] | null | undefined): string[] {
  return list && list.length > 0 ? list : ["fr"];
}

/** Nom natif d'une langue (endonyme, capitalisé), repli sur le code en majuscules. */
export function localeLabel(code: string): string {
  try {
    const label = new Intl.DisplayNames([code], { type: "language" }).of(code);
    return label ? label.charAt(0).toUpperCase() + label.slice(1) : code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

/**
 * Colonnes de `establishments` lisibles PUBLIQUEMENT (rôle anon).
 *
 * ⚠️ NE PAS utiliser `select("*")` sur establishments en contexte public : le rôle `anon` n'a plus de
 * privilège SELECT que sur ces colonnes (les identifiants fiscaux `siret`, `no_tva`, `code_naf`, ainsi que
 * `stock_owner` et `created_by` lui sont RÉVOQUÉS au niveau colonne). Un `select("*")` déclenche alors une
 * erreur 42501 « permission denied for table establishments » et casse la page publique.
 *
 * Ces colonnes correspondent exactement au GRANT SELECT accordé à `anon`. Toute lecture publique d'un
 * établissement doit passer par cette liste.
 */
// Littéral (`as const`) — nécessaire pour que le client Supabase typé infère le type du résultat.
export const PUBLIC_ESTABLISHMENT_COLUMNS =
  "id, organization_id, name, slug, description, address, phone, email, website, logo_url, cover_image_url, public_menu_locales, is_public, deleted, postal_code, city, country, seo_title, seo_description, created_at, updated_at" as const;

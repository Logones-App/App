import { createClient } from "@/lib/supabase/client";

/**
 * Typage DÉRIVÉ : ajoute un rôle au `product_type` d'un produit s'il n'y est pas déjà.
 * Le type émerge des actions (ajouter un BOM → `recipe` ; être composant → `ingredient`)
 * au lieu d'être choisi à la main. `product_type` reste un cache de lecture (cheap), juste
 * auto-maintenu. Le mobile ne lit jamais ce champ → zéro impact.
 */
export async function ensureProductType(
  supabase: ReturnType<typeof createClient>,
  productId: string,
  role: "recipe" | "ingredient",
): Promise<void> {
  const { data } = await supabase.from("products").select("product_type").eq("id", productId).maybeSingle();
  if (!data) return;
  const types = Array.isArray(data.product_type) ? (data.product_type as string[]) : [];
  if (types.includes(role)) return;
  const { error } = await supabase
    .from("products")
    .update({ product_type: [...types, role] })
    .eq("id", productId);
  if (error) throw error;
}

import type { CompositionStockRow } from "@/lib/queries/product-establishment-dashboard";
import { createClient } from "@/lib/supabase/client";

type DbClient = ReturnType<typeof createClient>;

/** Ligne de recette : `recipe` ou kind absent / vide (legacy). */
export function isRecipeCompositionKind(kind: string | null | undefined): boolean {
  if (kind == null) return true;
  const k = String(kind).trim();
  if (k === "") return true;
  return k === "recipe";
}

export function isModifierCompositionKind(kind: string | null | undefined): boolean {
  return String(kind ?? "").trim() === "modifier";
}

/** Au moins une ligne `modifier` du principal pour ce composant (mode hybride caisse). */
export function hasModifierLineForComponent(rows: CompositionStockRow[], componentProductId: string): boolean {
  return rows.some(
    (r) =>
      !r.isSelfComposition &&
      r.composition.component_product_id === componentProductId &&
      isModifierCompositionKind(r.composition.composition_kind),
  );
}

/**
 * Fiches `product_stocks` à passer en non suivi quand on active le self du principal :
 * - ligne recette (`lineStock`) si `composition_kind` recette / vide ;
 * - pool composant (`componentIdentityStock`) seulement si aucune ligne modifier sur ce composant
 *   (sinon le pool sert encore aux suppléments en hybride).
 */
export function gatherIngredientStockIdsToDisableWhenSelfTracks(rows: CompositionStockRow[]): string[] {
  const ids: string[] = [];
  const nonSelf = rows.filter((r) => !r.isSelfComposition);

  for (const r of nonSelf) {
    if (r.lineStock?.id && isRecipeCompositionKind(r.composition.composition_kind)) {
      ids.push(r.lineStock.id);
    }
  }

  for (const r of nonSelf) {
    if (!r.componentIdentityStock?.id) continue;
    const compId = r.composition.component_product_id;
    if (hasModifierLineForComponent(rows, compId)) continue;
    ids.push(r.componentIdentityStock.id);
  }

  return [...new Set(ids)];
}

/** @deprecated Préférer gatherIngredientStockIdsToDisableWhenSelfTracks pour l’activation du self. */
export function gatherIngredientStockIds(rows: CompositionStockRow[]): string[] {
  const ids: string[] = [];
  for (const r of rows) {
    if (r.isSelfComposition) continue;
    if (r.lineStock?.id) ids.push(r.lineStock.id);
    if (r.componentIdentityStock?.id) ids.push(r.componentIdentityStock.id);
  }
  return ids;
}

export function anyIngredientStockTracked(rows: CompositionStockRow[]): boolean {
  for (const r of rows) {
    if (r.isSelfComposition) continue;
    if (r.lineStock?.inventory_tracked) return true;
    if (r.componentIdentityStock?.inventory_tracked) return true;
  }
  return false;
}

/** True si activer le self désactiverait au moins une fiche actuellement suivie. */
export function willSelfTrackingDisableAnyCurrentlyTrackedStock(rows: CompositionStockRow[]): boolean {
  const toDisable = new Set(gatherIngredientStockIdsToDisableWhenSelfTracks(rows));
  for (const r of rows) {
    if (r.isSelfComposition) continue;
    if (r.lineStock?.id && toDisable.has(r.lineStock.id) && r.lineStock.inventory_tracked) return true;
    if (
      r.componentIdentityStock?.id &&
      toDisable.has(r.componentIdentityStock.id) &&
      r.componentIdentityStock.inventory_tracked
    ) {
      return true;
    }
  }
  return false;
}

/**
 * En activant le suivi sur une fiche ingrédient : faut-il couper le self du principal ?
 * — non pour une ligne modifier (hybride caisse) ;
 * — non pour le pool d’un composant qui a aussi une ligne modifier sur ce plat ;
 * — oui pour une ligne recette ou un pool « recette seule ».
 */
export function shouldClearSelfWhenActivatingIngredientStock(stockId: string, rows: CompositionStockRow[]): boolean {
  for (const r of rows) {
    if (r.isSelfComposition) continue;
    if (r.lineStock?.id === stockId) {
      return isRecipeCompositionKind(r.composition.composition_kind);
    }
    if (r.componentIdentityStock?.id === stockId) {
      return !hasModifierLineForComponent(rows, r.composition.component_product_id);
    }
  }
  return false;
}

export async function setSelfLineInventoryTracked(
  supabase: DbClient,
  selfStockId: string,
  tracked: boolean,
  compositionStockRows: CompositionStockRow[],
): Promise<void> {
  if (tracked) {
    const { error } = await supabase.from("product_stocks").update({ inventory_tracked: true }).eq("id", selfStockId);
    if (error) throw error;
    const ids = gatherIngredientStockIdsToDisableWhenSelfTracks(compositionStockRows);
    if (ids.length > 0) {
      const results = await Promise.all(
        ids.map((id) => supabase.from("product_stocks").update({ inventory_tracked: false }).eq("id", id)),
      );
      for (const r of results) {
        if (r.error) throw r.error;
      }
    }
  } else {
    const { error } = await supabase.from("product_stocks").update({ inventory_tracked: false }).eq("id", selfStockId);
    if (error) throw error;
  }
}

export async function setIngredientStockInventoryTracked(
  supabase: DbClient,
  stockId: string,
  tracked: boolean,
  selfStockId: string | undefined,
  compositionStockRows: CompositionStockRow[],
): Promise<void> {
  if (tracked && selfStockId && shouldClearSelfWhenActivatingIngredientStock(stockId, compositionStockRows)) {
    const { error } = await supabase.from("product_stocks").update({ inventory_tracked: false }).eq("id", selfStockId);
    if (error) throw error;
  }
  const { error } = await supabase.from("product_stocks").update({ inventory_tracked: tracked }).eq("id", stockId);
  if (error) throw error;
}

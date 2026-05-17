/**
 * Règles d’affichage / calcul du prix vendu selon la stratégie du menu (colonne menus.pricing_strategy).
 */
export const MENU_PRICING_STRATEGY_LABELS: Record<string, string> = {
  catalog_only: "Catalogue uniquement",
  menu_price_fallback_catalog: "Prix menu si défini, sinon catalogue",
  menu_price_required: "Prix menu obligatoire",
};

export type EffectivePriceResult = {
  amount: number;
  source: "catalog" | "menu";
  ruleLabel: string;
  /** Ligne menu sans prix alors que la stratégie l’exige */
  missingMenuPrice?: boolean;
};

export function menuPricingStrategyLabel(strategy: string): string {
  if (strategy === "catalog_only") return MENU_PRICING_STRATEGY_LABELS.catalog_only;
  if (strategy === "menu_price_fallback_catalog") {
    return MENU_PRICING_STRATEGY_LABELS.menu_price_fallback_catalog;
  }
  if (strategy === "menu_price_required") return MENU_PRICING_STRATEGY_LABELS.menu_price_required;
  return strategy;
}

export function resolveEffectiveProductPrice(
  catalogPrice: number,
  menuRowPrice: number | null | undefined,
  pricingStrategy: string | null | undefined,
): EffectivePriceResult {
  const strategy = pricingStrategy ?? "menu_price_fallback_catalog";

  if (strategy === "catalog_only") {
    return {
      amount: catalogPrice,
      source: "catalog",
      ruleLabel: "Stratégie menu : toujours le prix catalogue",
    };
  }

  if (strategy === "menu_price_required") {
    if (menuRowPrice == null) {
      return {
        amount: catalogPrice,
        source: "catalog",
        ruleLabel: "Prix menu manquant — repli catalogue (à corriger sur la ligne menu)",
        missingMenuPrice: true,
      };
    }
    return {
      amount: menuRowPrice,
      source: "menu",
      ruleLabel: "Stratégie menu : prix ligne menu obligatoire",
    };
  }

  /* menu_price_fallback_catalog (défaut) */
  if (menuRowPrice != null) {
    return {
      amount: menuRowPrice,
      source: "menu",
      ruleLabel: "Prix menu renseigné sur la ligne",
    };
  }
  return {
    amount: catalogPrice,
    source: "catalog",
    ruleLabel: "Pas de prix menu — prix catalogue",
  };
}

import { convertUnit } from "./unit-conversion";

/**
 * Vecteurs de test CANONIQUES de la conversion d'unités, partagés SaaS ↔ POS.
 * Miroir de la « table de cas » de `SQL_FN_CONVERT_VALIDATION.md` : `fn_convert(1, from, to)`
 * (SQL) et `convertUnit(1, from, to)` (TS) doivent tous deux égaler `expected`.
 * Toute divergence entre les deux implémentations = régression (c'est ce drift qui a produit
 * le commentaire schéma faux « portions » vs code « unités de stock »).
 *
 * ⚠ Deux edges divergent EN THÉORIE mais ne sont jamais exercés (les unités viennent d'un
 * ensemble fermé, jamais vides / jamais en casse mixte) — donc HORS contrat, à ne PAS « corriger »
 * d'un seul côté (ça créerait la dérive qu'on évite) :
 *   • chaîne vide : `convertUnit(1,"","g")` = 1 (identité) vs `fn_convert` = NULL.
 *   • casse mixte même unité : `convertUnit(1,"KG","kg")` = null vs `fn_convert` = 1.
 * Si un jour on durcit le helper (lowercase avant égalité, "" → null), re-synchroniser les DEUX
 * copies (TS + SQL) en même temps, en coordination POS.
 *
 * 🔒 GOUVERNANCE — tout nouveau vecteur = 3 emplacements à synchroniser (vecteurs dupliqués,
 * pas d'import cross-repo ; la règle « on ajoute des trois côtés » EST le garde-fou anti-dérive) :
 *   (1) ce fichier (`CONVERSION_CASES`) — SaaS, joué par `npm run check:unit-conversion` ;
 *   (2) POS `src/modules/stock/data/__tests__/unitConversion.test.ts` ;
 *   (3) POS `supabase/sql/fn_convert_concordance_check.sql` (miroir SQL contre `fn_convert`).
 * Évolution possible : exposer ces vecteurs comme artefact partagé (package, ou table SQL de
 * vecteurs lue par le check) pour supprimer la duplication.
 */
export const CONVERSION_CASES: { from: string | null; to: string | null; expected: number | null }[] = [
  { from: "kg", to: "g", expected: 1000 },
  { from: "g", to: "kg", expected: 0.001 },
  { from: "l", to: "ml", expected: 1000 },
  { from: "ml", to: "l", expected: 0.001 },
  { from: "l", to: "cl", expected: 100 },
  { from: "cl", to: "l", expected: 0.01 },
  { from: "cl", to: "ml", expected: 10 },
  { from: "ml", to: "cl", expected: 0.1 },
  { from: "kg", to: "kg", expected: 1 },
  { from: "piece", to: "piece", expected: 1 },
  { from: "kg", to: "l", expected: null }, // masse ↔ volume incompatibles
  { from: "kg", to: "piece", expected: null },
  { from: "Carton", to: "piece", expected: null }, // unité inconnue
  { from: null, to: "g", expected: 1 }, // pas d'unité → identité
];

export type ConcordanceFailure = {
  from: string | null;
  to: string | null;
  expected: number | null;
  got: number | null;
};

/** Vérifie `convertUnit(1, from, to) == expected` sur tous les cas. Renvoie les écarts (vide = OK). */
export function checkConversionConcordance(): { ok: boolean; failures: ConcordanceFailure[] } {
  const failures: ConcordanceFailure[] = [];
  for (const c of CONVERSION_CASES) {
    const got = convertUnit(1, c.from, c.to);
    const match = c.expected === null ? got === null : got !== null && Math.abs(got - c.expected) < 1e-9;
    if (!match) failures.push({ from: c.from, to: c.to, expected: c.expected, got });
  }
  return { ok: failures.length === 0, failures };
}

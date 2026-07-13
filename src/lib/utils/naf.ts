/** Code NAF/APE : 2 chiffres + 2 chiffres + 1 lettre, point optionnel (ex : 56.10A ou 5610A). */
export const NAF_RE = /^\d{2}\.?\d{2}[A-Z]$/;

/** true si `value` est un code NAF valide (espaces ignorés, casse normalisée). */
export function isValidNaf(value: string): boolean {
  return NAF_RE.test(value.replace(/\s/g, "").toUpperCase());
}

/** Message d'erreur NAF pour un champ requis (null = OK). `touched=false` masque l'erreur tant que non touché. */
export function nafError(value: string, touched: boolean): string | null {
  if (!touched) return null;
  if (!value.trim()) return "Champ requis";
  return isValidNaf(value) ? null : "Format NAF invalide (ex : 56.10A)";
}

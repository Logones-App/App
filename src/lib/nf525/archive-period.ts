/**
 * Découpage des archives fiscales par PÉRIODE. Server-only.
 *
 * ⚠️⚠️ POINT UNIQUE DE LA RÈGLE ① — RÉPONSE DE TRAVAIL DU POS, **NON FIGÉE**.
 * Le POS re-vérifie sa doctrine au référentiel. Si elle change, **on ne touche qu'à ce fichier**.
 * Ne PAS disséminer cette règle ailleurs.
 *
 * Règle actuelle : le **jour d'exploitation** = celui de la **CLÔTURE** (`daily_found.closed_at`),
 * en heure locale **Europe/Paris** — « la caisse fait foi quand elle est comptée ». Une caisse clôturée
 * le 1er juillet à 00h01 appartient donc à juillet, même si elle a été ouverte le 30/06.
 *
 * Conséquence assumée (POS) : une session > 24 h verse ses ventes dans la période de sa clôture. La règle
 * métier « aucune nouvelle commande après 24 h » borne l'effet à ~24 h de ventes, à une frontière de mois.
 *
 * ⚠️ Le chemin S3 ne fait PAS foi : sa date est celle de l'**upload (UTC)**, pas le jour d'exploitation.
 */

/** Formate en `YYYY-MM-DD` dans le fuseau d'exploitation (fr-CA rend nativement ce format). */
const PARIS_DAY = new Intl.DateTimeFormat("fr-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** RÈGLE ① : jour d'exploitation d'une archive, à partir du `closed_at` de son daily_found. */
export function businessDayFromClosedAt(closedAt: string): string {
  return PARIS_DAY.format(new Date(closedAt));
}

/** Extrait la date du chemin S3 (`nf525/{org}/{estab}/{YYYY-MM-DD}/{id}.json`) — date d'UPLOAD, indicative. */
export function pathDateOf(key: string): string | null {
  const m = /\/(\d{4}-\d{2}-\d{2})\/[^/]+\.json$/.exec(key);
  return m ? m[1] : null;
}

const dayShift = (day: string, delta: number): string => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
};

/**
 * Fenêtre de pré-filtrage sur la date du CHEMIN, pour ne télécharger que les archives plausibles.
 * L'upload étant fait à la clôture, la date du chemin (UTC) est à **±1 jour** de la date Paris
 * (Paris = UTC+1/+2). Élargir de 1 jour de chaque côté est donc sûr — le filtrage exact se fait
 * ensuite sur `businessDayFromClosedAt()`.
 */
export function widenWindow(from: string, to: string): { fromWide: string; toWide: string } {
  return { fromWide: dayShift(from, -1), toWide: dayShift(to, 1) };
}

/** Vrai si la date du chemin tombe dans la fenêtre élargie (pré-filtre, jamais un critère final). */
export function inPathWindow(key: string, fromWide: string, toWide: string): boolean {
  const d = pathDateOf(key);
  return d !== null && d >= fromWide && d <= toWide;
}

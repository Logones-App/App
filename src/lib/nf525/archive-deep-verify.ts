import { verifyEcdsaSignature, type ZArchive } from "./archive-verify";

/**
 * Vérification PROFONDE d'une archive Z : les objets internes (pièces, JET, Grands Totaux, restitutions)
 * portent CHACUN leur propre signature ECDSA (R13 §7) — signée avec la MÊME clé que l'archive. Server-only.
 *
 * Ce que ça prouve, au-delà de l'enveloppe : chaque pièce, chaque événement JET, chaque Grand Total a été
 * scellé individuellement par l'assujetti. Le contrôle ① de l'archive garantit déjà que le CONTENU archivé
 * n'a pas bougé (condensat du tableau) ; la vérification profonde prouve en plus que ce contenu était
 * VALIDEMENT SIGNÉ à la source. Chaque objet porte son `hash_chain_input` : on vérifie la signature dessus,
 * sans reconstruction (prouvé à l'octet sur données réelles le 22/07 : 65/65 pièces, 124/124 JET).
 *
 * ⚠️ On ne vérifie ICI que les SIGNATURES (contrôle non ambigu). Le chaînage INTERNE (une pièce référence la
 * précédente, par device ; les Grands Totaux par périodicité) traverse plusieurs archives — sa vérification
 * complète exige toute la séquence, pas une archive isolée : c'est une étape distincte, non couverte ici.
 */

interface SignedRow {
  hash_chain_input?: string;
  signature_base64url?: string;
  [key: string]: unknown;
}

export interface CollectionResult {
  /** Clé du tableau dans `data` (ex. `nf525_pieces`). */
  name: string;
  /** Lignes présentes dans le tableau. */
  rows: number;
  /** Lignes portant une signature (donc vérifiables). */
  signed: number;
  /** Signatures valides. */
  ok: number;
  /** Étiquettes des lignes dont la signature échoue (vide = tout bon). */
  failed: string[];
}

export interface DeepReport {
  /** false si aucune clé publique (établissement HMAC legacy) → signatures non vérifiables en ECDSA. */
  verifiable: boolean;
  collections: CollectionResult[];
  /** true si toutes les signatures de toutes les collections sont valides. */
  allOk: boolean;
}

/** Collections signées d'une archive + comment étiqueter une ligne fautive pour le rapport. */
const SIGNED_COLLECTIONS: { key: string; label: (row: SignedRow, i: number) => string }[] = [
  { key: "nf525_pieces", label: (r, i) => `pièce ${String(r.piece_number ?? i)}` },
  { key: "nf525_jet", label: (r, i) => `JET ${String(r.code_event ?? "?")} #${i}` },
  {
    key: "nf525_grands_totaux",
    label: (r, i) => `grand total ${String(r.periodicity ?? "?")} ${String(r.period_id ?? i)}`,
  },
  { key: "nf525_restitutions", label: (r, i) => `restitution #${String(r.print_index ?? i)}` },
];

function verifyCollection(
  name: string,
  rows: unknown,
  publicKey: string,
  label: (r: SignedRow, i: number) => string,
): CollectionResult {
  const list = Array.isArray(rows) ? (rows as SignedRow[]) : [];
  const result: CollectionResult = { name, rows: list.length, signed: 0, ok: 0, failed: [] };
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    if (typeof row.hash_chain_input !== "string" || typeof row.signature_base64url !== "string") continue;
    result.signed++;
    if (verifyEcdsaSignature(row.hash_chain_input, row.signature_base64url, publicKey)) result.ok++;
    else result.failed.push(label(row, i));
  }
  return result;
}

/**
 * Vérifie toutes les signatures internes de l'archive. `publicKeyBase64` = clé de l'établissement (null pour
 * un établissement HMAC legacy → non vérifiable en ECDSA).
 */
export function verifyArchiveDeep(a: ZArchive, publicKeyBase64: string | null): DeepReport {
  if (!publicKeyBase64) return { verifiable: false, collections: [], allOk: false };
  const data = a.data ?? {};
  const collections = SIGNED_COLLECTIONS.filter((c) => c.key in data).map((c) =>
    verifyCollection(c.key, data[c.key], publicKeyBase64, c.label),
  );
  const allOk = collections.every((c) => c.failed.length === 0);
  return { verifiable: true, collections, allOk };
}

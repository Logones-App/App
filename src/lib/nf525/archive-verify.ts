import { createHash, createPublicKey, verify as cryptoVerify } from "node:crypto";

/**
 * Vérification d'intégrité d'une archive fiscale Z (WORM). Server-only.
 *
 * ⚠️ LES 3 CONTRÔLES SONT INDISSOCIABLES. Altérer le contenu sans toucher `hash_chain_input` laisse la
 * signature VALIDE : seul le recalcul du condensat intégral (②) le détecte. Vérifier la signature seule
 * donnerait un faux « OK » sur une archive falsifiée.
 *
 * Format reverse-validé à l'octet sur des archives réelles (voir PLAN_NF525_ARCHIVES_WORM.md §2).
 */

const sha256hex = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

/** Les 7 fichiers logiques : 6 issus de `data` + le manifest synthétisé. */
const DATA_FILES = [
  ["nf525_pieces.json", "nf525_pieces"],
  ["nf525_piece_recap_tva.json", "nf525_piece_recap_tva"],
  ["order_products.json", "order_products"],
  ["order_payments.json", "order_payments"],
  ["order_payment_settlements.json", "order_payment_settlements"],
  ["payment_methods.json", "payment_methods"],
] as const;

export interface ZArchive {
  version?: number;
  created_at?: string;
  organization_id?: string;
  establishment_id?: string;
  device_id?: string;
  daily_found_id?: string;
  operation_type?: string;
  scope?: unknown;
  data?: Record<string, unknown>;
  totals?: unknown;
  hashes?: Record<string, string>;
  hash_chain_input?: string;
  report_previous_signature?: boolean;
  previous_archive_signature?: string | null;
  signature_base64url?: string;
}

export type ArchiveVerdict =
  | { verifiable: false; reason: "legacy_format"; detail: string }
  | {
      verifiable: true;
      filesOk: boolean;
      condensateOk: boolean;
      signatureOk: boolean | null; // null = pas de clé publique (établissement HMAC legacy)
      valid: boolean;
      failedFiles: string[];
    };

/**
 * Une archive est VÉRIFIABLE ssi elle porte `hash_chain_input` ET `signature_base64url`.
 * ⚠️ NE PAS se fier au champ `version` : des archives d'un ancien format (4 fichiers, sans signature)
 * portent elles aussi `version: 1`. La structure fait foi, pas le numéro.
 */
export function isVerifiable(a: ZArchive): boolean {
  return typeof a.hash_chain_input === "string" && typeof a.signature_base64url === "string";
}

/** ① Condensats des 7 fichiers logiques. Retourne la liste des fichiers en écart. */
function checkFiles(a: ZArchive): string[] {
  const failed: string[] = [];
  const manifest = {
    version: a.version,
    created_at: a.created_at,
    organization_id: a.organization_id,
    establishment_id: a.establishment_id,
    device_id: a.device_id,
    daily_found_id: a.daily_found_id,
    scope: a.scope,
  };
  for (const [name, dataKey] of DATA_FILES) {
    if (sha256hex(JSON.stringify(a.data?.[dataKey])) !== a.hashes?.[name]) failed.push(name);
  }
  if (sha256hex(JSON.stringify(manifest)) !== a.hashes?.["manifest.json"]) failed.push("manifest.json");
  return failed;
}

/**
 * ② Condensat intégral. ⚠️ L'ORDRE DES CLÉS EST SIGNIFIANT et DIFFÈRE de l'ordre des clés de l'archive
 * (elle-même sérialisée `… scope, data, hashes, totals, operation_type …`) → on construit un objet dédié.
 * Il doit égaler le DERNIER champ de `hash_chain_input`.
 */
function checkCondensate(a: ZArchive): boolean {
  const full = {
    version: a.version,
    created_at: a.created_at,
    organization_id: a.organization_id,
    establishment_id: a.establishment_id,
    device_id: a.device_id,
    daily_found_id: a.daily_found_id,
    operation_type: a.operation_type,
    scope: a.scope,
    data: a.data,
    totals: a.totals,
    hashes: a.hashes,
  };
  const chain = a.hash_chain_input ?? "";
  // Le condensat est TOUJOURS le dernier champ → insensible aux virgules de la ventilation TVA.
  return sha256hex(JSON.stringify(full)) === chain.slice(chain.lastIndexOf(",") + 1);
}

/** Point compressé (33 o) → clé publique SPKI utilisable par node:crypto. */
function publicKeyFromCompressed(pubBase64: string) {
  // Préfixe SPKI DER pour une clé publique EC prime256v1 (26 octets), suivi du point (compressé accepté).
  const SPKI_PREFIX = Buffer.from("3039301306072a8648ce3d020106082a8648ce3d030107032200", "hex");
  const point = Buffer.from(pubBase64, "base64");
  return createPublicKey({ key: Buffer.concat([SPKI_PREFIX, point]), format: "der", type: "spki" });
}

/** ③ Signature ECDSA P-256 (r‖s base64url) sur SHA-256 de `hash_chain_input`. */
function checkSignature(a: ZArchive, publicKeyBase64: string): boolean {
  try {
    const sig = Buffer.from(a.signature_base64url!.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    if (sig.length !== 64) return false;
    return cryptoVerify(
      "sha256",
      Buffer.from(a.hash_chain_input!, "utf8"),
      { key: publicKeyFromCompressed(publicKeyBase64), dsaEncoding: "ieee-p1363" },
      sig,
    );
  } catch {
    return false;
  }
}

/**
 * Vérifie une archive. `publicKeyBase64` = `nf525_signing_keys.public_key_base64` de l'établissement
 * (null pour un établissement HMAC legacy → la signature n'est pas vérifiable en ECDSA).
 */
export function verifyArchive(a: ZArchive, publicKeyBase64: string | null): ArchiveVerdict {
  if (!isVerifiable(a)) {
    return {
      verifiable: false,
      reason: "legacy_format",
      detail: "Archive sans hash_chain_input/signature (ancien format) — hors périmètre de vérification.",
    };
  }
  const failedFiles = checkFiles(a);
  const filesOk = failedFiles.length === 0;
  const condensateOk = checkCondensate(a);
  const signatureOk = publicKeyBase64 ? checkSignature(a, publicKeyBase64) : null;
  return {
    verifiable: true,
    filesOk,
    condensateOk,
    signatureOk,
    valid: filesOk && condensateOk && signatureOk !== false,
    failedFiles,
  };
}

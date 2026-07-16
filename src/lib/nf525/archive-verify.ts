import { createHash, createPublicKey, verify as cryptoVerify } from "node:crypto";

import {
  CONDENSATE_KEY_ORDER,
  dataKeyFromHashName,
  KNOWN_ROOT_KEYS,
  MANIFEST_HASH_NAME,
  MANIFEST_KEYS,
} from "./archive-format";

/**
 * Vérification d'intégrité d'une archive fiscale Z (WORM). Server-only.
 *
 * ⚠️ LES 3 CONTRÔLES SONT INDISSOCIABLES. Altérer le contenu sans toucher `hash_chain_input` laisse la
 * signature VALIDE : seul le recalcul du condensat intégral (②) le détecte. Vérifier la signature seule
 * donnerait un faux « OK » sur une archive falsifiée.
 *
 * ② est le contrôle que la norme EXIGE : « La sécurisation de l'archive fiscale produite par le logiciel
 * doit intégrer l'intégralité des données de l'archive » (Référentiel NF525 §6.11.3, X en catégorie B).
 *
 * ⚠️ AUCUN NOMBRE DE FICHIERS N'EST ÉCRIT ICI. ① itère sur les condensats que l'archive DÉCLARE
 * (`archive.hashes`), pas sur une liste figée : le format grandit (Grands Totaux, JET, restitutions…)
 * et doit pouvoir grandir sans redéploiement. Les rares règles non déductibles vivent dans
 * `archive-format.ts` — un seul fichier à toucher.
 */

const sha256hex = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

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
  [key: string]: unknown;
}

export type ArchiveVerdict =
  | { verifiable: false; reason: "legacy_format"; detail: string }
  | {
      verifiable: true;
      filesOk: boolean;
      condensateOk: boolean;
      signatureOk: boolean | null; // null = pas de clé publique (établissement HMAC legacy)
      /** Condensats déclarés dont le contenu est introuvable → on ne peut PAS conclure. */
      unmappedHashes: string[];
      /** Contenus de `data` sans condensat déclaré → ① ne les couvre pas. */
      undeclaredData: string[];
      /** Clés racine inconnues de notre profil → le format a évolué, notre ② est peut-être périmé. */
      unknownRootKeys: string[];
      /** Rien de faux, mais quelque chose n'a pas pu être vérifié → ni vert, ni défaut. */
      inconclusive: boolean;
      /** Tous les contrôles verts ET rien d'inconnu. */
      valid: boolean;
      failedFiles: string[];
    };

/**
 * Une archive est VÉRIFIABLE ssi elle porte `hash_chain_input` ET `signature_base64url`.
 * ⚠️ NE PAS se fier au champ `version` : des archives d'un ancien format (4 fichiers, sans signature)
 * portent elles aussi `version: 1`. La structure fait foi, pas le numéro. (Constat : 34 archives à
 * 5 condensats et 15 à 7 condensats coexistent sous `version: 1`.)
 */
export function isVerifiable(a: ZArchive): boolean {
  return typeof a.hash_chain_input === "string" && typeof a.signature_base64url === "string";
}

const buildFromKeys = (a: ZArchive, keys: readonly string[]): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = a[k];
  return out;
};

interface FilesResult {
  failedFiles: string[];
  unmappedHashes: string[];
  undeclaredData: string[];
}

/**
 * ① Condensats des fichiers logiques — GÉNÉRIQUE : on itère sur `a.hashes`, donc sur ce que
 * l'archive déclare. Un fichier ajouté au format est vérifié automatiquement.
 */
function checkFiles(a: ZArchive): FilesResult {
  const res: FilesResult = { failedFiles: [], unmappedHashes: [], undeclaredData: [] };
  const hashes = a.hashes ?? {};

  for (const [hashName, expected] of Object.entries(hashes)) {
    if (hashName === MANIFEST_HASH_NAME) {
      if (sha256hex(JSON.stringify(buildFromKeys(a, MANIFEST_KEYS))) !== expected) res.failedFiles.push(hashName);
      continue;
    }
    const dataKey = dataKeyFromHashName(hashName);
    if (!a.data || !(dataKey in a.data)) {
      // Condensat annoncé sans contenu : on ne peut ni valider ni accuser → on le DIT.
      res.unmappedHashes.push(hashName);
      continue;
    }
    if (sha256hex(JSON.stringify(a.data[dataKey])) !== expected) res.failedFiles.push(hashName);
  }

  for (const dataKey of Object.keys(a.data ?? {})) {
    if (!(`${dataKey}.json` in hashes)) res.undeclaredData.push(dataKey);
  }
  return res;
}

/**
 * ② Condensat intégral. ⚠️ L'ORDRE DES CLÉS EST SIGNIFIANT et diffère de l'ordre des clés de l'archive
 * → objet reconstruit depuis `CONDENSATE_KEY_ORDER`. Il doit égaler le DERNIER champ de `hash_chain_input`.
 */
function checkCondensate(a: ZArchive): boolean {
  const chain = a.hash_chain_input ?? "";
  // Le condensat est TOUJOURS le dernier champ → insensible aux virgules de la ventilation TVA.
  return sha256hex(JSON.stringify(buildFromKeys(a, CONDENSATE_KEY_ORDER))) === chain.slice(chain.lastIndexOf(",") + 1);
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
  const { failedFiles, unmappedHashes, undeclaredData } = checkFiles(a);
  const unknownRootKeys = Object.keys(a).filter((k) => !KNOWN_ROOT_KEYS.includes(k));

  const filesOk = failedFiles.length === 0;
  const condensateOk = checkCondensate(a);
  const signatureOk = publicKeyBase64 ? checkSignature(a, publicKeyBase64) : null;

  // Une clé racine inconnue = le format a évolué : notre ordre de condensat est peut-être périmé,
  // donc un ② rouge ne prouve RIEN. On ne conclut pas plutôt que d'accuser à tort.
  const inconclusive = unknownRootKeys.length > 0 || unmappedHashes.length > 0 || undeclaredData.length > 0;

  return {
    verifiable: true,
    filesOk,
    condensateOk,
    signatureOk,
    unmappedHashes,
    undeclaredData,
    unknownRootKeys,
    inconclusive,
    valid: filesOk && condensateOk && signatureOk !== false && !inconclusive,
    failedFiles,
  };
}

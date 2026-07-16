/**
 * PROFIL DE FORMAT DES ARCHIVES FISCALES Z. Server-only.
 *
 * ⚠️⚠️ CE FICHIER EST LE **SEUL** ENDROIT QUI CONNAÎT LA STRUCTURE DE L'ARCHIVE.
 * Le format évolue (le POS ajoute Grands Totaux, JET, restitutions…). Quand il change,
 * **on ne touche qu'à ce fichier**. Ne PAS disséminer ces règles ailleurs.
 *
 * Tout le reste de la vérification est GÉNÉRIQUE : le nombre de fichiers n'est écrit nulle part,
 * il est lu dans `archive.hashes`. Ajouter un 8ᵉ, 9ᵉ ou 12ᵉ fichier de `data` ne demande AUCUNE
 * modification de code — c'est délibéré, le POS doit pouvoir itérer sans déploiement SaaS.
 *
 * Ce qui, en revanche, ne se déduit PAS de l'archive et vit donc ici :
 *   1. la composition du manifest (objet synthétisé, absent de l'archive) ;
 *   2. l'ordre des clés du condensat intégral (JSON.stringify est sensible à l'ordre) ;
 *   3. la liste des clés racine connues, qui sert à DÉTECTER un format inconnu au lieu de le subir.
 */

/**
 * ① Clés composant `manifest.json`, DANS L'ORDRE. Le manifest n'existe pas dans l'archive : il est
 * reconstruit, et son condensat figure dans `hashes["manifest.json"]`. Ordre vérifié à l'octet sur
 * une archive réelle (2026-07-15).
 */
export const MANIFEST_KEYS = [
  "version",
  "created_at",
  "organization_id",
  "establishment_id",
  "device_id",
  "daily_found_id",
  "scope",
  // Ajoutés par le POS le 16/07/2026. En FIN de liste — position retrouvée par force brute sur une
  // archive réelle, puis vérifiée à l'octet. Rétrocompatible : sur une archive antérieure ces clés
  // valent `undefined`, et JSON.stringify OMET les clés `undefined` → condensat inchangé (testé).
  "emitter",
  "period",
] as const;

/**
 * ② Clés du condensat intégral, DANS L'ORDRE — celui-ci **DIFFÈRE de l'ordre des clés de l'archive
 * elle-même** (sérialisée `… scope, data, hashes, totals, operation_type …`). D'où la reconstruction
 * d'un objet dédié plutôt qu'une réutilisation de l'archive. Ordre vérifié à l'octet (2026-07-15).
 *
 * ⚠️ Si le POS ajoute un champ RACINE (hors `data`), il entrera dans le condensat côté caisse et
 * devra être ajouté ici, À LA BONNE POSITION. Un champ ajouté dans `data` ne demande rien :
 * `data` est haché en bloc.
 */
export const CONDENSATE_KEY_ORDER = [
  "version",
  "created_at",
  "organization_id",
  "establishment_id",
  "device_id",
  "daily_found_id",
  "operation_type",
  "scope",
  "data",
  "totals",
  "hashes",
  // Ajoutés par le POS le 16/07/2026, à la RACINE de l'archive (pas dans `data`). Position en FIN de
  // condensat — retrouvée par force brute sur une archive réelle, puis vérifiée à l'octet. Rétrocompatible
  // avec les archives antérieures (clés `undefined` → omises par JSON.stringify). Testé sur les 2 formats.
  "emitter",
  "period",
] as const;

/** Champs racine portant la sécurisation — présents dans l'archive mais HORS du condensat intégral. */
export const SECURITY_ROOT_KEYS = [
  "hash_chain_input",
  "report_previous_signature",
  "previous_archive_signature",
  "signature_base64url",
] as const;

/**
 * ③ Toutes les clés racine que ce profil sait traiter. Sert de **détecteur de format inconnu** :
 * une clé racine hors de cette liste signifie que l'archive a évolué et que notre ordre de condensat
 * est probablement périmé → on rend un verdict « non concluant », JAMAIS « défaut d'intégrité ».
 * Crier un faux défaut sur un format qu'on n'a pas encore appris serait la pire des réponses.
 */
export const KNOWN_ROOT_KEYS: readonly string[] = [...CONDENSATE_KEY_ORDER, ...SECURITY_ROOT_KEYS];

/** Nom du condensat du manifest dans `hashes`. */
export const MANIFEST_HASH_NAME = "manifest.json";

/** `hashes["X.json"]` ↔ `data["X"]`. Seule convention de nommage du format. */
export const dataKeyFromHashName = (hashName: string): string => hashName.replace(/\.json$/, "");

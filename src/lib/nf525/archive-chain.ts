import { isVerifiable, type ZArchive } from "./archive-verify";

/**
 * Contrôle de chaînage des archives fiscales Z. Server-only.
 *
 * Axe = **ÉTABLISSEMENT** (= assujetti), pas device. Confirmé par les données ET par la documentation
 * embarquée dans l'archive (2026-07-22) : « chaque archive reporte la signature de l'archive précédente du
 * MÊME ÉTABLISSEMENT ; device_id est une information, pas une clé ». La consultation étant déjà scopée à un
 * établissement, on chaîne toutes ses archives vérifiables triées par `created_at`, tous devices confondus.
 *
 * Règle : `archive(n).previous_archive_signature == archive(n-1).signature_base64url`.
 * La 1ʳᵉ archive de la FENÊTRE consultée est un « début de sélection » légitime (la chaîne peut continuer
 * avant la période) — on ne crie pas à la rupture pour ça. Une archive sans report est une genèse.
 *
 * ⚠️ DEUX NIVEAUX, à ne pas confondre :
 *   - **`broken`** = l'ancre pointe vers une valeur DIFFÉRENTE de la signature précédente → falsification non
 *     ambiguë (archive insérée/retirée/altérée). SEUL ceci compte comme défaut dur (`defectCount`).
 *   - **`restart`** = l'ancre est ABSENTE au milieu du fil (prev=null alors qu'une archive précède). AMBIGU :
 *     migration de format, réinstallation de caisse, rotation de trousseau produisent une genèse légitime en
 *     pleine vie. Le POS a lui-même prévenu (16/07) que `report_previous_signature` n'est PAS un marqueur
 *     fiable. On le SIGNALE (restartCount) sans l'accuser — un JET 90 est non purgeable, on ne le déclenche
 *     pas sur un signal ambigu. (Cas réel : la bascule 7→12 condensats du 16/07 crée un restart légitime.)
 *
 * Historique : neutralisé le 16/07 (ancres toutes orphelines, ancien format). Réactivé le 22/07 après
 * vérification sur données réelles : le nouveau format chaîne proprement (24691661 : chaîne continue du 16 au
 * 21/07, archives 14-condensats comprises).
 *
 * ⚠️ Les archives non signées / ancien format sont ÉCARTÉES avant le contrôle (elles ne font pas avancer le
 * fil) — sans cette exclusion, faux positif garanti.
 */

export interface ArchiveWithKey {
  key: string;
  archive: ZArchive;
}

export type ChainLinkType = "genesis" | "chained" | "start_of_selection" | "restart" | "broken";

export interface ChainNode {
  key: string;
  createdAt: string | null;
  deviceId: string | null;
  link: ChainLinkType;
  /** Renseignés seulement si `link === "broken"`. */
  expected?: string;
  found?: string | null;
}

export interface ChainReport {
  /** Fil de l'établissement, trié par `created_at`, un nœud par archive vérifiable. */
  nodes: ChainNode[];
  /** Ruptures dures (`broken`) uniquement — falsification non ambiguë. 0 = pas de défaut. */
  defectCount: number;
  /** Redémarrages de fil (`restart`) — signalés mais NON comptés comme défaut (ambigus, cf. en-tête). */
  restartCount: number;
  /** Archives écartées du contrôle (non signées / ancien format), à signaler jamais en silence. */
  excluded: { key: string; reason: "unsigned_or_legacy" }[];
}

/** Détermine le maillon d'une archive par rapport à la précédente du fil (null = 1ʳᵉ de la fenêtre). */
function linkFor(cur: ZArchive, prev: ZArchive | null): ChainNode["link"] | { link: "broken"; expected: string } {
  const found = cur.previous_archive_signature ?? null;
  if (!prev) return found ? "start_of_selection" : "genesis";
  if (!found) return "restart";
  if (found === prev.signature_base64url) return "chained";
  return { link: "broken", expected: prev.signature_base64url ?? "" };
}

/**
 * Contrôle le chaînage d'un lot d'archives d'UN établissement. Les archives non signées / ancien format
 * sont écartées avant tout contrôle.
 */
export function checkChains(items: ArchiveWithKey[]): ChainReport {
  const excluded: ChainReport["excluded"] = [];
  const kept: ArchiveWithKey[] = [];
  for (const it of items) {
    if (isVerifiable(it.archive)) kept.push(it);
    else excluded.push({ key: it.key, reason: "unsigned_or_legacy" });
  }
  kept.sort((a, b) => (a.archive.created_at ?? "").localeCompare(b.archive.created_at ?? ""));

  const nodes: ChainNode[] = [];
  let defectCount = 0;
  let restartCount = 0;
  for (let i = 0; i < kept.length; i++) {
    const cur = kept[i].archive;
    const prev = i === 0 ? null : kept[i - 1].archive;
    const result = linkFor(cur, prev);
    const base = { key: kept[i].key, createdAt: cur.created_at ?? null, deviceId: cur.device_id ?? null };
    if (typeof result === "object") {
      nodes.push({ ...base, link: "broken", expected: result.expected, found: cur.previous_archive_signature ?? null });
      defectCount++;
    } else {
      if (result === "restart") restartCount++;
      nodes.push({ ...base, link: result });
    }
  }

  return { nodes, defectCount, restartCount, excluded };
}

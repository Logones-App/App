import { isVerifiable, type ZArchive } from "./archive-verify";

/**
 * Contrôle de chaînage des archives fiscales Z. Server-only.
 *
 * Règles (spec POS, voir PLAN_NF525_ARCHIVES_WORM.md §3) :
 * - Une chaîne par **(établissement, device)**, JAMAIS entrelacée. Raison : offline — une caisse qui clôture
 *   sans réseau ne peut pas connaître la signature d'un autre device. Un établissement n'ayant qu'une caisse
 *   ouverte à la fois, les chaînes se succèdent en blocs contigus.
 * - On chaîne sur l'**ORDRE des archives**, JAMAIS le calendrier : un jour de fermeture ne produit pas
 *   d'archive → celle du mardi se chaîne à celle du dimanche. Un contrôle calendaire crierait à tort.
 *
 * ⚠️ DEUX EXCLUSIONS OBLIGATOIRES, sans lesquelles les faux positifs sont garantis (et un JET 90 est
 * NON PURGEABLE — un signal émis à tort ne se rattrape pas) :
 *   1. Les archives **sans signature** ne font pas avancer le fil (la suivante se chaîne à N-1) → hors chaîne.
 *   2. `report_previous_signature === false` **n'est PAS** un marqueur fiable de genèse : l'ancre vit dans le
 *      stockage local du device, donc une réinstallation ou une purge locale fabrique une fausse genèse en
 *      pleine vie. La règle fiable : **genèse ⇔ 1ʳᵉ archive de ce `device_id` (tri `created_at`)**.
 */

export interface ArchiveWithKey {
  key: string;
  archive: ZArchive;
}

export type ChainDefect =
  | {
      type: "chain_break";
      /** Clé d'anti-répétition (spec POS : la paire de signatures). */
      defectKey: string;
      deviceId: string;
      key: string;
      previousKey: string;
      expected: string;
      found: string | null;
    }
  | {
      type: "unexpected_genesis";
      /** Clé d'anti-répétition : l'archive fautive. */
      defectKey: string;
      deviceId: string;
      key: string;
    };

export interface DeviceChain {
  deviceId: string;
  count: number;
  genesisKey: string;
  lastSignature: string;
}

export interface ChainReport {
  devices: DeviceChain[];
  /** Archives écartées de la chaîne (hors périmètre), à signaler mais jamais en silence. */
  excluded: { key: string; reason: "unsigned_or_legacy" }[];
  defects: ChainDefect[];
}

/** Groupe par device et trie chaque fil par `created_at` croissant. */
function groupByDevice(items: ArchiveWithKey[]): Map<string, ArchiveWithKey[]> {
  const map = new Map<string, ArchiveWithKey[]>();
  for (const it of items) {
    const device = it.archive.device_id ?? "(inconnu)";
    const list = map.get(device);
    if (list) list.push(it);
    else map.set(device, [it]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.archive.created_at ?? "").localeCompare(b.archive.created_at ?? ""));
  }
  return map;
}

/** Vérifie un fil (un device) déjà trié. La 1ʳᵉ archive est la genèse légitime, par définition. */
function checkOneChain(deviceId: string, list: ArchiveWithKey[], defects: ChainDefect[]): DeviceChain {
  for (let i = 1; i < list.length; i++) {
    const cur = list[i];
    const prev = list[i - 1];
    const prevSig = prev.archive.signature_base64url!;

    // Une archive qui se déclare genèse alors que le device en a déjà = ancre locale perdue → anomalie.
    if (cur.archive.report_previous_signature === false) {
      defects.push({
        type: "unexpected_genesis",
        defectKey: `genesis:${cur.key}`,
        deviceId,
        key: cur.key,
      });
      continue;
    }

    const found = cur.archive.previous_archive_signature ?? null;
    if (found !== prevSig) {
      defects.push({
        type: "chain_break",
        defectKey: `chain:${prevSig}:${cur.archive.signature_base64url!}`,
        deviceId,
        key: cur.key,
        previousKey: prev.key,
        expected: prevSig,
        found,
      });
    }
  }
  return {
    deviceId,
    count: list.length,
    genesisKey: list[0].key,
    lastSignature: list[list.length - 1].archive.signature_base64url!,
  };
}

/**
 * Contrôle le chaînage d'un lot d'archives (typiquement toutes celles d'un établissement).
 * Les archives non signées / ancien format sont écartées AVANT tout contrôle.
 */
export function checkChains(items: ArchiveWithKey[]): ChainReport {
  const excluded: ChainReport["excluded"] = [];
  const kept: ArchiveWithKey[] = [];
  for (const it of items) {
    if (isVerifiable(it.archive)) kept.push(it);
    else excluded.push({ key: it.key, reason: "unsigned_or_legacy" });
  }

  const defects: ChainDefect[] = [];
  const devices: DeviceChain[] = [];
  for (const [deviceId, list] of groupByDevice(kept)) {
    devices.push(checkOneChain(deviceId, list, defects));
  }
  devices.sort((a, b) => a.deviceId.localeCompare(b.deviceId));
  return { devices, excluded, defects };
}

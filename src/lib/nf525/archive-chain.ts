import { isVerifiable, type ZArchive } from "./archive-verify";

/**
 * Inventaire des archives fiscales Z par caisse. Server-only.
 *
 * 🔴 LE CHAÎNAGE DES ARCHIVES N'EST PAS VÉRIFIABLE DEPUIS LE WORM — CONSTAT MESURÉ LE 2026-07-16.
 *
 * La spec POS annonçait `archive(n).previous_archive_signature == archive(n-1).signature_base64url`.
 * C'est FAUX en production. Sur les 15 archives signées du WORM, les 15 `previous_archive_signature` sont
 * ORPHELINES : aucune ne correspond à une autre archive (0 même-device, 0 cross-device, y compris sur les
 * établissements multi-devices), ni à un `nf525_jet.signature_base64url`, ni à un `nf525_pieces.signature_base64url`
 * — les seules tables de la base portant une `signature_base64url`.
 *
 * La valeur ancre n'existe donc NULLE PART chez nous : elle ne vit que dans le stockage local de la caisse.
 * Hypothèse : la caisse chaîne sur le fil LOCAL de ses clôtures Z, alors que `signature_base64url` signe
 * l'ARCHIVE S3 — deux objets distincts, jamais égaux.
 *
 * ⚠️ Appliquer la règle annoncée produirait un `chain_break` sur 100 % des archives. Un défaut d'intégrité crié à
 * tort détruit la valeur du signal (et un JET 90 est NON PURGEABLE). Tant que le POS n'a pas répondu à la question
 * « sur quoi porte réellement `previous_archive_signature`, et est-ce vérifiable depuis le WORM ? », ce module
 * n'émet AUCUN verdict de chaînage : il se contente d'inventorier, et le dit explicitement.
 *
 * ⚠️ Ne pas non plus regrouper par device pour en tirer une conclusion : `daily_found` n'a PAS de `device_id`,
 * la session de caisse est portée par l'ÉTABLISSEMENT. Le `device_id` de l'archive n'est que la caisse qui a
 * clôturé. L'inventaire ci-dessous est indicatif, pas un axe de contrôle.
 */

export interface ArchiveWithKey {
  key: string;
  archive: ZArchive;
}

export interface DeviceInventory {
  deviceId: string;
  count: number;
  firstCreatedAt: string | null;
  lastCreatedAt: string | null;
}

export interface ChainReport {
  /** Toujours false : cf. l'en-tête de ce fichier. Le rapport n'affirme rien sur le chaînage. */
  verifiable: false;
  reason: string;
  /** Inventaire indicatif par caisse ayant déposé des archives. */
  devices: DeviceInventory[];
  /** Archives hors périmètre de vérification (non signées / ancien format), à signaler jamais en silence. */
  excluded: { key: string; reason: "unsigned_or_legacy" }[];
}

const REASON =
  "Le chaînage des archives Z n'est pas vérifiable depuis le WORM : l'ancre de chaînage " +
  "(previous_archive_signature) ne correspond à aucune archive déposée ni à aucune signature en base — elle réside " +
  "dans le stockage local de la caisse. Constat mesuré le 16/07/2026 sur les 15 archives signées, en attente de " +
  "confirmation de l'éditeur POS. L'intégrité de chaque archive reste, elle, contrôlée par les 3 contrôles.";

/** Inventorie les archives par caisse. N'émet aucun verdict de chaînage — voir l'en-tête. */
export function checkChains(items: ArchiveWithKey[]): ChainReport {
  const excluded: ChainReport["excluded"] = [];
  const byDevice = new Map<string, ArchiveWithKey[]>();

  for (const it of items) {
    if (!isVerifiable(it.archive)) {
      excluded.push({ key: it.key, reason: "unsigned_or_legacy" });
      continue;
    }
    const device = it.archive.device_id ?? "(inconnu)";
    const list = byDevice.get(device);
    if (list) list.push(it);
    else byDevice.set(device, [it]);
  }

  const devices: DeviceInventory[] = [];
  for (const [deviceId, list] of byDevice) {
    const dates = list.map((it) => it.archive.created_at ?? "").sort((a, b) => a.localeCompare(b));
    devices.push({
      deviceId,
      count: list.length,
      firstCreatedAt: dates[0] || null,
      lastCreatedAt: dates[dates.length - 1] || null,
    });
  }
  devices.sort((a, b) => a.deviceId.localeCompare(b.deviceId));

  return { verifiable: false, reason: REASON, devices, excluded };
}

import { deflateRawSync } from "node:zlib";

/**
 * Écrivain ZIP minimal, zéro dépendance (cohérent avec s3-read.ts / la vérif ECDSA maison). Server-only.
 * Méthode DEFLATE (8). Suffisant pour empaqueter des archives JSON — chaque entrée conserve ses octets
 * exacts, donc le ZIP reste vérifiable une fois décompressé.
 *
 * Format ZIP (APPNOTE) : pour chaque fichier un en-tête local + données ; puis un annuaire central ; puis
 * l'enregistrement de fin d'annuaire. Tous les champs numériques sont little-endian.
 */

export interface ZipEntry {
  name: string;
  data: Buffer;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Heure/date MS-DOS (2s de résolution). `date` = instant de génération (Node, pas un script Workflow). */
function dosDateTime(date: Date): { time: number; dateField: number } {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const dateField = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, dateField };
}

/** Assemble un ZIP (DEFLATE) à partir d'entrées {nom, octets}. `now` = horodatage des entrées. */
export function createZip(entries: ZipEntry[], now: Date): Buffer {
  const { time, dateField } = dosDateTime(now);
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const crc = crc32(entry.data);
    const compressed = deflateRawSync(entry.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // signature en-tête local
    local.writeUInt16LE(20, 4); // version nécessaire
    local.writeUInt16LE(0x0800, 6); // drapeaux : bit 11 = nom en UTF-8
    local.writeUInt16LE(8, 8); // méthode DEFLATE
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(dateField, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // longueur extra
    chunks.push(local, nameBuf, compressed);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); // signature annuaire central
    cd.writeUInt16LE(20, 4); // version d'écriture
    cd.writeUInt16LE(20, 6); // version nécessaire
    cd.writeUInt16LE(0x0800, 8); // drapeaux (UTF-8)
    cd.writeUInt16LE(8, 10); // méthode
    cd.writeUInt16LE(time, 12);
    cd.writeUInt16LE(dateField, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(compressed.length, 20);
    cd.writeUInt32LE(entry.data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30); // extra
    cd.writeUInt16LE(0, 32); // commentaire
    cd.writeUInt16LE(0, 34); // n° disque
    cd.writeUInt16LE(0, 36); // attrs internes
    cd.writeUInt32LE(0, 38); // attrs externes
    cd.writeUInt32LE(offset, 42); // offset de l'en-tête local
    central.push(cd, nameBuf);

    offset += local.length + nameBuf.length + compressed.length;
  }

  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature fin d'annuaire
  eocd.writeUInt16LE(0, 4); // n° disque
  eocd.writeUInt16LE(0, 6); // disque de l'annuaire
  eocd.writeUInt16LE(entries.length, 8); // entrées sur ce disque
  eocd.writeUInt16LE(entries.length, 10); // entrées au total
  eocd.writeUInt32LE(centralBuf.length, 12); // taille de l'annuaire
  eocd.writeUInt32LE(offset, 16); // offset de l'annuaire
  eocd.writeUInt16LE(0, 20); // longueur du commentaire

  return Buffer.concat([...chunks, centralBuf, eocd]);
}

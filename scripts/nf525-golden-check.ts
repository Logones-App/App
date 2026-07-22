/**
 * Vecteur golden — non-régression du vérificateur d'archives fiscales Z.
 * Charge une archive RÉELLE figée (scripts/nf525-golden/) et la passe au MÊME `verifyArchive` que
 * l'application. Fait échouer si un des 3 contrôles cesse de valider — typiquement après une dérive de
 * `archive-format.ts` (ordre des clés du condensat, composition du manifest) non accompagnée d'une mise à
 * jour du golden.
 *
 *   npx tsx scripts/nf525-golden-check.ts     (ou : npm run check:nf525-golden)
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { verifyArchiveDeep } from "../src/lib/nf525/archive-deep-verify";
import { verifyArchive, type ZArchive } from "../src/lib/nf525/archive-verify";

const here = dirname(fileURLToPath(import.meta.url));
const goldenDir = join(here, "nf525-golden");

const archive = JSON.parse(readFileSync(join(goldenDir, "archive.json"), "utf8")) as ZArchive;
const publicKey = readFileSync(join(goldenDir, "public-key.txt"), "utf8").trim();

const verdict = verifyArchive(archive, publicKey);
const deep = verifyArchiveDeep(archive, publicKey);

console.log(`Golden : établissement ${archive.establishment_id}, ${archive.created_at}`);
console.log(`         ${Object.keys(archive.hashes ?? {}).length} condensats déclarés`);

if (!verdict.verifiable) {
  console.error(`❌ Archive jugée non vérifiable (${verdict.reason}) : ${verdict.detail}`);
  process.exit(1);
}

const checks: [string, boolean][] = [
  ["① condensats des fichiers", verdict.filesOk],
  ["② condensat intégral", verdict.condensateOk],
  ["③ signature ECDSA P-256", verdict.signatureOk === true],
  ["structure connue (rien d'inattendu)", !verdict.inconclusive],
  ["signatures internes (pièces, JET, Grands Totaux)", deep.verifiable && deep.allOk],
];

for (const [label, ok] of checks) console.log(`   ${ok ? "✅" : "❌"} ${label}`);
for (const c of deep.collections) console.log(`      ${c.name} : ${c.ok}/${c.signed} signatures valides`);

if (verdict.valid && verdict.signatureOk === true && !verdict.inconclusive && deep.allOk) {
  console.log("✅ Golden conforme — enveloppe et signatures internes validées.");
  process.exit(0);
}

console.error("❌ Le golden N'EST PLUS validé par le vérificateur.");
if (verdict.failedFiles.length) console.error(`   fichiers en écart : ${verdict.failedFiles.join(", ")}`);
if (verdict.unknownRootKeys.length) console.error(`   champs racine inconnus : ${verdict.unknownRootKeys.join(", ")}`);
if (verdict.unmappedHashes.length) console.error(`   condensats sans contenu : ${verdict.unmappedHashes.join(", ")}`);
console.error("   → soit le format a changé (mettre à jour archive-format.ts + remplacer le golden),");
console.error("   → soit une régression a été introduite dans le vérificateur.");
process.exit(1);

/**
 * Test de concordance de la conversion d'unités (SaaS).
 * Symétrique du test POS : les deux vérifient la MÊME table de cas contre leur implémentation
 * (`convertUnit` ici, `fn_convert` côté SQL). Fait échouer si `convertUnit` diverge de la table.
 *
 *   npx tsx scripts/check-unit-conversion.ts        (ou : npm run check:unit-conversion)
 */
import { CONVERSION_CASES, checkConversionConcordance } from "../src/lib/utils/unit-conversion-cases";

const { ok, failures } = checkConversionConcordance();

console.log(`Concordance convertUnit ↔ table fn_convert : ${CONVERSION_CASES.length} cas testés`);

if (ok) {
  console.log("✅ Tous les cas concordent.");
  process.exit(0);
}

console.error(`❌ ${failures.length} écart(s) :`);
for (const f of failures) {
  console.error(`  ${f.from ?? "NULL"} → ${f.to ?? "NULL"} : attendu ${f.expected}, obtenu ${f.got}`);
}
process.exit(1);

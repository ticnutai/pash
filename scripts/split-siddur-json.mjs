/**
 * split-siddur-json.mjs
 * Splits each large siddur_{nusach}.json into per-category files:
 *   siddur_sefard_shacharit.json, siddur_sefard_mincha.json, ...
 *
 * Before: browser downloads 3 MB to show שחרית
 * After:  browser downloads ~200 KB for שחרית only
 *
 * Usage: node scripts/split-siddur-json.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, basename } from "path";
import { fileURLToPath } from "url";

const __dir  = fileURLToPath(new URL(".", import.meta.url));
const SIDDUR = join(__dir, "..", "src", "data", "siddur");

const files = readdirSync(SIDDUR).filter(f => /^siddur_\w+\.json$/.test(f) && !/_[a-z]+_/.test(f));

let totalBefore = 0, totalAfter = 0;

for (const file of files) {
  const nusach = basename(file, ".json").replace("siddur_", "");
  const full   = join(SIDDUR, file);
  const sizeBefore = statSync(full).size;
  totalBefore += sizeBefore;

  const data = JSON.parse(readFileSync(full, "utf8"));

  for (const [catId, cat] of Object.entries(data)) {
    const outFile = join(SIDDUR, `siddur_${nusach}_${catId}.json`);
    const payload = { name: cat.name, sections: cat.sections };
    const json    = JSON.stringify(payload);
    writeFileSync(outFile, json, "utf8");
    totalAfter += json.length;
    const kb = (json.length / 1024).toFixed(0);
    console.log(`  ✓ siddur_${nusach}_${catId}.json  (${kb} KB)`);
  }

  console.log(`${file}  (${(sizeBefore / 1024).toFixed(0)} KB) → split into ${Object.keys(data).length} files\n`);
}

console.log(`\nTotal before: ${(totalBefore/1024).toFixed(0)} KB`);
console.log(`Total after:  ${(totalAfter/1024).toFixed(0)} KB`);
console.log("\nDone ✅");

/**
 * Verify every surface a painter can now add to a quote prices correctly through the code the
 * app actually calls, not through priceSurface directly.
 *
 * Three things this is checking, each of which was a real hazard while wiring it up:
 *
 *  1. Non-area surfaces are not treated as square feet. The old exterior path multiplied
 *     inputs.sqFt by an area coverage rate unconditionally, so 30 cabinet doors would have been
 *     costed as 30 square feet.
 *  2. The painter's own paintCostPerGallon is respected. priceSurface defaults to the catalog
 *     grade price, which would silently replace a setting painters configure themselves.
 *  3. No line carries the minimum job charge. The minimum belongs to the whole quote and is
 *     applied once in calculateItemsSummary; if a line floors at it, a five room job prices at
 *     five times the minimum.
 *
 * Run: node scripts/verify-surfaces.mjs   (compiles the lib to a temp dir first)
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, cpSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const TMP = ".tmp-verify";
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
writeFileSync(join(TMP, "tsconfig.json"), JSON.stringify({
  compilerOptions: {
    outDir: "out", module: "es2022", target: "es2022", moduleResolution: "bundler",
    resolveJsonModule: true, skipLibCheck: true, baseUrl: "..", paths: { "@/*": ["./*"] },
  },
  include: ["../lib/quote-engine.ts", "../lib/pricing.ts", "../lib/constants.ts",
            "../lib/catalog/index.ts", "../lib/cost-stack.ts", "../lib/utils.ts", "../lib/types.ts"],
}, null, 1));
execSync(`npx tsc -p ${TMP}/tsconfig.json`, { stdio: "pipe" });

const OUT = join(TMP, "out");
cpSync("lib/catalog/catalog.json", join(OUT, "catalog", "catalog.json"));
const fix = (f) => {
  let t = readFileSync(f, "utf8");
  t = t.replace(/from "@\/lib\/catalog"/g, 'from "./catalog/index.js"')
       .replace(/from "@\/lib\/([a-z-]+)"/g, 'from "./$1.js"')
       .replace(/from "\.\.\/types"/g, 'from "../types.js"')
       .replace(/from "\.\/catalog\.js"/g, 'from "./catalog/index.js"')
       .replace('import catalogJson from "./catalog.json";',
                'import { createRequire } from "node:module";\nconst catalogJson = createRequire(import.meta.url)("./catalog.json");');
  writeFileSync(f, t);
};
for (const f of readdirSync(OUT)) if (f.endsWith(".js")) fix(join(OUT, f));
for (const f of readdirSync(join(OUT, "catalog"))) if (f.endsWith(".js")) fix(join(OUT, "catalog", f));

const abs = (f) => pathToFileURL(join(process.cwd(), OUT, f)).href;
const { calculateExteriorSuggested } = await import(abs("quote-engine.js"));
const { EXTERIOR_TEMPLATES, DEFAULT_SETTINGS } = await import(abs("constants.js"));

const surfaces = Object.values(EXTERIOR_TEMPLATES);
console.log(`surfaces a painter can add to a quote: ${surfaces.length}\n`);
console.log("  surface                basis   qty  unit                          price   scope");
let fails = 0;
for (const t of surfaces) {
  const qty = t.defaultSqFt;
  const { suggestedPrice, scopeDescription } = calculateExteriorSuggested(
    { sqFt: qty, coats: t.defaultCoats, useSpray: false, heavyPrep: false },
    t.key, DEFAULT_SETTINGS,
  );
  const problems = [];
  if (!isFinite(suggestedPrice) || suggestedPrice <= 0) problems.push("bad price");
  // no line may sit exactly on the quote-level minimum
  if (Math.abs(suggestedPrice - DEFAULT_SETTINGS.minimumJobCharge) < 0.01) problems.push("line hit the quote minimum");
  if (!scopeDescription.includes(t.measureUnit)) problems.push(`scope missing unit "${t.measureUnit}"`);
  if (problems.length) fails++;
  console.log(`  ${t.key.padEnd(22)} ${t.basis.padEnd(7)} ${String(qty).padStart(4)}  ${t.measureUnit.padEnd(28)} $${suggestedPrice.toFixed(0).padStart(6)}  ${problems.length ? "FAIL: " + problems.join("; ") : "ok"}`);
}

// the painter's paint cost must actually move the price
const cheap = calculateExteriorSuggested({ sqFt: 1750, coats: 2, useSpray: false, heavyPrep: false },
  "siding", { ...DEFAULT_SETTINGS, paintCostPerGallon: 20 }).suggestedPrice;
const dear = calculateExteriorSuggested({ sqFt: 1750, coats: 2, useSpray: false, heavyPrep: false },
  "siding", { ...DEFAULT_SETTINGS, paintCostPerGallon: 80 }).suggestedPrice;
console.log(`\npainter's paint cost respected: $20/gal -> $${cheap.toFixed(0)}, $80/gal -> $${dear.toFixed(0)}  ${dear > cheap ? "ok" : "FAIL: setting ignored"}`);
if (!(dear > cheap)) fails++;

console.log(`\n${surfaces.length - fails}/${surfaces.length} surfaces clean`);
rmSync(TMP, { recursive: true, force: true });
process.exit(fails ? 1 : 0);

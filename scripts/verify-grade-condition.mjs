/**
 * Verify the paint-grade and condition controls, and prove they change nothing by default.
 *
 * The regression check is the important half. Both fields are optional and every quote saved
 * before they existed has neither, so an item with no grade and no condition must price to the
 * exact cent it did before. "fair" is multiplier 1.0 precisely so that holds.
 *
 * Also checks the precedence rule that was easy to get backwards: an explicit grade on a line
 * beats the painter's profile paintCostPerGallon, but with no grade chosen their setting wins.
 * The first version of priceSurface had settings winning unconditionally, which would have made
 * the grade picker do nothing at all.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, cpSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const TMP = ".tmp-gc";
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
writeFileSync(join(TMP, "tsconfig.json"), JSON.stringify({
  compilerOptions: { outDir: "out", module: "es2022", target: "es2022", moduleResolution: "bundler",
    resolveJsonModule: true, skipLibCheck: true, baseUrl: "..", paths: { "@/*": ["./*"] } },
  include: ["../lib/quote-engine.ts", "../lib/pricing.ts", "../lib/constants.ts",
            "../lib/catalog/index.ts", "../lib/cost-stack.ts", "../lib/utils.ts", "../lib/types.ts"],
}));
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

const { calculateInteriorSuggested, calculateExteriorSuggested } = await import(abs("quote-engine.js"));
const { DEFAULT_SETTINGS } = await import(abs("constants.js"));

const room = { defaultWallSqFt: 544, defaultCeilingSqFt: 280, includeCeiling: true,
  trimLinearFeet: 68, doorCount: 2, windowCount: 2, paintDoors: true, paintWindows: true,
  heavyPrep: false };
const I = (o) => calculateInteriorSuggested({ ...room, ...o }, DEFAULT_SETTINGS).suggestedPrice;
const E = (o) => calculateExteriorSuggested(
  { sqFt: 1750, coats: 2, useSpray: false, heavyPrep: false, ...o }, "siding", DEFAULT_SETTINGS).suggestedPrice;

let fails = 0;
const check = (label, got, want, tol = 0.01) => {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) fails++;
  console.log(`  ${label.padEnd(52)} ${ok ? "ok" : `FAIL got ${got.toFixed(2)} want ${want.toFixed(2)}`}`);
};

console.log("REGRESSION: nothing set must equal condition 'fair' with no grade\n");
const baseI = I({}), baseE = E({});
check("interior: absent === fair", I({ condition: "fair" }), baseI);
check("surface:  absent === fair", E({ condition: "fair" }), baseE);
console.log(`  (interior baseline $${baseI.toFixed(0)}, surface baseline $${baseE.toFixed(0)})`);

console.log("\nCONDITION moves prep, in the right direction\n");
const gI = I({ condition: "good" }), pI = I({ condition: "poor" });
console.log(`  interior  good $${gI.toFixed(0)}  <  fair $${baseI.toFixed(0)}  <  poor $${pI.toFixed(0)}`);
if (!(gI < baseI && baseI < pI)) { fails++; console.log("  FAIL: not monotonic"); }
const gE = E({ condition: "good" }), pE = E({ condition: "poor" });
console.log(`  surface   good $${gE.toFixed(0)}  <  fair $${baseE.toFixed(0)}  <  poor $${pE.toFixed(0)}`);
if (!(gE < baseE && baseE < pE)) { fails++; console.log("  FAIL: not monotonic"); }

console.log("\nPAINT GRADE moves materials, in the right direction\n");
const eco = I({ paintGrade: "economy" }), std = I({ paintGrade: "standard" }), pre = I({ paintGrade: "premium" });
console.log(`  interior  economy $${eco.toFixed(0)}  <  standard $${std.toFixed(0)}  <  premium $${pre.toFixed(0)}`);
if (!(eco < std && std < pre)) { fails++; console.log("  FAIL: not monotonic"); }
const ecoE = E({ paintGrade: "economy" }), preE = E({ paintGrade: "premium" });
console.log(`  surface   economy $${ecoE.toFixed(0)}  <  premium $${preE.toFixed(0)}`);
if (!(ecoE < preE)) { fails++; console.log("  FAIL: not monotonic"); }

console.log("\nPRECEDENCE: explicit grade beats the profile default, absent grade defers to it\n");
const cheapProfile = { ...DEFAULT_SETTINGS, paintCostPerGallon: 20 };
const noGrade = calculateInteriorSuggested(room, cheapProfile).suggestedPrice;
const withPremium = calculateInteriorSuggested({ ...room, paintGrade: "premium" }, cheapProfile).suggestedPrice;
console.log(`  profile $20/gal, no grade      $${noGrade.toFixed(0)}`);
console.log(`  profile $20/gal, grade premium $${withPremium.toFixed(0)}`);
if (!(withPremium > noGrade)) { fails++; console.log("  FAIL: grade picker is being ignored"); }
if (Math.abs(noGrade - baseI) < 0.01) { fails++; console.log("  FAIL: profile paint cost is being ignored"); }

console.log(`\n${fails === 0 ? "all checks passed" : fails + " check(s) FAILED"}`);
rmSync(TMP, { recursive: true, force: true });
process.exit(fails ? 1 : 0);

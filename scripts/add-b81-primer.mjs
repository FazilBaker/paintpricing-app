// Batch 81: primer calculator, a measurement tool on the contractor tool template (compute primerQuantity).
// Why a tool and not a calculator variant: the surface calculator counts primer as one more coat at the
// wall paint coverage and never shows primer gallons on their own, which is the whole question here.
// Default coverage 350 sq ft per gallon sits inside the published ranges (checked 2026-10-19):
//   KILZ 2 All-Purpose, Behr Pro product page: 300 to 400 sq ft per gallon by texture and porosity
//   Zinsser Bulls Eye 1-2-3 water based, Rust-Oleum TDS BEY123-01: 350 porous, 450 non porous
// GSC 90d: "primer calculator" 14 impressions at position 13.4; how-much-primer-do-i-need exists.
// Idempotent: refuses to overwrite. Run once, then `npm run build:catalog`.
import { readFileSync, writeFileSync } from "node:fs";

const SRC = new URL("../lib/catalog/tools.json", import.meta.url);
const tools = JSON.parse(readFileSync(SRC, "utf8"));
const calcs = JSON.parse(readFileSync(new URL("../lib/catalog/calculators.json", import.meta.url), "utf8")).variants;
const G = JSON.parse(readFileSync(new URL("../lib/catalog/catalog.json", import.meta.url), "utf8")).geometry;

const SLUG = "primer-calculator";
const T = {
  compute: "primerQuantity",
  h1: "Primer Calculator",
  metaTitle: "Primer Calculator: How Much Primer Do I Need?",
  metaDescription: "Work out how much primer you need, in gallons and quarts, from the area, the number of coats and the coverage on the can. Free, no signup.",
  focusKeyword: "primer calculator",
  intro: "Enter the area you are priming, the number of primer coats and the coverage printed on the can or data sheet. The default of 350 sq ft per gallon sits inside the published ranges for common primers; use the low end of the range for rough or porous surfaces.",
  audience: "mixed",
  inputs: [
    { key: "area", label: "Area to prime", suffix: "sq ft", default: 400, step: 10, min: 0 },
    { key: "coats", label: "Primer coats", default: 1, step: 1, min: 1, max: 3 },
    { key: "coverage", label: "Coverage per gallon", suffix: "sq ft", default: 350, step: 10, min: 100, max: 600 },
  ],
  outputs: [
    { key: "gallons", label: "Primer needed (gallons)", format: "decimal", primary: true },
    { key: "buyGallons", label: "Gallons to buy", format: "number" },
    { key: "buyQuarts", label: "Or quarts, for a small job", format: "number" },
    { key: "primedArea", label: "Total area primed, all coats (sq ft)", format: "number" },
  ],
  faqs: [
    ["How much does a gallon of primer cover?",
     "Each product prints a range on the can and data sheet. KILZ 2 All-Purpose lists 300 to 400 sq ft per gallon, and Zinsser Bulls Eye 1-2-3 lists about 350 on porous surfaces and 450 on non porous ones. Rough and porous surfaces land at the low end."],
    ["Do I need one coat of primer or two?",
     "One coat is usual over sound, previously painted walls. New drywall, bare wood, stains and big color changes can call for a second coat or a stain blocking primer, so check the directions for the product you are using."],
    ["Why work out primer separately from paint?",
     "Primer is bought separately and its coverage is printed on its own can, so it is worth working out on its own rather than as one more coat of finish paint."],
    ["How do I measure the area to prime?",
     `Multiply the room perimeter by the wall height, then take off about ${G.doorDeductionSqFt} sq ft for each door and ${G.windowDeductionSqFt} sq ft for each window. Add the ceiling, length times width, if you are priming it too.`],
    ["Can I spot prime instead of priming everything?",
     "Often, over walls in good condition. Enter only the area of the patches and stains you are priming, and buy by the quart."],
  ],
  related: ["interior-painting-calculator", "ceiling-painting-calculator", "bedroom-painting-calculator", "garage-painting-calculator", "basement-painting-calculator", "paint-coverage-calculator"],
};

if (tools.tools[SLUG]) throw new Error(`${SLUG} exists`);
const BANNED = /[–—‘’“”']| - |colour|labour/;
if (BANNED.test(JSON.stringify(T))) throw new Error("banned text");
if (T.metaTitle.length > 60 || T.metaDescription.length > 155) throw new Error(`meta ${T.metaTitle.length} ${T.metaDescription.length}`);
T.related = T.related.filter((r) => calcs[r] || tools.tools[r]);
tools.tools[SLUG] = T;
writeFileSync(SRC, JSON.stringify(tools, null, 2) + "\n");
console.log("tools", Object.keys(tools.tools).length, "related kept", T.related);

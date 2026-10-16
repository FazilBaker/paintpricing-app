// Batch 79: one room preset (walk-in closet) and two calculator variants (closet, porch).
// GSC 90 days to 2026-10-16, existing article clusters with no calculator link at all:
//   porch   14.1K impressions, 95 clicks; cost queries ("how much does it cost to paint a porch",
//           "how much to paint a porch", "cost to paint porch railings") sit at position 5 to 9
//   closet  3.25K impressions; cost and how long queries at position 3.6 to 6
// The closet preset follows the "standard walk-in (5 ft x 7 ft)" row of cost-to-paint-a-closet.
// The porch variant uses the existing deck-porch surface (floor area); the copy says how to add the
// ceiling, railing and balusters as extra lines with existing catalog rates. No new rates.
// The paid app reads only its own fixed CATALOG_ROOM_KEYS list (lib/constants.ts), so the new preset
// changes no app quote. Idempotent: refuses to overwrite. Run once, then `npm run build:catalog`.
import { readFileSync, writeFileSync } from "node:fs";

const CAT = new URL("../lib/catalog/catalog.json", import.meta.url);
const VAR = new URL("../lib/catalog/calculators.json", import.meta.url);
const catalog = JSON.parse(readFileSync(CAT, "utf8"));
const calcs = JSON.parse(readFileSync(VAR, "utf8"));
const G = catalog.geometry;

function preset(p) {
  const gross = 2 * (p.lengthFt + p.widthFt) * p.heightFt;
  const open = p.doors * G.doorDeductionSqFt + p.windows * G.windowDeductionSqFt;
  const ceiling = p.ceilingIncluded ? p.lengthFt * p.widthFt : 0;
  return { ...p, derived: { grossWallSqFt: gross, paintableWallSqFt: gross - open, ceilingSqFt: ceiling,
    openingDeductionSqFt: open, totalPaintedSqFt: gross - open + ceiling } };
}

const PRESETS = {
  closet: preset({
    label: "Walk-in closet", aliases: ["closet", "walk-in closet"], lengthFt: 7, widthFt: 5, heightFt: 8, trimLinearFt: 21,
    doors: 1, windows: 0, ceilingIncluded: true,
    note: "Standard walk-in closet. Shelving and rods come out or are cut around, which is slow for the area.",
    spec: ["Small rooms cost more per square foot, because setup, cutting in and cleanup barely shrink with the area.",
      "Taking out shelves and rods, or cutting around them, is the real time in a closet; add it in the editable hours.",
      "For a reach-in closet, enter its width, depth and height; the calculator works the same way."],
  }),
};

const REL_INT = ["interior-painting-calculator", "house-painting-calculator"];
const NEW = {
  "closet-painting-calculator": {
    mode: "interior", roomPreset: "closet",
    h1: "Closet Painting Calculator",
    metaTitle: "Closet Painting Calculator | Paint and Cost for a Closet",
    metaDescription: "Estimate the paint and cost to paint a walk-in or reach-in closet, walls, ceiling and trim. Free, no signup.",
    focusKeyword: "closet painting calculator",
    intro: "Estimate the paint and cost to paint a closet. It starts at a standard 5 by 7 foot walk-in; change the size for yours, or enter a reach-in by its width, depth and height.",
    audience: "mixed",
    faqs: [
      { q: "How much paint do I need for a closet?",
        a: "Not much. Enter the size and the calculator works out the paint for walls, ceiling and trim at the coats you choose, rounded up to whole gallons. A small reach-in often needs less than a gallon." },
      { q: "Why does a closet cost so much for its size?",
        a: "Setup, cutting in around tight corners and cleanup take nearly as long as in a bigger room, and shelves and rods have to come out or be worked around. Add that time in the editable hours on the result." },
      { q: "Can I price a reach-in closet with this?",
        a: "Yes. Enter the width, the depth and the height. A reach-in has one open face, so leave the door count at one for the opening." },
    ],
    related: ["bedroom-painting-calculator", "hallway-painting-calculator", "ceiling-painting-calculator", "trim-painting-calculator", ...REL_INT],
  },
  "porch-painting-calculator": {
    mode: "exterior", surface: "deck-porch",
    h1: "Porch Painting Calculator",
    metaTitle: "Porch Painting Calculator | Cost to Paint a Porch",
    metaDescription: "Estimate the cost to paint a porch floor, then add the ceiling, railing and balusters as extra lines. Free, no signup.",
    focusKeyword: "porch painting calculator",
    intro: "Estimate the cost to paint a porch. It starts with the floor area; add the ceiling, the railing and the balusters as extra surfaces, because each one is priced differently.",
    audience: "mixed",
    faqs: [
      { q: "How do I add the porch ceiling and railings?",
        a: "Use Add Surface. Enter the ceiling area as a Soffit line, since both are overhead exterior boards. Add the top rail as Handrail by the foot and the balusters as Stair spindles by the count. Those two rates come from interior work, where a smooth sanded finish is expected, so they lean high for plain square balusters." },
      { q: "Why is a porch priced by component?",
        a: "The floor takes a tough floor enamel and wears fastest, the ceiling is overhead work, and railings and balusters are slow brushwork with a lot of surface for their size. One price per square foot would hide all three." },
      { q: "Are columns and steps included?",
        a: "Not as their own line. Add steps to the floor area, and add the time for columns in the editable hours on the result." },
    ],
    related: ["deck-painting-calculator", "soffit-painting-calculator", "handrail-painting-calculator", "stair-spindle-painting-calculator", "front-door-painting-calculator", "exterior-painting-calculator"],
  },
};

const BANNED = /[–—‘’“”]| - |colour|labour|panelled/;
for (const [k, p] of Object.entries(PRESETS)) {
  if (catalog.roomPresets[k]) throw new Error(`preset ${k} exists`);
  if (BANNED.test(JSON.stringify(p))) throw new Error(`preset ${k} banned text`);
  catalog.roomPresets[k] = p;
}
for (const [slug, v] of Object.entries(NEW)) {
  if (calcs.variants[slug]) throw new Error(`${slug} exists`);
  if (BANNED.test(JSON.stringify(v))) throw new Error(`${slug} banned text`);
  if (v.metaTitle.length > 60) throw new Error(`${slug} metaTitle ${v.metaTitle.length}`);
  if (v.metaDescription.length > 155) throw new Error(`${slug} metaDescription ${v.metaDescription.length}`);
  for (const r of v.related) if (!calcs.variants[r] && !NEW[r]) throw new Error(`${slug} related ${r} missing`);
  calcs.variants[slug] = v;
}
writeFileSync(CAT, JSON.stringify(catalog, null, 2) + "\n");
writeFileSync(VAR, JSON.stringify(calcs, null, 2) + "\n");
console.log("presets", Object.keys(catalog.roomPresets).length, "variants", Object.keys(calcs.variants).length);

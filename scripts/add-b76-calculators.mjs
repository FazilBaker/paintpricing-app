// Batch 76: three room presets (garage, basement, stairwell) and four calculator variants
// (garage, basement, stairwell, ceiling). GSC 90 days to 2026-10-03, existing page one articles:
//   garage     how much paint 6,343 + cost 9,158 + best paint for walls 3,188 + how long 1,075
//   basement   cost 2,816 + best paint 1,333 + how much paint 268 + how long 258
//   stairwell  cost 1,661 (20 clicks) + how long 294 + how much paint 220
//   ceiling    how long 6,268 + best paint 897 + cost 679 + charge 402; autocomplete shows
//              "ceiling paint calculator" and "ceiling paint calculator square feet"
// The paid app reads only its own fixed CATALOG_ROOM_KEYS list (lib/constants.ts), so new presets
// change no app quote. Preset dimensions are editable starting points, labelled as such.
// Idempotent: refuses to overwrite. Run once, then `npm run build:catalog`.
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
  garage: preset({
    label: "Garage", aliases: ["garage"], lengthFt: 22, widthFt: 22, heightFt: 9, trimLinearFt: 20,
    doors: 1, windows: 1, ceilingIncluded: true,
    note: "Attached two car garage with drywall walls. The overhead door is priced separately.",
    spec: ["New or bare drywall in a garage drinks primer, so a primer coat is usually worth adding.",
      "The overhead door is its own job; use the garage door calculator for it.",
      "Floors take a different coating system and are not part of this estimate."],
  }),
  basement: preset({
    label: "Basement", aliases: ["basement"], lengthFt: 24, widthFt: 20, heightFt: 8, trimLinearFt: 60,
    doors: 2, windows: 2, ceilingIncluded: true, moistureFlag: true,
    note: "Finished basement room. Check for moisture before painting.",
    spec: ["Damp walls make paint fail, so moisture is worth checking before any basement job.",
      "Bare concrete or block walls need a masonry primer and take more paint than drywall.",
      "An exposed joist ceiling is usually sprayed and is priced very differently from drywall."],
  }),
  stairwell: preset({
    label: "Stairwell", aliases: ["stairwell"], lengthFt: 12, widthFt: 4, heightFt: 16, trimLinearFt: 40,
    doors: 0, windows: 1, ceilingIncluded: true, heavyTrim: true,
    note: "Two story stairwell. Tall walls need staging or a stair ladder.",
    spec: ["The height is the cost: tall stairwell walls need staging or a stair ladder, which is setup time on top of painting time.",
      "Handrails and spindles are priced separately; use the handrail and spindle calculators."],
  }),
};

const REL_INT = ["interior-painting-calculator", "house-painting-calculator"];
const NEW = {
  "garage-painting-calculator": {
    mode: "interior", roomPreset: "garage",
    h1: "Garage Painting Calculator",
    metaTitle: "Garage Paint Calculator | Gallons and Cost to Paint",
    metaDescription: "Estimate the paint and cost to paint garage walls and ceiling. Starts at a two car garage you can resize. Free, no signup.",
    focusKeyword: "garage paint calculator",
    intro: "Estimate the paint and cost to paint the inside of a garage. It starts at a typical attached two car garage; change the length, width and height to match yours.",
    audience: "mixed",
    faqs: [
      { q: "How much paint do I need for a two car garage?",
        a: "It depends on the wall height, the ceiling and whether the drywall is bare. Enter your garage size and the calculator shows the gallons for walls and ceiling at the coats you choose." },
      { q: "Should I prime garage walls?",
        a: "Bare or patched drywall usually needs primer, because it absorbs the first coat unevenly. Tick the primer option to include it." },
      { q: "Is the garage door or floor included?",
        a: "No. The overhead door has its own calculator, and floors take a different coating system altogether." },
    ],
    related: ["garage-door-painting-calculator", "basement-painting-calculator", "ceiling-painting-calculator", "laundry-room-painting-calculator", ...REL_INT],
  },
  "basement-painting-calculator": {
    mode: "interior", roomPreset: "basement",
    h1: "Basement Painting Calculator",
    metaTitle: "Basement Painting Calculator | Paint and Cost",
    metaDescription: "Estimate the paint and cost to paint a basement room, walls and ceiling, with coats and primer. Free, no signup.",
    focusKeyword: "basement painting calculator",
    intro: "Estimate the paint and cost to paint a finished basement room. It starts at a typical rec room; change the size to match yours, and check for damp before you paint.",
    audience: "mixed",
    faqs: [
      { q: "How much does it cost to paint a basement?",
        a: "Mostly the wall and ceiling area, the condition of the surfaces and whether they are drywall or bare masonry. Enter your room size and the calculator prices paint, labor and prep." },
      { q: "Can I paint bare concrete basement walls?",
        a: "Yes, with a masonry primer and only once moisture is under control. Masonry absorbs more paint than drywall, so expect a higher paint quantity." },
      { q: "Does this cover an exposed basement ceiling?",
        a: "No. An open joist ceiling is usually sprayed and priced very differently. This calculator assumes a drywall ceiling." },
    ],
    related: ["garage-painting-calculator", "ceiling-painting-calculator", "laundry-room-painting-calculator", "home-office-painting-calculator", ...REL_INT],
  },
  "stairwell-painting-calculator": {
    mode: "interior", roomPreset: "stairwell",
    h1: "Stairwell Painting Calculator",
    metaTitle: "Stairwell Painting Calculator | Cost to Paint Stairs",
    metaDescription: "Estimate the paint and cost to paint a two story stairwell, where the wall height drives the price. Free, no signup.",
    focusKeyword: "stairwell painting calculator",
    intro: "Estimate the paint and cost to paint a stairwell. It starts at a typical two story stairwell; change the length, width and the tallest wall height to match yours, then add any staging time in the editable hours on the result.",
    audience: "mixed",
    faqs: [
      { q: "Why does a stairwell cost more to paint than a room?",
        a: "Height. Tall stairwell walls need staging or a stair ladder, and setting it up and moving it takes time. This calculator prices the painted area, so add that setup time in the editable hours box on the result." },
      { q: "How do I measure a stairwell for paint?",
        a: "Use the length and width of the stair opening and the height of the tallest wall. The calculator works out the wall and ceiling area from those." },
      { q: "Are the handrail and spindles included?",
        a: "No. They are priced by the foot and by the spindle. Use the handrail and spindle calculators alongside this one." },
    ],
    related: ["handrail-painting-calculator", "stair-spindle-painting-calculator", "hallway-painting-calculator", "ceiling-painting-calculator", ...REL_INT],
  },
  "ceiling-painting-calculator": {
    mode: "interior", roomPreset: "living-room", ceilingOnly: true,
    h1: "Ceiling Paint Calculator",
    metaTitle: "Ceiling Paint Calculator | Gallons and Cost by Sq Ft",
    metaDescription: "Work out how much paint a ceiling needs and what it costs to paint, from the square footage. Free, no signup.",
    focusKeyword: "ceiling paint calculator",
    intro: "Work out the paint and cost for a ceiling on its own. Enter the ceiling area, length times width of the room, and the calculator applies the slower overhead production rate.",
    audience: "mixed",
    faqs: [
      { q: "How much paint do I need for a ceiling?",
        a: "Multiply the room length by its width for the ceiling area, then allow for two coats. Enter the area and the calculator shows the gallons at the coats you choose." },
      { q: "Why does a ceiling take longer than a wall?",
        a: "Overhead rolling is slower and more tiring than wall work, so the calculator uses a slower ceiling production rate than it does for walls." },
      { q: "Do textured or popcorn ceilings need more paint?",
        a: "Yes. Texture holds more paint and a popcorn ceiling can need a sprayer. Add a primer coat or a third coat to allow for it." },
    ],
    related: ["interior-painting-calculator", "living-room-painting-calculator", "bedroom-painting-calculator", "basement-painting-calculator", "house-painting-calculator", "stairwell-painting-calculator"],
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
  calcs.variants[slug] = v;
}
writeFileSync(CAT, JSON.stringify(catalog, null, 2) + "\n");
writeFileSync(VAR, JSON.stringify(calcs, null, 2) + "\n");
console.log("presets", Object.keys(catalog.roomPresets).length, "variants", Object.keys(calcs.variants).length);

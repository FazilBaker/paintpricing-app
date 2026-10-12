// Batch 75: four calculator variants for surfaces the catalog already prices but no page exposed.
// GSC (90 days to 2026-10-03) shows the site already earns page one impressions on each surface:
//   shutters      cost/charge 5,165 + best paint 2,482 + how much paint 1,438
//   garage door   how much paint 2,963 + cost 1,481 + charge 889
//   front door    cost 1,518 + charge 937
//   soffit        how to paint 551 + charge 189
// Narrow calculators are the page type that ranks 5 to 9 and earns clicks on this domain.
// Idempotent: refuses to overwrite an existing variant. Run once, then `npm run build:catalog`.
import { readFileSync, writeFileSync } from "node:fs";

const P = new URL("../lib/catalog/calculators.json", import.meta.url);
const data = JSON.parse(readFileSync(P, "utf8"));

const NEW = {
  "garage-door-painting-calculator": {
    mode: "exterior",
    surface: "garage-door",
    h1: "Garage Door Painting Calculator",
    metaTitle: "Garage Door Painting Calculator | Cost and Paint",
    metaDescription: "Estimate the cost and paint to repaint a garage door, single or double, with prep and two coats. Free, no signup.",
    focusKeyword: "garage door painting calculator",
    intro: "Estimate the cost to paint a garage door. The default is a standard double door; measure the width and height of yours and enter the area to match a single or an oversized door.",
    audience: "mixed",
    faqs: [
      { q: "How much does it cost to paint a garage door?",
        a: "It depends mostly on the door area, the panel style and the prep. Enter your door size and the calculator prices labor, paint, prep and supplies from it." },
      { q: "How do I measure a garage door for paint?",
        a: "Multiply the width by the height for one face. Most people paint only the outside face; if you are painting both, double it." },
      { q: "Does a paneled door take longer than a flat one?",
        a: "Yes. Raised panels add many more edges and cut lines than a flush door of the same size, so expect more labor than the area alone suggests." },
    ],
    related: ["front-door-painting-calculator", "trim-painting-calculator", "siding-painting-calculator",
      "shutter-painting-calculator", "exterior-painting-calculator", "house-painting-calculator"],
  },
  "shutter-painting-calculator": {
    mode: "exterior",
    surface: "shutters",
    h1: "Shutter Painting Calculator",
    metaTitle: "Shutter Painting Calculator | Cost to Paint Shutters",
    metaDescription: "Estimate the cost and paint to repaint exterior shutters, on the house or taken down and sprayed. Free, no signup.",
    focusKeyword: "shutter painting calculator",
    intro: "Estimate the cost to paint exterior shutters. The default assumes eight shutters at about 15 square feet each; count yours and multiply by the size of one shutter to set the area.",
    audience: "mixed",
    faqs: [
      { q: "How much does it cost to paint shutters?",
        a: "Shutters are usually priced per shutter, which comes down to their area, the number of louvers and whether they come off the house. Enter the total area and the calculator prices it." },
      { q: "How do I work out the area of my shutters?",
        a: "Measure one shutter, multiply width by height, and multiply by the number of shutters. Paint both faces only if you are painting the back too." },
      { q: "Is it faster to take shutters down to paint them?",
        a: "Often, yes. Removed shutters can be sprayed flat, which is quicker and neater than brushing louvers in place, though removal and rehanging take time of their own." },
    ],
    related: ["front-door-painting-calculator", "garage-door-painting-calculator", "trim-painting-calculator",
      "siding-painting-calculator", "exterior-painting-calculator", "house-painting-calculator"],
  },
  "front-door-painting-calculator": {
    mode: "exterior",
    surface: "doors",
    h1: "Front Door Painting Calculator",
    metaTitle: "Front Door Painting Calculator | Cost and Paint",
    metaDescription: "Estimate the cost and paint to repaint a front door or other exterior doors, with prep and two coats. Free, no signup.",
    focusKeyword: "front door painting calculator",
    intro: "Estimate the cost to paint a front door or other exterior doors. The default is one door painted on both faces, at about 21 square feet per face; add faces or doors to match your job.",
    audience: "mixed",
    faqs: [
      { q: "How much does it cost to paint a front door?",
        a: "A front door is a small job, so prep, setup and drying time weigh heavily against the area. Enter your door area and the calculator prices labor, paint and prep." },
      { q: "How much paint does a front door need?",
        a: "Very little. A single door usually needs well under a gallon for two coats, which is why many painters buy a quart. The calculator shows the paint quantity for the area you enter." },
      { q: "Should I paint both sides of the door?",
        a: "Only if the inside face needs it. Many people paint just the exterior face in a new color; if so, enter one face rather than two." },
    ],
    related: ["garage-door-painting-calculator", "shutter-painting-calculator", "interior-door-painting-calculator",
      "trim-painting-calculator", "exterior-painting-calculator", "house-painting-calculator"],
  },
  "soffit-painting-calculator": {
    mode: "exterior",
    surface: "soffit",
    h1: "Soffit Painting Calculator",
    metaTitle: "Soffit Painting Calculator | Cost to Paint Soffits",
    metaDescription: "Estimate the cost and paint to repaint soffits, the overhead underside of the eaves, with prep and two coats. Free, no signup.",
    focusKeyword: "soffit painting calculator",
    intro: "Estimate the cost to paint soffits, the underside of the roof overhang. Measure the run of the eaves and the depth of the overhang, multiply them, and enter the area.",
    audience: "mixed",
    faqs: [
      { q: "How much does it cost to paint soffits?",
        a: "More per square foot than siding, because the work is overhead and on a ladder. Enter your soffit area and the calculator applies the slower overhead production rate." },
      { q: "How do I measure soffit area?",
        a: "Measure the length of each eave run and the depth of the overhang, multiply them for each run, and add the runs together." },
      { q: "Is fascia included?",
        a: "No. Fascia is the board along the edge of the roof, and it is priced with trim. Use the trim calculator alongside this one." },
    ],
    related: ["trim-painting-calculator", "gutter-painting-calculator", "siding-painting-calculator",
      "stucco-painting-calculator", "exterior-painting-calculator", "house-painting-calculator"],
  },
};

const BANNED = /[–—‘’“”]| - /;
for (const [slug, v] of Object.entries(NEW)) {
  if (data.variants[slug]) throw new Error(`${slug} already exists`);
  const text = JSON.stringify(v);
  if (BANNED.test(text)) throw new Error(`${slug}: banned character`);
  if (v.metaTitle.length > 60) throw new Error(`${slug}: metaTitle ${v.metaTitle.length}`);
  if (v.metaDescription.length > 155) throw new Error(`${slug}: metaDescription ${v.metaDescription.length}`);
  data.variants[slug] = v;
}
writeFileSync(P, JSON.stringify(data, null, 2) + "\n");
console.log("added", Object.keys(NEW).length, "variants; total", Object.keys(data.variants).length);

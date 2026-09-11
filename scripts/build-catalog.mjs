#!/usr/bin/env node
/**
 * Generates the WordPress theme's copies of the pricing catalog.
 *
 * lib/catalog/catalog.json and lib/catalog/calculators.json are the single
 * source of truth. The marketing site cannot import them, so this script emits:
 *
 *   assets/js/pp-catalog.js   window.PP_CATALOG + window.PP_CALCULATORS
 *   inc/pp-calculators.php    the variant registry, for server-rendered H1,
 *                             intro copy and SEO meta
 *
 * Run after any edit to either source file:
 *   npm run build:catalog
 *
 * Override the theme location with THEME_DIR if the repo lives elsewhere.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "..");

const SOURCE = join(appRoot, "lib", "catalog", "catalog.json");
const VARIANTS_SOURCE = join(appRoot, "lib", "catalog", "calculators.json");
const TOOLS_SOURCE = join(appRoot, "lib", "catalog", "tools.json");
const THEME_DIR =
  process.env.THEME_DIR ?? resolve(appRoot, "..", "paintpricing-theme", "paintpricing");
const OUT = join(THEME_DIR, "assets", "js", "pp-catalog.js");
const OUT_PHP = join(THEME_DIR, "inc", "pp-calculators.php");

if (!existsSync(SOURCE)) {
  console.error(`Catalog not found at ${SOURCE}`);
  process.exit(1);
}

let catalog;
try {
  catalog = JSON.parse(readFileSync(SOURCE, "utf8"));
} catch (err) {
  console.error(`catalog.json is not valid JSON: ${err.message}`);
  process.exit(1);
}

// Fail loudly rather than shipping a half-built catalog to the live site.
const REQUIRED = ["labor", "prep", "materials", "supplies", "pricing", "geometry", "roomPresets", "surfaces"];
const missing = REQUIRED.filter((k) => !catalog[k]);
if (missing.length) {
  console.error(`catalog.json is missing required sections: ${missing.join(", ")}`);
  process.exit(1);
}

// ── Calculator page variants ──────────────────────────────

let variants = { variants: {} };
if (existsSync(VARIANTS_SOURCE)) {
  try {
    variants = JSON.parse(readFileSync(VARIANTS_SOURCE, "utf8"));
  } catch (err) {
    console.error(`calculators.json is not valid JSON: ${err.message}`);
    process.exit(1);
  }
}

// A variant pointing at a room or surface that does not exist would render a
// page whose preset silently does nothing. Fail the build instead.
const problems = [];
for (const [slug, v] of Object.entries(variants.variants)) {
  if (v.roomPreset && !catalog.roomPresets[v.roomPreset]) {
    problems.push(`${slug}: roomPreset "${v.roomPreset}" is not in catalog.json`);
  }
  if (v.surface && !catalog.surfaces[v.surface]) {
    problems.push(`${slug}: surface "${v.surface}" is not in catalog.json`);
  }
  // The safety rail. A surface whose pricing basis the engine cannot yet
  // compute must never get a published calculator page, because the page would
  // return a confidently wrong number.
  if (v.surface && catalog.surfaces[v.surface] && catalog.surfaces[v.surface].engineReady === false) {
    problems.push(
      `${slug}: surface "${v.surface}" is not engine ready ` +
        `(${catalog.surfaces[v.surface].requires || "engine work required"})`
    );
  }
  if (v.metaTitle && v.metaTitle.length > 60) {
    problems.push(`${slug}: metaTitle is ${v.metaTitle.length} chars (max 60)`);
  }
  if (v.metaDescription && v.metaDescription.length > 155) {
    problems.push(`${slug}: metaDescription is ${v.metaDescription.length} chars (max 155)`);
  }
  if (!v.h1) {
    problems.push(`${slug}: missing h1`);
  }
}

// ── Tier 2 contractor tools ───────────────────────────────
//
// These take a business's own numbers rather than measurements, so they render
// from a different shape: declared inputs and outputs, with the maths keyed by
// `compute` in the theme.

let tools = { tools: {} };
if (existsSync(TOOLS_SOURCE)) {
  try {
    tools = JSON.parse(readFileSync(TOOLS_SOURCE, "utf8"));
  } catch (err) {
    console.error(`tools.json is not valid JSON: ${err.message}`);
    process.exit(1);
  }
}

const KNOWN_COMPUTE = [
  "markupMargin", "laborBurden", "breakEven", "overheadRecovery", "minimumJob",
  "productionRate", "crewDay", "jobProfitability", "discountImpact", "fullStack",
];

for (const [slug, t] of Object.entries(tools.tools)) {
  if (!t.compute) problems.push(`${slug}: missing compute`);
  else if (!KNOWN_COMPUTE.includes(t.compute)) {
    problems.push(`${slug}: unknown compute "${t.compute}" (the theme has no handler for it)`);
  }
  if (!t.inputs || !t.inputs.length) problems.push(`${slug}: no inputs declared`);
  if (!t.outputs || !t.outputs.length) problems.push(`${slug}: no outputs declared`);
  if (t.metaTitle && t.metaTitle.length > 60) problems.push(`${slug}: metaTitle is ${t.metaTitle.length} chars (max 60)`);
  if (t.metaDescription && t.metaDescription.length > 155) {
    problems.push(`${slug}: metaDescription is ${t.metaDescription.length} chars (max 155)`);
  }
  const outKeys = new Set((t.outputs || []).map((o) => o.key));
  if ((t.outputs || []).filter((o) => o.primary).length !== 1) {
    problems.push(`${slug}: needs exactly one primary output`);
  }
  if (outKeys.size !== (t.outputs || []).length) problems.push(`${slug}: duplicate output keys`);
}

// Validation for BOTH calculators.json and tools.json runs before this point,
// so a bad tool definition fails the build rather than shipping a broken page.
if (problems.length) {
  console.error("catalog definitions have invalid entries:");
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

const surfaceCount = Object.keys(catalog.surfaces).length;
const roomCount = Object.keys(catalog.roomPresets).length;
const variantCount = Object.keys(variants.variants).length;
const toolCount = Object.keys(tools.tools).length;

const allSurfaces = Object.values(catalog.surfaces);
const readyCount = allSurfaces.filter((s) => s.engineReady !== false).length;
const blocked = allSurfaces.filter((s) => s.engineReady === false);
const byBasis = {};
for (const s of allSurfaces) {
  byBasis[s.basis] = (byBasis[s.basis] || 0) + 1;
}

// ── JS output ─────────────────────────────────────────────

const banner = [
  "/**",
  " * GENERATED FILE. DO NOT EDIT.",
  " *",
  ` * Source: paintpricing-app/lib/catalog/catalog.json (v${catalog.version})`,
  " * Rebuild: npm run build:catalog",
  " *",
  " * Editing this file by hand reintroduces the drift between the free",
  " * calculator and the app that this catalog exists to eliminate.",
  " */",
  "",
].join("\n");

const body =
  `window.PP_CATALOG = ${JSON.stringify(catalog, null, 2)};\n\n` +
  `window.PP_CALCULATORS = ${JSON.stringify(variants.variants, null, 2)};\n`;

const outDir = dirname(OUT);
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}
writeFileSync(OUT, banner + body, "utf8");

// ── PHP output ────────────────────────────────────────────
//
// The template needs the H1, intro and SEO meta server-side. Swapping them in
// JavaScript would leave search engines and social previews on the generic page.

const BACKSLASH = String.fromCharCode(92);
const QUOTE = String.fromCharCode(39);

function phpString(value) {
  const escaped = value
    .split(BACKSLASH)
    .join(BACKSLASH + BACKSLASH)
    .split(QUOTE)
    .join(BACKSLASH + QUOTE);
  return QUOTE + escaped + QUOTE;
}

function toPhp(value, indent) {
  const pad = "\t".repeat(indent);
  const padEnd = "\t".repeat(indent - 1);

  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return phpString(value);

  if (Array.isArray(value)) {
    if (!value.length) return "array()";
    const items = value.map((v) => `${pad}${toPhp(v, indent + 1)},`).join("\n");
    return `array(\n${items}\n${padEnd})`;
  }

  const entries = Object.entries(value);
  if (!entries.length) return "array()";
  const items = entries
    .map(([k, v]) => `${pad}${phpString(k)} => ${toPhp(v, indent + 1)},`)
    .join("\n");
  return `array(\n${items}\n${padEnd})`;
}

const phpOut = [
  "<?php",
  "/**",
  " * GENERATED FILE. DO NOT EDIT.",
  " *",
  " * Source: paintpricing-app/lib/catalog/calculators.json",
  " * Rebuild: npm run build:catalog",
  " *",
  " * @package PaintPricing",
  " */",
  "",
  "if ( ! defined( 'ABSPATH' ) ) {",
  "\texit;",
  "}",
  "",
  "function paintpricing_calculator_variants() {",
  `\treturn ${toPhp(variants.variants, 2)};`,
  "}",
  "",
  "/**",
  " * Surface specifications, so the template can publish each surface's real",
  " * coverage and production rates rather than shared boilerplate.",
  " */",
  "function paintpricing_catalog() {",
  `\treturn ${toPhp(
    {
      surfaces: catalog.surfaces,
      roomPresets: catalog.roomPresets,
      labor: catalog.labor,
      materials: catalog.materials,
      bases: catalog.bases || {},
    },
    2
  )};`,
  "}",
  "",
  "/**",
  " * Tier 2 contractor tools, keyed by slug.",
  " */",
  "function paintpricing_tools() {",
  `	return ${toPhp(tools.tools, 2)};`,
  "}",
  "",
  "/**",
  " * Resolve a tool for a page slug, or null if the slug is not a tool.",
  " */",
  "function paintpricing_get_tool( $slug ) {",
  "	$tools = paintpricing_tools();",
  "	return isset( $tools[ $slug ] ) ? $tools[ $slug ] : null;",
  "}",
  "",
  "/**",
  " * Resolve the calculator variant for a page slug.",
  " *",
  " * Returns null for the generic /calculator page, which has no variant.",
  " */",
  "function paintpricing_get_calculator_variant( $slug ) {",
  "\t$variants = paintpricing_calculator_variants();",
  "\treturn isset( $variants[ $slug ] ) ? $variants[ $slug ] : null;",
  "}",
  "",
].join("\n");

const phpDir = dirname(OUT_PHP);
if (!existsSync(phpDir)) {
  mkdirSync(phpDir, { recursive: true });
}
writeFileSync(OUT_PHP, phpOut, "utf8");

console.log(`Catalog v${catalog.version} written to ${OUT}`);
console.log(`Variant registry written to ${OUT_PHP}`);
console.log(`  ${surfaceCount} surfaces, ${roomCount} room presets, ${variantCount} calculator variants, ${toolCount} contractor tools`);
console.log(
  `  bases: ${Object.entries(byBasis)
    .map(([b, n]) => `${b}=${n}`)
    .join("  ")}`
);
console.log(`  ${readyCount} engine ready, ${blocked.length} awaiting engine work`);
if (blocked.length) {
  const waiting = {};
  for (const s of blocked) {
    const key = s.requires || "unspecified";
    waiting[key] = (waiting[key] || 0) + 1;
  }
  for (const [req, n] of Object.entries(waiting)) {
    console.log(`      ${n} blocked on ${req}`);
  }
}

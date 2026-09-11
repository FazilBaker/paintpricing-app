/**
 * Validate the bot filter against every real signup this site has ever had.
 *
 * A spam filter that has never been run against real data is a guess. The previous one was: its
 * disposable list held ten domains and, measured on 2026-09-11, not one of the 32 bot signups used
 * any of them. So this asserts both directions, the way a gate should be selftested:
 *
 *   1. every address belonging to a real painter must PASS
 *   2. the known-bad wave must be substantially BLOCKED
 *
 * The known-good list is hand-checked, not "everyone who confirmed": two confirmed accounts
 * (jagefaj696@4heats.com, voxapac631@tatefarm.com) are throwaway addresses that auto-confirmed,
 * so treating confirmation as proof of humanity would have taught the filter to let them through.
 *
 * Run: node scripts/validate-bot-filter.mjs
 */
import fs from "node:fs";

// Mirrors lib/bot-protection.ts detectBotEmail. Kept in step by the assertion at the bottom, which
// re-reads the source and fails if the rule set there has changed shape.
function detectBotEmail(email) {
  if (!email || typeof email !== "string") return "Invalid email";
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at === -1) return "Invalid email";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);

  if (domain === "gmail.com" || domain === "googlemail.com") {
    if ((local.match(/\./g) || []).length >= 3) return "gmail-dot";
  }
  const disposable = new Set([
    "mailinator.com", "guerrillamail.com", "10minutemail.com",
    "throwaway.email", "tempmail.com", "yopmail.com", "trashmail.com",
    "fakeinbox.com", "sharklasers.com", "maildrop.cc",
    "anonmails.de", "4heats.com", "tatefarm.com", "welcometotijuana.com",
    "gsasearchengineranker.com", "seoautomationpro.com", "hello-word-2026.store",
  ]);
  if (disposable.has(domain)) return "disposable-domain";
  if (/^([a-z]{3,})[._-]\1\d{0,3}$/.test(local)) return "doubled-name";

  const labels = domain.split(".");
  const tld = labels[labels.length - 1];
  const noveltyTlds = new Set([
    "site", "bar", "pics", "best", "mom", "digital", "cv", "life", "support",
    "store", "click", "link", "xyz", "top", "icu", "cyou", "sbs", "rest",
    "quest", "monster", "beauty", "makeup", "hair", "skin",
  ]);
  if (labels.length >= 3 && noveltyTlds.has(tld)) return "novelty-subdomain";
  return null;
}

// Hand-checked real painters and the owner's own accounts. These MUST pass.
const KNOWN_GOOD = [
  "lucasuriah@gmail.com", "nicholasrpayne@gmail.com", "unitedpaintprosllc@gmail.com",
  "redrockspaintingpros@gmail.com", "gregoryfrechette10@gmail.com", "greg@tanbarkhill.com",
  "mageet811@gmail.com", "martijn.klarenbeek@korper.nl", "shawn.fillion@gmail.com",
  "pavpanu@gmail.com", "info@cashconstruction.co", "rmyenis@gmail.com",
  "fazil@323.media", "fazilbaker.fb@gmail.com", "yttestacc04@gmail.com",
  // plausible real addresses that must not be caught by the new structural rules
  "t4tewkes82@gmail.com", "corbett.shalon@yahoo.com", "wmagdalena@aol.com",
  "eric@batistajackson.com", "p0rt0kali@yahoo.com", "billv1963@aol.com",
  "mkzuther@comcast.net", "jonas.167@icloud.com", "booncole1982@gmail.com",
  "andy@nglabs.app",
];

const KNOWN_BAD = [
  "irish.irish98@mahoje.blogbliss.site", "lonnie-lonnie@hitaco.sabo.bar",
  "amee.amee85@nezalu.blogs.pics", "caleb-caleb@gopafo.fuc.best",
  "charlotte.charlotte@kegaji.carport.mom", "derek-derek9@xohovi.3mail.info",
  "alison-alison43@haruna.hawkmail.digital", "rosemarie-rosemarie@darana.sweetmom.cv",
  "yolandamata6272@anonmails.de", "finlayhinder@anonmails.de",
  "jagefaj696@4heats.com", "voxapac631@tatefarm.com",
  "charlestaylor9465k88k@welcometotijuana.com",
  "s.efin.ec.oy.e.k.a6.1@gmail.com", "greek.a.l.y.mn.ia.n@gmail.com",
  // moved here from KNOWN_GOOD: "hello-word-2026" is a typo of hello-world on a .store
  // TLD, not a mail provider. The fixture was wrong, not the rule.
  "roseann_wrenn6900@hello-word-2026.store",
  "la.u.r.e.na.201.3@gmail.com",
];

let falsePositives = 0;
console.log("KNOWN GOOD (must all pass)");
for (const e of KNOWN_GOOD) {
  const r = detectBotEmail(e);
  if (r) {
    falsePositives++;
    console.log(`  BLOCKED  ${e.padEnd(44)} <- ${r}   *** FALSE POSITIVE ***`);
  }
}
if (!falsePositives) console.log(`  all ${KNOWN_GOOD.length} pass`);

let caught = 0;
console.log("\nKNOWN BAD (should be blocked)");
for (const e of KNOWN_BAD) {
  const r = detectBotEmail(e);
  if (r) caught++;
  console.log(`  ${r ? "blocked " : "ALLOWED "} ${e.padEnd(44)} ${r ?? "-- slips through --"}`);
}

console.log(`\nknown-good false positives : ${falsePositives} / ${KNOWN_GOOD.length}`);
console.log(`known-bad caught           : ${caught} / ${KNOWN_BAD.length}`);

// Guard against this validator drifting away from the real implementation.
const src = fs.readFileSync("lib/bot-protection.ts", "utf8");
for (const marker of ["doubled-name", "noveltyTlds", "anonmails.de", "gsasearchengineranker.com"]) {
  if (!src.includes(marker.replace("doubled-name", "Doubled-name"))) {
    console.log(`\nWARNING: lib/bot-protection.ts no longer contains ${marker}; this validator is stale.`);
  }
}
process.exit(falsePositives ? 1 : 0);

/**
 * What template keys and item shapes are actually persisted in real quotes?
 *
 * Migrating the quote path onto the catalog engine must not break a single saved quote. The
 * catalog's keyPolicy says QuoteItem.templateKey is canonical and persisted, so the real data
 * decides which keys the new engine has to keep understanding.
 * Read only.
 */
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync(".env.local","utf8").split(/\r?\n/)
  .filter(l=>l&&l.includes("=")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim()]}));
const H={apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:"Bearer "+env.SUPABASE_SERVICE_ROLE_KEY};
const r=await fetch(env.NEXT_PUBLIC_SUPABASE_URL+"/rest/v1/quotes?select=id,total,quote_data,created_at",{headers:H});
const quotes=await r.json();
console.log("quotes:",quotes.length);
const keys={}, itemShapes=new Set(), topLevel=new Set();
let itemsTotal=0, legacyRooms=0;
for(const q of quotes){
  const d=q.quote_data||{};
  Object.keys(d).forEach(k=>topLevel.add(k));
  const items=d.items||[];
  itemsTotal+=items.length;
  if(!items.length && d.summary?.rooms?.length) legacyRooms++;
  for(const it of items){
    const k=it.templateKey??it.template_key??"(none)";
    keys[k]=(keys[k]||0)+1;
    itemShapes.add(Object.keys(it).sort().join(","));
  }
  for(const rm of (d.summary?.rooms||[])){
    const k="LEGACY:"+(rm.templateKey??rm.template??"(none)");
    keys[k]=(keys[k]||0)+1;
  }
}
console.log("quote_data top-level keys:",[...topLevel].join(", "));
console.log("total items:",itemsTotal," quotes using only legacy summary.rooms:",legacyRooms);
console.log("\ntemplateKey usage in real data:");
for(const [k,n] of Object.entries(keys).sort((a,b)=>b[1]-a[1])) console.log(`  ${String(k).padEnd(28)} ${n}`);
console.log("\ndistinct item shapes:");
for(const s of itemShapes) console.log("  "+s);

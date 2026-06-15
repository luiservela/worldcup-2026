// Daily job: read today's Polymarket win-probabilities and append a dated
// snapshot to the owned archive (history.json + history.js). Append-only —
// existing days are never dropped, so the timeline survives Polymarket.
import { readFileSync, existsSync } from "node:fs";
import { CODES, fetchWorldCupEvent, saveHistory } from "./codes.mjs";

const ev = await fetchWorldCupEvent();
const p = {};
for(const m of ev.markets || []){
  const code = CODES[(m.groupItemTitle || "").trim()];
  if(!code || !m.outcomePrices) continue;
  let yes; try { yes = parseFloat(JSON.parse(m.outcomePrices)[0]); } catch { continue; }
  if(Number.isFinite(yes)) p[code] = Math.round(yes * 1e4) / 1e4;
}
// Integrity guards — never let a bad/partial API response corrupt the append-only
// archive. (Only today's snapshot is ever rewritten; past days are untouched.)
const codes = Object.keys(p);
if(codes.length < 30){ console.error("only", codes.length, "teams resolved — aborting"); process.exit(1); }
const total = codes.reduce((s, c) => s + p[c], 0);   // YES prices sum to ~1 (+ overround) all tournament long
if(!(total > 0.6 && total < 1.6)){ console.error("implausible probability total", total.toFixed(3), "— aborting"); process.exit(1); }

const date = new Date().toISOString().slice(0, 10);
const file = new URL("../history.json", import.meta.url);
let hist = { updated: "", snapshots: [] };
if(existsSync(file)) hist = JSON.parse(readFileSync(file, "utf8"));
hist.snapshots = (hist.snapshots || []).filter(s => s.date !== date);   // upsert today
hist.snapshots.push({ date, p });
hist.snapshots.sort((a, b) => a.date.localeCompare(b.date));
hist.updated = new Date().toISOString();
saveHistory(hist);
console.log("snapshot", date, "· teams", Object.keys(p).length, "· total days", hist.snapshots.length);

// One-time backfill: pull Polymarket's full daily price tape for every team and
// seed the owned archive, so we already own the timeline from the tournament's
// start. After this, the daily odds-snapshot job just appends new days.
import { CODES, fetchWorldCupEvent, saveHistory } from "./codes.mjs";

const FROM = "2026-06-01";   // keep the tournament era (the chart starts 11 Jun)
const ev = await fetchWorldCupEvent();
const tokens = {};
for(const m of ev.markets || []){
  const code = CODES[(m.groupItemTitle || "").trim()];
  if(!code) continue;
  try { tokens[code] = JSON.parse(m.clobTokenIds)[0]; } catch {}
}
const codes = Object.keys(tokens);
const series = {};
for(const c of codes){
  try {
    const r = await fetch(`https://clob.polymarket.com/prices-history?market=${tokens[c]}&interval=all&fidelity=1440`);
    const h = (await r.json()).history || [];
    series[c] = h.map(pt => ({ d: new Date(pt.t * 1000).toISOString().slice(0, 10), p: Math.round((+pt.p) * 1e4) / 1e4 }));
  } catch(e){ series[c] = []; console.error("skip", c, String(e)); }
  await new Promise(r => setTimeout(r, 120));   // be gentle on the API
}
const dates = [...new Set(Object.values(series).flat().map(x => x.d))].filter(d => d >= FROM).sort();
const snapshots = dates.map(date => {
  const p = {};
  for(const c of codes){ let v = null; for(const pt of series[c]){ if(pt.d <= date) v = pt.p; else break; } if(v != null) p[c] = v; }
  return { date, p };
});
saveHistory({ updated: new Date().toISOString(), snapshots });
console.log("backfilled", snapshots.length, "days,", codes.length, "teams");

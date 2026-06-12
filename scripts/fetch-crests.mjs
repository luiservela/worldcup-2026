// Download the 48 team crests into the repo (assets/crests/<CODE>.png) and repoint
// TEAM_IMG in images.js to those local paths — so crests are self-owned and don't
// depend on TheSportsDB's CDN. Stadium photos stay on (durable) Wikimedia.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const src = readFileSync(new URL("images.js", root), "utf8");
const STADIUM_IMG = (new Function(src + "; return STADIUM_IMG;"))();
const TEAM_IMG    = (new Function(src + "; return TEAM_IMG;"))();

mkdirSync(new URL("assets/crests/", root), { recursive: true });
let saved = 0;
for(const code of Object.keys(TEAM_IMG)){
  const u = TEAM_IMG[code];
  if(!/^https?:/.test(u)) { saved++; continue; }   // already local
  try{
    const r = await fetch(u, { headers:{ "User-Agent":"wc26-hub/1.0" } });
    if(!r.ok){ console.error("skip", code, r.status); continue; }
    const buf = Buffer.from(await r.arrayBuffer());
    writeFileSync(new URL(`assets/crests/${code}.png`, root), buf);
    TEAM_IMG[code] = `assets/crests/${code}.png`;
    saved++;
  }catch(e){ console.error("fail", code, String(e)); }
  await new Promise(s=>setTimeout(s,80));
}

writeFileSync(new URL("images.js", root),
  "/* Stadium photos: Wikimedia Commons (hotlinked, durable source).\n" +
  "   Team crests: self-hosted in assets/crests/ (originally from TheSportsDB). */\n" +
  "const STADIUM_IMG=" + JSON.stringify(STADIUM_IMG) + ";\n\n" +
  "const TEAM_IMG=" + JSON.stringify(TEAM_IMG) + ";\n");
console.error("crests saved:", saved + "/" + Object.keys(TEAM_IMG).length);

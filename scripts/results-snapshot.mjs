// Re-scrapes Wikipedia's rendered "2026 FIFA World Cup" fixtures and regenerates
// schedule.js: 72 group matches (with any FINAL scores baked in), per-match UTC
// kickoffs + venues, and the 32 knockout matches (teams resolved + scores as the
// bracket fills). Strictly validated — aborts rather than write a broken file, so
// results become self-owned and survive any live feed going away.
import { writeFileSync } from "node:fs";

const NAMECODE = {
  "Mexico":"MEX","South Africa":"RSA","South Korea":"KOR","Korea Republic":"KOR","Czech Republic":"CZE","Czechia":"CZE",
  "Canada":"CAN","Bosnia and Herzegovina":"BIH","Bosnia-Herzegovina":"BIH","Qatar":"QAT","Switzerland":"SUI",
  "Brazil":"BRA","Morocco":"MAR","Haiti":"HAI","Scotland":"SCO","United States":"USA","Paraguay":"PAR","Australia":"AUS",
  "Turkey":"TUR","Türkiye":"TUR","Germany":"GER","Curaçao":"CUW","Curacao":"CUW","Ivory Coast":"CIV","Côte d'Ivoire":"CIV",
  "Ecuador":"ECU","Netherlands":"NED","Japan":"JPN","Sweden":"SWE","Tunisia":"TUN","Belgium":"BEL","Egypt":"EGY","Iran":"IRN",
  "New Zealand":"NZL","Spain":"ESP","Cape Verde":"CPV","Saudi Arabia":"KSA","Uruguay":"URU","France":"FRA","Senegal":"SEN",
  "Iraq":"IRQ","Norway":"NOR","Algeria":"ALG","Argentina":"ARG","Austria":"AUT","Jordan":"JOR","Colombia":"COL",
  "DR Congo":"COD","Portugal":"POR","Uzbekistan":"UZB","Croatia":"CRO","England":"ENG","Ghana":"GHA","Panama":"PAN",
};
// Venue → stadium id. Matched tolerantly against each venue's official name,
// its World-Cup-branded name, and its city (normalized), so a Wikipedia label
// change ("NRG Stadium" ↔ "Houston Stadium") can't break the resolve. A miss is
// NON-FATAL: the venue id only links to the stadium page (the app re-derives it
// from the venue string anyway), so it must never block committing fresh scores.
const STAD = [
  ["estadio-azteca","Estadio Azteca","Estadio Ciudad de México","Mexico City","America/Mexico_City"],
  ["estadio-akron","Estadio Akron","Estadio Guadalajara","Guadalajara","America/Mexico_City"],
  ["estadio-bbva","Estadio BBVA","Estadio Monterrey","Monterrey","America/Monterrey"],
  ["bmo-field","BMO Field","Toronto Stadium","Toronto","America/Toronto"],
  ["bc-place","BC Place","Vancouver Stadium","Vancouver","America/Vancouver"],
  ["mercedes-benz-stadium","Mercedes-Benz Stadium","Atlanta Stadium","Atlanta","America/New_York"],
  ["gillette-stadium","Gillette Stadium","Boston Stadium","Foxborough","America/New_York"],
  ["att-stadium","AT&T Stadium","Dallas Stadium","Arlington","America/Chicago"],
  ["nrg-stadium","NRG Stadium","Houston Stadium","Houston","America/Chicago"],
  ["arrowhead-stadium","Arrowhead Stadium","Kansas City Stadium","Kansas City","America/Chicago"],
  ["sofi-stadium","SoFi Stadium","Los Angeles Stadium","Inglewood","America/Los_Angeles"],
  ["hard-rock-stadium","Hard Rock Stadium","Miami Stadium","Miami Gardens","America/New_York"],
  ["metlife-stadium","MetLife Stadium","New York New Jersey Stadium","East Rutherford","America/New_York"],
  ["lincoln-financial-field","Lincoln Financial Field","Philadelphia Stadium","Philadelphia","America/New_York"],
  ["levis-stadium","Levi's Stadium","San Francisco Bay Area Stadium","Santa Clara","America/Los_Angeles"],
  ["lumen-field","Lumen Field","Seattle Stadium","Seattle","America/Los_Angeles"],
];
const TZ_BY_VID = Object.fromEntries(STAD.map(([id,,,,tz])=>[id,tz]));
const vnorm = s => (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim();
function vidOf(venue){
  const v = vnorm(venue); if(!v) return "";
  for(const [id,name,wc] of STAD){                              // official or WC-branded name
    for(const cand of [name,wc]){ const c=vnorm(cand); if(c && (v===c || v.includes(c) || c.includes(v))) return id; }
  }
  for(const [id,,,city] of STAD){ const c=vnorm(city); if(c && v.includes(c)) return id; }   // city fallback
  return "";
}
// Given a wall-clock time in an IANA zone, find the UTC instant that displays as that
// wall clock in that zone (DST-aware — resolves the zone's actual offset for that date).
function localToUTC(y,mo,d,hh,mm,tz){
  const guess = Date.UTC(y,mo-1,d,hh,mm);
  const dtf = new Intl.DateTimeFormat("en-US",{timeZone:tz,hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"});
  const p = Object.fromEntries(dtf.formatToParts(new Date(guess)).map(x=>[x.type,x.value]));
  const wall = Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
  return new Date(2*guess - wall);
}
const DAY = 86400000;
const strip = s => (s||"").replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim();
const decode = s => (s||"").replace(/&amp;/g,"&").replace(/&#160;/g," ").replace(/&#0?39;/g,"'").replace(/&#8217;/g,"’").replace(/&quot;/g,'"');
const firstLink = c => { const m=/<a[^>]*>(.*?)<\/a>/s.exec(c); return decode(strip(m?m[1]:c)); };

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// Fetching all 12 group sub-articles back-to-back can trip Wikipedia's rate
// limiter (429) — retry with backoff rather than aborting the whole run.
async function fetchWikiHtml(page, tries=6){
  const url = "https://en.wikipedia.org/w/api.php?action=parse&page="+encodeURIComponent(page)+"&prop=text&format=json&origin=*";
  for(let i=0;i<tries;i++){
    const res = await fetch(url, { headers:{ "User-Agent":"wc26-hub-results/1.0" } });
    if(res.status===429){ await sleep(2000*2**i); continue; }
    if(!res.ok){ console.error("wiki http "+res.status+" for "+page); process.exit(1); }
    const j = await res.json();
    if(j.error) return null;
    return j.parse.text["*"];
  }
  console.error("wiki http 429 for "+page+" (exhausted retries)"); process.exit(1);
}
// Parses every `footballbox` match box out of a page's rendered HTML. `stage`
// is read from the box itself when present (main-article knockout boxes carry
// a "2026 FIFA World Cup <stage>" title); callers that already know the stage
// (per-group sub-articles) pass `forcedStage` instead.
function parseBoxes(html, forcedStage){
  const out=[];
  for(const b0 of html.split('class="footballbox"').slice(1)){
    // No artificial cap: split() already bounds b0 to the next footballbox (or end
    // of document for the last one) — a penalty-shootout box's long kicker list can
    // otherwise push the venue past a fixed-size window.
    const b = b0;
    const md=/class="bday[^"]*">(\d{4})-(\d{2})-(\d{2})<\/span>/.exec(b);
    const mt=/class="ftime">\s*(\d{1,2}):(\d{2})(?:&#160;|\s)*([ap])\.m\./.exec(b);
    const mn=/class="ftime">\s*(\d{1,2}):(\d{2})(?:&#160;|\s)*(noon|midnight)/.exec(b);
    const mo=/\/wiki\/UTC(%E2%88%92|%2B)(\d{2}):?(\d{2})/.exec(b);
    const mh=/class="fhome"[^>]*>(.*?)<\/th>/s.exec(b);
    const ma=/class="faway"[^>]*>(.*?)<\/th>/s.exec(b);
    const ms=/class="fscore"[^>]*>(.*?)<\/th>/s.exec(b);
    if(!(mh&&ma&&md)) continue;
    const home=firstLink(mh[1]), away=firstLink(ma[1]);
    const scell=ms?strip(ms[1]):"";
    const mstage=/class="fscore"[^>]*>.*?title="2026 FIFA World Cup ([^"]+)"/s.exec(b);
    const stage=forcedStage||(mstage?decode(mstage[1]):"");
    const mv=/itemprop="name address">(.*?)<\/span>/s.exec(b);
    let venue=""; if(mv){ const ln=mv[1].match(/<a[^>]*>(.*?)<\/a>/gs); if(ln) venue=decode(strip(ln[0])); }
    let utc=null;
    if(md && (mt||mn)){
      let hh,mm;
      if(mt){ hh=(+mt[1])%12; mm=+mt[2]; if(mt[3]==="p") hh+=12; }
      else { hh=mn[3]==="noon"?12:0; mm=+mn[2]; }
      if(mo){
        const sign=mo[1]==="%E2%88%92"?-1:1, oh=+mo[2], om=+mo[3];
        const loc=Date.UTC(+md[1],+md[2]-1,+md[3],hh,mm);
        utc=new Date(loc - sign*(oh*3600000+om*60000)).toISOString().replace(/\.\d+Z$/,"Z");
      } else {
        // Wikipedia omits the per-box UTC-offset link for simultaneous final-matchday
        // games — derive the instant from the venue's known IANA timezone instead.
        const tz=TZ_BY_VID[vidOf(venue)];
        if(tz) utc=localToUTC(+md[1],+md[2],+md[3],hh,mm,tz).toISOString().replace(/\.\d+Z$/,"Z");
      }
    }
    const hc=NAMECODE[home], ac=NAMECODE[away];
    const sc=/(\d+)\s*[–-]\s*(\d+)/.exec(scell);
    const hs=sc?+sc[1]:null, as=sc?+sc[2]:null;
    out.push({utc,hc,ac,home,away,venue,vid:vidOf(venue),stage,hs,as});
  }
  return out;
}

const html = await fetchWikiHtml("2026 FIFA World Cup");
const group=[], knock=[];
for(const rec of parseBoxes(html)){
  (rec.hc&&rec.ac&&/^Group /.test(rec.stage) ? group : knock).push(rec);
}
// Once the group stage finishes, Wikipedia moves each group's 6 fixture boxes
// off the main article into its own "2026 FIFA World Cup Group <X>" sub-article
// (the main article keeps only standings tables). If the main-article scrape
// came up short, backfill any missing groups from their sub-articles.
const GROUP_LETTERS=["A","B","C","D","E","F","G","H","I","J","K","L"];
if(group.length<72){
  const counts={};
  for(const m of group){ const l=m.stage.replace(/^Group /,""); counts[l]=(counts[l]||0)+1; }
  const missing=GROUP_LETTERS.filter(l=>(counts[l]||0)<6);
  const missingSet=new Set(missing);
  const kept=group.filter(m=>!missingSet.has(m.stage.replace(/^Group /,"")));
  group.length=0; group.push(...kept);
  for(const letter of missing){
    const ghtml=await fetchWikiHtml("2026 FIFA World Cup Group "+letter);
    if(ghtml) group.push(...parseBoxes(ghtml,"Group "+letter));
    await sleep(1500);
  }
}

// ---- validate before writing ----
const fail=m=>{ console.error("ABORT:",m); process.exit(1); };
if(group.length!==72) fail(`expected 72 group matches, got ${group.length}`);
if(knock.length!==32) fail(`expected 32 knockout matches, got ${knock.length}`);
if([...group,...knock].some(m=>!m.utc)) fail("a match is missing a UTC kickoff");
// Venue id is non-fatal (cosmetic link only) — warn but never block fresh scores.
const noVid=[...group,...knock].filter(m=>!m.vid);
if(noVid.length) console.warn(`WARN: ${noVid.length} match(es) without a resolved venue id — kept; the app re-derives from the venue name. Unmatched: ${[...new Set(noVid.map(m=>m.venue||"(empty)"))].join(" | ")}`);

group.sort((a,b)=>a.utc.localeCompare(b.utc));
knock.sort((a,b)=>a.utc.localeCompare(b.utc));
const ROUNDS=[...Array(16).fill("Round of 32"),...Array(8).fill("Round of 16"),...Array(4).fill("Quarter-final"),"Semi-final","Semi-final","Third place","Final"];
knock.forEach((m,i)=>m.round=ROUNDS[i]||"Knockout");

// ---- emit schedule.js (same shape the app expects; KNOCKOUT gains hc/ac/hs/as) ----
const J=s=>JSON.stringify(s);
const mrows=group.map(m=>`[${J(m.hc)},${J(m.ac)},${m.hs??"null"},${m.as??"null"},"${m.hs!=null?"fin":"up"}",${J(m.stage)},"",${J(m.venue)},""]`);
const fix=group.map(m=>`${J(m.hc+"-"+m.ac)}:[${J(m.utc)},${J(m.venue)}]`);
const krows=knock.map(m=>`{utc:${J(m.utc)},round:${J(m.round)},vid:${J(m.vid)},venue:${J(m.venue)},home:${J(m.home)},away:${J(m.away)},hc:${m.hc?J(m.hc):"null"},ac:${m.ac?J(m.ac):"null"},hs:${m.hs??"null"},as:${m.as??"null"}}`);
const out =
`/* Full 104-match schedule — auto-generated from Wikipedia's rendered fixtures by
   .github/workflows/results-snapshot.yml. 72 group matches (codes + final scores)
   + 32 knockout matches (teams + scores resolved as the bracket fills). UTC
   kickoffs computed from each venue's local time + offset. Self-owned: survives
   any live feed going away. Format: MATCHES=[hc,ac,hs,as,status,stage,"",venue,""]. */
const MATCHES=[
${mrows.join(",\n")}
];

const FIX={${fix.join(",")}};

const KNOCKOUT=[
${krows.join(",\n")}
];
`;
writeFileSync(new URL("../schedule.js", import.meta.url), out);
const played=[...group,...knock].filter(m=>m.hs!=null).length;
const resolved=knock.filter(m=>m.hc&&m.ac).length;
console.log(`schedule.js written · group 72, knockout 32 · played ${played}/104 · knockout teams resolved ${resolved}/32`);

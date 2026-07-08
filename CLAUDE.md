# CLAUDE.md — agent guide

Orientation for AI agents (and humans) working on this repo. Read this first.

## What this is
A single-page **FIFA World Cup 2026 hub**, deployed as a static site on GitHub Pages.
Its hero is an **hourly win-probability stacked-area** chart (tartan-woven fills);
it also has Matches (each linking to a **per-match page** with Polymarket odds), a
**circular knockout Bracket**, Groups and Teams pages with detail views.

- **Live:** https://luiservela.github.io/worldcup-2026/
- **No build step, no framework, no `package.json`, no `node_modules`.** Node is used
  only to *run the data scripts*; the site itself is plain HTML/CSS/JS.

## Architecture
- **`index.html` is the entire app** (~130 KB): HTML + a big inline `<style>` + a big
  inline `<script>`. Edit it directly.
- It's a **hash-routed SPA**. `route()` reads `location.hash` and shows one
  `.view[data-view=…]` section. Views: `odds` (landing chart), `matches` +
  `match/<id>`, `bracket`, `groups`, `teams` + `team/<CODE>`.
  `document.body[data-view]` drives page-specific CSS (e.g. full-bleed Odds page).
- **Match ids** (shared by the router and `match-odds.js`): group games `"HC-AC"`
  (the `FIX` key), knockout games `"K<matchNumber>"` where number = 73 + index into
  `KNOCKOUT` (chronological order = official FIFA numbering 73–104).
- **Match pages** (`renderMatchPage`): team A left / team B right (crest, group
  position, form, title chance, fixtures), centre-top big number — match **odds**
  (upcoming, from `MATCH_ODDS` with a title-odds fallback), **score** (finished),
  or both (live).
- **Bracket** (`renderBracket`): the knockout stage as a radial SVG net (1200
  viewBox, full-viewport height). Each MATCH is one **tangent-rotated scorebox** —
  `[crest] score/odds [crest]`, crest `<image>`s kept unrotated — on its round's
  ring (R32 545 → SF 165 → final at the centre; crests 56→96px). Wires are
  **polar-only** (radial → mid-radius arc → radial): both contestants' wires run
  into a box, ONE gold wire (the winner's) leaves it; losers dim, the champion's
  crest gets the gold ring in the centre box. The tree is derived per side:
  resolved teams matched to the previous round, else the "Winner/Loser Match N"
  labels. Every box links to its match page (native `<title>` hover detail).
  Layout margins are tight (~4px worst case) — if you resize rings/crests/fonts,
  re-verify with a SAT rotated-rect overlap test (see the session harness in
  memory: `tune.mjs`).
- **Data is loaded as globals** via `<script src>` at the **end of `<body>`**, right
  before the inline app script (moved out of `<head>` so first paint doesn't wait for
  them). Plotly is the only external lib (CDN) — the **basic** bundle, loaded with
  `defer`; `window.__plotlyReady` upgrades the CSS fallback chart when it arrives.
- **PWA:** `manifest.webmanifest` + `sw.js` (network-first same-origin, cache-first
  CDN, but the live-score host `site.api.espn.com` is never cached) make the site
  installable and offline-capable. On phones (≤720px) the nav becomes a fixed
  bottom tab bar. Bump `VER` in `sw.js` to flush every client's cache.
- **Live score overlay:** committed `schedule.js` is the durable record; on top of
  it a fail-safe client overlay fetches the current score from ESPN's CORS-open,
  key-less soccer scoreboard during/just-after matches (`syncLiveScores` →
  `applyLiveScores`, mutating MATCHES/KNOCKOUT, status from ESPN's in-progress/final
  state). Any network/CORS/shape problem is swallowed and committed data stands.
- **Conventions inside index.html:** every flag links to `#/team/<CODE>` (`flagLink`);
  every player card links to `#/player/<id>` (`playerCard`); `.lnk`/`teamLink`/
  `stadiumLink`/`groupLink` make mentions navigable. Match times render in the
  **viewer's** timezone via `Intl` (`fmtZone` + `LOCAL_TZ`/`TZ_BADGE`); stadium pages
  use the stadium's own tz.

- **Win-probability charts (Plotly).** Hero (`renderForecast`) = an **hourly stacked
  area** from `odds-hourly.js`, normalized to 100% over the *selected* teams (presets
  top3/5/10/all + legend), x-axis spanning the whole tournament so the future is empty
  ahead of the latest data; circular crest badges (`placeCrests`, HTML overlay in
  `#fc-crests`, positioned off Plotly's `_fullLayout._size`, fixed sizes). Top-N
  presets rank from the **latest hourly column** (`fcRankedCodes` → `areaSeries`) —
  never from the daily archive, which can be up to 24h stale and once kept an
  eliminated team in the Top 5. The fill is fixed to **Tartan (crest)**
  (`barMarker`/`tartanMarker`; a two-colour `fillpattern` weave whose *shape* also
  varies per team — `TARTAN_SHAPES`), and match markers are always on (`FC_MATCHES`:
  dimmed tartans, a black band-height line + the opponent's crest at each played
  match of the shown teams, from `event-history.js`). There is no ⚙️ Options button
  anymore. 📤 **Share** exports a 1200×630 PNG via `Plotly.toImage` (download fallback
  if `navigator.share` is unavailable). Team pages have a **"Road to the title"**
  line+markers chart (`renderTeamTitleChart`): a Pre reference point + that team's
  matches (group fixtures known up front show as flag ticks).

## Files
### Hand-edited
- **`index.html`** — the whole app. The only file you normally edit by hand.
- **`sw.js`** — service worker (bump `VER` when changing caching behaviour),
  **`manifest.webmanifest`** — PWA manifest.
- **`README.md`**, **`CLAUDE.md`** — docs.

### Generated data (DON'T hand-edit — regenerate with the scripts)
Loaded as globals via `<script src>` at the **end of `<body>`**:
| File | Global(s) | What | Generated by |
|---|---|---|---|
| `schedule.js` | `MATCHES` (72 group), `FIX` (UTC kickoff+venue), `KNOCKOUT` (32) | full 104-match schedule, scores + resolved knockout teams | `scripts/results-snapshot.mjs` (Wikipedia) |
| `images.js` | `TEAM_IMG` (48) | crest paths (local) | `scripts/fetch-crests.mjs` |
| `history.js` / `history.json` | `HISTORY` `{updated,snapshots:[{date,p:{code:price}}]}` | daily win-probability archive (movers, fallback) | `scripts/odds-snapshot.mjs` (+ `backfill-history.mjs`) |
| `odds-hourly.js` / `.json` | `ODDS_HOURLY` `{updated,times:[ISO],p:{code:[winProb…]}}` | **hourly** win-prob tape → the hero stacked area | `scripts/odds-hourly.mjs` (Polymarket `fidelity=60`) |
| `event-history.js` / `.json` | `EVENT_HISTORY` `{updated,slots:[{t,utc,phase,matches:[{hc,ac,hs,as}],p:{code}}]}` | win-probs sampled at each match's final whistle → team road-line + hero match markers | `scripts/event-history.mjs` (Polymarket + schedule.js) |
| `match-odds.js` / `.json` | `MATCH_ODDS` `{updated,m:{matchId:{h,d,a,t}}}` | per-match win/draw/win odds (90-min result) → match pages + bracket pills | `scripts/match-odds.mjs` (Polymarket match markets, series `soccer-fifwc`) |
| `flag-colors.js` / `.json` | `FLAG_COLOR` `{code:[{h,s,l},{h,s,l}]}` | each flag's two main colours (legacy "Tartan (flag)" data — still loaded) | `scripts/flag-colors.py` (Pillow, flagcdn — one-off) |
| `assets/crests/<CODE>.png` (48) | — | self-hosted team crests | `scripts/fetch-crests.mjs` |
| `assets/og.png` | — (referenced by the `og:image`/`twitter:image` meta tags) | 1200×630 social-share card drawn from the odds archive | `scripts/og-image.py` (Pillow) |
| `assets/icon-*.png` (4) | — (manifest + apple-touch-icon) | PWA/home-screen icons | `scripts/app-icons.py` (Pillow) |

The app also has small **baked-in** literals inside `index.html`: `T` (48 teams →
`[name,flag,group,confederation]`), `GROUPS`, `STADIUMS` (16 venues w/ lat/lng + IANA
tz), `SEED`/`TOKENS` (Polymarket fallback snapshot + token ids), `FEATURE_COLORS`.

### Scripts (`scripts/*.mjs`, Node 18+, run e.g. `node scripts/odds-snapshot.mjs`)
- **`codes.mjs`** — shared: `CODES` (Polymarket/Wikipedia name → 3-letter code),
  `fetchWorldCupEvent()`, `saveHistory()` (writes history.json + history.js).
- **`odds-snapshot.mjs`** — append today's Polymarket odds to the daily archive (append-only).
- **`odds-hourly.mjs`** — resample Polymarket's hourly price history onto a regular grid → `odds-hourly.js` (the hero stacked area).
- **`event-history.mjs`** — sample each team's Polymarket price at every match's final whistle (times from `schedule.js`) → `event-history.js`.
- **`match-odds.mjs`** — snapshot every OPEN Polymarket match market (series `soccer-fifwc`,
  events `fifwc-<abbr>-<abbr>-<date>`, matched to our schedule by UTC kickoff + team
  names) → `match-odds.js`. Closed events keep their last open-market snapshot.
- **`backfill-history.mjs`** — one-time: seed the daily archive from Polymarket price history.
- **`flag-colors.py`** (Python 3 + Pillow, one-off) — extract each flag's two main colours from flagcdn images → `flag-colors.js` (NOT from emoji — Windows renders flag emoji as text).
- **`results-snapshot.mjs`** — regenerate `schedule.js` from Wikipedia's rendered
  fixtures (scores + knockout teams). **Strictly validated** (72 group + 32 knockout,
  all with UTC + venue) or it aborts — so a Wikipedia markup change can't corrupt data.
  Once the group stage finishes, Wikipedia moves each group's 6 fixture boxes off the
  main article into its own "2026 FIFA World Cup Group `<X>`" sub-article (the main
  article keeps only standings tables); the script backfills any group that comes up
  short from its sub-article (429-retrying, since fetching all 12 back-to-back can trip
  Wikipedia's rate limiter). Kickoff UTC normally comes from the box's own UTC-offset
  link, but Wikipedia omits that link for simultaneous final-matchday games — falls
  back to deriving it from the venue's known IANA timezone (`STAD` table) instead.
- **`fetch-crests.mjs`** — download crests into `assets/crests/` and repoint `TEAM_IMG`.
- **`og-image.py`** (Python 3 + Pillow, not Node) — render `assets/og.png`, the
  social-share card, from `history.json`.
- **`app-icons.py`** (Python 3 + Pillow) — render the four `assets/icon-*.png`
  PWA/home-screen icons.

### Automation (`.github/workflows/`)
- **`odds-snapshot.yml`** — cron daily 06:00 UTC → `odds-snapshot.mjs`, then re-renders
  `assets/og.png` (`og-image.py`); commits as `wc26-odds-bot`.
- **`results-snapshot.yml`** — cron **hourly** (at :20) → `results-snapshot.mjs`, then
  (best-effort, after the schedule regen) `event-history.mjs` + `odds-hourly.mjs` +
  `match-odds.mjs` so the win-prob charts and match pages stay in lockstep with
  results; commits them as `wc26-results-bot`
  (rebase-before-push to avoid racing the odds bot). The archive refresh never blocks the
  durable schedule commit. This is the **sole** score-refresh path: no client-side live feed.
- Both declare `permissions: contents: write` (works even though the repo's default
  workflow token is read-only). These keep the data fresh with **zero runtime API
  dependency** — the site renders from the committed files, so it survives the live
  feeds (Polymarket/TheSportsDB) going away after the tournament.

## Workflow for making changes
1. Edit `index.html` (or regenerate a data file with its script).
2. **Syntax-check the inline JS before committing:**
   ```bash
   python3 -c "import re;open('/tmp/c.js','w').write(chr(10).join(re.findall(r'<script(?![^>]*\\bsrc=)[^>]*>(.*?)</script>',open('index.html').read(),re.S)))"
   node --check /tmp/c.js
   ```
3. Commit (end the message with the `Co-Authored-By: Claude …` trailer) and
   `git push origin main`.
4. **Deploy:** Pages rebuilds from `main` root automatically (~1 min). There's a
   **~10-minute CDN cache** (`max-age=600`) + browser cache, so to see changes
   immediately use a hard refresh or a novel query, e.g.
   `…github.io/worldcup-2026/?fresh=<random>`.

## Gotchas
- **Crest-colour extraction needs https.** The Odds chart's Team/Complementary/Tartan
  palettes read crest pixels via `<canvas>` — `file://` taints the canvas, so locally
  they fall back to the Vibrant palette. Test colour modes on the **live site**.
- **Pages cache lag** (above): "nothing deployed" is almost always stale cache. Verify
  with `curl -s ".../?nocache=$(date +%s)" | grep <marker>`.
- **Scheduled Actions auto-pause** after ~60 days of repo inactivity (GitHub policy);
  re-enable in the Actions tab if returning long after the tournament.
- **Knockout teams are TBD** until the group stage ends; `results-snapshot.mjs` fills
  them in as Wikipedia updates.
- The Odds chart is **responsive in JS**: on narrow widths `renderForecast` thins the
  x-axis ticks and hides the 48-team legend; `placeCrests` scales the badges down.
  Its height is **flex-driven** (`body[data-view="odds"]` is a flex column) — don't
  reintroduce fixed `calc(100dvh - Npx)` heights.
- **The service worker caches same-origin files network-first**, so deploys still win;
  but if caching behaviour ever seems stuck during testing, unregister the SW in
  DevTools → Application, or bump `VER` in `sw.js`.

## Data sources & ownership
- **Polymarket** (`gamma-api`/`clob.polymarket.com`, CORS-open, no key) — win
  probabilities. Owned via the committed archives (`history.js` daily, `odds-hourly.js`
  hourly, `event-history.js` per-whistle, `match-odds.js` per-match win/draw/win);
  `clob…/prices-history?fidelity=N` gives the tape, gamma series `soccer-fifwc`
  (id 11433) lists the per-match events.
- **Wikipedia** — schedule & results only, *owned* (regenerated into `schedule.js`).
  **Crests are self-hosted** in `assets/crests/`. (Squads/player/stadium photos were
  dropped along with the Players and Stadiums pages in Jul 2026.)
- **ESPN** (`site.api.espn.com/.../soccer/fifa.world/scoreboard`, CORS-open, no key)
  — the **live score overlay**: current scores during/after matches, overlaid on the
  committed data (fail-safe — see Architecture). This is the near-real-time path;
  `results-snapshot.yml` → `schedule.js` is the durable hourly record underneath.
- **TheSportsDB** (free key `3`) — was the original crest source. A client-side
  "Update Scores" button that pulled live scores from it was **removed** (rate-limited
  HTTP 1015, CORS-fragile); ESPN replaced it as the live source.

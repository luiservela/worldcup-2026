# FIFA World Cup 2026

A single-page hub for the 2026 FIFA World Cup — built as one static `index.html`,
deployed on GitHub Pages, with its data kept current by automated jobs.

**→ https://luiservela.github.io/worldcup-2026/**

> Not affiliated with FIFA. A personal project.

## What it does

A dark, glassy interface with a sticky banner (emblem · centered nav · a live/next-kickoff
status chip) and a hash-routed set of pages:

- **Odds** (landing) — the hero. An **hourly stacked-area chart of win-probability** for
  all 48 nations, spanning kickoff (11 Jun) → final (19 Jul) with the future left empty
  ahead of the latest data. The stack is re-normalized over the **selected** teams to
  total 100%; circular **crest badges** sit at the right edge. Presets **Top 3 / 5 / 10 /
  All** + team search, and an **⚙️ Options** dropdown with: a colour-palette toggle
  (Vibrant · Team · Complementary · **Tartan (crest)** · **Tartan (flag)** — tartans are a
  two-colour woven `fillpattern` whose shape also varies per team), crest-size sliders, and
  a **Show matches** toggle (marks each played match of the shown teams with a line + the
  opponent's crest inside that team's band). A **📤 Share** button exports the chart as a PNG.
- **Matches** — the full **104-match schedule** in one chronological column: each row
  shows both teams (flags link to team pages), kickoff in **Luxembourg time**, venue
  (links to its stadium), and either the **score** (played) or each team's
  head-to-head **title-win %** (upcoming). Knockout games show as bracket slots until
  decided. Filters: by team, and all / upcoming / played.
- **Groups** — all 12 standings tables, computed live from results; rows link to teams.
- **Teams** — grid of crests → **team page** (crest, group standings, fixtures, a
  **"Road to the title"** line of the team's win-the-cup % through its matches, and the
  full squad sorted by caps).
- **Players** — every player (~1,248) searchable/filterable by team & position, sortable
  by caps / name / age → **player page** (photo where available, club, age, caps,
  derived squad context, teammates).
- **Stadiums** — grid of the 16 venues (with photos) → **stadium page** (photo, capacity,
  live local time, facts, matches hosted, Google Maps directions).

## How the data works

The site renders entirely from **committed data files** (no runtime API needed), which
two GitHub Actions keep fresh:

- **`history.js`** — daily win-probability archive (from **Polymarket**). Updated daily
  by `odds-snapshot.yml`.
- **`odds-hourly.js`** / **`event-history.js`** — the **hourly** win-prob tape (hero area)
  and the **per-match** win-probs (team road-lines + "Show matches"), both from Polymarket.
- **`schedule.js`** — the 104-match schedule, scores, and knockout teams (parsed from
  **Wikipedia**). Refreshed **hourly** by `results-snapshot.yml`, which then also
  regenerates `odds-hourly.js` + `event-history.js` so the charts stay in lockstep.
- **`flag-colors.js`** — each flag's two main colours (for "Tartan (flag)"); a one-off build.
- **`players.js`**, **`images.js`**, **`player-img.js`**, `assets/crests/` — squads,
  stadium photos, player photos, and self-hosted crests.

Because everything is baked into the repo (and git keeps every dated commit), the site
stays fully browsable **after the tournament**, even once the live feeds disappear.
Scores refresh automatically: an hourly GitHub Action re-scrapes Wikipedia into
`schedule.js`, so results stay current with **zero runtime API dependency**.

Data provenance: Polymarket (odds), Wikipedia (schedule, squads, photos — CC via
Wikimedia Commons, and the source for results), TheSportsDB (original crests). Crests
are self-hosted; stadium/player photos are hotlinked from durable Wikimedia.

## Run it

It's a static site — just open `index.html` in a browser, or serve the folder.

> Note: the Odds chart's crest-derived colour palettes (Team/Complementary/Tartan) use
> a `<canvas>` to read crest pixels, which browsers block for `file://` pages. Open the
> **live https site** to see those modes; locally they fall back to the Vibrant palette.

## Development

There's no build step or dependencies. Edit `index.html` directly; regenerate data with
the Node scripts in `scripts/`. Push to `main` and GitHub Pages redeploys (allow ~10 min
for the CDN cache, or hard-refresh).

**Agents:** see [`CLAUDE.md`](CLAUDE.md) for architecture, the file/script map,
conventions (incl. the inline-JS syntax-check), and gotchas.

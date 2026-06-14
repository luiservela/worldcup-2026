# FIFA World Cup 2026

A single-page hub for the 2026 FIFA World Cup — built as one static `index.html`,
deployed on GitHub Pages, with its data kept current by automated jobs.

**→ https://luiservela.github.io/worldcup-2026/**

> Not affiliated with FIFA. A personal project.

## What it does

A dark, glassy interface with a sticky banner (emblem · centered nav · a live/next-kickoff
status chip) and a hash-routed set of pages:

- **Odds** (landing) — the hero. A daily **stacked-bar chart of win-probability** for
  all 48 nations, spanning kickoff (11 Jun) → final (19 Jul). Each day's stack is
  re-normalized over the **selected** teams to total 100%; circular **crest badges**
  sit at the right edge of the latest bar; future days are blank on a ruled canvas.
  Presets **Top 3 / 5 / 10 / All** + a team search, and an **⚙️ Options** disclosure
  with a colour-palette toggle (Vibrant · Team · Complementary · **Tartan**, derived
  from each crest's two dominant colours) and a crest-size slider.
- **Matches** — the full **104-match schedule** in one chronological column: each row
  shows both teams (flags link to team pages), kickoff in **Luxembourg time**, venue
  (links to its stadium), and either the **score** (played) or each team's
  head-to-head **title-win %** (upcoming). Knockout games show as bracket slots until
  decided. Filters: by team, and all / upcoming / played.
- **Groups** — all 12 standings tables, computed live from results; rows link to teams.
- **Teams** — grid of crests → **team page** (crest, group standings, fixtures, full
  squad sorted by caps).
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
- **`schedule.js`** — the 104-match schedule, scores, and knockout teams (parsed from
  **Wikipedia**). Updated every ~3h by `results-snapshot.yml`.
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

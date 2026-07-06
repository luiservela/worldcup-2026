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
  total 100%; circular **crest badges** sit at the right edge, and every played match of
  the shown teams is marked with a line + the opponent's crest inside that team's band.
  Bands are **tartan-woven** from each crest's two main colours. Presets **Top 3 / 5 / 10 /
  All** (ranked from the latest hourly data) + team search; a **📤 Share** button exports
  the chart as a PNG.
- **Matches** — the full **104-match schedule** in one chronological column: each row
  links to that **match's page** and shows kickoff in your time zone, venue, and either
  the **score** (played) or each team's **chance to win the match** (Polymarket, 90-minute
  result). Filters: by team, and **Now** (last 24h + next 24h — the default) / all / today /
  upcoming / played.
- **Match pages** (`#/match/<id>`) — team A on the left, team B on the right (crest, group
  position, form, title chance, full fixture list), and the big number centre-top: match
  **odds** (upcoming), the **score** (finished), or both (live).
- **Bracket** — the knockout stage as a **circular net** filling the screen: 32 teams on
  the outer ring, then 16 → 8 → 4 → the final at the centre. Each match is a scorebox
  (both crests + the score, or live Polymarket odds) laid along its ring; the winner's
  gold line runs inward to the next round (radial/arc wiring only, no diagonals), the
  champion's crest takes the centre once decided. Hover for details, click to open the
  match page.
- **Groups** — all 12 standings tables, computed live from results; rows link to teams.
- **Teams** — grid of crests → **team page** (crest, group standings, fixtures, and a
  **"Road to the title"** line of the team's win-the-cup % through its matches).

## How the data works

The site renders entirely from **committed data files** (no runtime API needed), which
two GitHub Actions keep fresh:

- **`history.js`** — daily win-probability archive (from **Polymarket**). Updated daily
  by `odds-snapshot.yml`.
- **`odds-hourly.js`** / **`event-history.js`** — the **hourly** win-prob tape (hero area)
  and the **per-match** win-probs (team road-lines + "Show matches"), both from Polymarket.
- **`schedule.js`** — the 104-match schedule, scores, and knockout teams (parsed from
  **Wikipedia**). Refreshed **hourly** by `results-snapshot.yml`, which then also
  regenerates `odds-hourly.js` + `event-history.js` + `match-odds.js` so the charts and
  match pages stay in lockstep.
- **`match-odds.js`** — per-match win/draw/win probabilities from Polymarket's match
  markets (the big numbers on match pages + the bracket pills).
- **`flag-colors.js`** — each flag's two main colours; a one-off build.
- **`images.js`**, `assets/crests/` — self-hosted team crests.

Because everything is baked into the repo (and git keeps every dated commit), the site
stays fully browsable **after the tournament**, even once the live feeds disappear.
Scores refresh automatically: an hourly GitHub Action re-scrapes Wikipedia into
`schedule.js`, so results stay current with **zero runtime API dependency**.

Data provenance: Polymarket (title + match odds), Wikipedia (schedule and results),
TheSportsDB (original crests). Crests are self-hosted.

## Run it

It's a static site — just open `index.html` in a browser, or serve the folder.

> Note: the Odds chart's tartan palette reads crest pixels via `<canvas>`, which browsers
> block for `file://` pages. Open the **live https site** to see the tartans; locally the
> chart falls back to the Vibrant palette.

## Development

There's no build step or dependencies. Edit `index.html` directly; regenerate data with
the Node scripts in `scripts/`. Push to `main` and GitHub Pages redeploys (allow ~10 min
for the CDN cache, or hard-refresh).

**Agents:** see [`CLAUDE.md`](CLAUDE.md) for architecture, the file/script map,
conventions (incl. the inline-JS syntax-check), and gotchas.

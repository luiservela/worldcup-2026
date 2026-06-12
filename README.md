# FIFA World Cup 26™ — Local Hub

A single self-contained `index.html` that presents the 2026 FIFA World Cup as an
official-feeling, vibrant-but-sophisticated web hub. No build step, no server,
no dependencies — just open the file in any modern browser.

```
worldcup-2026/
├── index.html   ← the entire app (HTML + CSS + JS in one file)
└── README.md
```

## Run it

Double-click `index.html`, or:

```bash
open index.html        # macOS
```

That's it — everything (styles, logic, data, flags) lives inside the one file.

---

## What the page does

A dark, gradient-lit interface with a sticky glass header. It's a **single-file
hash-routed SPA** — six pages plus detail views, all in one `index.html`, no
build. Navigation uses URL hashes, so links are shareable and work directly on
GitHub Pages: `#/odds`, `#/matches`, `#/team/MEX`, `#/stadium/estadio-azteca`,
`#/nerd`. **Every flag on the site links to that team's page.**

Pages: **Odds** (landing) · **Matches** · **Groups** · **Teams** · **Players** ·
**Stadiums** · **Nerd-stuff**.

Data strategy: reliable, slow-changing data (the 16 stadiums, fixture kickoffs,
tournament facts) is **curated and baked in**; data that actually changes
(win probabilities, scores, squads) is **fetched live** with graceful fallbacks.

### Odds (the landing page)
A stacked **area chart** — x-axis = time, y-axis = win probability — showing how
each of the 48 nations' chance of lifting the trophy has evolved. Built on
[Plotly](https://plotly.com/javascript/): click any team in the legend to toggle
it, double-click to isolate one, plus **Top contenders / All 48 / Clear** presets
and a search box to add a specific team.

- **Every column is normalized to total 100%**, so the stack always reaches the
  top regardless of bookmaker overround. Eliminated teams decay toward 0% and
  fade out of the stack.
- **Source: [Polymarket](https://polymarket.com/event/world-cup-winner)
  prediction markets** — the "Yes" share price of each team's *World Cup Winner*
  market is a market-implied probability, and Polymarket's `prices-history`
  endpoint (CORS-open, no API key) hands us a full per-team time-series. That
  time-series *is* our x-axis — no need to snapshot daily ourselves.
- A **baked-in seed** (the 11 Jun 2026 snapshot of all 48 teams) renders the
  chart instantly and even fully offline; live history layers in on top and is
  cached in `localStorage` for an hour. **Refresh** re-pulls live data.

### Matches
Single chronological column of the **full 104-match schedule** — 72 group games
(with team flags, cup-win %, scores) plus the 32 **knockout** bracket games
(shown as TBD slots like "Winner Group A", with round labels). Each row shows
both teams (flags link to their pages), each team's **current chance to win the
*whole tournament*** (labeled — the two won't sum to 100%), the **kickoff in
Luxembourg time** (`Intl`-converted from real UTC kickoffs), stage, and the venue
(links to its stadium page). Filters: by team, and all / upcoming / played.
Schedule lives in `schedule.js`, parsed from Wikipedia's rendered fixtures.

### Groups
All 12 groups (A–L) with standings tables, top-two qualification highlighted.
**Standings compute automatically from match results.** Team rows link to team
pages.

### Stadiums
Grid of all 16 host venues (with **photos** + host-country flag) → click for a
detail page: a photo, capacity, local time (live), interesting facts, matches
hosted, and a **Google Maps directions** link (from verified coordinates). Core
data is baked in; photos (`images.js`) come from Wikimedia Commons.

### Players
Every tournament player (~1,248 across 48 squads) in one searchable page —
filter by team and position, sort by caps / name / age. Each card shows number,
position, current club, age and caps, and links to that player's team page.
Data is **baked into `players.js`**, curated from Wikipedia's final-squad lists
(name, number, position, date of birth, club, caps, goals — no height; that
field isn't free). This same dataset powers the full rosters on team pages.

### Team detail (`#/team/<code>`)
Flag, group, confederation, current cup-win %, the team's group standings, its
fixtures, and the **full squad** (from `players.js`, grouped GK/DF/MF/FW with
club, age and caps).

### Nerd-stuff (was "Stats")
A facts grid mixing **live** aggregates (matches played, goals) with curated
static trivia (prize money, viewership, mascots, debutants, records…), plus the
Golden Boot placeholder and "Did you know" notes.

### Teams
All 48 nations as flag cards, sorted alphabetically, each tagged with its group
and confederation. Click any card to open that team's detail page.

---

## The "Update Stats Live" button

The glowing button in the Matches header pulls **real** data from
[TheSportsDB](https://www.thesportsdb.com/) (a free, CORS-friendly football API)
and merges it into the page:

1. Fetches World Cup events for the Matchday-1 dates.
2. Matches returned teams to the local fixtures (by name, either orientation).
3. Writes any posted scores, then recomputes standings and stats live.
4. Reports the result inline (synced / no results yet / offline).

**It only writes real results.** If the feed hasn't published a fixture's score
yet, the page says so rather than inventing one. No API key is required to try
it; you can add your own TheSportsDB key in `LIVE_CFG` for higher rate limits.

---

## Data & accuracy

- **Groups and Matchday-1 fixtures** reflect the real 2026 final draw
  (held 5 Dec 2025) and the published schedule — verified against Wikipedia and
  public schedule sources.
- **No results are shown by default** because the tournament is at kickoff
  (opener: Mexico vs South Africa, 11 Jun 2026, Estadio Azteca). All standings
  start at zero.
- One fixture (South Korea vs Czechia) has a confirmed date but unconfirmed
  venue, shown generically.

### Editing the data

All data lives in clearly-marked objects near the bottom of `index.html`:

- `T` — the 48 teams: `code: [name, flag, group, confederation]`
- `MATCHES` — fixtures: `[home, away, homeScore, awayScore, status, stage, day, venue, kickoff]`
- `NOTES` — the "Did you know" facts

To add a result by hand, set the score fields and status, e.g.:

```js
["MEX","RSA", 2, 1, "fin", "Group A", "Thu 11 Jun", "Estadio Azteca, Mexico City", "19:00 GMT"],
//          ^hs ^as ^status
```

Standings, goal totals, and KPIs recalculate on reload.

---

## Tech notes

- **Single file** — HTML, CSS, and vanilla JS; zero dependencies, zero assets
  (flags are Unicode emoji).
- **Tournament format** — 48 teams, 12 groups of 4, top 2 + best 8 third-placed
  advance to a Round of 32.
- **Known limits** — static page (manual refresh, not auto-polling); individual
  goalscorers (Golden Boot) are not fetched from the free API tier.

---

*Built as a local hub. Data shown reflects the verified 2026 draw at a
pre-tournament state. Not affiliated with FIFA.*

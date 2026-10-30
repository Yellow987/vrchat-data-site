# Bio·Telemetry — public sleep / body / movement dashboard

A live, public dashboard of my sleep, recovery, body weight, lifts and VR-dance
cardio. The data is intentionally public: it funnels nightly into one Google
Sheet, and this site reads that sheet **live** and renders it with trend-first
charts (signal over noise, week-over-week deltas, Bryan-Johnson style).

Built with **Next.js (App Router, TypeScript)** + **Recharts**, deployed to
**Vercel**. No API keys, no service account — it fetches the sheet's public CSV.

---

## Sections

- **Sleep & Recovery** — last-night hero card + streaks, week-over-week delta
  pills, and trend lines (daily dots + 7-day rolling average) for HRV, sleep
  duration, onset HR, efficiency and score; bedtime-consistency band and a
  sleep↔HRV scatter.
- **Body** — weight with a rolling average (day-to-day is noisy).
- **Lifts** — best-set reps per exercise over time (fed by the LiftLog app).
  Blank-friendly until data lands.
- **Dance / Cardio** — auto-detects whatever numeric columns the VR dance
  tracker writes (duration, active minutes, movement, HR) and charts each.
  Blank-friendly.

Each section degrades gracefully: empty tabs, a missing worksheet, or an
un-published sheet all show a helpful message instead of breaking.

---

## Data source

The site reads each worksheet as CSV from the Google Visualization endpoint:

```
https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:csv&sheet=<TabName>
```

Fetched server-side in a React Server Component with `revalidate` (default 1h),
so the page is cached, SEO-friendly, and refreshes hourly.

### One-time: make the sheet readable

The endpoint only works if the sheet is readable without a login. Do **one** of:

1. **Share (simplest).** In the sheet: **File → Share → Share with others →
   General access → "Anyone with the link" → Viewer.**
2. **Publish to web.** **File → Share → Publish to web → Publish.**

Either way the data stays read-only to the public, which is the intent here.
The dashboard picks it up within the revalidate window (≈1 hour), or instantly
on the next deploy / a manual refresh.

### Worksheet schema the parser expects

- **Sleep** — `Date` (YYYY-MM-DD), `Bedtime` (e.g. `8:05 PM`), `Sleep`
  (e.g. `6h 42m`), `Efficiency %`, `Latency (min)`, `Onset HR`, `HRV`, `Score`,
  `Weight` (lb). Text formats are parsed; bedtimes after midnight are
  night-anchored so the rolling average doesn't wrap around noon.
- **Lifts** — `Timestamp`, `Exercise`, `Weight (kg)`, `Reps`, `Duration (s)`
  (one row per set; the site shows best reps per exercise per day).
- **Dance** — a date/timestamp column plus any numeric columns; they're
  auto-detected, so the exact headers can change without touching the code.

Column lookups are space/case-insensitive and tolerate a few header variants.

---

## Local development

```bash
npm install
npm run dev        # http://localhost:3000
```

The sheet ID defaults to the public one in `lib/config.ts`; override anything
via a `.env.local` (see `.env.example`):

```
NEXT_PUBLIC_SHEET_ID=...
NEXT_PUBLIC_SLEEP_TAB=Sleep
NEXT_PUBLIC_LIFTS_TAB=Lifts
NEXT_PUBLIC_DANCE_TAB=Dance
SHEET_REVALIDATE_SECONDS=3600
```

### Preview before the sheet is public

If the sheet isn't shared yet, you can preview the UI against the bundled sample
data in `fixtures/`:

```bash
# PowerShell
$env:USE_SAMPLE_DATA=1; npm run dev
# bash
USE_SAMPLE_DATA=1 npm run dev
```

This only changes behavior when `USE_SAMPLE_DATA=1` is set, so production is
never affected.

---

## Deploy to Vercel

Vercel ties to your own account, so this is a one-time interactive step you run:

```bash
npm i -g vercel      # if you don't have the CLI
vercel login         # opens the browser to authenticate
vercel               # first run: link/create the project, accept defaults
vercel --prod        # promote to production
```

No environment variables are required (the public sheet ID is baked into
`lib/config.ts`). If you ever move to a different sheet or rename tabs, set the
`NEXT_PUBLIC_*` vars above in **Vercel → Project → Settings → Environment
Variables** instead of editing code.

Pushing this repo to GitHub and importing it at <https://vercel.com/new> works
too — every push then auto-deploys.

---

## Project layout

```
app/
  layout.tsx        root layout + metadata
  page.tsx          server component: fetch → build series → compose sections
  globals.css       dark / VR theme, design tokens, responsive grid
components/         client chart components (Recharts)
lib/
  config.ts         sheet id, tab names, CSV URL, revalidate
  sheet.ts          fetch + status detection + typed parsing
  parse.ts          CSV, duration/clock parsing, rolling mean, deltas
  metrics.ts        series/hero/delta/streak/scatter/lift builders
  palette.ts        hex colors for charts (mirror of CSS vars)
  types.ts          shared row/data types
fixtures/           sample CSVs for USE_SAMPLE_DATA preview
```

## Design notes

- Trend charts show **muted daily dots + a bright 7-day rolling average** so the
  signal reads over the noise.
- A consistent categorical palette (defined once in `globals.css` /
  `palette.ts`) keeps every chart legible on the dark background.
- Delta pills are colored by meaning, not direction: HRV/sleep/efficiency/score
  up = good, onset HR down = good, weight is neutral.

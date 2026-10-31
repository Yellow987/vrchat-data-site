// Turns parsed rows into the exact series the charts and cards consume.
// Kept separate from fetching so the view layer stays declarative.

import {
  formatClock,
  formatDuration,
  latest,
  rollingMean,
  trailingMean,
  weekDelta,
} from "./parse";
import { PALETTE } from "./palette";
import type { LiftRow, PhotoRow, SleepRow } from "./types";

export type Direction = "up-good" | "down-good" | "neutral";

export interface MetricDef {
  key: keyof SleepPoint;
  avgKey: keyof SleepPoint;
  label: string;
  short: string;
  unit: string;
  color: string;
  direction: Direction;
  /** format a value for display */
  fmt: (v: number | null) => string;
}

export interface SleepPoint {
  date: string;
  label: string; // short date label e.g. "Oct 28"
  hrv: number | null;
  hrvAvg: number | null;
  sleepMin: number | null;
  sleepAvg: number | null;
  onsetHr: number | null;
  onsetHrAvg: number | null;
  bedtimeMin: number | null;
  bedtimeAvg: number | null;
  efficiency: number | null;
  efficiencyAvg: number | null;
  score: number | null;
  scoreAvg: number | null;
  weight: number | null;
  weightAvg: number | null;
}

const num = (v: number | null) => (v === null ? "—" : String(Math.round(v)));
const num1 = (v: number | null) =>
  v === null ? "—" : (Math.round(v * 10) / 10).toFixed(1);

export const SLEEP_METRICS: MetricDef[] = [
  {
    key: "hrv",
    avgKey: "hrvAvg",
    label: "Heart-rate variability",
    short: "HRV",
    unit: "ms",
    color: PALETTE.cyan,
    direction: "up-good",
    fmt: num,
  },
  {
    key: "sleepMin",
    avgKey: "sleepAvg",
    label: "Sleep duration",
    short: "Sleep",
    unit: "",
    color: PALETTE.violet,
    direction: "up-good",
    fmt: formatDuration,
  },
  {
    key: "onsetHr",
    avgKey: "onsetHrAvg",
    label: "Onset heart rate",
    short: "Onset HR",
    unit: "bpm",
    color: PALETTE.magenta,
    direction: "down-good",
    fmt: num,
  },
  {
    key: "efficiency",
    avgKey: "efficiencyAvg",
    label: "Sleep efficiency",
    short: "Efficiency",
    unit: "%",
    color: PALETTE.lime,
    direction: "up-good",
    fmt: num,
  },
  {
    key: "score",
    avgKey: "scoreAvg",
    label: "Sleep score",
    short: "Score",
    unit: "",
    color: PALETTE.amber,
    direction: "up-good",
    fmt: num,
  },
  {
    key: "weight",
    avgKey: "weightAvg",
    label: "Body weight",
    short: "Weight",
    unit: "lb",
    color: PALETTE.cyan,
    direction: "neutral",
    fmt: num1,
  },
];

function shortLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function buildSleepSeries(sleep: SleepRow[]): SleepPoint[] {
  const hrv = rollingMean(sleep.map((r) => r.hrv), 7);
  const sleepMin = rollingMean(sleep.map((r) => r.sleepMin), 7);
  const onsetHr = rollingMean(sleep.map((r) => r.onsetHr), 7);
  const bedtime = rollingMean(sleep.map((r) => r.bedtimeMin), 7);
  const eff = rollingMean(sleep.map((r) => r.efficiency), 7);
  const score = rollingMean(sleep.map((r) => r.score), 7);
  const weight = rollingMean(sleep.map((r) => r.weight), 7);

  return sleep.map((r, i) => ({
    date: r.date,
    label: shortLabel(r.date),
    hrv: r.hrv,
    hrvAvg: round(hrv[i]),
    sleepMin: r.sleepMin,
    sleepAvg: round(sleepMin[i]),
    onsetHr: r.onsetHr,
    onsetHrAvg: round(onsetHr[i]),
    bedtimeMin: r.bedtimeMin,
    bedtimeAvg: round(bedtime[i]),
    efficiency: r.efficiency,
    efficiencyAvg: round(eff[i]),
    score: r.score,
    scoreAvg: round(score[i]),
    weight: r.weight,
    weightAvg: round(weight[i]),
  }));
}

function round(v: number | null): number | null {
  return v === null ? null : Math.round(v * 100) / 100;
}

// ---- progress photos on the weight line ----

export interface WeightPoint extends SleepPoint {
  /** y-position (weight, falling back to the rolling avg) for a photo marker, or
   *  null when this day has no photo or no weight to anchor the dot to. */
  photoY: number | null;
  /** index into the chronologically-sorted photos array of the first photo on
   *  this day — what the lightbox opens to when the marker is clicked. */
  photoIndex: number | null;
  /** how many photos map to this day. */
  photoCount: number;
  /** first photo's thumbnail url, for the hover preview. */
  photoThumb: string | null;
}

/** Snap a photo's date onto the nearest day present in the weight series so its
 *  marker can sit on the line even if that exact day has no sleep row. */
function nearestIndex(dates: string[], target: string): number {
  let best = -1;
  let bestDiff = Infinity;
  const t = Date.parse(target + "T00:00:00");
  for (let i = 0; i < dates.length; i++) {
    const diff = Math.abs(Date.parse(dates[i] + "T00:00:00") - t);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return best;
}

export function buildWeightSeries(
  series: SleepPoint[],
  photos: PhotoRow[],
): WeightPoint[] {
  const out: WeightPoint[] = series.map((p) => ({
    ...p,
    photoY: null,
    photoIndex: null,
    photoCount: 0,
    photoThumb: null,
  }));
  if (out.length === 0) return out;

  const dates = series.map((p) => p.date);
  const exact = new Map(dates.map((d, i) => [d, i]));

  photos.forEach((photo, gi) => {
    const i = exact.has(photo.date)
      ? (exact.get(photo.date) as number)
      : nearestIndex(dates, photo.date);
    if (i < 0) return;
    const pt = out[i];
    pt.photoCount += 1;
    if (pt.photoIndex === null) {
      pt.photoIndex = gi;
      pt.photoThumb = photo.imageUrl;
      pt.photoY = pt.weight ?? pt.weightAvg ?? null;
    }
  });
  return out;
}

export interface DeltaCard {
  short: string;
  label: string;
  unit: string;
  direction: Direction;
  latest: number | null;
  latestText: string;
  delta: number | null;
  deltaText: string;
  tone: "good" | "bad" | "neutral";
}

const rawKey: Record<string, keyof SleepRow> = {
  HRV: "hrv",
  Sleep: "sleepMin",
  "Onset HR": "onsetHr",
  Efficiency: "efficiency",
  Score: "score",
  Weight: "weight",
};

export function buildDeltas(sleep: SleepRow[]): DeltaCard[] {
  return SLEEP_METRICS.map((m) => {
    const col = rawKey[m.short];
    const series = sleep.map((r) => r[col] as number | null);
    const last = latest(series);
    const d = weekDelta(series, 7);
    const tone = toneFor(m.direction, d);
    const signed = (v: number) => (v > 0 ? "+" : "") + formatDelta(m, v);
    return {
      short: m.short,
      label: m.label,
      unit: m.unit,
      direction: m.direction,
      latest: last,
      latestText: m.fmt(last),
      delta: d,
      deltaText: d === null ? "—" : signed(d),
      tone,
    };
  });
}

function formatDelta(m: MetricDef, v: number): string {
  if (m.short === "Sleep") {
    // show delta in minutes for readability
    const sign = v < 0 ? "-" : "";
    return `${sign}${formatDuration(Math.abs(v))}`.replace("-", "");
  }
  const abs = Math.abs(v);
  const r = m.short === "Weight" ? Math.round(abs * 10) / 10 : Math.round(abs);
  return String(r) + (m.unit ? ` ${m.unit}` : "");
}

function toneFor(dir: Direction, delta: number | null): DeltaCard["tone"] {
  if (delta === null || Math.abs(delta) < 1e-9 || dir === "neutral")
    return "neutral";
  const improving = dir === "up-good" ? delta > 0 : delta < 0;
  return improving ? "good" : "bad";
}

// ---- hero / latest ----

export interface HeroStat {
  short: string;
  valueText: string;
  unit: string;
  sub: string;
}

export function buildHero(series: SleepPoint[], sleep: SleepRow[]): {
  date: string | null;
  stats: HeroStat[];
} {
  const last = sleep[sleep.length - 1];
  if (!last) return { date: null, stats: [] };
  const avg = (col: keyof SleepRow) =>
    trailingMean(sleep.map((r) => r[col] as number | null), 7);
  const stats: HeroStat[] = [
    {
      short: "HRV",
      valueText: last.hrv === null ? "—" : String(Math.round(last.hrv)),
      unit: "ms",
      sub: `7d avg ${fmtOrDash(avg("hrv"))}`,
    },
    {
      short: "Sleep",
      valueText: formatDuration(last.sleepMin),
      unit: "",
      sub: `7d avg ${formatDuration(avg("sleepMin"))}`,
    },
    {
      short: "Onset HR",
      valueText: last.onsetHr === null ? "—" : String(Math.round(last.onsetHr)),
      unit: "bpm",
      sub: `7d avg ${fmtOrDash(avg("onsetHr"))}`,
    },
    {
      short: "Bedtime",
      valueText: formatClock(last.bedtimeMin),
      unit: "",
      sub: `7d avg ${formatClock(avg("bedtimeMin"))}`,
    },
    {
      short: "Efficiency",
      valueText: last.efficiency === null ? "—" : String(Math.round(last.efficiency)),
      unit: "%",
      sub: `7d avg ${fmtOrDash(avg("efficiency"))}`,
    },
    {
      short: "Score",
      valueText: last.score === null ? "—" : String(Math.round(last.score)),
      unit: "",
      sub: `7d avg ${fmtOrDash(avg("score"))}`,
    },
  ];
  return { date: last.date, stats };
}

function fmtOrDash(v: number | null): string {
  return v === null ? "—" : String(Math.round(v));
}

// ---- streaks ----

export interface Streak {
  label: string;
  value: string;
}

export function buildStreaks(sleep: SleepRow[]): Streak[] {
  const streaks: Streak[] = [];

  // consecutive nights (from the end) with sleep >= 7h
  streaks.push({
    label: "nights ≥ 7h sleep",
    value: `${countStreak(sleep, (r) => (r.sleepMin ?? 0) >= 420)}`,
  });
  // consecutive nights with score >= 80 (only if score exists)
  if (sleep.some((r) => r.score !== null)) {
    streaks.push({
      label: "nights score ≥ 80",
      value: `${countStreak(sleep, (r) => (r.score ?? 0) >= 80)}`,
    });
  }
  // nights in bed before midnight (anchored < 24:00 == <1440)
  streaks.push({
    label: "nights asleep before 12am",
    value: `${countStreak(sleep, (r) => r.bedtimeMin !== null && r.bedtimeMin < 24 * 60)}`,
  });
  // total nights logged
  streaks.push({ label: "nights logged", value: `${sleep.length}` });
  return streaks;
}

function countStreak(sleep: SleepRow[], pred: (r: SleepRow) => boolean): number {
  let n = 0;
  for (let i = sleep.length - 1; i >= 0; i--) {
    if (pred(sleep[i])) n++;
    else break;
  }
  return n;
}

// ---- scatter (sleep vs hrv) ----

export interface ScatterPoint {
  sleepHours: number;
  hrv: number;
  date: string;
}

export function buildScatter(sleep: SleepRow[]): ScatterPoint[] {
  return sleep
    .filter((r) => r.sleepMin !== null && r.hrv !== null)
    .map((r) => ({
      sleepHours: Math.round(((r.sleepMin as number) / 60) * 100) / 100,
      hrv: r.hrv as number,
      date: r.date,
    }));
}

// ---- lifts ----

export interface LiftSeries {
  exercise: string;
  points: { date: string; label: string; bestReps: number; topWeight: number | null }[];
}

export function buildLiftSeries(lifts: LiftRow[]): LiftSeries[] {
  const byExercise = new Map<string, LiftRow[]>();
  for (const l of lifts) {
    const k = l.exercise;
    if (!byExercise.has(k)) byExercise.set(k, []);
    byExercise.get(k)!.push(l);
  }
  const out: LiftSeries[] = [];
  for (const [exercise, rows] of byExercise) {
    const byDay = new Map<string, { bestReps: number; topWeight: number | null }>();
    for (const r of rows) {
      const cur = byDay.get(r.date) || { bestReps: 0, topWeight: null };
      if ((r.reps ?? 0) > cur.bestReps) cur.bestReps = r.reps ?? 0;
      if (r.weightKg !== null && (cur.topWeight === null || r.weightKg > cur.topWeight))
        cur.topWeight = r.weightKg;
      byDay.set(r.date, cur);
    }
    const points = Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({
        date,
        label: shortLabel(date),
        bestReps: v.bestReps,
        topWeight: v.topWeight,
      }));
    out.push({ exercise, points });
  }
  return out.sort((a, b) => a.exercise.localeCompare(b.exercise));
}

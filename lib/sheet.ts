// Server-side data layer: fetch each public worksheet as CSV, parse the text
// formats, and hand back plain-serializable rows for the (client) charts.

import { csvUrl, REVALIDATE_SECONDS, TABS } from "./config";
import {
  anchorBedtime,
  parseClock,
  parseCsv,
  parseDuration,
  toNum,
  toRecords,
} from "./parse";
import type {
  DanceRow,
  LiftRow,
  PhotoRow,
  SiteData,
  SleepRow,
  TabStatus,
} from "./types";

interface FetchResult {
  records: Record<string, string>[];
  status: TabStatus;
}

/** Opt-in local preview mode: read fixtures/sample-<Tab>.csv instead of the
 *  live sheet. Handy before the sheet is published. Enable with
 *  USE_SAMPLE_DATA=1 in .env.local. Never affects production unless that env
 *  var is set. */
const USE_SAMPLE = process.env.USE_SAMPLE_DATA === "1";

async function fetchSample(tab: string): Promise<FetchResult> {
  try {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const body = await readFile(
      join(process.cwd(), "fixtures", `sample-${tab}.csv`),
      "utf8",
    );
    const records = toRecords(parseCsv(body));
    return {
      records,
      status: { ok: true, reason: records.length ? "ok" : "empty", rowCount: records.length },
    };
  } catch {
    return {
      records: [],
      status: { ok: false, reason: "missing", message: `No sample for "${tab}".`, rowCount: 0 },
    };
  }
}

async function fetchTab(tab: string): Promise<FetchResult> {
  if (USE_SAMPLE) return fetchSample(tab);

  const empty = (reason: TabStatus["reason"], message?: string): FetchResult => ({
    records: [],
    status: { ok: false, reason, message, rowCount: 0 },
  });

  let res: Response;
  try {
    res = await fetch(csvUrl(tab), {
      next: { revalidate: REVALIDATE_SECONDS },
      headers: { Accept: "text/csv,*/*" },
    });
  } catch (e) {
    return empty("error", `Network error fetching "${tab}".`);
  }

  const body = await res.text();

  // A private / unpublished sheet answers with an HTML login page.
  if (res.status === 401 || res.status === 403 || /^\s*<(!doctype|html)/i.test(body)) {
    return empty(
      "private",
      "The sheet isn't public yet — share it as 'anyone with the link can view' or publish it to the web.",
    );
  }
  // gviz reports a missing tab with a JS/JSON error payload, not CSV.
  if (!res.ok || /google\.visualization\.Query\.setResponse/.test(body)) {
    return empty("missing", `Worksheet "${tab}" was not found in the sheet.`);
  }

  const records = toRecords(parseCsv(body));
  if (records.length === 0) {
    return { records, status: { ok: true, reason: "empty", rowCount: 0 } };
  }
  return { records, status: { ok: true, reason: "ok", rowCount: records.length } };
}

/** Case/space-insensitive column getter. */
function pick(rec: Record<string, string>, ...names: string[]): string {
  const keys = Object.keys(rec);
  for (const name of names) {
    const hit = keys.find(
      (k) => k.toLowerCase().replace(/\s+/g, "") === name.toLowerCase().replace(/\s+/g, ""),
    );
    if (hit && rec[hit] !== "") return rec[hit];
  }
  return "";
}

/** Normalize assorted date texts to YYYY-MM-DD. */
function isoDate(text: string): string {
  const t = text.trim();
  // already ISO-ish
  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  }
  const d = new Date(t);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return t;
}

function parseSleep(records: Record<string, string>[]): SleepRow[] {
  return records
    .map((r): SleepRow | null => {
      const dateText = pick(r, "Date");
      if (!dateText) return null;
      const bedtimeText = pick(r, "Bedtime") || null;
      return {
        date: isoDate(dateText),
        bedtimeText,
        bedtimeMin: anchorBedtime(parseClock(bedtimeText)),
        sleepMin: parseDuration(pick(r, "Sleep", "Sleep Duration")),
        efficiency: toNum(pick(r, "Efficiency %", "Efficiency")),
        latency: toNum(pick(r, "Latency (min)", "Latency")),
        onsetHr: toNum(pick(r, "Onset HR", "OnsetHR", "HR")),
        hrv: toNum(pick(r, "HRV")),
        score: toNum(pick(r, "Score")),
        weight: toNum(pick(r, "Weight", "Weight (lb)")),
      };
    })
    .filter((r): r is SleepRow => r !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** "leg_raise" / "pushups" -> "Leg Raise" / "Pushups" for display. */
function prettyExercise(raw: string): string {
  return raw
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseLifts(records: Record<string, string>[]): LiftRow[] {
  return records
    .map((r): LiftRow | null => {
      const ts = pick(r, "Timestamp", "Date", "Time");
      const exercise = pick(r, "Exercise", "Lift", "Movement");
      if (!ts && !exercise) return null;
      return {
        timestamp: ts,
        date: isoDate(ts),
        exercise: exercise ? prettyExercise(exercise) : "Unknown",
        weightKg: toNum(pick(r, "Weight (kg)", "Weight", "Weight(kg)")),
        reps: toNum(pick(r, "Reps", "Rep")),
        durationS: toNum(pick(r, "Duration (s)", "Duration", "Duration(s)")),
      };
    })
    .filter((r): r is LiftRow => r !== null)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

const DANCE_DATE_KEYS = ["date", "timestamp", "time", "day", "when"];

/** The dance tab's exact columns aren't fixed yet, so detect the date column
 *  and treat every other numeric-looking column as a metric. */
function parseDance(records: Record<string, string>[]): {
  rows: DanceRow[];
  columns: string[];
} {
  if (records.length === 0) return { rows: [], columns: [] };
  const headers = Object.keys(records[0]);
  const dateKey =
    headers.find((h) => DANCE_DATE_KEYS.includes(h.toLowerCase().replace(/\s+/g, ""))) ||
    headers.find((h) => /date|time|day/i.test(h)) ||
    headers[0];

  // A column is a metric if a majority of its values parse as numbers.
  const metricCols = headers.filter((h) => {
    if (h === dateKey) return false;
    const vals = records.map((r) => toNum(r[h])).filter((v) => v !== null);
    return vals.length >= Math.max(1, records.length * 0.5);
  });

  const rows = records
    .map((r): DanceRow | null => {
      const tsText = r[dateKey];
      if (!tsText) return null;
      const metrics: Record<string, number> = {};
      for (const c of metricCols) {
        const n = toNum(r[c]);
        if (n !== null) metrics[c] = n;
      }
      return { date: isoDate(tsText), timestampText: tsText, metrics };
    })
    .filter((r): r is DanceRow => r !== null)
    .sort((a, b) => a.timestampText.localeCompare(b.timestampText));

  return { rows, columns: metricCols };
}

/** Direct-embeddable Drive thumbnail URL from a file id. */
function driveThumb(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1600`;
}

function parsePhotos(records: Record<string, string>[]): PhotoRow[] {
  return records
    .map((r): PhotoRow | null => {
      const dateText = pick(r, "Date", "Taken", "Day");
      const fileId = pick(r, "FileId", "File Id", "FileID", "Drive Id");
      let imageUrl = pick(r, "ImageURL", "Image URL", "URL", "Image", "Link");
      if (!imageUrl && fileId) imageUrl = driveThumb(fileId);
      // Need something to show and something to date it by.
      if (!imageUrl || !dateText) return null;
      return {
        date: isoDate(dateText),
        imageUrl,
        fileId,
        caption: pick(r, "Caption", "Note", "Label", "Title"),
        uploaded: pick(r, "Uploaded", "Upload Time", "Timestamp", "Created"),
      };
    })
    .filter((r): r is PhotoRow => r !== null)
    // chronological; same-day photos ordered by upload time, then url for stability
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.uploaded.localeCompare(b.uploaded) ||
        a.imageUrl.localeCompare(b.imageUrl),
    );
}

export async function getSiteData(): Promise<SiteData> {
  const [sleepRes, liftsRes, danceRes, photosRes] = await Promise.all([
    fetchTab(TABS.sleep),
    fetchTab(TABS.lifts),
    fetchTab(TABS.dance),
    fetchTab(TABS.photos),
  ]);

  const sleep = parseSleep(sleepRes.records);
  const lifts = parseLifts(liftsRes.records);
  const { rows: dance, columns: danceColumns } = parseDance(danceRes.records);
  const photos = parsePhotos(photosRes.records);

  return {
    sleep,
    lifts,
    dance,
    danceColumns,
    photos,
    status: {
      sleep: finalizeStatus(sleepRes.status, sleep.length),
      lifts: finalizeStatus(liftsRes.status, lifts.length),
      dance: finalizeStatus(danceRes.status, dance.length),
      photos: finalizeStatus(photosRes.status, photos.length),
    },
  };
}

function finalizeStatus(status: TabStatus, parsedCount: number): TabStatus {
  if (status.ok && parsedCount === 0) {
    return { ...status, reason: "empty", rowCount: 0 };
  }
  return { ...status, rowCount: parsedCount };
}

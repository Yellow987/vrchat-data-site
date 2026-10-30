// Pure parsing/number helpers. No I/O here so these are trivially testable.

/** Minimal RFC-4180-ish CSV parser: handles quoted fields, embedded commas,
 *  escaped double-quotes ("") and CRLF. Returns an array of string rows. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  // flush trailing field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Turn CSV rows into an array of header-keyed objects. */
export function toRecords(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const o: Record<string, string> = {};
    headers.forEach((h, idx) => {
      o[h] = (r[idx] ?? "").trim();
    });
    return o;
  });
}

/** "6h 42m" / "6h" / "42m" / "402" (minutes) -> minutes. null if empty/bad. */
export function parseDuration(text: string | undefined | null): number | null {
  if (!text) return null;
  const t = text.trim();
  if (t === "") return null;
  const hm = t.match(/(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+(?:\.\d+)?)\s*m)?/i);
  if (hm && (hm[1] || hm[2])) {
    const h = hm[1] ? parseFloat(hm[1]) : 0;
    const m = hm[2] ? parseFloat(hm[2]) : 0;
    return Math.round(h * 60 + m);
  }
  // plain number -> assume already minutes
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

/** "8:05 PM" -> minutes from midnight (0..1439). null if unparseable. */
export function parseClock(text: string | undefined | null): number | null {
  if (!text) return null;
  const m = text.trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ampm = m[3]?.toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Night-anchored bedtime: after-midnight times (before noon) are pushed past
 *  midnight so they sort/average above evening times. 11:00 PM -> 1380,
 *  12:30 AM -> 1470, 1:15 AM -> 1515. Averaging these then wrapping back is
 *  what keeps a mean bedtime from collapsing to noon. */
export function anchorBedtime(clockMin: number | null): number | null {
  if (clockMin === null) return null;
  return clockMin < 12 * 60 ? clockMin + 24 * 60 : clockMin;
}

/** Format an anchored bedtime minute value back to a clock label, e.g. 1470 ->
 *  "12:30 AM". Accepts values up to 36h. */
export function formatClock(anchored: number | null): string {
  if (anchored === null || !Number.isFinite(anchored)) return "—";
  let m = ((anchored % (24 * 60)) + 24 * 60) % (24 * 60);
  let h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  const ampm = h >= 12 ? "PM" : "AM";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
}

export function toNum(text: string | undefined | null): number | null {
  if (text === undefined || text === null) return null;
  const t = String(text).replace(/[%,]/g, "").trim();
  if (t === "") return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

/** Minutes -> "6h 42m". */
export function formatDuration(min: number | null): string {
  if (min === null || !Number.isFinite(min)) return "—";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Trailing N-point rolling mean over an array of (number|null). Returns an
 *  array of the same length; a point is null until it has `window` real values
 *  behind it (inclusive). */
export function rollingMean(
  values: (number | null)[],
  window: number,
): (number | null)[] {
  const out: (number | null)[] = [];
  const buf: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v !== null && Number.isFinite(v)) buf.push(v);
    else buf.push(NaN);
    // keep a trailing window of the last `window` entries
    const slice = buf.slice(Math.max(0, i - window + 1), i + 1);
    const real = slice.filter((x) => Number.isFinite(x)) as number[];
    out.push(real.length >= Math.min(window, 3) ? mean(real) : null);
  }
  return out;
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return NaN;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Mean of the last `window` real values in a series. */
export function trailingMean(
  values: (number | null)[],
  window: number,
): number | null {
  const real = values
    .filter((v): v is number => v !== null && Number.isFinite(v))
    .slice(-window);
  return real.length ? mean(real) : null;
}

/** Week-over-week delta: mean of the most recent `window` reals minus mean of
 *  the `window` before that. null if either window is empty. */
export function weekDelta(
  values: (number | null)[],
  window = 7,
): number | null {
  const real = values.filter(
    (v): v is number => v !== null && Number.isFinite(v),
  );
  if (real.length < 2) return null;
  const recent = real.slice(-window);
  const prior = real.slice(-window * 2, -window);
  if (!recent.length || !prior.length) return null;
  return mean(recent) - mean(prior);
}

/** Most recent non-null value in a series. */
export function latest(values: (number | null)[]): number | null {
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i];
    if (v !== null && Number.isFinite(v)) return v;
  }
  return null;
}

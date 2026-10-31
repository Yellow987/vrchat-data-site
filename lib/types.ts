// Shared data shapes. Everything that crosses from server components into the
// client chart components must be plain-serializable (no Date objects), so dates
// are kept as ISO `YYYY-MM-DD` strings and times as minute offsets.

export interface SleepRow {
  /** ISO date, YYYY-MM-DD */
  date: string;
  /** Bedtime (fall-asleep clock) in minutes, night-anchored so after-midnight
   *  times sit above evening times on a continuous axis. null if unparseable. */
  bedtimeMin: number | null;
  /** Raw bedtime text as shown in the sheet, e.g. "8:05 PM". */
  bedtimeText: string | null;
  /** Sleep duration in minutes. */
  sleepMin: number | null;
  efficiency: number | null;
  latency: number | null;
  onsetHr: number | null;
  hrv: number | null;
  score: number | null;
  /** Body weight in lb (from Garmin). */
  weight: number | null;
}

export interface LiftRow {
  /** ISO datetime string. */
  timestamp: string;
  /** ISO date, YYYY-MM-DD (day bucket). */
  date: string;
  exercise: string;
  weightKg: number | null;
  reps: number | null;
  durationS: number | null;
}

export interface DanceRow {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** Raw timestamp text. */
  timestampText: string;
  /** Flexible numeric fields keyed by their sheet column header. */
  metrics: Record<string, number>;
}

export interface PhotoRow {
  /** ISO date the photo was taken, YYYY-MM-DD. */
  date: string;
  /** Direct-embeddable image URL (Google Drive thumbnail link). */
  imageUrl: string;
  /** Drive file id — lets us build an alternate URL if the thumbnail host fails. */
  fileId: string;
  /** Optional caption. */
  caption: string;
  /** Raw upload timestamp text (tiebreaker for multiple photos on one date). */
  uploaded: string;
}

export interface SiteData {
  sleep: SleepRow[];
  lifts: LiftRow[];
  dance: DanceRow[];
  danceColumns: string[];
  photos: PhotoRow[];
  /** Per-tab fetch status so the UI can show helpful empty/error states. */
  status: {
    sleep: TabStatus;
    lifts: TabStatus;
    dance: TabStatus;
    photos: TabStatus;
  };
}

export interface TabStatus {
  ok: boolean;
  /** "ok" | "empty" | "private" | "missing" | "error" */
  reason: "ok" | "empty" | "private" | "missing" | "error";
  message?: string;
  rowCount: number;
}

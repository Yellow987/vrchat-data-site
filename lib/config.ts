// Central config. The sheet ID and tab names are public (the data is public by
// design), so sane defaults live here and can be overridden by env vars.

export const SHEET_ID =
  process.env.NEXT_PUBLIC_SHEET_ID ||
  "1-FAKBI3xZjsrkrwXikwBW-9FHgGBjDyjMz-DTH8iRyA";

export const TABS = {
  sleep: process.env.NEXT_PUBLIC_SLEEP_TAB || "Sleep",
  lifts: process.env.NEXT_PUBLIC_LIFTS_TAB || "Lifts",
  dance: process.env.NEXT_PUBLIC_DANCE_TAB || "Dance",
  photos: process.env.NEXT_PUBLIC_PHOTOS_TAB || "Photos",
} as const;

export const REVALIDATE_SECONDS = Number(
  process.env.SHEET_REVALIDATE_SECONDS || 3600,
);

/** gviz CSV endpoint for a link-shareable sheet. Works without an API key. */
export function csvUrl(tab: string): string {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    tab,
  )}`;
}

/** Human link to open the sheet (shown in the UI footer). */
export function sheetHumanUrl(): string {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
}

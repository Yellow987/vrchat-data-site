// Authenticated reads of a PRIVATE Google Sheet via a service account.
//
// The public site used to read the sheet's public CSV with no credentials. To
// keep part of the sheet private we make the whole sheet private and read it
// server-side with a service account that the sheet is shared with (Viewer).
// The service account key is a secret — it lives only in env vars (Vercel /
// .env.local), never in the repo.
//
// If no service-account credentials are configured this module is inert
// (`hasServiceAccount()` is false) and the caller falls back to the public-CSV
// path, so the site keeps working during the migration and builds without any
// secret present.

import { JWT } from "google-auth-library";
import { REVALIDATE_SECONDS, SHEET_ID } from "./config";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

/** Read the service account from env. Supports, in order:
 *  - GOOGLE_SERVICE_ACCOUNT_JSON: the whole downloaded key file, as JSON (or
 *    base64-encoded JSON — handy when a UI mangles newlines).
 *  - GOOGLE_SA_EMAIL + GOOGLE_SA_PRIVATE_KEY: the two fields separately
 *    (literal "\n" in the key is converted to real newlines).
 *  Returns null when nothing usable is set. */
function readServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    const json = raw.startsWith("{")
      ? raw
      : safeBase64Json(raw);
    if (json) {
      try {
        const j = JSON.parse(json);
        if (j.client_email && j.private_key) {
          return { client_email: j.client_email, private_key: j.private_key };
        }
      } catch {
        /* fall through */
      }
    }
  }

  const email = process.env.GOOGLE_SA_EMAIL?.trim();
  const key = process.env.GOOGLE_SA_PRIVATE_KEY;
  if (email && key) {
    return { client_email: email, private_key: key.replace(/\\n/g, "\n") };
  }
  return null;
}

function safeBase64Json(s: string): string | null {
  try {
    return Buffer.from(s, "base64").toString("utf8");
  } catch {
    return null;
  }
}

/** Whether authenticated reads are available (creds are configured). */
export function hasServiceAccount(): boolean {
  return readServiceAccount() !== null;
}

let cachedJwt: JWT | null = null;
function jwtClient(sa: ServiceAccount): JWT {
  if (cachedJwt) return cachedJwt;
  cachedJwt = new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return cachedJwt;
}

/** A sheet name used as an A1 range, single-quoted and quote-escaped so tab
 *  names with spaces or apostrophes work. */
function rangeForTab(tab: string): string {
  return `'${tab.replace(/'/g, "''")}'`;
}

export class SheetApiError extends Error {
  constructor(
    message: string,
    readonly kind: "private" | "missing" | "error",
  ) {
    super(message);
    this.name = "SheetApiError";
  }
}

/** Fetch a whole worksheet (by tab name) as rows of formatted cell text.
 *  FORMATTED_VALUE returns exactly what the cell displays, so our existing
 *  text parsers (durations, clocks, dates) keep working unchanged — and, unlike
 *  the gviz CSV endpoint, it never blanks text dates.
 *  Throws SheetApiError for real failures (so the caller can map them to a
 *  TabStatus); returns null only when no credentials are configured. */
export async function fetchSheetRows(tab: string): Promise<string[][] | null> {
  const sa = readServiceAccount();
  if (!sa) return null;

  let token: string | null | undefined;
  try {
    ({ token } = await jwtClient(sa).getAccessToken());
  } catch {
    throw new SheetApiError("Could not authenticate the service account.", "error");
  }
  if (!token) {
    throw new SheetApiError("No access token for the service account.", "error");
  }

  const range = encodeURIComponent(rangeForTab(tab));
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}` +
    `?valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING&majorDimension=ROWS`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: REVALIDATE_SECONDS },
    });
  } catch {
    throw new SheetApiError(`Network error reading "${tab}".`, "error");
  }

  if (res.ok) {
    const json = (await res.json()) as { values?: string[][] };
    return json.values ?? [];
  }

  // Map Google's error shapes to our status reasons.
  const body = await res.text();
  if (res.status === 403) {
    throw new SheetApiError(
      "The service account can't read the sheet — share the sheet with it (Viewer).",
      "private",
    );
  }
  if (res.status === 400 && /unable to parse range/i.test(body)) {
    throw new SheetApiError(`Worksheet "${tab}" was not found in the sheet.`, "missing");
  }
  if (res.status === 404) {
    throw new SheetApiError(`Spreadsheet not found for "${tab}".`, "missing");
  }
  throw new SheetApiError(`Sheets API error (${res.status}) reading "${tab}".`, "error");
}

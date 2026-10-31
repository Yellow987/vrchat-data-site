"use client";

// The private section. Renders NOTHING unless the owner is signed in — for
// everyone else it's not in the DOM at all. When signed in it fetches the
// auth-gated /api/private route (never cached) and charts the private metrics
// with the same auto-detected-columns scheme as the Dance section.
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import DanceChart from "./DanceChart";
import type { PrivateData } from "@/lib/types";

export default function PrivatePanel() {
  const { status } = useSession();
  const [data, setData] = useState<PrivateData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    setLoading(true);
    setError(null);
    fetch("/api/private", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(
            r.status === 401 ? "Not authorized." : `Couldn't load (${r.status}).`,
          );
        }
        return (await r.json()) as PrivateData;
      })
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [status]);

  // Invisible to anyone who isn't the signed-in owner.
  if (status !== "authenticated") return null;

  const hasRows = !!data && data.rows.length > 0 && data.columns.length > 0;

  return (
    <section id="private" className="section">
      <div className="section-head">
        <h2>Private</h2>
        <span className="tag">owner only · 🔒</span>
      </div>

      {loading && (
        <div className="empty">
          <div>Loading private data…</div>
        </div>
      )}

      {error && (
        <div className="empty">
          <div className="big">Couldn’t load private data</div>
          <div>{error}</div>
        </div>
      )}

      {!loading && !error && hasRows && data && (
        <>
          <PrivateSummary data={data} />
          <div className="grid cols-2">
            {data.columns.map((col, i) => (
              <div className="card chart" key={col}>
                <div className="card-title">
                  <span>{col}</span>
                  <span className="card-sub">per entry</span>
                </div>
                <DanceChart
                  rows={data.rows}
                  column={col}
                  kind={i % 2 === 0 ? "bar" : "line"}
                  colorIndex={i}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && !error && data && !hasRows && (
        <div className="empty">
          <div className="big">No private entries yet</div>
          <div>Log one from the app and it shows up here — just for you.</div>
        </div>
      )}
    </section>
  );
}

function PrivateSummary({ data }: { data: PrivateData }) {
  const col = data.columns[0];
  const total = data.rows.reduce((s, r) => s + (r.metrics[col] ?? 0), 0);
  const entries = data.rows.length;
  const last = entries ? data.rows[entries - 1].date : "—";
  return (
    <div className="grid cols-3" style={{ marginBottom: 16 }}>
      <div className="card">
        <div className="stat">
          <span className="label">Entries</span>
          <span className="value">{entries}</span>
        </div>
      </div>
      <div className="card">
        <div className="stat">
          <span className="label">Total {col}</span>
          <span className="value">{Number.isInteger(total) ? total : total.toFixed(1)}</span>
        </div>
      </div>
      <div className="card">
        <div className="stat">
          <span className="label">Last logged</span>
          <span className="value" style={{ fontSize: 20 }}>{last}</span>
        </div>
      </div>
    </div>
  );
}

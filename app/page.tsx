import BedtimeChart from "@/components/BedtimeChart";
import DanceChart from "@/components/DanceChart";
import LiftsChart from "@/components/LiftsChart";
import ProgressGallery from "@/components/ProgressGallery";
import SleepHrvScatter from "@/components/SleepHrvScatter";
import TrendChart, { type ValueFormat } from "@/components/TrendChart";
import WeightChart from "@/components/WeightChart";
import { REVALIDATE_SECONDS, sheetHumanUrl } from "@/lib/config";
import {
  buildDeltas,
  buildHero,
  buildLiftSeries,
  buildScatter,
  buildSleepSeries,
  buildStreaks,
  buildWeightSeries,
  SLEEP_METRICS,
} from "@/lib/metrics";
import { getSiteData } from "@/lib/sheet";
import type { SiteData, TabStatus } from "@/lib/types";

export const revalidate = 3600;

// map each sleep metric to the TrendChart value format
const FORMAT: Record<string, ValueFormat> = {
  HRV: "int",
  Sleep: "duration",
  "Onset HR": "int",
  Efficiency: "int",
  Score: "int",
  Weight: "float",
};

export default async function Home() {
  const data = await getSiteData();
  const series = buildSleepSeries(data.sleep);
  const hero = buildHero(series, data.sleep);
  const deltas = buildDeltas(data.sleep);
  const streaks = buildStreaks(data.sleep);
  const scatter = buildScatter(data.sleep);
  const lifts = buildLiftSeries(data.lifts);
  const weightSeries = buildWeightSeries(series, data.photos);
  const hasPhotos = data.photos.length > 0;

  const sheetPrivate = data.status.sleep.reason === "private";

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="dot" />
            BIO·TELEMETRY
          </div>
          <nav className="nav">
            <a href="#sleep">Sleep</a>
            <a href="#body">Body</a>
            <a href="#progress">Progress</a>
            <a href="#lifts">Lifts</a>
            <a href="#dance">Dance</a>
          </nav>
        </div>
      </header>

      <main className="wrap">
        <section className="hero">
          <h1>Sleep, recovery &amp; movement — in the open.</h1>
          <p>
            Every night my ring, scale and trackers dump into one sheet. This is
            that sheet, live. I care about <strong>trends and week-over-week
            deltas</strong>, not single numbers — signal over noise.
          </p>
        </section>

        {sheetPrivate && (
          <div className="banner">
            <b>Waiting on the sheet.</b> The Google Sheet isn&apos;t public yet,
            so there&apos;s nothing to show. In the sheet: <b>File → Share →
            General access → Anyone with the link → Viewer</b> (or{" "}
            <b>File → Share → Publish to web</b>). The dashboard refreshes within
            an hour once it&apos;s shared.
          </div>
        )}

        {/* ------------------------------------------------ SLEEP */}
        <Section id="sleep" title="Sleep & Recovery" tag="Eight Sleep · nightly">
          {hero.date ? (
            <>
              <div className="card" style={{ marginBottom: 16 }}>
                <div
                  className="card-title"
                  style={{ padding: 0, marginBottom: 14 }}
                >
                  <span>Last night</span>
                  <span className="card-sub">{formatDateLong(hero.date)}</span>
                </div>
                <div className="grid cols-3">
                  {hero.stats.map((s) => (
                    <div className="stat" key={s.short}>
                      <span className="label">{s.short}</span>
                      <span className="value">
                        {s.valueText}
                        {s.unit && <span className="unit">{s.unit}</span>}
                      </span>
                      <span className="sub">{s.sub}</span>
                    </div>
                  ))}
                </div>
                <div className="chips">
                  {streaks.map((st) => (
                    <span className="chip" key={st.label}>
                      <b>{st.value}</b> {st.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* week-over-week deltas */}
              <div className="grid cols-3" style={{ marginBottom: 16 }}>
                {deltas.map((d) => (
                  <div className="card" key={d.short}>
                    <div className="stat">
                      <span className="label">{d.short}</span>
                      <span className="value">
                        {d.latestText}
                        {d.unit && <span className="unit">{d.unit}</span>}
                      </span>
                      <span style={{ marginTop: 6 }}>
                        <span className={`delta ${d.tone}`}>
                          {d.tone === "good"
                            ? "▲"
                            : d.tone === "bad"
                              ? "▼"
                              : "→"}{" "}
                          {d.deltaText}
                        </span>{" "}
                        <span className="card-sub">vs last week</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* trend charts: daily dots + 7-day rolling avg */}
              <div className="grid cols-2">
                {SLEEP_METRICS.filter((m) => m.short !== "Weight").map((m) => (
                  <div className="card chart" key={m.short}>
                    <div className="card-title">
                      <span>{m.label}</span>
                      <span className="card-sub">
                        {m.direction === "up-good"
                          ? "higher better"
                          : m.direction === "down-good"
                            ? "lower better"
                            : "trend"}
                        {m.unit ? ` · ${m.unit}` : ""}
                      </span>
                    </div>
                    <TrendChart
                      data={series}
                      dataKey={m.key as string}
                      avgKey={m.avgKey as string}
                      color={m.color}
                      unit={m.unit}
                      format={FORMAT[m.short]}
                    />
                  </div>
                ))}
              </div>

              {/* bedtime consistency + scatter */}
              <div className="grid cols-2" style={{ marginTop: 16 }}>
                <div className="card chart">
                  <div className="card-title">
                    <span>Bedtime consistency</span>
                    <span className="card-sub">asleep-clock vs 9:30–11pm band</span>
                  </div>
                  <BedtimeChart data={series} />
                </div>
                <div className="card chart">
                  <div className="card-title">
                    <span>Sleep ↔ HRV</span>
                    <span className="card-sub">does more sleep lift HRV?</span>
                  </div>
                  {scatter.length >= 3 ? (
                    <SleepHrvScatter data={scatter} />
                  ) : (
                    <SmallEmpty text="Need a few more nights of paired sleep + HRV." />
                  )}
                </div>
              </div>
            </>
          ) : (
            <StatusEmpty
              status={data.status.sleep}
              title="No sleep data yet"
              tab="Sleep"
            />
          )}
        </Section>

        {/* ------------------------------------------------ BODY */}
        <Section id="body" title="Body" tag="Garmin · weight">
          {series.some((p) => p.weight !== null) ? (
            <div className="card chart">
              <div className="card-title">
                <span>Body weight</span>
                <span className="card-sub">
                  daily · 7-day rolling avg · lb
                  {hasPhotos ? " · 📷 = progress photo" : ""}
                </span>
              </div>
              <WeightChart data={weightSeries} photos={data.photos} height={260} />
            </div>
          ) : (
            <StatusEmpty
              status={data.status.sleep}
              title="No weight data yet"
              tab="Sleep"
              hint="Weight lives in the Sleep tab's Weight column."
            />
          )}
        </Section>

        {/* ------------------------------------------------ PROGRESS */}
        <Section id="progress" title="Progress Photos" tag="self-captured">
          {hasPhotos ? (
            <ProgressGallery photos={data.photos} />
          ) : (
            <StatusEmpty
              status={data.status.photos}
              title="No progress photos yet"
              tab="Photos"
              hint="Add a progress photo (with its date) from the Last Meal app and it shows up here — on the weight line as a 📷 marker, and in a before/after comparison below."
            />
          )}
        </Section>

        {/* ------------------------------------------------ LIFTS */}
        <Section id="lifts" title="Lifts" tag="LiftLog · best reps">
          {lifts.length > 0 ? (
            <div className="grid cols-2">
              {lifts.map((s) => (
                <div className="card chart" key={s.exercise}>
                  <div className="card-title">
                    <span>{s.exercise}</span>
                    <span className="card-sub">best set reps</span>
                  </div>
                  <LiftsChart series={s} />
                </div>
              ))}
            </div>
          ) : (
            <StatusEmpty
              status={data.status.lifts}
              title="No lifts logged yet"
              tab="Lifts"
              hint="The LiftLog app will fill the Lifts tab (push-ups, squats, barbell curls). This section lights up automatically."
            />
          )}
        </Section>

        {/* ------------------------------------------------ DANCE */}
        <Section id="dance" title="Dance / Cardio" tag="VR dance tracker">
          {data.dance.length > 0 && data.danceColumns.length > 0 ? (
            <div className="grid cols-2">
              {data.danceColumns.map((col, i) => (
                <div className="card chart" key={col}>
                  <div className="card-title">
                    <span>{col}</span>
                    <span className="card-sub">per session</span>
                  </div>
                  <DanceChart
                    rows={data.dance}
                    column={col}
                    kind={i % 2 === 0 ? "bar" : "line"}
                    colorIndex={i}
                  />
                </div>
              ))}
            </div>
          ) : (
            <StatusEmpty
              status={data.status.dance}
              title="No dance sessions yet"
              tab="Dance"
              hint="The VR dance tracker records active minutes, movement and HR per session. This section fills in as sessions land."
            />
          )}
        </Section>

        <Footer data={data} />
      </main>
    </>
  );
}

// ---------- small server components ----------

function Section({
  id,
  title,
  tag,
  children,
}: {
  id: string;
  title: string;
  tag: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="section">
      <div className="section-head">
        <h2>{title}</h2>
        <span className="tag">{tag}</span>
      </div>
      {children}
    </section>
  );
}

function StatusEmpty({
  status,
  title,
  tab,
  hint,
}: {
  status: TabStatus;
  title: string;
  tab: string;
  hint?: string;
}) {
  let msg = hint;
  if (status.reason === "private")
    msg =
      "The sheet isn't public yet — share it as 'anyone with the link can view', then this appears automatically.";
  else if (status.reason === "missing")
    msg = `No "${tab}" worksheet found in the sheet yet.${hint ? " " + hint : ""}`;
  else if (status.reason === "error")
    msg = status.message || "Couldn't reach the sheet.";
  return (
    <div className="empty">
      <div className="big">{title}</div>
      <div>{msg}</div>
    </div>
  );
}

function SmallEmpty({ text }: { text: string }) {
  return (
    <div style={{ padding: "40px 12px", textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>
      {text}
    </div>
  );
}

function Footer({ data }: { data: SiteData }) {
  const n = data.sleep.length;
  return (
    <footer className="footer">
      <span>
        {n > 0
          ? `${n} nights logged · live from Google Sheets · refreshes hourly`
          : "live from Google Sheets"}
      </span>
      <span>
        <a href={sheetHumanUrl()} target="_blank" rel="noreferrer">
          source sheet
        </a>{" "}
        · cache {Math.round(REVALIDATE_SECONDS / 60)}m
      </span>
    </footer>
  );
}

function formatDateLong(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

"use client";

import { useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Lightbox from "@/components/Lightbox";
import type { WeightPoint } from "@/lib/metrics";
import {
  PALETTE,
  tooltipItemStyle,
  tooltipLabelStyle,
  tooltipStyle,
} from "@/lib/palette";
import type { PhotoRow } from "@/lib/types";

const f1 = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? "—"
    : (Math.round(v * 10) / 10).toFixed(1);

// Tooltip that ignores the invisible photo-marker series (dataKey "photoY"),
// which would otherwise show up as a duplicate "daily" row.
function WeightTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const rows = payload
    .filter((p: any) => p.dataKey === "weight" || p.dataKey === "weightAvg")
    .map((p: any) => ({
      name: p.dataKey === "weightAvg" ? "7-day avg" : "daily",
      value: f1(p.value),
    }));
  if (rows.length === 0) return null;
  return (
    <div style={tooltipStyle as any}>
      <div style={{ ...tooltipLabelStyle, padding: "2px 2px 4px" }}>{label}</div>
      {rows.map((r: any) => (
        <div key={r.name} style={{ ...tooltipItemStyle, padding: "1px 2px" }}>
          {r.name}: {r.value} lb
        </div>
      ))}
    </div>
  );
}

interface HoverState {
  x: number;
  y: number;
  thumb: string;
  count: number;
  date: string;
  index: number;
}

interface Props {
  data: WeightPoint[];
  photos: PhotoRow[];
  height?: number;
}

export default function WeightChart({ data, photos, height = 260 }: Props) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);

  // Custom dot: a camera marker, but only on days that carry a photo.
  const renderMarker = (props: any) => {
    const { cx, cy, payload, index } = props;
    const key = `m-${payload?.date ?? index}`;
    if (
      payload?.photoY === null ||
      payload?.photoY === undefined ||
      payload?.photoIndex === null ||
      payload?.photoIndex === undefined ||
      cx === undefined ||
      cy === undefined
    ) {
      return <g key={key} />;
    }
    const count: number = payload.photoCount || 1;
    const gi: number = payload.photoIndex;
    const thumb: string = payload.photoThumb;
    const date: string = payload.date;

    return (
      <g
        key={key}
        style={{ cursor: "pointer" }}
        onMouseEnter={() =>
          setHover({ x: cx, y: cy, thumb, count, date, index: gi })
        }
        onMouseLeave={() => setHover(null)}
        onClick={() => setLightbox(gi)}
      >
        {/* generous transparent hit area */}
        <circle cx={cx} cy={cy} r={14} fill="transparent" />
        {/* halo */}
        <circle cx={cx} cy={cy} r={9} fill={PALETTE.amber} opacity={0.18} />
        {/* camera body */}
        <g transform={`translate(${cx - 7}, ${cy - 6})`}>
          <rect x={0} y={2} width={14} height={9} rx={2} fill={PALETTE.amber} />
          <rect x={4.5} y={0} width={5} height={3} rx={1} fill={PALETTE.amber} />
          <circle cx={7} cy={7} r={2.4} fill="#07070d" />
        </g>
        {count > 1 && (
          <>
            <circle cx={cx + 8} cy={cy - 8} r={6} fill="#07070d" />
            <circle
              cx={cx + 8}
              cy={cy - 8}
              r={6}
              fill="none"
              stroke={PALETTE.amber}
              strokeWidth={1}
            />
            <text
              x={cx + 8}
              y={cy - 8}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={8}
              fontWeight={800}
              fill={PALETTE.amber}
            >
              {count}
            </text>
          </>
        )}
      </g>
    );
  };

  return (
    <div style={{ position: "relative" }}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
        >
          <CartesianGrid stroke={PALETTE.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: PALETTE.textFaint, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: PALETTE.border }}
            minTickGap={28}
          />
          <YAxis
            width={44}
            domain={["auto", "auto"]}
            tick={{ fill: PALETTE.textFaint, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => f1(v)}
          />
          <Tooltip content={<WeightTooltip />} />
          {/* daily dots — muted */}
          <Line
            type="monotone"
            dataKey="weight"
            stroke="transparent"
            dot={{ r: 2.5, fill: PALETTE.dot, strokeWidth: 0 }}
            activeDot={{ r: 4, fill: PALETTE.cyan }}
            isAnimationActive={false}
            connectNulls
          />
          {/* 7-day rolling average — the signal */}
          <Line
            type="monotone"
            dataKey="weightAvg"
            stroke={PALETTE.cyan}
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
          {/* photo markers — invisible line, custom camera dots on photo days */}
          <Line
            dataKey="photoY"
            stroke="transparent"
            dot={renderMarker}
            activeDot={false}
            isAnimationActive={false}
            connectNulls={false}
            legendType="none"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {hover && (
        <div
          className="photo-peek"
          style={{ left: hover.x, top: hover.y - 14 }}
          onClick={() => setLightbox(hover.index)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hover.thumb} alt="" referrerPolicy="no-referrer" />
          <div className="photo-peek-meta">
            {hover.count > 1 ? `${hover.count} photos` : "Progress photo"}
            <span>click to open</span>
          </div>
        </div>
      )}

      <Lightbox
        photos={photos}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndex={setLightbox}
      />
    </div>
  );
}

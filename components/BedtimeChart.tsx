"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatClock } from "@/lib/parse";
import {
  PALETTE,
  tooltipItemStyle,
  tooltipLabelStyle,
  tooltipStyle,
} from "@/lib/palette";

interface Props {
  data: any[];
  /** Bedtime consistency band [low, high] in anchored minutes, or null. */
  bedBand?: [number, number] | null;
  /** Wake consistency band [low, high] in minutes, or null. */
  wakeBand?: [number, number] | null;
  /** Whether the wake series is derived (bedtime + duration) vs a real column. */
  wakeDerived?: boolean;
  height?: number;
}

const finite = (v: any): v is number => v !== null && Number.isFinite(v);

export default function BedtimeChart({
  data,
  bedBand = null,
  wakeBand = null,
  wakeDerived = false,
  height = 220,
}: Props) {
  const bedVals = data.map((d) => d.bedtimeMin).filter(finite) as number[];
  const wakeVals = data.map((d) => d.wakeMin).filter(finite) as number[];

  // Axis spans from the earliest wake (bottom) to the latest bedtime (top),
  // including the bands, with a little padding.
  const tops = [...bedVals, ...(bedBand ? [bedBand[1]] : [])];
  const bots = [...wakeVals, ...(wakeBand ? [wakeBand[0]] : [])];
  const hi = (tops.length ? Math.max(...tops) : 23 * 60) + 25;
  const lo = (bots.length ? Math.min(...bots) : 6 * 60) - 25;

  const seriesName: Record<string, string> = {
    bedtimeMin: "asleep",
    bedtimeAvg: "asleep · 7-day",
    wakeMin: wakeDerived ? "wake (est.)" : "wake",
    wakeAvg: wakeDerived ? "wake 7-day (est.)" : "wake · 7-day",
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={PALETTE.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: PALETTE.textFaint, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: PALETTE.border }}
          minTickGap={28}
        />
        <YAxis
          width={58}
          domain={[lo, hi]}
          tick={{ fill: PALETTE.textFaint, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatClock(v)}
        />

        {/* Your own consistency bands (median ± tolerance). */}
        {bedBand && (
          <ReferenceArea
            y1={bedBand[0]}
            y2={bedBand[1]}
            fill={PALETTE.violet}
            fillOpacity={0.1}
            stroke={PALETTE.violet}
            strokeOpacity={0.25}
            strokeDasharray="4 4"
          />
        )}
        {wakeBand && (
          <ReferenceArea
            y1={wakeBand[0]}
            y2={wakeBand[1]}
            fill={PALETTE.amber}
            fillOpacity={0.1}
            stroke={PALETTE.amber}
            strokeOpacity={0.25}
            strokeDasharray="4 4"
          />
        )}

        <Tooltip
          contentStyle={tooltipStyle}
          itemStyle={tooltipItemStyle}
          labelStyle={tooltipLabelStyle}
          formatter={(value: any, name: any) => [
            formatClock(value),
            seriesName[name] ?? name,
          ]}
        />

        {/* Bedtime: muted daily dots + bright 7-day average. */}
        <Line
          type="monotone"
          dataKey="bedtimeMin"
          stroke="transparent"
          dot={{ r: 2.5, fill: PALETTE.dot, strokeWidth: 0 }}
          activeDot={{ r: 4, fill: PALETTE.violet }}
          isAnimationActive={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="bedtimeAvg"
          stroke={PALETTE.violet}
          strokeWidth={2.5}
          dot={false}
          isAnimationActive={false}
          connectNulls
        />

        {/* Wake: same treatment, amber. Dashed line when derived (estimated). */}
        <Line
          type="monotone"
          dataKey="wakeMin"
          stroke="transparent"
          dot={{ r: 2.5, fill: PALETTE.dot, strokeWidth: 0 }}
          activeDot={{ r: 4, fill: PALETTE.amber }}
          isAnimationActive={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="wakeAvg"
          stroke={PALETTE.amber}
          strokeWidth={2.5}
          strokeDasharray={wakeDerived ? "5 4" : undefined}
          dot={false}
          isAnimationActive={false}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

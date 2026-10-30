"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LiftSeries } from "@/lib/metrics";
import {
  PALETTE,
  tooltipItemStyle,
  tooltipLabelStyle,
  tooltipStyle,
} from "@/lib/palette";

const COLORS = [PALETTE.cyan, PALETTE.violet, PALETTE.magenta, PALETTE.amber, PALETTE.lime];

export default function LiftsChart({
  series,
  height = 200,
}: {
  series: LiftSeries;
  color?: string;
  height?: number;
}) {
  const idx = Math.abs(hashString(series.exercise)) % COLORS.length;
  const color = COLORS[idx];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={series.points} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={PALETTE.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: PALETTE.textFaint, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: PALETTE.border }}
          minTickGap={24}
        />
        <YAxis
          width={34}
          allowDecimals={false}
          domain={[0, "auto"]}
          tick={{ fill: PALETTE.textFaint, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          itemStyle={tooltipItemStyle}
          labelStyle={tooltipLabelStyle}
          formatter={(value: any) => [`${value} reps`, "best set"]}
        />
        <Line
          type="monotone"
          dataKey="bestReps"
          stroke={color}
          strokeWidth={2.5}
          dot={{ r: 3, fill: color, strokeWidth: 0 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

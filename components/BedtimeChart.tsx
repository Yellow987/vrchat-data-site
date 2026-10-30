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
  /** target band in anchored minutes, e.g. [1290, 1380] == 9:30pm–11:00pm */
  targetLow?: number;
  targetHigh?: number;
  height?: number;
}

export default function BedtimeChart({
  data,
  targetLow = 21.5 * 60, // 9:30 PM
  targetHigh = 23 * 60, // 11:00 PM
  height = 220,
}: Props) {
  const vals = data
    .map((d) => d.bedtimeMin)
    .filter((v) => v !== null && Number.isFinite(v)) as number[];
  const lo = Math.min(targetLow, ...vals) - 20;
  const hi = Math.max(targetHigh, ...vals) + 20;

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
        <ReferenceArea
          y1={targetLow}
          y2={targetHigh}
          fill={PALETTE.good}
          fillOpacity={0.1}
          stroke={PALETTE.good}
          strokeOpacity={0.25}
          strokeDasharray="4 4"
        />
        <Tooltip
          contentStyle={tooltipStyle}
          itemStyle={tooltipItemStyle}
          labelStyle={tooltipLabelStyle}
          formatter={(value: any, name: any) => [
            formatClock(value),
            name === "bedtimeAvg" ? "7-day avg" : "asleep",
          ]}
        />
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
      </ComposedChart>
    </ResponsiveContainer>
  );
}

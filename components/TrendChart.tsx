"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatClock, formatDuration } from "@/lib/parse";
import {
  PALETTE,
  tooltipItemStyle,
  tooltipLabelStyle,
  tooltipStyle,
} from "@/lib/palette";

export type ValueFormat = "int" | "float" | "duration" | "clock";

function fmt(v: number | null | undefined, format: ValueFormat): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  switch (format) {
    case "duration":
      return formatDuration(v);
    case "clock":
      return formatClock(v);
    case "float":
      return (Math.round(v * 10) / 10).toFixed(1);
    default:
      return String(Math.round(v));
  }
}

interface Props {
  data: any[];
  dataKey: string;
  avgKey: string;
  color: string;
  unit?: string;
  format?: ValueFormat;
  /** invert Y so "lower is better" metrics read downward-good (optional) */
  reversed?: boolean;
  height?: number;
}

export default function TrendChart({
  data,
  dataKey,
  avgKey,
  color,
  unit = "",
  format = "int",
  reversed = false,
  height = 200,
}: Props) {
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
          width={44}
          reversed={reversed}
          domain={["auto", "auto"]}
          tick={{ fill: PALETTE.textFaint, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => fmt(v, format)}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          itemStyle={tooltipItemStyle}
          labelStyle={tooltipLabelStyle}
          formatter={(value: any, name: any) => [
            fmt(value, format) + (unit ? ` ${unit}` : ""),
            name === avgKey ? "7-day avg" : "daily",
          ]}
        />
        {/* daily dots — muted, no connecting line */}
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke="transparent"
          dot={{ r: 2.5, fill: PALETTE.dot, strokeWidth: 0 }}
          activeDot={{ r: 4, fill: color }}
          isAnimationActive={false}
          connectNulls
        />
        {/* 7-day rolling average — the signal */}
        <Line
          type="monotone"
          dataKey={avgKey}
          stroke={color}
          strokeWidth={2.5}
          dot={false}
          isAnimationActive={false}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

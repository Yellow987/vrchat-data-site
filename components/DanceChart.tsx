"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DanceRow } from "@/lib/types";
import {
  PALETTE,
  tooltipItemStyle,
  tooltipLabelStyle,
  tooltipStyle,
} from "@/lib/palette";

const COLORS = [PALETTE.magenta, PALETTE.cyan, PALETTE.amber, PALETTE.lime];

function shortLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DanceChart({
  rows,
  column,
  kind = "bar",
  height = 200,
  colorIndex = 0,
}: {
  rows: DanceRow[];
  column: string;
  kind?: "bar" | "line";
  height?: number;
  colorIndex?: number;
}) {
  const color = COLORS[colorIndex % COLORS.length];
  const data = rows.map((r) => ({
    label: shortLabel(r.date),
    value: r.metrics[column] ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={PALETTE.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: PALETTE.textFaint, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: PALETTE.border }}
          minTickGap={24}
        />
        <YAxis
          width={38}
          domain={[0, "auto"]}
          tick={{ fill: PALETTE.textFaint, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          itemStyle={tooltipItemStyle}
          labelStyle={tooltipLabelStyle}
          formatter={(value: any) => [value, column]}
        />
        {kind === "bar" ? (
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        ) : (
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            isAnimationActive={false}
            connectNulls
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

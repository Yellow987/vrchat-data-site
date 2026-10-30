"use client";

import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { ScatterPoint } from "@/lib/metrics";
import {
  PALETTE,
  tooltipItemStyle,
  tooltipLabelStyle,
  tooltipStyle,
} from "@/lib/palette";

export default function SleepHrvScatter({
  data,
  height = 240,
}: {
  data: ScatterPoint[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 10, right: 16, bottom: 18, left: 0 }}>
        <CartesianGrid stroke={PALETTE.grid} />
        <XAxis
          type="number"
          dataKey="sleepHours"
          name="Sleep"
          unit="h"
          domain={["auto", "auto"]}
          tick={{ fill: PALETTE.textFaint, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: PALETTE.border }}
          label={{
            value: "sleep (h)",
            position: "insideBottom",
            offset: -10,
            fill: PALETTE.textFaint,
            fontSize: 11,
          }}
        />
        <YAxis
          type="number"
          dataKey="hrv"
          name="HRV"
          unit="ms"
          domain={["auto", "auto"]}
          width={44}
          tick={{ fill: PALETTE.textFaint, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <ZAxis range={[40, 40]} />
        <Tooltip
          cursor={{ strokeDasharray: "3 3", stroke: PALETTE.border }}
          contentStyle={tooltipStyle}
          itemStyle={tooltipItemStyle}
          labelStyle={tooltipLabelStyle}
          formatter={(value: any, name: any) => [
            name === "HRV" ? `${value} ms` : `${value} h`,
            name,
          ]}
        />
        <Scatter
          data={data}
          fill={PALETTE.cyan}
          fillOpacity={0.65}
          stroke={PALETTE.cyan}
          strokeOpacity={0.9}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

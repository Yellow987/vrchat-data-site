// Concrete hex values mirroring the CSS custom properties in globals.css.
// Recharts writes colors as SVG presentation attributes, where CSS var() does
// not resolve, so charts must use these literals. Keep in sync with :root.

export const PALETTE = {
  cyan: "#22d3ee",
  violet: "#a78bfa",
  magenta: "#f472b6",
  amber: "#fbbf24",
  lime: "#a3e635",
  good: "#4ade80",
  bad: "#fb7185",
  neutral: "#8b93c9",
  grid: "#20202e",
  dot: "#4b4b63",
  textDim: "#a3a1b8",
  textFaint: "#6b6980",
  panel: "#12121d",
  border: "#262636",
} as const;

export const tooltipStyle = {
  background: "#12121d",
  border: "1px solid #262636",
  borderRadius: 10,
  color: "#ecebf5",
  fontSize: 12,
};
export const tooltipItemStyle = { color: "#ecebf5" };
export const tooltipLabelStyle = { color: "#a3a1b8", fontWeight: 700 };

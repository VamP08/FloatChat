/**
 * Shared Recharts styling, so every chart in the app reads as the same instrument.
 *
 * Recharts defaults to a light theme with a purple series colour. Left alone it puts a
 * white card in the middle of a dark ocean, which is what the charts here used to do.
 */

// The emission colours from world.css, repeated here because Recharts needs literal
// values rather than CSS custom properties for its SVG strokes.
export const SERIES_COLOUR = {
  temp: "#ff6b57",
  psal: "#ffc94a",
  doxy: "#2ee8ff",
  chla: "#7cff63",
  nitrate: "#5b8cff",
  bbp700: "#c7a4ff",
  ph: "#ff7bd5",
};

export const ACTION = "#3dffc0";
export const INK = "#e8f1f5";
export const INK_DIM = "#93a8b4";
export const INK_FAINT = "#6d8194";
export const EDGE = "#1b2b38";

export const gridProps = {
  stroke: EDGE,
  strokeDasharray: "2 4",
  vertical: false,
};

export const axisProps = {
  stroke: EDGE,
  tick: { fill: INK_FAINT, fontSize: 11 },
  tickLine: { stroke: EDGE },
};

export const labelStyle = {
  fill: INK_DIM,
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

export const tooltipProps = {
  contentStyle: {
    background: "#0a141d",
    border: `1px solid ${EDGE}`,
    borderRadius: 3,
    boxShadow: "0 12px 32px -8px rgb(0 0 0 / 0.7)",
    fontSize: 12,
  },
  labelStyle: { color: INK_DIM, marginBottom: 4 },
  itemStyle: { color: INK },
  cursor: { stroke: EDGE, strokeDasharray: "3 3" },
};

export const colourFor = (parameter) => SERIES_COLOUR[parameter] ?? ACTION;

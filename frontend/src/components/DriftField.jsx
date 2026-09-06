import { useEffect, useRef } from "react";
import trackData from "../data/tracks.json";

/**
 * The drift of 83 Argo floats through the northern Indian Ocean, drawn as wakes.
 *
 * Three things here are data rather than decoration, and that is the whole point of
 * the picture:
 *
 *   Colour   is the parameter each float holds the most readings for. Floats whose
 *            biogeochemical sensors produced nothing that passed quality control have
 *            no colour, and draw in grey. The dark ones are the missing record.
 *   Brightness falls off backwards along each path, so the newest cycle is the
 *            brightest point and a float's history dims behind it.
 *   Light    answers movement. Dinoflagellates flash when something disturbs the
 *            water; the pointer disturbs this water, and the wake it passes through
 *            fires and then decays. It is the one authored motion on the page.
 *
 * How the light is actually made: every pass composites additively, so where wakes
 * cross, their light sums the way real emission does instead of painting over itself.
 * Four passes per band, widest and faintest first, build the bloom. Paths are drawn as
 * curves through segment midpoints because a float's drift loops and meanders, and
 * straight chords between sampled positions read as noise.
 */

// Emission peaks of real marine organisms, matching the parameter palette in world.css.
const EMISSION = {
  doxy: [46, 232, 255],
  chla: [124, 255, 99],
  nitrate: [91, 140, 255],
  bbp700: [199, 164, 255],
  ph: [255, 123, 213],
};
// A float with no usable biogeochemical readings. Deliberately colourless.
const UNLIT = [104, 126, 143];

// Derived from the tracks rather than declared. The selection box and the drawn box
// are not the same thing: floats were chosen by where they reported, but a float can
// wander outside that box over twelve years, and a hardcoded frame clips it mid-path.
const BOUNDS = trackData.tracks.reduce(
  (box, track) => {
    track.pts.forEach(([lon, lat]) => {
      if (lon < box.lonMin) box.lonMin = lon;
      if (lon > box.lonMax) box.lonMax = lon;
      if (lat < box.latMin) box.latMin = lat;
      if (lat > box.latMax) box.latMax = lat;
    });
    return box;
  },
  { lonMin: Infinity, lonMax: -Infinity, latMin: Infinity, latMax: -Infinity },
);

const BANDS = 8;
// Widest and faintest first. Additively stacked, these become the bloom.
const BLOOM = [
  { width: 22, alpha: 0.016 },
  { width: 10, alpha: 0.032 },
  { width: 4, alpha: 0.06 },
  { width: 1.6, alpha: 0.12 },
  { width: 0.8, alpha: 0.34 },
];
const EXCITE_RADIUS = 150;
const EXCITE_DECAY = 0.93;
const CELL = 64;

export default function DriftField({ className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let layers = [];
    let segments = [];
    let grid = new Map();
    let energy = new Float32Array(0);
    let width = 0;
    let height = 0;
    let frame = 0;
    let reveal = reduceMotion ? BANDS : 0;
    const pointer = { x: -9999, y: -9999, active: false };

    function project() {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const scale = Math.max(
        width / (BOUNDS.lonMax - BOUNDS.lonMin),
        height / (BOUNDS.latMax - BOUNDS.latMin),
      );
      const offsetX = (width - (BOUNDS.lonMax - BOUNDS.lonMin) * scale) / 2;
      const offsetY = (height - (BOUNDS.latMax - BOUNDS.latMin) * scale) / 2;
      const toX = (lon) => offsetX + (lon - BOUNDS.lonMin) * scale;
      const toY = (lat) => offsetY + (BOUNDS.latMax - lat) * scale;

      // One Path2D per colour and brightness band, built once per resize. Bands rise
      // with age, so the reveal is simply how many bands are drawn.
      const paths = new Map();
      segments = [];

      trackData.tracks.forEach((track) => {
        const rgb = EMISSION[track.bgc] ?? UNLIT;
        const dim = track.bgc == null ? 0.42 : 1;
        const points = track.pts.map(([lon, lat]) => [toX(lon), toY(lat)]);
        if (points.length < 2) return;

        let run = null;
        let runBand = -1;
        for (let i = 1; i < points.length; i += 1) {
          const age = i / (points.length - 1);
          const strength = (0.1 + age * age * 0.9) * dim;
          const band = Math.max(0, Math.min(BANDS - 1, Math.floor(strength * BANDS)));
          const key = `${rgb.join()}|${band}`;

          if (band !== runBand) {
            let entry = paths.get(key);
            if (!entry) paths.set(key, (entry = { rgb, band, path: new Path2D() }));
            run = entry.path;
            runBand = band;
            run.moveTo(points[i - 1][0], points[i - 1][1]);
          }
          // Curve through the midpoint so meanders read as meanders, not zigzags.
          const [px, py] = points[i - 1];
          const [cx, cy] = points[i];
          run.quadraticCurveTo(px, py, (px + cx) / 2, (py + cy) / 2);

          segments.push({ x: px, y: py, x2: cx, y2: cy, rgb, strength });
        }
      });

      layers = [...paths.values()].sort((a, b) => a.band - b.band);

      energy = new Float32Array(segments.length);
      grid = new Map();
      segments.forEach((seg, index) => {
        const key = `${Math.floor(seg.x / CELL)}:${Math.floor(seg.y / CELL)}`;
        let bucket = grid.get(key);
        if (!bucket) grid.set(key, (bucket = []));
        bucket.push(index);
      });
    }

    function nearPointer() {
      const found = [];
      const cx = Math.floor(pointer.x / CELL);
      const cy = Math.floor(pointer.y / CELL);
      const span = Math.ceil(EXCITE_RADIUS / CELL);
      for (let gx = cx - span; gx <= cx + span; gx += 1) {
        for (let gy = cy - span; gy <= cy + span; gy += 1) {
          const bucket = grid.get(`${gx}:${gy}`);
          if (bucket) found.push(...bucket);
        }
      }
      return found;
    }

    function draw() {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#03070c";
      ctx.fillRect(0, 0, width, height);

      // Light adds where wakes cross, as emission does.
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (const pass of BLOOM) {
        for (const layer of layers) {
          if (layer.band > reveal) continue;
          const level = (layer.band + 1) / BANDS;
          const [r, g, b] = layer.rgb;
          ctx.strokeStyle = `rgba(${r},${g},${b},${(pass.alpha * level).toFixed(4)})`;
          ctx.lineWidth = pass.width * (0.4 + level * 0.85);
          ctx.stroke(layer.path);
        }
      }

      // The disturbance response, drawn only where it exists.
      for (let i = 0; i < energy.length; i += 1) {
        const charge = energy[i];
        if (charge < 0.02) continue;
        const seg = segments[i];
        const [r, g, b] = seg.rgb;
        ctx.strokeStyle = `rgba(${r},${g},${b},${(charge * 0.5).toFixed(3)})`;
        ctx.lineWidth = 1 + charge * 3.5;
        ctx.beginPath();
        ctx.moveTo(seg.x, seg.y);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
      }

      ctx.globalCompositeOperation = "source-over";
    }

    function tick() {
      if (reveal < BANDS) reveal += 0.11;

      for (let i = 0; i < energy.length; i += 1) {
        if (energy[i] > 0.002) energy[i] *= EXCITE_DECAY;
        else energy[i] = 0;
      }

      if (pointer.active) {
        for (const index of nearPointer()) {
          const seg = segments[index];
          const distance = Math.hypot(seg.x - pointer.x, seg.y - pointer.y);
          if (distance < EXCITE_RADIUS) {
            const falloff = 1 - distance / EXCITE_RADIUS;
            energy[index] = Math.min(1, energy[index] + falloff * falloff * 0.55);
          }
        }
      }

      draw();
      frame = requestAnimationFrame(tick);
    }

    function handleMove(event) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    }

    function handleLeave() {
      pointer.active = false;
    }

    project();
    if (reduceMotion) {
      draw();
    } else {
      frame = requestAnimationFrame(tick);
      window.addEventListener("pointermove", handleMove);
      canvas.addEventListener("pointerleave", handleLeave);
    }

    const observer = new ResizeObserver(() => {
      project();
      if (reduceMotion) draw();
    });
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", handleMove);
      canvas.removeEventListener("pointerleave", handleLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role="img"
      aria-label={
        `Drift paths of ${trackData.stats.floats} Argo floats across the northern ` +
        `Indian Ocean between ${trackData.stats.first} and ${trackData.stats.last}. ` +
        `Each path is coloured by the measurement that float carries most of, and ` +
        `fades backwards into its own history.`
      }
    />
  );
}

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
 *
 * What it costs: the bloom is a few hundred wide additive strokes, too heavy to repeat
 * every frame, and it never changes once revealed. So it has a canvas of its own that
 * is drawn once per reveal step and then left alone, and the lit wake goes on a clear
 * canvas above it, added by the compositor with plus-lighter, the same sum `lighter`
 * makes inside a canvas. A frame touches only that clear canvas. The loop sleeps when
 * nothing is lit and the pointer is away, and while the canvas is off screen.
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
// Per 60 Hz frame. Scaled by elapsed time, so the glow lasts as long on a 120 Hz
// screen or a machine that drops frames.
const EXCITE_DECAY = 0.93;
const FRAME_MS = 1000 / 60;
const CELL = 64;

export default function DriftField({ className = "" }) {
  const canvasRef = useRef(null);
  const glowRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const glow = glowRef.current;
    if (!canvas || !glow) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    const glowCtx = glow.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let layers = [];
    let segments = [];
    let grid = new Map();
    let energy = new Float32Array(0);
    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;
    let visible = true;
    let reveal = reduceMotion ? BANDS : 0;
    const pointer = { x: -9999, y: -9999, active: false };
    // How many bands the bloom canvas holds; -1 means it needs drawing.
    let fieldBands = -1;
    let glowing = false;

    function project() {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = glow.width = Math.round(width * dpr);
      canvas.height = glow.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      glowCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fieldBands = -1;
      glowing = false;

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

          segments.push({ x: px, y: py, x2: cx, y2: cy, color: rgb.join(), strength });
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

    function renderField(bands) {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#03070c";
      ctx.fillRect(0, 0, width, height);

      // Light adds where wakes cross, as emission does.
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (const pass of BLOOM) {
        for (const layer of layers) {
          if (layer.band > bands) continue;
          const level = (layer.band + 1) / BANDS;
          const [r, g, b] = layer.rgb;
          ctx.strokeStyle = `rgba(${r},${g},${b},${(pass.alpha * level).toFixed(4)})`;
          ctx.lineWidth = pass.width * (0.4 + level * 0.85);
          ctx.stroke(layer.path);
        }
      }
      ctx.globalCompositeOperation = "source-over";
      fieldBands = bands;
    }

    // Returns whether anything is still lit, so the loop knows when it can sleep.
    function draw() {
      if (width === 0) return false;
      const bands = Math.floor(Math.min(reveal, BANDS));
      if (bands !== fieldBands) renderField(bands);

      // An untouched glow canvas costs nothing to composite; only clear it when it has
      // something on it.
      let lit = false;
      if (glowing) glowCtx.clearRect(0, 0, width, height);

      // The disturbance response, drawn only where it exists. One stroke per segment,
      // so crossing wakes add up here too.
      glowCtx.globalCompositeOperation = "lighter";
      glowCtx.lineCap = "round";
      for (let i = 0; i < energy.length; i += 1) {
        const charge = energy[i];
        if (charge < 0.02) continue;
        lit = true;
        const seg = segments[i];
        glowCtx.strokeStyle = `rgba(${seg.color},${(charge * 0.5).toFixed(3)})`;
        glowCtx.lineWidth = 1 + charge * 3.5;
        glowCtx.beginPath();
        glowCtx.moveTo(seg.x, seg.y);
        glowCtx.lineTo(seg.x2, seg.y2);
        glowCtx.stroke();
      }
      glowCtx.globalCompositeOperation = "source-over";
      glowing = lit;
      return lit;
    }

    function tick(now) {
      // Elapsed time in 60 Hz frames, capped so a backgrounded tab does not jump.
      const steps = last ? Math.min(now - last, 100) / FRAME_MS : 1;
      last = now;
      if (reveal < BANDS) reveal += 0.11 * steps;

      const decay = EXCITE_DECAY ** steps;
      for (let i = 0; i < energy.length; i += 1) {
        if (energy[i] > 0.002) energy[i] *= decay;
        else energy[i] = 0;
      }

      if (pointer.active) {
        for (const index of nearPointer()) {
          const seg = segments[index];
          const distance = Math.hypot(seg.x - pointer.x, seg.y - pointer.y);
          if (distance < EXCITE_RADIUS) {
            const falloff = 1 - distance / EXCITE_RADIUS;
            energy[index] = Math.min(1, energy[index] + falloff * falloff * 0.55 * steps);
          }
        }
      }

      const lit = draw();
      if (visible && (lit || pointer.active || reveal < BANDS)) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
        last = 0;
      }
    }

    function wake() {
      if (!frame && visible) frame = requestAnimationFrame(tick);
    }

    function handleMove(event) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      // Within reach of the field, a resting pointer keeps its wake lit, as before.
      pointer.active =
        pointer.x > -EXCITE_RADIUS && pointer.x < width + EXCITE_RADIUS &&
        pointer.y > -EXCITE_RADIUS && pointer.y < height + EXCITE_RADIUS;
      if (pointer.active) wake();
    }

    function handleLeave() {
      pointer.active = false;
    }

    project();
    if (reduceMotion) {
      draw();
    } else {
      wake();
      window.addEventListener("pointermove", handleMove);
      document.documentElement.addEventListener("pointerleave", handleLeave);
    }

    const observer = new ResizeObserver(() => {
      project();
      if (reduceMotion || !frame) draw();
    });
    observer.observe(canvas);

    // Nothing to animate while the hero is scrolled away.
    const sight = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduceMotion) wake();
    });
    sight.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      sight.disconnect();
      window.removeEventListener("pointermove", handleMove);
      document.documentElement.removeEventListener("pointerleave", handleLeave);
    };
  }, []);

  return (
    <>
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
      <canvas
        ref={glowRef}
        className={`pointer-events-none ${className}`}
        style={{ mixBlendMode: "plus-lighter" }}
        aria-hidden="true"
      />
    </>
  );
}

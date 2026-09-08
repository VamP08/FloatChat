import { useMemo, useRef } from 'react';

/**
 * A float's dives as ticks along its own lifetime.
 *
 * The list this replaces was a scrolling column of "Cycle 137 - 21/03/2021" rows, which
 * for a float with 382 dives told you nothing about the shape of its record. As ticks on
 * a real time axis, the gaps where a float went quiet and the stretches where it
 * reported steadily are both visible at a glance.
 *
 * The ticks themselves are not controls. Dives cluster, so at 382 dives across nine
 * hundred pixels a per-tick hit box either misses its own mark or covers its neighbour,
 * and it puts 382 stops in the tab order on the way to the next section. The track is
 * one control instead: a click takes the nearest dive, and the arrow keys walk them.
 */
export default function DiveTimeline({ dives, selectedId, onSelect }) {
  const trackRef = useRef(null);

  const { ticks, firstYear, lastYear } = useMemo(() => {
    if (!dives.length) return { ticks: [], firstYear: null, lastYear: null };
    const times = dives.map((dive) => new Date(dive.profile_date).getTime());
    const min = Math.min(...times);
    const max = Math.max(...times);
    const span = Math.max(max - min, 1);
    return {
      ticks: dives.map((dive, index) => ({
        dive,
        left: ((times[index] - min) / span) * 100,
      })),
      firstYear: new Date(min).getFullYear(),
      lastYear: new Date(max).getFullYear(),
    };
  }, [dives]);

  if (!dives.length) return null;

  const index = Math.max(0, dives.findIndex((dive) => dive.id === selectedId));
  const selected = dives[index];
  const dateOf = (dive) => new Date(dive.profile_date).toLocaleDateString();

  function pickNearest(event) {
    const box = trackRef.current?.getBoundingClientRect();
    if (!box) return;
    const percent = ((event.clientX - box.left) / box.width) * 100;
    let best = 0;
    ticks.forEach((tick, i) => {
      if (Math.abs(tick.left - percent) < Math.abs(ticks[best].left - percent)) best = i;
    });
    onSelect(dives[best].id);
  }

  function onKeyDown(event) {
    const step = {
      ArrowLeft: -1, ArrowRight: 1,
      PageUp: -10, PageDown: 10,
      Home: -dives.length, End: dives.length,
    }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    onSelect(dives[Math.min(dives.length - 1, Math.max(0, index + step))].id);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="micro">{dives.length} dives with data</p>
        <p className="tnum text-xs text-[var(--ink-faint)]">
          {firstYear}&ndash;{lastYear}
        </p>
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Dive"
        aria-valuemin={1}
        aria-valuemax={dives.length}
        aria-valuenow={index + 1}
        aria-valuetext={`Dive ${selected.cycle_number} on ${dateOf(selected)}`}
        onPointerDown={pickNearest}
        onKeyDown={onKeyDown}
        title={`Dive ${selected.cycle_number} · ${dateOf(selected)}`}
        className="relative mt-4 h-14 cursor-pointer outline-none
                   ring-offset-4 ring-offset-[var(--sea-abyss)]
                   focus-visible:ring-1 focus-visible:ring-[var(--action)]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-7 h-px bg-[var(--sea-edge)]" />
        {ticks.map(({ dive, left }) => (
          <span
            key={dive.id}
            aria-hidden="true"
            style={{ left: `${left}%` }}
            className={`pointer-events-none absolute block w-px -translate-x-1/2 ${
              dive.id === selected.id
                ? 'emit top-0 h-14 bg-[var(--action)]'
                : 'top-4 h-6 bg-[var(--ink-faint)]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

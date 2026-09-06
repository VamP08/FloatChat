import { useMemo } from 'react';

/**
 * A float's dives as ticks along its own lifetime.
 *
 * The list this replaces was a scrolling column of "Cycle 137 - 21/03/2021" rows, which
 * for a float with 382 dives told you nothing about the shape of its record. As ticks on
 * a real time axis, the gaps where a float went quiet and the stretches where it
 * reported steadily are both visible at a glance.
 */
export default function DiveTimeline({ dives, selectedId, onSelect }) {
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

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="micro">{dives.length} dives with data</p>
        <p className="tnum text-xs text-[var(--ink-faint)]">
          {firstYear}&ndash;{lastYear}
        </p>
      </div>

      <div className="relative mt-4 h-14">
        <div className="absolute inset-x-0 top-7 h-px bg-[var(--sea-edge)]" />
        {ticks.map(({ dive, left }) => {
          const isSelected = dive.id === selectedId;
          return (
            <button
              key={dive.id}
              type="button"
              onClick={() => onSelect(dive.id)}
              title={`Cycle ${dive.cycle_number} · ${new Date(dive.profile_date).toLocaleDateString()}`}
              aria-label={`Dive ${dive.cycle_number} on ${new Date(dive.profile_date).toLocaleDateString()}`}
              aria-pressed={isSelected}
              className="absolute top-0 h-14 w-3 -translate-x-1/2 cursor-pointer bg-transparent"
              style={{ left: `${left}%` }}
            >
              <span
                className={`block w-px transition-all ${
                  isSelected
                    ? 'emit mx-auto h-14 bg-[var(--action)]'
                    : 'mx-auto h-6 translate-y-4 bg-[var(--ink-faint)] hover:h-10 hover:translate-y-2 hover:bg-[var(--ink)]'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

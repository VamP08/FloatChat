import { useEffect, useState } from "react";
import { fetchFloats } from "../api/client";
import trackData from "../data/tracks.json";
import { describe } from "../parameters";
import { useAppStore } from "../store/appStore";

const EMISSION = {
  doxy: "#2ee8ff",
  chla: "#7cff63",
  nitrate: "#5b8cff",
  bbp700: "#c7a4ff",
  ph: "#ff7bd5",
};

// Cycle counts and date spans come from the same static file the landing page draws,
// so a row can say something concrete without a second request per float.
const RECORD = new Map(trackData.tracks.map((track) => [track.id, track]));

export default function FloatList() {
  const [floats, setFloats] = useState([]);
  const [error, setError] = useState(null);
  const setFloat = useAppStore((s) => s.setFloat);
  const selectedFloat = useAppStore((s) => s.selectedFloat);

  useEffect(() => {
    fetchFloats()
      .then(setFloats)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <p className="p-4 text-sm text-[var(--em-temp)]">Could not load the floats: {error}</p>;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-[var(--sea-edge)] bg-[var(--sea-deep)] px-4 py-3">
        <h2 className="micro">
          {floats.length ? `${floats.length} floats` : "Floats"}
        </h2>
      </div>
      <ul className="p-2">
        {floats.map((float) => {
          const record = RECORD.get(float.id);
          const colour = EMISSION[record?.bgc] ?? "#687e8f";
          const isSelected = float.id === selectedFloat;
          return (
            <li key={float.id}>
              <button
                type="button"
                onClick={() => setFloat(float.id)}
                className={`flex w-full items-baseline gap-3 rounded-sm px-2.5 py-2.5 text-left
                            transition-colors ${
                              isSelected
                                ? "bg-[var(--sea-raised)]"
                                : "hover:bg-[var(--sea-panel)]"
                            }`}
              >
                <span
                  className="emit mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: colour, color: colour }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span
                      className={`tnum text-sm ${
                        isSelected ? "text-[var(--ink)]" : "text-[var(--ink-dim)]"
                      }`}
                    >
                      {float.id}
                    </span>
                    {record && (
                      <span className="tnum shrink-0 text-xs text-[var(--ink-faint)]">
                        {record.cycles} dives
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 flex items-baseline justify-between gap-2 text-xs text-[var(--ink-faint)]">
                    <span className="truncate">{float.project_name}</span>
                    {record && (
                      <span className="tnum shrink-0">
                        {record.first.slice(0, 4)}&ndash;{record.last.slice(0, 4)}
                      </span>
                    )}
                  </span>
                  {record?.bgc && (
                    <span className="mt-1 block text-xs" style={{ color: colour }}>
                      mostly {describe(record.bgc).name.toLowerCase()}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

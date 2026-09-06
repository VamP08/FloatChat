import { useEffect, useState } from 'react';
import { fetchFloatCoverage, fetchFloatDetails } from '../api/client';
import { describe } from '../parameters';
import { useAppStore } from '../store/appStore';

const EMISSION = {
  temp: '#ff6b57',
  psal: '#ffc94a',
  doxy: '#2ee8ff',
  chla: '#7cff63',
  nitrate: '#5b8cff',
  bbp700: '#c7a4ff',
  ph: '#ff7bd5',
};

function Row({ label, children }) {
  return (
    <div className="flex gap-4">
      <dt className="micro w-20 shrink-0 pt-0.5">{label}</dt>
      <dd className="min-w-0 flex-1 text-[var(--ink)]">{children}</dd>
    </div>
  );
}

/**
 * What one float is and what it actually measured.
 *
 * The sensor list from the metadata file is a column of instrument codes
 * (SPECTROPHOTOMETER_NITRATE, RADIOMETER_DOWN_IRR490) that means nothing to a reader
 * without an oceanography background, and long enough to overflow this panel into the
 * dive list beside it. What the float measured, in plain words and with the counts
 * that survived quality control, answers the same question and is honest about
 * coverage.
 */
export default function FloatDetails() {
  const floatId = useAppStore((s) => s.selectedFloat);
  const [details, setDetails] = useState(null);
  const [coverage, setCoverage] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!floatId) {
      setDetails(null);
      setCoverage([]);
      return;
    }
    setLoading(true);
    setDetails(null);
    setCoverage([]);
    Promise.all([
      fetchFloatDetails(floatId).then(setDetails),
      fetchFloatCoverage(floatId).then(setCoverage).catch(() => setCoverage([])),
    ])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [floatId]);

  if (!floatId) {
    return (
      <div className="flex h-40 items-center justify-center p-4">
        <p className="text-[var(--ink-dim)]">Select a float to see its detail</p>
      </div>
    );
  }

  return (
    <div className="max-h-[45%] shrink-0 overflow-y-auto p-4">
      <h2 className="tnum display text-2xl">Float {details ? details.id : '…'}</h2>
      {loading && <p className="mt-3 text-[var(--ink-dim)]">Loading detail&hellip;</p>}

      {details && !loading && (
        <>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Project">{details.project_name}</Row>
            <Row label="Platform">{details.platform_type || details.wmo_inst_type}</Row>
            {details.pi_name && <Row label="Lead">{details.pi_name}</Row>}
          </dl>

          {coverage.length > 0 && (
            <div className="mt-5 border-t border-[var(--sea-edge)] pt-4">
              <p className="micro">What it measured</p>
              <ul className="mt-3 space-y-1.5">
                {coverage.map((entry) => (
                  <li key={entry.parameter} className="flex items-baseline gap-2.5 text-sm">
                    <span
                      className="emit h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        background: EMISSION[entry.parameter],
                        color: EMISSION[entry.parameter],
                      }}
                      aria-hidden="true"
                    />
                    <span className="flex-1 text-[var(--ink)]">
                      {describe(entry.parameter).name}
                    </span>
                    <span className="tnum text-xs text-[var(--ink-faint)]">
                      {entry.n_values.toLocaleString('en-US')}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-relaxed text-[var(--ink-faint)]">
                Counts are readings that passed quality control. A sensor the float
                carries but whose readings failed does not appear here.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { MapContainer, Polyline, TileLayer } from 'react-leaflet';
import {
  fetchFloatCoverage, fetchFloatDetails, fetchFloatTimeSeries, fetchMeasurements,
  fetchProfilesWithData,
} from '../api/client';
import { describe, presentIn } from '../parameters';
import MiniProfileChart from './MiniProfileChart';
import MiniTimeSeriesChart from './MiniTimeSeriesChart';
import DiveTimeline from './DiveTimeline';

const EMISSION = {
  temp: '#ff6b57', psal: '#ffc94a', doxy: '#2ee8ff', chla: '#7cff63',
  nitrate: '#5b8cff', bbp700: '#c7a4ff', ph: '#ff7bd5',
};

/** The float's own drift, on its own map, framed to itself. */
function TraceMap({ dives }) {
  const path = dives
    .filter((d) => d.latitude != null && d.longitude != null)
    .map((d) => [d.latitude, d.longitude]);
  if (path.length < 2) return null;

  const lats = path.map((p) => p[0]);
  const lons = path.map((p) => p[1]);
  const bounds = [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  ];

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [28, 28] }}
      scrollWheelZoom={false}
      zoomControl={false}
      attributionControl={false}
      style={{ height: '100%', width: '100%', background: 'var(--sea-abyss)' }}
    >
      <TileLayer
        url="https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        maxZoom={16}
      />
      <Polyline pathOptions={{ color: '#3dffc0', weight: 9, opacity: 0.12 }} positions={path} />
      <Polyline pathOptions={{ color: '#3dffc0', weight: 1.75, opacity: 0.95 }} positions={path} />
    </MapContainer>
  );
}

/**
 * Everything known about one float, as a single document.
 *
 * This replaces a three-column drill-down in which each column carried its own empty
 * state and its own idea of the task. Here the float is the subject and the page reads
 * top to bottom: where it went, what it measured, when it dived, and then the numbers
 * from whichever dive you pick.
 */
export default function Dossier({ floatId }) {
  const [details, setDetails] = useState(null);
  const [coverage, setCoverage] = useState([]);
  const [dives, setDives] = useState([]);
  const [selectedDive, setSelectedDive] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // 'dive' reads one cast; 'record' reads every reading the float ever returned.
  const [mode, setMode] = useState('dive');
  const [series, setSeries] = useState([]);
  const [seriesLoading, setSeriesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedDive(null);
    setMeasurements([]);
    setSeries([]);
    setMode('dive');
    Promise.all([
      fetchFloatDetails(floatId),
      fetchFloatCoverage(floatId).catch(() => []),
      fetchProfilesWithData(floatId).catch(() => []),
    ])
      .then(([detail, cover, profiles]) => {
        if (cancelled) return;
        setDetails(detail);
        setCoverage(cover);
        setDives(profiles);
        // Open on the most recent dive rather than an empty frame.
        if (profiles.length) setSelectedDive(profiles[profiles.length - 1].id);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [floatId]);

  // The whole record is a large response, so it is only fetched if asked for.
  useEffect(() => {
    if (mode !== 'record' || series.length || seriesLoading) return;
    setSeriesLoading(true);
    fetchFloatTimeSeries(floatId)
      .then(setSeries)
      .catch(() => setSeries([]))
      .finally(() => setSeriesLoading(false));
  }, [mode, floatId, series.length, seriesLoading]);

  useEffect(() => {
    if (!selectedDive) return;
    let cancelled = false;
    fetchMeasurements(selectedDive)
      .then((rows) => !cancelled && setMeasurements(rows))
      .catch(() => !cancelled && setMeasurements([]));
    return () => { cancelled = true; };
  }, [selectedDive]);

  if (loading) {
    return <p className="p-8 text-[var(--ink-dim)]">Opening float {floatId}&hellip;</p>;
  }
  if (error) {
    return <p className="p-8 text-sm text-[var(--em-temp)]">Could not open this float: {error}</p>;
  }

  const dive = dives.find((d) => d.id === selectedDive);
  const available = presentIn(measurements);

  return (
    <article className="mx-auto max-w-4xl px-8 pb-28 pt-8">
      <header>
        <h1 className="tnum display text-[clamp(2rem,4vw,3rem)]">Float {details?.id}</h1>
        <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3 text-sm">
          {[
            ['Project', details?.project_name],
            ['Platform', details?.platform_type || details?.wmo_inst_type],
            ['Lead', details?.pi_name],
          ]
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label}>
                <dt className="micro">{label}</dt>
                <dd className="mt-1 text-[var(--ink)]">{value}</dd>
              </div>
            ))}
        </dl>
      </header>

      {dives.length > 1 && (
        <section className="mt-8">
          <div className="h-64 overflow-hidden rounded-sm border border-[var(--sea-edge)]">
            <TraceMap dives={dives} />
          </div>
          <p className="mt-3 text-sm text-[var(--ink-dim)]">
            Where it drifted. Every dive it made is a point on that line.
          </p>
        </section>
      )}

      {coverage.length > 0 && (
        <section className="mt-10 border-t border-[var(--sea-edge)] pt-6">
          <p className="micro">What it measured</p>
          <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
            {coverage.map((entry) => (
              <li key={entry.parameter} className="flex items-baseline gap-2.5">
                <span
                  className="emit h-1.5 w-1.5 rounded-full"
                  style={{ background: EMISSION[entry.parameter], color: EMISSION[entry.parameter] }}
                  aria-hidden="true"
                />
                <span className="text-sm text-[var(--ink)]">{describe(entry.parameter).name}</span>
                <span className="tnum text-sm text-[var(--ink-faint)]">
                  {entry.n_values.toLocaleString('en-US')}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[var(--ink-faint)]">
            Readings that passed quality control. A sensor whose readings failed does not
            appear here, however many it took.
          </p>
        </section>
      )}

      <section className="mt-10 border-t border-[var(--sea-edge)] pt-6">
        <DiveTimeline dives={dives} selectedId={selectedDive} onSelect={setSelectedDive} />
      </section>

      {dive && (
        <section className="mt-8 border-t border-[var(--sea-edge)] pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="display text-2xl">
              {mode === 'dive' ? `Dive ${dive.cycle_number}` : 'The whole record'}
            </h2>
            <div className="flex gap-1 rounded-sm border border-[var(--sea-edge)] p-0.5">
              {[['dive', 'This dive'], ['record', 'Whole record']].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`rounded-sm px-3 py-1.5 text-xs transition-colors ${
                    mode === value
                      ? 'bg-[var(--sea-raised)] text-[var(--ink)]'
                      : 'text-[var(--ink-dim)] hover:text-[var(--ink)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {mode === 'dive' && (
            <p className="tnum mt-2 text-sm text-[var(--ink-dim)]">
              {new Date(dive.profile_date).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
              {' · '}
              {dive.latitude.toFixed(2)}°, {dive.longitude.toFixed(2)}°
            </p>
          )}

          {mode === 'record' ? (
            seriesLoading ? (
              <p className="mt-6 text-[var(--ink-dim)]">Loading every reading&hellip;</p>
            ) : (
              <div className="mt-2 grid gap-x-8 sm:grid-cols-2">
                {presentIn(series).map((key) => (
                  <MiniTimeSeriesChart
                    key={key}
                    data={series}
                    parameter={key}
                    config={describe(key)}
                  />
                ))}
              </div>
            )
          ) : available.length === 0 ? (
            <p className="mt-6 text-[var(--ink-dim)]">
              Nothing from this dive passed quality control.
            </p>
          ) : (
            <div className="mt-2 grid gap-x-8 sm:grid-cols-2">
              {available.map((key) => (
                <MiniProfileChart
                  key={key}
                  data={measurements}
                  parameter={key}
                  config={describe(key)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </article>
  );
}

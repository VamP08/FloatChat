import { useEffect, useState } from 'react';
import { fetchFloatTimeSeries } from '../api/client';
import { describe, presentIn } from '../parameters';
import MiniTimeSeriesChart from './MiniTimeSeriesChart';

export default function TimeSeriesViewer({ floatId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState([]);

  useEffect(() => {
    if (!floatId) return;
    setLoading(true);
    setError(null);
    fetchFloatTimeSeries(floatId)
      .then(setTimeSeriesData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [floatId]);

  if (loading) {
    return <p className="p-4 text-center text-[var(--ink-dim)]">Loading the full record…</p>;
  }
  if (error) {
    return <p className="p-4 text-sm text-[var(--em-temp)]">Could not load the time series: {error}</p>;
  }

  const availableParams = presentIn(timeSeriesData);

  return (
    <div className="h-full">
      <p className="border-b border-[var(--sea-edge)] p-4 text-sm text-[var(--ink-dim)]">
        Every measurement float <strong>{floatId}</strong> has reported. Each point is one
        reading at one depth on one date.
      </p>
      {availableParams.length > 0 ? (
        availableParams.map((key) => (
          <MiniTimeSeriesChart
            key={key}
            data={timeSeriesData}
            parameter={key}
            config={describe(key)}
          />
        ))
      ) : (
        <p className="p-4 text-center text-[var(--ink-dim)]">
          This float has no measurements that passed quality control.
        </p>
      )}
    </div>
  );
}

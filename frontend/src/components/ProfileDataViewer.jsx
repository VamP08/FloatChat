import { useEffect, useState } from 'react';
import { fetchMeasurements } from '../api/client';
import { describe, presentIn } from '../parameters';
import MiniProfileChart from './MiniProfileChart';

export default function ProfileDataViewer({ profileId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [measurements, setMeasurements] = useState([]);

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    setError(null);
    fetchMeasurements(profileId)
      .then(setMeasurements)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [profileId]);

  if (loading) return <p className="p-4 text-[var(--ink-dim)]">Loading dive…</p>;
  if (error) return <p className="p-4 text-sm text-[var(--em-temp)]">Could not load this profile: {error}</p>;

  const availableParams = presentIn(measurements);

  if (availableParams.length === 0) {
    return (
      <p className="p-4 text-[var(--ink-dim)]">
        This profile has no measurements that passed quality control.
      </p>
    );
  }

  return (
    <div className="h-full">
      {availableParams.map((key) => (
        <MiniProfileChart
          key={key}
          data={measurements}
          parameter={key}
          config={describe(key)}
        />
      ))}
    </div>
  );
}

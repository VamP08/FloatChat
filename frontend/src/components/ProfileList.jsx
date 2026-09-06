import { useEffect, useState } from "react";
// 1. Import the new API function
import { fetchProfilesWithData } from "../api/client";
import { useAppStore } from "../store/appStore";

export default function ProfileList() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const { selectedFloat, selectedProfile, setProfile } = useAppStore();

  useEffect(() => {
    if (selectedFloat) {
      setLoading(true);
      // 2. Call the new, smarter endpoint
      fetchProfilesWithData(selectedFloat)
        .then(setProfiles)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setProfiles([]);
    }
  }, [selectedFloat]);

  if (loading) return <p className="p-4 text-[var(--ink-dim)]">Finding dives with data…</p>;
  if (!selectedFloat) return null; // Don't show anything if no float is selected

  return (
    <div className="p-4">
      <h3 className="micro mb-3">Dives with data</h3>
      {profiles.length > 0 ? (
        <ul className="space-y-1">
          {profiles.map((p) => (
            <li
              key={p.id}
              className={`tnum cursor-pointer rounded-sm px-2.5 py-2 text-sm transition-colors ${
                p.id === selectedProfile
                  ? 'bg-[var(--sea-raised)] text-[var(--ink)]'
                  : 'text-[var(--ink-dim)] hover:bg-[var(--sea-panel)] hover:text-[var(--ink)]'
              }`}
              onClick={() => setProfile(p.id)}
            >
              Cycle {p.cycle_number} –{" "}
              {new Date(p.profile_date).toLocaleDateString()}
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-4 text-sm text-[var(--ink-dim)]">No dive from this float has measurements that passed quality control.</p>
      )}
    </div>
  );
}
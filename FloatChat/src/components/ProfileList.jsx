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

  if (loading) return <p className="p-4 text-gray-500">Finding profiles with data...</p>;
  if (!selectedFloat) return null; // Don't show anything if no float is selected

  return (
    <div className="p-4">
      <h3 className="font-bold mb-2 text-gray-700">Profiles with Data</h3>
      {profiles.length > 0 ? (
        <ul className="space-y-1">
          {profiles.map((p) => (
            <li
              key={p.id}
              className={`cursor-pointer hover:bg-blue-100 p-2 rounded text-sm ${
                p.id === selectedProfile ? 'bg-blue-200 font-semibold' : ''
              }`}
              onClick={() => setProfile(p.id)}
            >
              Cycle {p.cycle_number} –{" "}
              {new Date(p.profile_date).toLocaleDateString()}
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-4 text-gray-500 text-sm">No profiles with scientific measurements were found for this float.</p>
      )}
    </div>
  );
}
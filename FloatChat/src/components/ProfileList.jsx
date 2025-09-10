import { useEffect, useState } from "react";
import { fetchProfiles } from "../api/client";
import { useAppStore } from "../store/appStore";

export default function ProfileList() {
  const [profiles, setProfiles] = useState([]);
  const floatId = useAppStore((s) => s.selectedFloat);
  const setProfile = useAppStore((s) => s.setProfile);

  useEffect(() => {
    if (floatId) {
      fetchProfiles(floatId).then(setProfiles);
    }
  }, [floatId]);

  if (!floatId) return <p className="p-4">Select a float first</p>;

  return (
    <div className="p-4 border-r h-full overflow-y-auto">
      <h2 className="font-bold mb-2">Profiles</h2>
      <ul>
        {profiles.map((p) => (
          <li
            key={p.id}
            className="cursor-pointer hover:bg-gray-200 p-1 rounded"
            onClick={() => setProfile(p.id)}
          >
            Cycle {p.cycle_number} –{" "}
            {new Date(p.profile_date).toLocaleDateString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

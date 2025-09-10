import { useEffect, useState, useMemo } from "react";
// 1. Import the new function
import { fetchActiveFloatLocations } from "../api/client";
import { useAppStore } from "../store/appStore";
import FloatMap from "../components/FloatMap";
import MapSidebar from "../components/MapSidebar";

export default function MapView() {
  const [allLocations, setAllLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const selectedFloat = useAppStore((state) => state.selectedFloat);

  useEffect(() => {
    setLoading(true);
    // 2. Call the new, smarter endpoint
    fetchActiveFloatLocations()
      .then(setAllLocations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ... (the rest of your component code for filtering remains exactly the same) ...
  const filteredLocations = useMemo(() => {
    if (!searchTerm) {
      return allLocations;
    }
    return allLocations.filter(loc =>
      loc.id.toString().includes(searchTerm)
    );
  }, [allLocations, searchTerm]);

  return (
    <div className="h-full w-full relative">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white p-2 rounded-lg shadow-lg">
        <input
          type="text"
          placeholder="Search Active Float ID..."
          className="px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span className="ml-2 text-sm text-gray-500">
          {filteredLocations.length} / {allLocations.length} showing
        </span>
      </div>
      {loading ? (
        <div className="h-full flex items-center justify-center">
          <p className="text-gray-500">Finding active floats...</p>
        </div>
      ) : (
        <FloatMap locations={filteredLocations} />
      )}
      {selectedFloat && <MapSidebar />}
    </div>
  );
}
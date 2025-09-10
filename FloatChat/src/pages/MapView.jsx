import { useEffect, useState } from "react";
import { fetchFloatLocations } from "../api/client";
import FloatMap from "../components/FloatMap";
import MapSidebar from "../components/MapSidebar"; // <-- Import the new sidebar

export default function MapView() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchFloatLocations()
      .then(setLocations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full w-full relative"> {/* <-- Use a relative container */}
      {loading ? (
        <div className="h-full flex items-center justify-center">
          <p className="text-gray-500">Loading float locations...</p>
        </div>
      ) : (
        <FloatMap locations={locations} />
      )}
      <MapSidebar /> {/* <-- Add the sidebar here */}
    </div>
  );
}
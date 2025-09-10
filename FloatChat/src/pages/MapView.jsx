import { useEffect, useState } from "react";
import { fetchFloatLocations } from "../api/client";
import FloatMap from "../components/FloatMap"; 

export default function MapView() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFloatLocations()
      .then(setLocations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">Loading float locations...</p>
      </div>
    );
  }

  return <FloatMap locations={locations} />;
}
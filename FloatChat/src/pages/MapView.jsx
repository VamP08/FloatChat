import { useAppStore } from "../store/appStore";
import FloatMap from "../components/FloatMap";
import MapSidebar from "../components/MapSidebar";

// Receive the new flyToTarget prop
export default function MapView({ locations, loading, searchTerm, flyToTarget }) {
  const selectedFloat = useAppStore((state) => state.selectedFloat);

  return (
    <div className="h-full w-full relative">
      {loading ? (
        <div className="h-full flex items-center justify-center">
          <p className="text-gray-500">Finding active floats...</p>
        </div>
      ) : (
        // Pass it down to the FloatMap
        <FloatMap
          locations={locations}
          searchTerm={searchTerm}
          flyToTarget={flyToTarget}
        />
      )}
      {selectedFloat && <MapSidebar />}
    </div>
  );
}
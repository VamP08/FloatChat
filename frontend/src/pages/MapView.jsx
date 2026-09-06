import FloatMap from "../components/FloatMap";
import MapSidebar from "../components/MapSidebar";
import { useAppStore } from "../store/appStore";

export default function MapView({ locations, loading, loadError, searchTerm, flyToTarget }) {
  const selectedFloat = useAppStore((state) => state.selectedFloat);

  if (loadError) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="display text-2xl text-[var(--ink)]">Could not reach the API</p>
        <p className="max-w-md text-sm text-[var(--ink-dim)]">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      {loading ? (
        <div className="h-full flex items-center justify-center">
          <p className="text-[var(--ink-dim)]">Finding floats…</p>
        </div>
      ) : locations.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="display text-2xl text-[var(--ink)]">No floats match that search</p>
          <p className="text-sm text-[var(--ink-dim)]">
            Float identifiers are seven digits, for example 1902367.
          </p>
        </div>
      ) : (
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

import L from 'leaflet';
import { useEffect, useMemo, useRef } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import trackData from '../data/tracks.json';
import { describe } from '../parameters';
import { useAppStore } from '../store/appStore';
import FloatTrajectory from './FloatTrajectory';
import MapFlyToController from './MapFlyToController';

// Emission colours, matching world.css and the drift field on the landing page.
const EMISSION = {
  doxy: '#2ee8ff',
  chla: '#7cff63',
  nitrate: '#5b8cff',
  bbp700: '#c7a4ff',
  ph: '#ff7bd5',
};
const UNLIT = '#687e8f';

// Which measurement each float carries most of, joined from the same file the landing
// page draws, so a float is the same colour wherever it appears.
const DOMINANT = new Map(trackData.tracks.map((track) => [track.id, track.bgc]));

function clusterIcon(cluster) {
  const total = cluster.getChildCount();
  const size = total < 10 ? 30 : total < 50 ? 38 : 46;
  return L.divIcon({
    html: `<span>${total}</span>`,
    className: 'float-cluster',
    iconSize: L.point(size, size),
  });
}

export default function FloatMap({ locations, searchTerm, flyToTarget }) {
  const setFloat = useAppStore((s) => s.setFloat);
  const selectedFloat = useAppStore((s) => s.selectedFloat);
  const mapRef = useRef(null);

  const validLocations = useMemo(
    () => locations.filter((loc) => loc.latitude != null && loc.longitude != null),
    [locations],
  );

  useEffect(() => {
    const timer = setTimeout(() => mapRef.current?.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <MapContainer
      center={[12, 72]}
      zoom={4}
      minZoom={3}
      style={{ height: '100%', width: '100%', background: 'var(--sea-abyss)' }}
      ref={mapRef}
      zoomControl={false}
    >
      {/* Esri's dark canvas. The basemap this project previously used now stamps
          "API KEY REQUIRED" across every tile it serves without a key. */}
      <TileLayer
        url="https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, DeLorme, NAVTEQ'
        maxZoom={16}
      />

      <MarkerClusterGroup key={searchTerm || 'all'} iconCreateFunction={clusterIcon}>
        {validLocations.map((float) => {
          const parameter = DOMINANT.get(float.id);
          const colour = EMISSION[parameter] ?? UNLIT;
          const isSelected = float.id === selectedFloat;
          return (
            <CircleMarker
              key={float.id}
              center={[float.latitude, float.longitude]}
              radius={isSelected ? 8 : 5}
              pathOptions={{
                color: colour,
                weight: isSelected ? 2.5 : 1.5,
                opacity: 1,
                fillColor: colour,
                fillOpacity: parameter ? 0.5 : 0.2,
              }}
              eventHandlers={{ click: () => setFloat(float.id) }}
            >
              <Popup>
                <span className="block font-semibold text-[var(--ink)]">Float {float.id}</span>
                <span className="mt-1 block text-[var(--ink-dim)]">{float.project_name}</span>
                <span className="mt-1 block text-[var(--ink-dim)]">
                  Last surfaced {new Date(float.profile_date).toLocaleDateString()}
                </span>
                <span className="mt-2 block" style={{ color: colour }}>
                  {parameter
                    ? `Mostly ${describe(parameter).name.toLowerCase()}`
                    : 'No biogeochemistry passed quality control'}
                </span>
              </Popup>
            </CircleMarker>
          );
        })}
      </MarkerClusterGroup>

      <FloatTrajectory />
      <MapFlyToController locations={locations} flyToTarget={flyToTarget} />
    </MapContainer>
  );
}

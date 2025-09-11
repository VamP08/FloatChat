import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import { useAppStore } from '../store/appStore';
import FloatTrajectory from './FloatTrajectory';
import MapFlyToController from './MapFlyToController';

// --- THIS IS THE FIX ---
// Add 'flyToTarget' to the function's props
export default function FloatMap({ locations, searchTerm, flyToTarget }) {
  const setFloat = useAppStore((s) => s.setFloat);
  const mapRef = useRef(null);

  const validLocations = locations.filter(
    (loc) => loc.latitude != null && loc.longitude != null
  );

  const centerLat = 20;
  const centerLon = 77;

  useEffect(() => {
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 100);
  }, []);

  return (
    <MapContainer
      center={[centerLat, centerLon]}
      zoom={4}
      style={{ height: '100%', width: '100%' }}
      ref={mapRef}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      <MarkerClusterGroup key={searchTerm || 'all'}>
        {validLocations.map((float) => (
          <Marker
            key={float.id}
            position={[float.latitude, float.longitude]}
            eventHandlers={{
              click: () => {
                setFloat(float.id);
              },
            }}
          >
            <Popup>
              <strong>Float ID: {float.id}</strong>
              <br />
              Last Report: {new Date(float.profile_date).toLocaleDateString()}
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>

      <FloatTrajectory />
      <MapFlyToController locations={locations} flyToTarget={flyToTarget} />
    </MapContainer>
  );
}
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import { useAppStore } from '../store/appStore';
import FloatTrajectory from './FloatTrajectory';

export default function FloatMap({ locations }) {
  const setFloat = useAppStore((s) => s.setFloat);
  const selectedFloat = useAppStore((s) => s.selectedFloat);
  const mapRef = useRef(null);

  const validLocations = locations.filter(
    (loc) => loc.latitude != null && loc.longitude != null
  );

  const centerLat = 20; // Center of the Indian Ocean
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
      zoom={4} // Zoom in a bit more initially
      style={{ height: '100%', width: '100%' }}
      ref={mapRef} // Use ref directly on MapContainer
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" // <-- A cleaner, more professional map style
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      {/* 2. Wrap your markers in this component */}
      <MarkerClusterGroup>
        {validLocations.map((float) => (
          <Marker
            key={float.id}
            position={[float.latitude, float.longitude]}
            eventHandlers={{
              click: () => {
                console.log(`Marker clicked! Setting selectedFloat to: ${float.id}`);
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
    </MapContainer>
  );
}
import { useEffect, useRef } from 'react'; // Import hooks
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useAppStore } from '../store/appStore';

export default function FloatMap({ locations }) {
  const setFloat = useAppStore((s) => s.setFloat);
  const selectedFloat = useAppStore((s) => s.selectedFloat);
  const mapRef = useRef(null); // Create a ref for the map instance

  const validLocations = locations.filter(
    (loc) => loc.latitude != null && loc.longitude != null
  );

  const centerLat = validLocations.length > 0 ? validLocations[0].latitude : 20;
  const centerLon = validLocations.length > 0 ? validLocations[0].longitude : 0;

  // This effect runs after the component renders and forces the map to resize.
  useEffect(() => {
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 100); // A small delay ensures the container is visible
  }, []);

  return (
    <MapContainer
      center={[centerLat, centerLon]}
      zoom={2}
      style={{ height: '100%', width: '100%' }}
      whenCreated={map => (mapRef.current = map)} // Assign the map instance to the ref
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {validLocations.map((float) => (
        <Marker
          key={float.id}
          position={[float.latitude, float.longitude]}
          opacity={selectedFloat === float.id ? 1 : 0.7}
          eventHandlers={{
            click: () => {
              setFloat(float.id);
            },
          }}
        >
          <Popup>
            <strong>Float ID: {float.id}</strong>
            <br />
            Project: {float.project_name}
            <br />
            Last Report: {new Date(float.profile_date).toLocaleDateString()}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
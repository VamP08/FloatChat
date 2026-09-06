import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { useAppStore } from '../store/appStore';

/**
 * Frames the map on the data and moves it when a float is chosen.
 *
 * The map used to open on a fixed centre and zoom, which showed Europe, China and most
 * of Africa around a dataset that only occupies the northern Indian Ocean. It now fits
 * to the floats themselves on first load.
 */
export default function MapFlyToController({ locations, flyToTarget }) {
  const map = useMap();
  const selectedFloat = useAppStore((state) => state.selectedFloat);
  const hasFramed = useRef(false);

  useEffect(() => {
    if (hasFramed.current || !locations?.length) return;
    const points = locations
      .filter((loc) => loc.latitude != null && loc.longitude != null)
      .map((loc) => [loc.latitude, loc.longitude]);
    if (points.length === 0) return;
    hasFramed.current = true;
    map.fitBounds(L.latLngBounds(points), { padding: [64, 64], animate: false });
  }, [locations, map]);

  useEffect(() => {
    if (!selectedFloat) return;
    const target = locations.find((loc) => loc.id === selectedFloat);
    if (target) map.flyTo([target.latitude, target.longitude], 6);
  }, [selectedFloat, locations, map]);

  useEffect(() => {
    if (flyToTarget) map.flyTo([flyToTarget.latitude, flyToTarget.longitude], 6);
  }, [flyToTarget, map]);

  return null;
}

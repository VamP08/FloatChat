import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { useAppStore } from '../store/appStore';

export default function MapFlyToController({ locations, flyToTarget }) {
  const map = useMap();
  const selectedFloat = useAppStore((state) => state.selectedFloat);

  useEffect(() => {
    if (selectedFloat) {
      const floatLocation = locations.find(loc => loc.id === selectedFloat);
      if (floatLocation) {
        const { latitude, longitude } = floatLocation;
        map.flyTo([latitude, longitude], 6);
      }
    }
  }, [selectedFloat]);

  useEffect(() => {
    if (flyToTarget) {
      const { latitude, longitude } = flyToTarget;
      map.flyTo([latitude, longitude], 6);
    }
  }, [flyToTarget, map]);

  return null;
}
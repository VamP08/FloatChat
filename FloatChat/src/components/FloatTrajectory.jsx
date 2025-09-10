import { useEffect, useState } from 'react';
import { Polyline } from 'react-leaflet';
import { useAppStore } from '../store/appStore';
import { fetchFloatTrajectory } from '../api/client';

export default function FloatTrajectory() {
  const selectedFloat = useAppStore((s) => s.selectedFloat);
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    if (selectedFloat) {
      fetchFloatTrajectory(selectedFloat).then(profiles => {
        const validPositions = profiles
          .filter(p => p.latitude != null && p.longitude != null)
          .map(p => [p.latitude, p.longitude]);
        setPositions(validPositions);
      });
    } else {
      setPositions([]); 
    }
  }, [selectedFloat]);

  if (positions.length === 0) {
    return null;
  }

  return <Polyline pathOptions={{ color: 'red', weight: 3 }} positions={positions} />;
}
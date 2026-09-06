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

  return (
    <>
      {/* Two strokes make the wake: a wide dim halo and a narrow bright core, the
          same construction the landing page's field uses. */}
      <Polyline pathOptions={{ color: '#3dffc0', weight: 9, opacity: 0.12 }} positions={positions} />
      <Polyline pathOptions={{ color: '#3dffc0', weight: 1.75, opacity: 0.95 }} positions={positions} />
    </>
  );
}
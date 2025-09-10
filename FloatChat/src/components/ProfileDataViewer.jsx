import React, { useEffect, useState } from 'react';
import { fetchMeasurements } from '../api/client';
import MiniProfileChart from './MiniProfileChart';

const PARAMETER_CONFIG = {
  temp: { name: 'Temperature', unit: '°C' },
  psal: { name: 'Salinity', unit: 'PSU' },
  doxy: { name: 'Oxygen', unit: 'μmol/kg' },
  chla: { name: 'Chlorophyll-a', unit: 'mg/m³' },
  nitrate: { name: 'Nitrate', unit: 'μmol/kg' },
};

export default function ProfileDataViewer({ profileId }) {
  const [loading, setLoading] = useState(true);
  const [measurements, setMeasurements] = useState([]);
  const [availableParams, setAvailableParams] = useState([]);

  useEffect(() => {
    if (profileId) {
      setLoading(true);
      fetchMeasurements(profileId)
        .then(apiData => {
          // --- THIS IS THE CRITICAL DEBUGGING STEP ---
          console.log("API data received in ProfileDataViewer:", apiData);
          // ---------------------------------------------

          setMeasurements(apiData);
          const paramsWithData = Object.keys(PARAMETER_CONFIG).filter(paramKey =>
            apiData.some(d => d[paramKey] != null)
          );
          setAvailableParams(paramsWithData);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [profileId]);

  if (loading) {
    return <p className="p-4 text-gray-500">Loading profile data...</p>;
  }

  if (availableParams.length === 0) {
    return <p className="p-4 text-gray-500">No scientific measurements were found for this profile.</p>;
  }

  return (
    <div className="h-full bg-gray-50">
      {availableParams.map(paramKey => (
        <MiniProfileChart
          key={paramKey}
          data={measurements}
          parameter={paramKey}
          config={PARAMETER_CONFIG[paramKey]}
        />
      ))}
    </div>
  );
}
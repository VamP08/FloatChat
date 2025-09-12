import React, { useEffect, useState } from 'react';
import { fetchFloatTimeSeries } from '../api/client';
import MiniTimeSeriesChart from './MiniTimeSeriesChart';

const PARAMETER_CONFIG = {
  temp: { name: 'Temperature', unit: '°C' },
  psal: { name: 'Salinity', unit: 'PSU' },
  doxy: { name: 'Oxygen', unit: 'μmol/kg' },
  chla: { name: 'Chlorophyll-a', unit: 'mg/m³' },
  nitrate: { name: 'Nitrate', unit: 'μmol/kg' },
};

export default function TimeSeriesViewer({ floatId }) {
  const [loading, setLoading] = useState(true);
  const [timeSeriesData, setTimeSeriesData] = useState([]);

  useEffect(() => {
    if (floatId) {
      setLoading(true);
      fetchFloatTimeSeries(floatId)
        .then(setTimeSeriesData)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [floatId]);

  if (loading) return <p className="p-4 text-center text-gray-500">Loading full time series...</p>;

  // Filter out parameters that have no data to prevent rendering empty charts
  const availableParams = Object.keys(PARAMETER_CONFIG).filter(paramKey =>
    timeSeriesData.some(d => d[paramKey] != null)
  );

  return (
    <div className="h-full bg-gray-50">
      <p className="p-4 text-sm text-gray-600 border-b">Showing lifetime data for Float <strong>{floatId}</strong>. Each point represents a measurement at a specific depth and time.</p>
      {availableParams.length > 0 ? (
        availableParams.map(paramKey => (
         <MiniTimeSeriesChart
            key={paramKey}
            data={timeSeriesData}
            parameter={paramKey}
            // --- THIS IS THE FIX ---
            config={PARAMETER_CONFIG[paramKey]}
          />
        ))
      ) : (
        <p className="p-4 text-center text-gray-500">No time series data could be plotted for this float.</p>
      )}
    </div>
  );
}
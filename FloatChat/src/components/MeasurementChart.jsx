import { useEffect, useState } from "react";
import { fetchMeasurements } from "../api/client";
import { useAppStore } from "../store/appStore";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Label
} from "recharts";

const PARAMETER_CONFIG = {
  temp: { name: 'Temperature', unit: '°C' },
  psal: { name: 'Salinity', unit: 'PSU' },
  doxy: { name: 'Oxygen', unit: 'μmol/kg' },
  chla: { name: 'Chlorophyll-a', unit: 'mg/m³' },
  nitrate: { name: 'Nitrate', unit: 'μmol/kg' },
};

// Sub-component for selecting parameters
function ParameterSelector() {
    const setParameter = useAppStore((s) => s.setParameter);
    const selectedParameter = useAppStore((s) => s.selectedParameter);

    return (
        <div className="p-2 flex flex-wrap gap-2 bg-gray-100 border-b border-t">
            {Object.entries(PARAMETER_CONFIG).map(([key, { name }]) => (
                <button
                    key={key}
                    onClick={() => setParameter(key)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        selectedParameter === key
                            ? 'bg-blue-600 text-white shadow'
                            : 'bg-white text-gray-700 hover:bg-blue-100'
                    }`}
                >
                    {name}
                </button>
            ))}
        </div>
    );
}

export default function MeasurementChart() {
  const profileId = useAppStore((s) => s.selectedProfile);
  const parameter = useAppStore((s) => s.selectedParameter);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profileId) {
      setLoading(true);
      fetchMeasurements(profileId)
        .then(apiData => {
          const filteredData = apiData.filter(d => d[parameter] != null);
          setData(filteredData);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setData([]);
    }
  }, [profileId, parameter]);

  const paramConfig = PARAMETER_CONFIG[parameter];

  if (!profileId) {
    return (
      <div className="p-4 h-full flex flex-col items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-center">Select a float and then a profile <br/> to see measurements.</p>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col h-full bg-white">
      <h2 className="font-bold text-lg mb-2">{paramConfig.name} Profile</h2>
      <ParameterSelector />
      <div className="flex-grow pt-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Loading chart data...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No data available for '{paramConfig.name}' in this profile.</p>
          </div>
        ) : (
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 40, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="pressure" reversed={true} type="number" domain={['dataMax', 'dataMin']}>
                        <Label value="Pressure (dbar)" position="insideBottom" offset={-10} />
                    </XAxis>
                    <YAxis type="number" domain={['auto', 'auto']}>
                         <Label value={`${paramConfig.name} (${paramConfig.unit})`} angle={-90} position="insideLeft" offset={-10} style={{ textAnchor: 'middle' }} />
                    </YAxis>
                    <Tooltip formatter={(value) => typeof value === 'number' ? value.toFixed(3) : value} />
                    <Line
                        type="monotone"
                        dataKey={parameter}
                        stroke="#8884d8"
                        strokeWidth={2}
                        dot={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
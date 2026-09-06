import React from 'react';
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, Legend
} from 'recharts';

const PARAMETER_CONFIG = {
  temp: { name: 'Temperature', unit: '°C' },
  psal: { name: 'Salinity', unit: 'PSU' },
  doxy: { name: 'Oxygen', unit: 'μmol/kg' },
  chla: { name: 'Chlorophyll-a', unit: 'mg/m³' },
  nitrate: { name: 'Nitrate', unit: 'μmol/kg' },
  bbp700: { name: 'Backscatter 700nm', unit: 'm⁻¹' },
  ph: { name: 'pH', unit: '' },
};

export default function ChatVisualization({ visualization }) {
  if (!visualization || !visualization.data || visualization.data.length === 0) {
    return null;
  }

  const { chart_type, title, data, parameters } = visualization;

  const renderChart = () => {
    switch (chart_type) {
      case 'bar':
        return (
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={parameters.x_axis}
              angle={-45}
              textAnchor="end"
              height={80}
            >
              <Label value={parameters.x_axis.replace('_', ' ').toUpperCase()} position="insideBottom" offset={-50} />
            </XAxis>
            <YAxis>
              <Label value={parameters.y_axis.replace('_', ' ').toUpperCase()} angle={-90} position="insideLeft" />
            </YAxis>
            <Tooltip
              formatter={(value) => [typeof value === 'number' ? value.toFixed(3) : value, parameters.y_axis]}
            />
            <Bar dataKey={parameters.y_axis} fill="#1d4ed8" />
          </BarChart>
        );

      case 'scatter': {
        // Group data by parameter if needed
        const groupedData = {};
        data.forEach(item => {
          const key = item.parameter || 'default';
          if (!groupedData[key]) {
            groupedData[key] = [];
          }
          groupedData[key].push(item);
        });

        // The variable 'param' from Object.entries(groupedData) is used as the key and name for each Scatter.
        return (
          <ScatterChart margin={{ top: 20, right: 30, left: 60, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={parameters.x_axis}
              type="category"
              angle={-45}
              textAnchor="end"
              height={80}
            >
              <Label value={parameters.x_axis.toUpperCase()} position="insideBottom" offset={-50} />
            </XAxis>
            <YAxis dataKey={parameters.y_axis} type="number" domain={['auto', 'auto']}>
              <Label value={parameters.y_axis.toUpperCase()} angle={-90} position="insideLeft" offset={-50} />
            </YAxis>
            <Tooltip
              formatter={(value) => [typeof value === 'number' ? value.toFixed(3) : value, parameters.y_axis]}
              labelFormatter={(label) => `${parameters.x_axis}: ${label}`}
            />
            {Object.entries(groupedData).map(([param, paramData]) => (
              <Scatter
            key={param}
            data={paramData}
            fill={parameters.color_by && paramData[0]?.is_anomaly ? '#dc2626' : '#1d4ed8'}
            shape="circle"
            name={param}
              />
            ))}
          </ScatterChart>
        );
      }

      case 'line': {
        // Handle time series data with multiple regions
        const groupedLineData = {};
        data.forEach(item => {
          const key = item.region || item.parameter || 'default';
          if (!groupedLineData[key]) {
            groupedLineData[key] = [];
          }
          groupedLineData[key].push({
            ...item,
            time: new Date(item.date || item.profile_date).getTime()
          });
        });

        return (
          <LineChart data={Object.values(groupedLineData)[0] || []} margin={{ top: 20, right: 30, left: 60, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString()}
            >
              <Label value="Date" position="insideBottom" offset={-50} />
            </XAxis>
            <YAxis>
              <Label value={parameters.y_axis.replace('_', ' ').toUpperCase()} angle={-90} position="insideLeft" />
            </YAxis>
            <Tooltip
              formatter={(value) => [typeof value === 'number' ? value.toFixed(3) : value, parameters.y_axis]}
              labelFormatter={(unixTime) => new Date(unixTime).toUTCString()}
            />
            <Legend />
            {Object.entries(groupedLineData).map(([groupName, groupData], index) => (
              <Line
                key={groupName}
                data={groupData}
                type="monotone"
                dataKey={parameters.y_axis}
                stroke={index === 0 ? '#1d4ed8' : '#dc2626'}
                strokeWidth={2}
                dot={false}
                name={groupName}
              />
            ))}
          </LineChart>
        );
      }

      case 'table': {
        // Display data in a table format
        const columns = parameters.columns || (data.length > 0 ? Object.keys(data[0]) : []);
        return (
          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full bg-white border border-gray-300">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  {columns.map((col, index) => (
                    <th key={index} className="px-4 py-2 border-b text-left font-semibold text-gray-700">
                      {col.replace('_', ' ').toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 50).map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {columns.map((col, colIndex) => (
                      <td key={colIndex} className="px-4 py-2 border-b text-sm">
                        {typeof row[col] === 'number' ? row[col].toFixed(3) : String(row[col] || '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length > 50 && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                Showing first 50 of {data.length} rows
              </p>
            )}
          </div>
        );
      }

      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Unsupported chart type: {chart_type}</p>
          </div>
        );
    }
  };

  return (
    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
      {chart_type === 'scatter' && (
        <div className="mt-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span>Normal values</span>
            <div className="w-3 h-3 bg-red-600 rounded-full ml-4"></div>
            <span>Anomalies</span>
          </div>
        </div>
      )}
    </div>
  );
}
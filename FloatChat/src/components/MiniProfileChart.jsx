import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Label
} from 'recharts';

// This is a "dumb" component. It just receives data and renders a chart.
export default function MiniProfileChart({ data, parameter, config }) {
  // We need to rename the specific parameter (e.g., 'temp') to a generic 'value'
  // so the Line component can find it easily.
  const chartData = data.map(d => ({
    pressure: d.pressure,
    value: d[parameter]
  }));

  return (
    <div className="p-4 border-b h-64 bg-white">
      <h4 className="font-semibold text-sm text-gray-800">{config.name} Profile</h4>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="pressure" reversed={true} type="number" domain={['dataMax', 0]}>
            <Label value="Pressure (dbar)" position="insideBottom" offset={-15} />
          </XAxis>
          <YAxis type="number" domain={['auto', 'auto']} width={80}>
            <Label value={`${config.name} (${config.unit})`} angle={-90} position="insideLeft" offset={-10} style={{ textAnchor: 'middle' }} />
          </YAxis>
          <Tooltip formatter={(value) => typeof value === 'number' ? value.toFixed(3) : value} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#8884d8"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
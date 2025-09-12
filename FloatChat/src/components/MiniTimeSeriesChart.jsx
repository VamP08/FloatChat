import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Label } from 'recharts';

export default function MiniTimeSeriesChart({ data, parameter, config }) {
  // We use a scatter plot because the data is not continuous
  const chartData = data
    .filter(d => d[parameter] != null)
    .map(d => ({
      // Convert date string to a plottable timestamp
      time: new Date(d.profile_date).getTime(),
      value: d[parameter]
    }));

  return (
    <div className="p-4 border-b h-64 bg-white">
      <h4 className="font-semibold text-sm text-gray-800">{config.name} vs. Time</h4>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, left: 30, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString()}
          >
             <Label value="Date" position="insideBottom" offset={-15} style={{ fontSize: 12 }} />
          </XAxis>
          <YAxis dataKey="value" type="number" domain={['auto', 'auto']} width={80}>
             <Label value={`${config.name} (${config.unit})`} angle={-90} position="insideLeft" offset={-20} style={{ textAnchor: 'middle', fontSize: 12 }} />
          </YAxis>
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(value) => typeof value === 'number' ? value.toFixed(3) : value}
            labelFormatter={(unixTime) => new Date(unixTime).toUTCString()}
          />
          <Scatter data={chartData} fill="#1d4ed8" shape="circle" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
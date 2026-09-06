import {
  CartesianGrid, Label, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { axisProps, colourFor, gridProps, labelStyle, tooltipProps } from '../design/chart';

/**
 * One measurement against depth, for a single dive.
 *
 * Depth runs down the vertical axis rather than across the horizontal one. That is how
 * an oceanographic profile is always drawn, and for a reader who does not know the
 * convention it is still the obvious reading: further down the chart is further down
 * the water column.
 */
export default function MiniProfileChart({ data, parameter, config }) {
  const colour = colourFor(parameter);
  const series = data
    .filter((row) => row[parameter] != null && row.pressure != null)
    // One decibar is close enough to one metre to say metres, which is the unit a
    // reader without an oceanography background actually has a feel for.
    .map((row) => ({ depth: row.pressure, value: row[parameter] }))
    .sort((a, b) => a.depth - b.depth);

  if (series.length === 0) return null;

  return (
    <div className="border-b border-[var(--sea-edge)] p-4 pb-6">
      <h4 className="text-sm font-medium text-[var(--ink)]">
        {config.name}
        {config.unit ? <span className="text-[var(--ink-faint)]"> · {config.unit}</span> : null}
      </h4>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart layout="vertical" data={series} margin={{ top: 6, right: 16, left: 6, bottom: 22 }}>
            <CartesianGrid {...gridProps} vertical />
            <XAxis type="number" dataKey="value" domain={['auto', 'auto']} {...axisProps}>
              <Label value={config.unit || config.name} position="insideBottom" offset={-14} style={labelStyle} />
            </XAxis>
            <YAxis
              type="number"
              dataKey="depth"
              domain={[0, 'dataMax']}
              width={52}
              {...axisProps}
            >
              <Label value="Depth (m)" angle={-90} position="insideLeft" offset={12} style={{ ...labelStyle, textAnchor: 'middle' }} />
            </YAxis>
            <Tooltip
              {...tooltipProps}
              formatter={(value) => [typeof value === 'number' ? value.toFixed(3) : value, config.name]}
              labelFormatter={(depth) => `${Math.round(depth)} m down`}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={colour}
              strokeWidth={1.75}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

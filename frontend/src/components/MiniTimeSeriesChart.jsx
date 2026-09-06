import {
  CartesianGrid, Label, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts';
import { axisProps, colourFor, gridProps, labelStyle, tooltipProps } from '../design/chart';

/**
 * One measurement across a float's whole record.
 *
 * Every reading at every depth is plotted, so a dense column of points at one date is
 * a single dive seen edge-on. Points are drawn small and semi-transparent: where the
 * float sampled often, they accumulate into a darker band, which is the shape of the
 * record rather than an effect.
 */
export default function MiniTimeSeriesChart({ data, parameter, config }) {
  const colour = colourFor(parameter);
  const series = data
    .filter((row) => row[parameter] != null)
    .map((row) => ({
      time: new Date(row.profile_date).getTime(),
      value: row[parameter],
    }));

  if (series.length === 0) return null;

  return (
    <div className="border-b border-[var(--sea-edge)] p-4 pb-6">
      <div className="flex items-baseline justify-between gap-4">
        <h4 className="text-sm font-medium text-[var(--ink)]">
          {config.name}
          {config.unit ? <span className="text-[var(--ink-faint)]"> · {config.unit}</span> : null}
        </h4>
        <span className="tnum text-xs text-[var(--ink-faint)]">
          {series.length.toLocaleString('en-US')} readings
        </span>
      </div>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 6, right: 16, left: 6, bottom: 22 }}>
            <CartesianGrid {...gridProps} />
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
              }
              {...axisProps}
            >
              <Label value="Date" position="insideBottom" offset={-14} style={labelStyle} />
            </XAxis>
            <YAxis dataKey="value" type="number" domain={['auto', 'auto']} width={52} {...axisProps}>
              <Label
                value={config.unit || config.name}
                angle={-90}
                position="insideLeft"
                offset={12}
                style={{ ...labelStyle, textAnchor: 'middle' }}
              />
            </YAxis>
            <Tooltip
              {...tooltipProps}
              formatter={(value) => [typeof value === 'number' ? value.toFixed(3) : value, config.name]}
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <Scatter
              data={series}
              fill={colour}
              fillOpacity={0.45}
              shape="circle"
              isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

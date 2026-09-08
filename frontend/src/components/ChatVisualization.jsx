import {
  Bar, BarChart, CartesianGrid, Cell, Label, Legend, Line, LineChart,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  ACTION, INK_FAINT, axisProps, colourFor, gridProps, labelStyle, tooltipProps,
} from '../design/chart';
import { describe, keyForLabel } from '../parameters';

/**
 * The chart that comes back with an answer.
 *
 * This was the last component still on the Recharts defaults: a white card with a blue
 * bar, dropped into a dark page. It now draws from the same tokens as the charts on a
 * float page, so an answer and a dossier read as the same instrument.
 */

// The API labels a series with the word the question used, so "Temperature" and
// "Chlorophyll" arrive where this app says temp and chla.
const seriesColour = (label) => colourFor(keyForLabel(label));

/** "average_value" reads as a sentence, not as a shouted column name. */
const humanise = (field) =>
  String(field ?? '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** Region names arrive lowercase from the query, but they are place names. */
const MINOR = new Set(['of', 'the', 'and']);
const titleCase = (text) =>
  String(text ?? '')
    .split(' ')
    .map((word, index) =>
      index > 0 && MINOR.has(word) ? word : word.replace(/^./, (c) => c.toUpperCase()))
    .join(' ');

const format = (value) => (typeof value === 'number' ? value.toFixed(3) : value);

/**
 * One aggregate is a number, not a chart.
 *
 * A single bar spends two hundred pixels of height to repeat what its own axis already
 * says, and the average of one parameter in one region is the most common question
 * this app is asked.
 */
function Readout({ rows, valueKey, labelKey, unitOf }) {
  return (
    <dl className="flex flex-wrap gap-x-10 gap-y-4">
      {rows.map((row, index) => {
        const label = row[labelKey];
        const unit = unitOf(row);
        return (
          <div key={index}>
            <dt className="micro">{label}</dt>
            <dd className="tnum mt-1 text-3xl" style={{ color: seriesColour(label) }}>
              {format(row[valueKey])}
              {unit ? (
                <span className="ml-1.5 text-sm text-[var(--ink-faint)]">{unit}</span>
              ) : null}
            </dd>
            {row.count ? (
              <p className="tnum mt-1 text-xs text-[var(--ink-faint)]">
                {Number(row.count).toLocaleString('en-US')} readings
              </p>
            ) : null}
          </div>
        );
      })}
    </dl>
  );
}

export default function ChatVisualization({ visualization }) {
  if (!visualization?.data?.length) return null;

  const { chart_type: type, title, data, parameters } = visualization;
  const x = parameters?.x_axis;
  const y = parameters?.y_axis;

  // Bars only carry a unit when the value column is the measurement itself. An anomaly
  // rate is a proportion whatever parameter it belongs to.
  const unitOf = (row) => (y === 'value' ? describe(keyForLabel(row[x]) ?? '').unit : '');

  // Bars share one axis, so they can only be read against each other when they are in
  // the same unit. Averaging temperature, salinity, oxygen, chlorophyll and nitrate
  // together put 0.2 mg/m³ beside 43 µmol/kg on a single scale, which drew chlorophyll
  // as no bar at all. Mixed units, or too few values to compare, go out as figures.
  const mixedUnits = type === 'bar' && new Set(data.map(unitOf)).size > 1;
  if (type === 'bar' && (data.length <= 3 || mixedUnits)) {
    return (
      <figure className="mt-4 rounded-sm border border-[var(--sea-edge)] bg-[var(--sea-deep)] p-4">
        <figcaption className="micro mb-4">{title}</figcaption>
        <Readout rows={data} valueKey={y} labelKey={x} unitOf={unitOf} />
      </figure>
    );
  }

  const chart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 56 }}>
            <CartesianGrid {...gridProps} />
            <XAxis
              dataKey={x}
              angle={-40}
              textAnchor="end"
              height={70}
              interval={0}
              {...axisProps}
            />
            <YAxis {...axisProps}>
              {/* Every bar shares a unit by the time we get here, so name it. */}
              <Label
                value={unitOf(data[0]) || humanise(y)}
                angle={-90}
                position="insideLeft"
                style={labelStyle}
              />
            </YAxis>
            <Tooltip {...tooltipProps} formatter={(v) => [format(v), humanise(y)]} />
            <Bar dataKey={y} radius={[2, 2, 0, 0]}>
              {data.map((row, index) => (
                <Cell key={index} fill={seriesColour(row[x])} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        );

      case 'scatter': {
        const groups = {};
        data.forEach((row) => {
          const key = row.parameter || 'measurements';
          (groups[key] ||= []).push(row);
        });
        return (
          <ScatterChart margin={{ top: 8, right: 12, left: 4, bottom: 56 }}>
            <CartesianGrid {...gridProps} />
            <XAxis
              dataKey={x}
              type="category"
              angle={-40}
              textAnchor="end"
              height={70}
              {...axisProps}
            />
            <YAxis dataKey={y} type="number" domain={['auto', 'auto']} {...axisProps}>
              <Label
                value={describe(keyForLabel(data[0]?.parameter) ?? '').unit || humanise(y)}
                angle={-90}
                position="insideLeft"
                style={labelStyle}
              />
            </YAxis>
            <Tooltip {...tooltipProps} formatter={(v) => [format(v), humanise(y)]} />
            {Object.entries(groups).map(([name, rows]) => (
              <Scatter key={name} data={rows} name={name} shape="circle">
                {rows.map((row, index) => (
                  <Cell
                    key={index}
                    // An anomaly is what the reader is looking for, so it takes the one
                    // warm colour and everything else steps back.
                    fill={parameters?.color_by && row.is_anomaly ? '#ff6b57' : seriesColour(name)}
                    fillOpacity={row.is_anomaly ? 1 : 0.6}
                  />
                ))}
              </Scatter>
            ))}
          </ScatterChart>
        );
      }

      case 'line': {
        const groups = {};
        data.forEach((row) => {
          const key = row.region || row.parameter || 'series';
          (groups[key] ||= []).push({
            ...row,
            time: new Date(row.date || row.profile_date).getTime(),
          });
        });
        const names = Object.keys(groups);
        // Every line here is the same parameter in a different place, so the axis can
        // carry the unit rather than the word "value".
        const unit = describe(keyForLabel(data[0]?.parameter) ?? '').unit;
        return (
          <LineChart margin={{ top: 8, right: 12, left: 4, bottom: 40 }}>
            <CartesianGrid {...gridProps} />
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              // A two-digit year reads as a day of the month next to a month name:
              // "Mar 14" for March 2014 is not a date anyone parses correctly.
              tickFormatter={(t) =>
                new Date(t).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
              {...axisProps}
            />
            <YAxis domain={['auto', 'auto']} {...axisProps}>
              <Label
                value={unit || humanise(y)}
                angle={-90}
                position="insideLeft"
                style={labelStyle}
              />
            </YAxis>
            <Tooltip
              {...tooltipProps}
              formatter={(v) => [format(v), humanise(y)]}
              labelFormatter={(t) =>
                new Date(t).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
            />
            {names.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: INK_FAINT }} />}
            {names.map((name, index) => (
              <Line
                key={name}
                data={groups[name]}
                type="monotone"
                dataKey={y}
                name={titleCase(name)}
                // One series takes the colour of what it measures. Several series are
                // regions rather than parameters, so they are told apart by hue alone.
                stroke={names.length > 1 ? [ACTION, '#ff7bd5', '#ffc94a'][index % 3] : seriesColour(name)}
                strokeWidth={1.75}
                dot={false}
              />
            ))}
          </LineChart>
        );
      }

      default:
        return null;
    }
  };

  if (type === 'table') {
    const columns = parameters?.columns || Object.keys(data[0]);
    return (
      <figure className="mt-4 rounded-sm border border-[var(--sea-edge)] bg-[var(--sea-deep)]">
        <figcaption className="micro border-b border-[var(--sea-edge)] p-4">{title}</figcaption>
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--sea-panel)]">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="micro border-b border-[var(--sea-edge)] px-4 py-2.5 text-left font-normal"
                  >
                    {humanise(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 50).map((row, index) => (
                <tr key={index} className="border-b border-[var(--sea-edge)] last:border-0">
                  {columns.map((column) => (
                    <td key={column} className="tnum px-4 py-2 text-[var(--ink-dim)]">
                      {row[column] == null ? '—' : format(row[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.length > 50 && (
          <p className="tnum border-t border-[var(--sea-edge)] p-3 text-center text-xs text-[var(--ink-faint)]">
            First 50 of {data.length.toLocaleString('en-US')} rows
          </p>
        )}
      </figure>
    );
  }

  const body = chart();
  if (!body) return null;

  return (
    <figure className="mt-4 rounded-sm border border-[var(--sea-edge)] bg-[var(--sea-deep)] p-4">
      <figcaption className="micro">{title}</figcaption>
      <div className="mt-3 h-72">
        <ResponsiveContainer width="100%" height="100%">{body}</ResponsiveContainer>
      </div>
      {type === 'scatter' && parameters?.color_by && (
        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--ink-faint)]">
          <span
            className="emit h-1.5 w-1.5 rounded-full"
            style={{ background: '#ff6b57', color: '#ff6b57' }}
          />
          Anomalies
          <span className="ml-3 h-1.5 w-1.5 rounded-full bg-[var(--ink-faint)]" />
          Everything else
        </div>
      )}
    </figure>
  );
}

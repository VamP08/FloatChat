import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid, Label, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { fetchMeasurements } from "../api/client";
import { axisProps, colourFor, gridProps, labelStyle, tooltipProps } from "../design/chart";
import { describe, presentIn } from "../parameters";
import { useAppStore } from "../store/appStore";

function ParameterSelector({ available }) {
  const setParameter = useAppStore((s) => s.setParameter);
  const selectedParameter = useAppStore((s) => s.selectedParameter);

  return (
    <div className="flex flex-wrap gap-2 border-y border-[var(--sea-edge)] bg-[var(--sea-deep)] p-3">
      {available.map((key) => (
        <button
          key={key}
          onClick={() => setParameter(key)}
          className="rounded-full border px-3.5 py-1.5 text-sm transition-colors"
          style={
            selectedParameter === key
              ? { borderColor: colourFor(key), color: colourFor(key), background: "var(--sea-raised)" }
              : { borderColor: "var(--sea-edge)", color: "var(--ink-dim)", background: "transparent" }
          }
        >
          {describe(key).name}
        </button>
      ))}
    </div>
  );
}

export default function MeasurementChart() {
  const profileId = useAppStore((s) => s.selectedProfile);
  const parameter = useAppStore((s) => s.selectedParameter);
  const setParameter = useAppStore((s) => s.setParameter);
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch once per profile. Switching parameter filters what is already here rather
  // than asking the API for the same rows again.
  useEffect(() => {
    if (!profileId) {
      setMeasurements([]);
      return;
    }
    setLoading(true);
    setError(null);
    fetchMeasurements(profileId)
      .then(setMeasurements)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [profileId]);

  const available = useMemo(() => presentIn(measurements), [measurements]);
  const data = useMemo(
    () => measurements.filter((row) => row[parameter] != null),
    [measurements, parameter],
  );

  // The selected parameter may be absent from this profile -- sensor payloads differ
  // between floats. Fall back to one this profile actually has.
  useEffect(() => {
    if (available.length > 0 && !available.includes(parameter)) {
      setParameter(available[0]);
    }
  }, [available, parameter, setParameter]);

  if (!profileId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <p className="text-center text-[var(--ink-dim)]">
          Select a float, then a profile, to see its measurements.
        </p>
      </div>
    );
  }

  const config = describe(parameter);

  return (
    <div className="flex h-full flex-col bg-[var(--sea-abyss)]">
      <h2 className="display px-4 pt-4 text-xl">{config.name} against depth</h2>
      <ParameterSelector available={available} />
      <div className="flex-grow p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[var(--ink-dim)]">Loading measurements&hellip;</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-[var(--em-temp)]">Could not load measurements: {error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-center text-[var(--ink-dim)]">
              This profile has no {config.name.toLowerCase()} readings that passed
              quality control.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart layout="vertical" data={data} margin={{ top: 8, right: 24, left: 8, bottom: 26 }}>
              <CartesianGrid {...gridProps} vertical />
              <XAxis type="number" dataKey={parameter} domain={["auto", "auto"]} {...axisProps}>
                <Label
                  value={config.unit || config.name}
                  position="insideBottom"
                  offset={-16}
                  style={labelStyle}
                />
              </XAxis>
              <YAxis type="number" dataKey="pressure" domain={[0, "dataMax"]} width={58} {...axisProps}>
                <Label
                  value="Depth (m)"
                  angle={-90}
                  position="insideLeft"
                  offset={14}
                  style={{ ...labelStyle, textAnchor: "middle" }}
                />
              </YAxis>
              <Tooltip
                {...tooltipProps}
                formatter={(value) => [typeof value === "number" ? value.toFixed(3) : value, config.name]}
                labelFormatter={(depth) => `${Math.round(depth)} m down`}
              />
              <Line
                type="monotone"
                dataKey={parameter}
                stroke={colourFor(parameter)}
                strokeWidth={1.9}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

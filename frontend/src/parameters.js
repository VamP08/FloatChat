// One definition of what each measured parameter is called and what it is measured in.
// This used to be copied into three components, two of which had drifted and omitted pH
// and backscatter entirely, so those parameters could never be plotted in the sidebar.

export const PARAMETERS = {
  temp: { name: "Temperature", unit: "°C" },
  psal: { name: "Salinity", unit: "PSU" },
  doxy: { name: "Oxygen", unit: "µmol/kg" },
  chla: { name: "Chlorophyll-a", unit: "mg/m³" },
  nitrate: { name: "Nitrate", unit: "µmol/kg" },
  bbp700: { name: "Backscatter 700nm", unit: "m⁻¹" },
  ph: { name: "pH", unit: "total scale" },
};

export const PARAMETER_KEYS = Object.keys(PARAMETERS);

/** Display name and unit for a column, falling back to the raw key. */
export function describe(key) {
  return PARAMETERS[key] ?? { name: key, unit: "" };
}

/**
 * The parameters present in a set of rows, in the canonical order above.
 *
 * Argo floats carry different sensor payloads, and readings that failed quality
 * control were dropped during ingest, so a column can be entirely null for one float
 * and full for the next. Charting a column of nulls produces an empty axis and no
 * explanation, so callers ask this first.
 */
export function presentIn(rows) {
  if (!rows?.length) return [];
  return PARAMETER_KEYS.filter((key) => rows.some((row) => row[key] != null));
}

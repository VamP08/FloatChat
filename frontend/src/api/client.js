// The deployed frontend and the API live on different hosts, so the base URL is
// configuration rather than a constant. Vite inlines VITE_API_URL at build time.
const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

// The API is hosted on a free tier that sleeps after a quiet spell, and the first
// request afterwards waits through a cold start. Rather than show a spinner that looks
// broken for a minute, anything slower than this announces itself.
const SLOW_REQUEST_MS = 2500;

let slowListener = null;
let pendingSlowRequests = 0;

/** Register a callback that receives true while any request is running slowly. */
export function onSlowRequest(listener) {
  slowListener = listener;
  return () => {
    slowListener = null;
  };
}

function notifySlow(delta) {
  pendingSlowRequests += delta;
  slowListener?.(pendingSlowRequests > 0);
}

async function request(path, options) {
  let markedSlow = false;
  const timer = setTimeout(() => {
    markedSlow = true;
    notifySlow(1);
  }, SLOW_REQUEST_MS);

  try {
    const res = await fetch(`${API_URL}${path}`, options);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const error = new Error(text || `Request failed with status ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return res.json();
  } finally {
    clearTimeout(timer);
    if (markedSlow) notifySlow(-1);
  }
}

/** Wake the API and confirm it can reach its database. */
export const checkBackend = () => request("/healthz");

export const fetchFloats = () => request("/floats/");
export const fetchFloatDetails = (floatId) => request(`/floats/${floatId}`);
export const fetchFloatLocations = () => request("/floats/locations");
export const fetchActiveFloatLocations = () => request("/floats/locations/active");
export const fetchFloatTrajectory = (floatId) => request(`/floats/${floatId}/trajectory`);
export const fetchProfiles = (floatId) => request(`/floats/${floatId}/profiles`);
export const fetchProfilesWithData = (floatId) =>
  request(`/floats/${floatId}/profiles_with_data`);
export const fetchMeasurements = (profileId) =>
  request(`/profiles/${profileId}/measurements`);
export const fetchFloatTimeSeries = (floatId) => request(`/floats/${floatId}/timeseries`);

/**
 * Which parameters this float actually holds data for.
 *
 * A float's sensor list names the instruments aboard, not the ones whose readings
 * survived quality control. Offering a parameter the float has no values for produces
 * an empty chart and no explanation, so the selector is built from this instead.
 */
export const fetchFloatCoverage = (floatId) => request(`/floats/${floatId}/coverage`);

/** Starting questions the query engine is known to answer. */
export const fetchChatExamples = () => request("/chat/examples");

export const sendChatMessage = (history) =>
  request("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history }),
  });

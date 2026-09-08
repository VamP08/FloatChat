// The deployed frontend and the API live on different hosts, so the base URL is
// configuration rather than a constant. Vite inlines VITE_API_URL at build time.
const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

// The API is hosted on a free tier that stops the container after fifteen idle minutes.
// Waking it takes roughly half a minute, and while it wakes the platform answers with a
// gateway error rather than holding the connection open — so a cold start arrives as an
// immediate failure, not a slow response. Retrying through it is what makes the wait a
// wait rather than a dead end.
const SLOW_REQUEST_MS = 2500;
const RETRY_DELAYS_MS = [1500, 3000, 5000, 8000, 12000, 15000, 15000];
// Statuses a waking or restarting instance returns. Anything else is a real answer.
const WAKING_STATUSES = new Set([502, 503, 504]);

// A set rather than one variable. React mounts effects twice in development, so a
// single slot is overwritten by the second registration and then cleared by the first
// one's cleanup, leaving nothing subscribed and the waking notice never shown.
const slowListeners = new Set();
let pendingSlowRequests = 0;

/** Register a callback that receives true while any request is running slowly. */
export function onSlowRequest(listener) {
  slowListeners.add(listener);
  listener(pendingSlowRequests > 0);
  return () => {
    slowListeners.delete(listener);
  };
}

function notifySlow(delta) {
  pendingSlowRequests += delta;
  const slow = pendingSlowRequests > 0;
  slowListeners.forEach((listener) => listener(slow));
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function attempt(path, options) {
  const res = await fetch(`${API_URL}${path}`, options);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const error = new Error(text || `Request failed with status ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

/**
 * One request, retried while the host is still waking.
 *
 * Only reads are retried. A failed POST may already have reached the server, and the
 * chat endpoint both spends an API key and counts against a rate limit, so repeating it
 * on a timeout could charge for work that was already done.
 */
async function request(path, options = {}) {
  const retryable = (options.method ?? "GET") === "GET";
  let markedSlow = false;
  const timer = setTimeout(() => {
    markedSlow = true;
    notifySlow(1);
  }, SLOW_REQUEST_MS);

  try {
    for (let index = 0; ; index += 1) {
      try {
        return await attempt(path, options);
      } catch (error) {
        const waking =
          error.status === undefined || WAKING_STATUSES.has(error.status);
        if (!retryable || !waking || index >= RETRY_DELAYS_MS.length) throw error;
        await wait(RETRY_DELAYS_MS[index]);
      }
    }
  } finally {
    clearTimeout(timer);
    if (markedSlow) notifySlow(-1);
  }
}

/**
 * Ask the API to wake up, without waiting for it.
 *
 * The landing page calls this on load. It reads no API data itself, so everyone arrives
 * on a page that renders instantly — and the container starts booting while they read,
 * rather than when they finally click through.
 */
export function warmBackend() {
  fetch(`${API_URL}/healthz`, { method: "GET", keepalive: true }).catch(() => {});
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

const API_URL = "http://localhost:8000";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export function fetchFloats() { return fetchJson(`${API_URL}/floats`); }
export function fetchFloatDetails(floatId) { return fetchJson(`${API_URL}/floats/${floatId}`); }
export function fetchProfiles(floatId) { return fetchJson(`${API_URL}/floats/${floatId}/profiles`); }
export function fetchMeasurements(profileId) { return fetchJson(`${API_URL}/profiles/${profileId}/measurements`); }
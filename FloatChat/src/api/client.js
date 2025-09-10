const API_URL = "http://localhost:8000";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// For the main float list on the Dashboard page
export function fetchFloats() { return fetchJson(`${API_URL}/floats`); }

// For the FloatDetails component (in the sidebar or dashboard)
export function fetchFloatDetails(floatId) { return fetchJson(`${API_URL}/floats/${floatId}`); }

// For the old ProfileList that shows ALL profiles
export function fetchProfiles(floatId) { return fetchJson(`${API_URL}/floats/${floatId}/profiles`); }

// For getting the scientific measurement data for a single profile
export function fetchMeasurements(profileId) { return fetchJson(`${API_URL}/profiles/${profileId}/measurements`); }

// For getting the initial locations of all floats for the map
export function fetchFloatLocations() { return fetchJson(`${API_URL}/floats/locations`); }

// For drawing the red trajectory line on the map
export function fetchFloatTrajectory(floatId) { return fetchJson(`${API_URL}/floats/${floatId}/trajectory`); }

// For the NEW "smart" profile list that only shows cycles with data
export function fetchProfilesWithData(floatId) { return fetchJson(`${API_URL}/floats/${floatId}/profiles_with_data`); }

// For getting the initial locations of ONLY ACTIVE floats for the map
export function fetchActiveFloatLocations() { return fetchJson(`${API_URL}/floats/locations/active`); }
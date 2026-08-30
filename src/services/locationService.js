// ====================================================================
// ZOLVE LOCATION SERVICE — Geolocation + Geocoding + Distance
// Free stack: Browser Geolocation API + Nominatim (OSM) + Haversine
// ====================================================================

const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';
const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';

let lastNominatimAt = 0;

function throttleNominatim() {
  const now = Date.now();
  const wait = 1100 - (now - lastNominatimAt);
  if (wait > 0) {
    return new Promise((r) => setTimeout(r, wait));
  }
  return Promise.resolve();
}

// Haversine distance in km
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatDistanceKm(km) {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

export function calcETA(distanceKm, avgSpeedKmh = 22) {
  if (distanceKm <= 0) return 'Arriving now';
  const mins = Math.round((distanceKm / avgSpeedKmh) * 60);
  if (mins < 1) return '<1 min';
  if (mins === 1) return '1 min';
  return `${mins} mins`;
}

export async function checkPermission() {
  if (!navigator.permissions?.query) return 'unknown';
  try {
    const r = await navigator.permissions.query({ name: 'geolocation' });
    return r.state; // granted | denied | prompt
  } catch {
    return 'unknown';
  }
}

export function isGeolocationSupported() {
  return 'geolocation' in navigator;
}

export function getCurrentPosition(options = {}) {
  const opts = {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 10000,
    ...options,
  };
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new Error('Geolocation not supported in this browser'));
      return;
    }
    // Secure context check
    if (window.isSecureContext === false && window.location.hostname !== 'localhost') {
      reject(new Error('Geolocation requires HTTPS. Use localhost or HTTPS.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, heading: pos.coords.heading, speed: pos.coords.speed }),
      (err) => {
        const map = { 1: 'Permission denied', 2: 'Position unavailable', 3: 'Timeout' };
        reject(new Error(map[err.code] || err.message));
      },
      opts
    );
  });
}

export function watchPosition(callback, options = {}) {
  const opts = {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 5000,
    ...options,
  };
  if (!isGeolocationSupported()) return null;
  return navigator.geolocation.watchPosition(
    (pos) => callback({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, heading: pos.coords.heading, speed: pos.coords.speed, timestamp: Date.now() }),
    (err) => callback({ error: err.message, code: err.code }),
    opts
  );
}

export function clearWatch(watchId) {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
}

export async function reverseGeocode(lat, lng) {
  await throttleNominatim();
  lastNominatimAt = Date.now();
  const url = `${NOMINATIM_REVERSE}?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Reverse geocode failed');
  const data = await res.json();
  const name = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  // shorten to neighborhood
  const addr = data.address || {};
  const short = [addr.neighbourhood, addr.suburb, addr.city || addr.town || addr.village].filter(Boolean).join(', ') || name.split(',').slice(0,3).join(',');
  return { name: short, full: name, raw: data };
}

export async function searchPlaces(query, limit = 5) {
  if (!query || query.trim().length < 2) return [];
  await throttleNominatim();
  lastNominatimAt = Date.now();
  const url = `${NOMINATIM_SEARCH}?format=json&q=${encodeURIComponent(query)}&limit=${limit}&countrycodes=in`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((d) => ({ name: d.display_name, lat: parseFloat(d.lat), lng: parseFloat(d.lon), raw: d }));
}

// Interpolate position toward destination for mock simulation
export function interpolatePosition(from, to, fraction) {
  return {
    lat: from.lat + (to.lat - from.lat) * fraction,
    lng: from.lng + (to.lng - from.lng) * fraction,
  };
}

// ====================================================================
// ZOLVE LOCATION SERVICE — Geolocation + Geocoding + Distance
// Free stack: Browser Geolocation API + Nominatim (OSM) + Haversine
// ====================================================================

import { CITY_HUBS } from '../data/mockData.js';

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

export async function searchPlaces(query, limit = 8) {
  if (!query || query.trim().length < 2) return [];
  const clean = query.trim();
  // If query is exactly a 6-digit Indian pincode, delegate to pincode resolver for better accuracy
  if (/^[1-9]\d{5}$/.test(clean)) {
    try {
      const pinRes = await searchByPincode(clean, limit);
      if (pinRes.length > 0) return pinRes;
    } catch { /* fall through to normal search */ }
  }
  await throttleNominatim();
  lastNominatimAt = Date.now();
  // Nominatim India-biased search. Browser automatically sends User-Agent/Referer which satisfies OSM policy.
  // We keep throttle to respect 1 req/sec policy. addressdetails helps build better display.
  const url = `${NOMINATIM_SEARCH}?format=json&q=${encodeURIComponent(clean)}&limit=${limit}&countrycodes=in&addressdetails=1&accept-language=en`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json', 'Accept-Language': 'en' } });
    if (!res.ok) {
      // 403 often means policy block - still return empty so UI can fallback to local results
      console.warn('[locationService] Nominatim search failed:', res.status, res.statusText);
      return [];
    }
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter((d) => d.lat && d.lon)
      .map((d) => ({
        name: d.display_name,
        // short label: first 3 parts e.g. "Connaught Place, New Delhi, Delhi"
        short: d.display_name.split(',').slice(0, 3).join(',').trim(),
        lat: parseFloat(d.lat),
        lng: parseFloat(d.lon),
        raw: d,
      }));
  } catch (err) {
    console.warn('[locationService] searchPlaces error:', err?.message || err);
    return [];
  }
}

export function isValidIndianPincode(pin) {
  return /^[1-9]\d{5}$/.test(String(pin).trim());
}

// Locality aliases → hub city (offline, extendable). For typed addresses that
// carry neither a pincode nor a city token (e.g. "Dhelua, Rajpur Sonarpur").
const LOCALITY_TO_CITY = [
  { match: ['rajpur sonarpur', 'sonarpur', 'dhelua', 'howrah', 'salt lake', 'sector v', 'new town', 'rajarhat', 'dum dum', 'behala', 'jadavpur', 'park street', 'garia'], city: 'Kolkata' },
  { match: ['indiranagar', 'koramangala', 'whitefield', 'hsr layout', 'bellandur'], city: 'Bengaluru' },
  { match: ['andheri', 'bandra', 'borivali', 'thane'], city: 'Mumbai' },
  { match: ['lajpat nagar', 'rohini', 'dwarka', 'noida'], city: 'Delhi NCR' },
];

// Offline hub match (synchronous, no network): city/state token or locality alias.
function matchOfflineHub(text) {
  const lower = String(text || '').toLowerCase();
  if (lower.length < 3) return null;
  const hubByName = (CITY_HUBS || []).find((h) =>
    (h.city && lower.includes(h.city.toLowerCase())) ||
    (h.state && lower.includes(h.state.toLowerCase()))
  );
  if (hubByName) return { lat: hubByName.lat, lng: hubByName.lng, source: 'city' };
  for (const alias of LOCALITY_TO_CITY) {
    if (alias.match.some((m) => lower.includes(m))) {
      const hub = (CITY_HUBS || []).find((h) => h.city === alias.city);
      if (hub) return { lat: hub.lat, lng: hub.lng, source: 'locality' };
    }
  }
  return null;
}

// Checkout-time address → coords. Every paid booking MUST carry a location for
// the 50km allocation rule, so typed addresses resolve here (payment is blocked
// when this returns null). Offline match is sync and returned immediately —
// hub-center precision is enough for the 50km decision and the customer can
// refine with map-drag; network (pincode/search) only refines when offline
// found nothing, so this never stalls the UI when Nominatim is unreachable.
export async function resolveCoordsFromText(text) {
  const q = String(text || '').trim();
  if (q.length < 3) return null;
  // Offline first (sync, no console noise, instant): precise enough for the
  // 50km decision. Network only refines when offline found nothing.
  const offline = matchOfflineHub(q);
  if (offline) return offline;
  const pinMatch = q.match(/[1-9]\d{5}/);
  if (pinMatch) {
    try {
      const res = await searchByPincode(pinMatch[0], 1);
      const best = Array.isArray(res) ? res[0] : null;
      if (best && Number.isFinite(best.lat) && Number.isFinite(best.lng)) {
        return { lat: best.lat, lng: best.lng, source: 'pincode' };
      }
    } catch { /* fall through to search */ }
  }
  try {
    const list = await searchPlaces(q, 1);
    const best = Array.isArray(list) ? list[0] : null;
    if (best && Number.isFinite(best.lat) && Number.isFinite(best.lng)) {
      return { lat: best.lat, lng: best.lng, source: 'search' };
    }
  } catch { /* null below */ }
  return null;
}

// India pincode -> lat/lng + address via PostalPincode.in + Nominatim postalcode fallback
// Uses: Nominatim postalcode search (preferred free, no key) + https://api.postalpincode.in fallback for district/state names
export async function searchByPincode(pincode, limit = 5) {
  const pin = String(pincode).trim();
  if (!isValidIndianPincode(pin)) throw new Error('Enter valid 6-digit Indian pincode (e.g. 110001)');
  await throttleNominatim();
  lastNominatimAt = Date.now();

  // 1) Try Nominatim postalcode directly - most reliable for GPS coords
  try {
    const url = `${NOMINATIM_SEARCH}?format=json&postalcode=${encodeURIComponent(pin)}&countrycodes=in&addressdetails=1&limit=${limit}&accept-language=en`;
    const res = await fetch(url, { headers: { Accept: 'application/json', 'Accept-Language': 'en' } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].lat) {
        return data.filter(d => d.lat && d.lon).map(d => ({
          name: d.display_name,
          short: `${pin} - ${d.display_name.split(',').slice(0,2).join(',').trim()}`,
          pincode: pin,
          lat: parseFloat(d.lat),
          lng: parseFloat(d.lon),
          raw: d,
        }));
      }
    }
  } catch (e) {
    console.warn('[locationService] postalcode nominatim failed', e?.message);
  }

  // 2) Fallback: India Post API to resolve district/state, then geocode that text
  try {
    const postRes = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pin)}`);
    if (!postRes.ok) throw new Error('Pincode service unavailable');
    const postJson = await postRes.json();
    const entry = postJson?.[0];
    if (entry?.Status !== 'Success' || !entry?.PostOffice?.length) throw new Error('Invalid pincode or no Post Office found');
    const po = entry.PostOffice[0];
    const district = po.District || '';
    const state = po.State || '';
    const block = po.Block || po.Name || '';
    const queryText = [block, district, state, 'India'].filter(Boolean).join(', ');
    // second nominatim call needs throttle
    await throttleNominatim();
    lastNominatimAt = Date.now();
    const qUrl = `${NOMINATIM_SEARCH}?format=json&q=${encodeURIComponent(queryText)}&limit=${limit}&countrycodes=in&addressdetails=1&accept-language=en`;
    const qRes = await fetch(qUrl, { headers: { Accept: 'application/json', 'Accept-Language': 'en' } });
    if (!qRes.ok) throw new Error('Geocode for pincode locality failed');
    const qData = await qRes.json();
    if (!Array.isArray(qData) || qData.length === 0) throw new Error(`No map location for pincode area: ${queryText}`);
    return qData.filter(d => d.lat && d.lon).map(d => ({
      name: d.display_name,
      short: `${pin} - ${block || district}, ${district}${state ? ', ' + state : ''}`,
      pincode: pin,
      district, state, block,
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lon),
      raw: d,
      postOffice: po,
    }));
  } catch (err) {
    console.warn('[locationService] searchByPincode fallback failed:', err?.message);
    throw err;
  }
}

// Service availability radius (km) — executive presence check
export const SERVICE_RADIUS_KM = 50;

// --- Live-tracker coordinate separation ---------------------------------
// Partner position and customer destination must NEVER come from the same
// object. Canonical fields: booking.customerCoords (destination) and
// booking.providerCoords (partner's own coords, null until assigned).
const isFiniteCoord = (c) =>
  !!c && Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lng));

// Haversine destination point: coords at a bearing + distance from origin.
export function destinationPoint(lat, lng, bearingDeg, distanceKm) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const br = toRad(bearingDeg);
  const lat1 = toRad(lat), lon1 = toRad(lng);
  const d = distanceKm / R;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(br));
  const lon2 = lon1 + Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: toDeg(lat2), lng: toDeg(lon2) };
}

function hashStr32(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Deterministic demo partner position: nearby but NEVER identical to the
// customer. Stable per booking (same bookingId → same coords, no per-render
// randomness). Used ONLY when no live/assigned partner position exists.
export function demoPartnerLocationForBooking(bookingId, customerCoords) {
  if (!isFiniteCoord(customerCoords)) return null;
  const h = hashStr32(String(bookingId || 'demo'));
  const bearing = h % 360;
  const distKm = 3.5 + ((h >>> 8) % 26) / 10; // 3.5 – 6.0 km
  const p = destinationPoint(Number(customerCoords.lat), Number(customerCoords.lng), bearing, distKm);
  return { lat: Math.round(p.lat * 10000) / 10000, lng: Math.round(p.lng * 10000) / 10000 };
}

// Nearest dataset partner to a location (demo fallback only — distance-only,
// no qualification gate). Returns { provider, distanceKm } or null.
export function nearestProviderToLocation(providers = [], loc) {
  if (!isFiniteCoord(loc)) return null;
  let best = null;
  for (const p of providers || []) {
    if (!isFiniteCoord(p?.coords)) continue;
    const d = haversineKm(Number(loc.lat), Number(loc.lng), Number(p.coords.lat), Number(p.coords.lng));
    if (!Number.isFinite(d)) continue;
    if (!best || d < best.distanceKm) best = { provider: p, distanceKm: d };
  }
  return best;
}

// Single tracker-position resolver (one implementation; UI + tests share it).
// Priority: live GPS > assigned provider coords > deterministic demo > null.
// Returns finite numbers or nulls — never NaN/undefined/Infinity.
export function resolveTrackerPositions({ customerCoords = null, liveCoords = null, assignedCoords = null, bookingId = null } = {}) {
  const customer = isFiniteCoord(customerCoords)
    ? { lat: Number(customerCoords.lat), lng: Number(customerCoords.lng) } : null;
  if (!customer) return { customerCoords: null, providerCoords: null, distanceKm: null, eta: null, partnerSource: null };
  let provider = null;
  let partnerSource = null;
  if (isFiniteCoord(liveCoords)) {
    provider = { lat: Number(liveCoords.lat), lng: Number(liveCoords.lng) };
    partnerSource = 'live';
  } else if (isFiniteCoord(assignedCoords)) {
    provider = { lat: Number(assignedCoords.lat), lng: Number(assignedCoords.lng) };
    partnerSource = 'assigned';
  } else {
    const demo = demoPartnerLocationForBooking(bookingId, customer);
    if (demo) { provider = demo; partnerSource = 'demo'; }
  }
  if (!provider) return { customerCoords: customer, providerCoords: null, distanceKm: null, eta: null, partnerSource: null };
  const distanceKm = haversineKm(provider.lat, provider.lng, customer.lat, customer.lng);
  if (!Number.isFinite(distanceKm)) {
    return { customerCoords: customer, providerCoords: null, distanceKm: null, eta: null, partnerSource: null };
  }
  return { customerCoords: customer, providerCoords: provider, distanceKm, eta: calcETA(distanceKm), partnerSource };
}

export function isWithinServiceRadius(userLat, userLng, providerLat, providerLng, radiusKm = SERVICE_RADIUS_KM) {
  if ([userLat, userLng, providerLat, providerLng].some(v => v == null || isNaN(v))) return false;
  return haversineKm(userLat, userLng, providerLat, providerLng) <= radiusKm;
}

export function getNearbyProviders(providers, userCoords, radiusKm = SERVICE_RADIUS_KM) {
  if (!userCoords || userCoords.lat == null || userCoords.lng == null) return providers;
  return providers.filter(p => p.coords && isWithinServiceRadius(userCoords.lat, userCoords.lng, p.coords.lat, p.coords.lng, radiusKm));
}

export function getNearestProviderDistanceKm(userCoords, providers) {
  if (!userCoords || !providers?.length) return null;
  let min = Infinity;
  for (const p of providers) {
    if (!p.coords) continue;
    const d = haversineKm(userCoords.lat, userCoords.lng, p.coords.lat, p.coords.lng);
    if (d < min) min = d;
  }
  return min === Infinity ? null : min;
}

// Interpolate position toward destination for mock simulation
export function interpolatePosition(from, to, fraction) {
  return {
    lat: from.lat + (to.lat - from.lat) * fraction,
    lng: from.lng + (to.lng - from.lng) * fraction,
  };
}

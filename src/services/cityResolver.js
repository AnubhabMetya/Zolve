// City resolver — uses both selectedLocation coords + reverseGeocode/pincode
import { CITY_HUBS } from '../data/mockData.js';
import { haversineKm } from './locationService.js';

export function resolveCityFromCoords(lat, lng) {
  if (lat == null || lng == null) return null;
  let best = null;
  let bestDist = Infinity;
  for (const hub of CITY_HUBS) {
    const d = haversineKm(lat, lng, hub.lat, hub.lng);
    if (d < bestDist) {
      bestDist = d;
      best = hub;
    }
  }
  if (!best) return null;
  // HARD 50km rule: outside coverage → do NOT silently map to nearest city
  if (bestDist > 50) {
    return { city: null, state: null, hub_id: null, coords: { lat, lng }, pincode: null, distanceKm: bestDist, supported: false, nearestCity: best.city, nearestHubId: best.id };
  }
  return { city: best.city, state: best.state, hub_id: best.id, coords: { lat: best.lat, lng: best.lng }, pincode: best.pincode, distanceKm: bestDist, supported: true };
}

export function resolveCityFromText(text) {
  if (!text) return null;
  const lower = String(text).toLowerCase();
  for (const hub of CITY_HUBS) {
    if (lower.includes(hub.city.toLowerCase()) || (hub.city === 'Delhi NCR' && (lower.includes('delhi') || lower.includes('gurugram') || lower.includes('gurgaon')))) {
      return { city: hub.city, state: hub.state, hub_id: hub.id, coords: { lat: hub.lat, lng: hub.lng }, pincode: hub.pincode };
    }
    // also match pincode
    if (hub.pincode && lower.includes(hub.pincode)) {
      return { city: hub.city, state: hub.state, hub_id: hub.id, coords: { lat: hub.lat, lng: hub.lng }, pincode: hub.pincode };
    }
  }
  return null;
}

export function resolveCity({ lat, lng, pincode, name, text } = {}) {
  // Priority: GPS coords → manual text/pincode → unknown (never Bengaluru fallback)
  if (lat != null && lng != null) {
    const viaCoords = resolveCityFromCoords(lat, lng);
    if (viaCoords) return viaCoords;
    // coords present but not matched? keep coords with unknown city
    return { city: null, state: null, hub_id: null, coords: { lat, lng }, pincode: pincode || null, distanceKm: null, supported: false };
  }
  const viaText = resolveCityFromText(text || name || pincode || '');
  if (viaText) return { ...viaText, supported: true, distanceKm: 0 };
  if (pincode) {
    const viaPin = resolveCityFromText(pincode);
    if (viaPin) return { ...viaPin, supported: true, distanceKm: 0 };
  }
  // Unknown location — never default to Bengaluru
  return { city: null, state: null, hub_id: null, coords: null, pincode: null, distanceKm: null, supported: false, unknown: true };
}

export function getHubByCity(city) {
  if (!city) return null;
  return CITY_HUBS.find(h => h.city.toLowerCase() === String(city).toLowerCase()) || null;
}

export function getHubById(hub_id) {
  return CITY_HUBS.find(h => h.id === hub_id) || null;
}

// Customer sees ONLY bookability — never provider names/availability.
// Internally reuses workforce capacity + FairMatch eligibility concepts.
import { haversineKm, SERVICE_RADIUS_KM } from './locationService.js';

export const SLOT_DEFINITIONS = [
  '09:00 – 11:00',
  '11:00 – 13:00',
  '14:00 – 16:00',
  '16:00 – 18:00',
];

const ACTIVE_STATUSES = new Set(['CONFIRMED', 'PROVIDER_ASSIGNED', 'PROVIDER_ACCEPTED', 'PROVIDER_ON_THE_WAY', 'SERVICE_STARTED', 'PAYMENT_PENDING']);

const countActiveForSlot = (bookings = [], scheduledDate) =>
  bookings.filter((b) => ACTIVE_STATUSES.has(b.bookingStatus) && (!scheduledDate || b.scheduledDate === scheduledDate)).length;

const countEligibleProviders = (providers = [], customerCoords) => {
  if (!customerCoords || customerCoords.lat == null) return providers.length;
  return providers.filter((p) => {
    if (!p.coords) return false;
    try {
      return haversineKm(customerCoords.lat, customerCoords.lng, p.coords.lat, p.coords.lng) <= SERVICE_RADIUS_KM;
    } catch { return false; }
  }).length;
};

// Heuristic capacity → slot status. Deterministic, no randomness in status tiers
// beyond a stable hash so SSR/refresh is consistent.
const hashStr = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

export const getBookableSlots = ({ date, serviceIds = [], customerCoords = null, providers = [], bookings = [] } = {}) => {
  const eligible = countEligibleProviders(providers, customerCoords);
  const active = countActiveForSlot(bookings, date);
  const load = eligible > 0 ? active / Math.max(1, eligible) : 1;
  return SLOT_DEFINITIONS.map((slot) => {
    const h = hashStr(`${date || ''}|${slot}|${serviceIds.join(',')}`) % 100;
    // Higher system load pushes slots toward limited/full; hash adds per-slot variance.
    const pressure = load * 100 * 0.6 + h * 0.4;
    let status = 'available';
    if (pressure > 88) status = 'full';
    else if (pressure > 62) status = 'limited';
    return { slot, status, bookable: status !== 'full' };
  });
};

export const SLOT_STATUS_LABEL = { available: 'Available', limited: 'Limited availability', full: 'Full' };

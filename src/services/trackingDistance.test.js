// Regression test: tracker distance/ETA must never be a fake customer→customer 0.
// Partner position and customer destination are separate sources; the demo
// fallback is nearby but never identical. No NaN/undefined/Infinity.
// Run: node src/services/trackingDistance.test.js
import {
  haversineKm, calcETA, destinationPoint,
  demoPartnerLocationForBooking, resolveTrackerPositions, nearestProviderToLocation,
} from './locationService.js';
import { INITIAL_PROVIDERS } from '../data/mockData.js';

let pass = 0, fail = 0;
const assert = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('FAIL:', msg); } };

const finite = (v) => typeof v === 'number' && Number.isFinite(v);

// Screenshot case: customer at 22.4770, 88.4134, no live/assigned partner yet
const customer = { lat: 22.477, lng: 88.4134 };
const demo = demoPartnerLocationForBooking('bk-zol-6358', customer);
assert(!!demo && finite(demo.lat) && finite(demo.lng), 'demo seed exists with finite coords');
assert(demo.lat !== customer.lat || demo.lng !== customer.lng, 'demo partner != customer coords');
const demoDist = haversineKm(demo.lat, demo.lng, customer.lat, customer.lng);
assert(demoDist > 0, `demo distance > 0 (got ${demoDist.toFixed(2)} km)`);
assert(demoDist >= 3 && demoDist <= 7, `demo distance realistic 3–7km (got ${demoDist.toFixed(2)} km)`);

// Deterministic per booking: stable, not re-randomized per render
const demo2 = demoPartnerLocationForBooking('bk-zol-6358', customer);
assert(demo2.lat === demo.lat && demo2.lng === demo.lng, 'demo seed stable for same booking');
const demoOther = demoPartnerLocationForBooking('bk-zol-9999', customer);
assert(!!demoOther, 'demo seed resolves for other bookings');

// No customer → no demo (never fabricate from nothing)
assert(demoPartnerLocationForBooking('bk-x', null) === null, 'no customer → null demo');
assert(demoPartnerLocationForBooking('bk-x', { lat: NaN, lng: 1 }) === null, 'non-finite customer → null demo');

// Full resolver: screenshot state — partner derived, never customer copy
const t = resolveTrackerPositions({ customerCoords: customer, liveCoords: null, assignedCoords: null, bookingId: 'bk-zol-6358' });
assert(!!t.providerCoords && !!t.customerCoords, 'resolver yields both positions');
assert(t.providerCoords.lat !== t.customerCoords.lat || t.providerCoords.lng !== t.customerCoords.lng, 'resolver partner != customer');
assert(finite(t.distanceKm) && t.distanceKm > 0, `resolver distance > 0 (got ${t.distanceKm?.toFixed?.(2)})`);
assert(typeof t.eta === 'string' && t.eta !== 'Arriving now' && !/NaN|undefined|Infinity/i.test(t.eta), `ETA realistic ("${t.eta}")`);
assert(t.partnerSource === 'demo', 'source labelled demo when no live/assigned data');

// Priority: live GPS wins over assigned; assigned wins over demo
const live = { lat: 22.49, lng: 88.4 };
const asg = { lat: 22.5, lng: 88.39 };
assert(resolveTrackerPositions({ customerCoords: customer, liveCoords: live, assignedCoords: asg, bookingId: 'b' }).partnerSource === 'live', 'live GPS first');
assert(resolveTrackerPositions({ customerCoords: customer, liveCoords: null, assignedCoords: asg, bookingId: 'b' }).partnerSource === 'assigned', 'assigned coords second');
const liveT = resolveTrackerPositions({ customerCoords: customer, liveCoords: live, assignedCoords: null, bookingId: 'b' });
assert(Math.abs(liveT.distanceKm - haversineKm(live.lat, live.lng, customer.lat, customer.lng)) < 1e-9, 'distance = partner→customer haversine');

// Arrival: partner at customer doorstep → near-zero, ETA arrived-side
const arrived = resolveTrackerPositions({
  customerCoords: customer,
  liveCoords: { lat: 22.4771, lng: 88.4135 },
  assignedCoords: null, bookingId: 'b',
});
assert(arrived.distanceKm < 0.05, `arrival distance near 0 (got ${arrived.distanceKm.toFixed(3)} km)`);
assert(arrived.eta === '<1 min' || arrived.eta === 'Arriving now', `arrival ETA ("${arrived.eta}")`);

// Missing data: nulls, never NaN/undefined/Infinity
const empty = resolveTrackerPositions({ customerCoords: null, liveCoords: null, assignedCoords: null, bookingId: 'b' });
assert(empty.distanceKm === null && empty.eta === null && empty.providerCoords === null, 'no customer → nulls');
for (const [k, v] of Object.entries({ ...t, ...arrived })) {
  assert(v === null || v === undefined || typeof v !== 'number' || finite(v), `${k} finite-or-null`);
  assert(typeof v !== 'string' || !/NaN|undefined|Infinity/i.test(v), `${k} string clean`);
}

// ETA policy (existing): zero → Arriving now; positive → minutes
assert(calcETA(0) === 'Arriving now', 'ETA 0 → Arriving now');
assert(/min/.test(calcETA(4.8)), `ETA 4.8km in minutes ("${calcETA(4.8)}")`);

// destinationPoint sanity: 5km north stays ~5km away, deterministic
const p1 = destinationPoint(22.477, 88.4134, 0, 5);
const p2 = destinationPoint(22.477, 88.4134, 0, 5);
assert(Math.abs(haversineKm(22.477, 88.4134, p1.lat, p1.lng) - 5) < 0.01, 'destination 5km out');
assert(p1.lat === p2.lat && p1.lng === p2.lng, 'destination deterministic');

// Demo advancer fallback: unmapped service names must still resolve a REAL
// nearby partner (button never dead) — e.g. "Small Room" near Kolkata.
const smallRoomLoc = { lat: 22.5726, lng: 88.3639 };
const nearest = nearestProviderToLocation(INITIAL_PROVIDERS, smallRoomLoc);
assert(!!nearest && !!nearest.provider?.id && !!nearest.provider?.name, 'nearest fallback yields real record');
assert(nearest.distanceKm <= 50, `fallback partner same-city (got ${nearest.distanceKm.toFixed(1)}km: ${nearest.provider.name})`);
assert(nearest.provider.rating != null && Array.isArray(nearest.provider.skills), 'fallback record has full profile');
assert(nearestProviderToLocation([], smallRoomLoc) === null, 'empty dataset → null (genuinely impossible)');
assert(nearestProviderToLocation(INITIAL_PROVIDERS, null) === null, 'no location → null');

console.log(`trackingDistance.test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

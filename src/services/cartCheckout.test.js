// Slot + allocation invisibility QA — run: node src/services/cartCheckout.test.js
import { getBookableSlots } from './slotAvailabilityService.js';
import { allocatePartnerForBooking, customerStatusLabel } from './internalAllocationService.js';

let pass = 0, fail = 0;
const assert = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('FAIL:', msg); } };

const providers = [
  { id: 'p1', name: 'A', rating: 4.9, coords: { lat: 22.5726, lng: 88.3639 }, skills: ['Full Home Deep Cleaning'], serviceCategories: ['Cleaning'], availability: 'Available' },
  { id: 'p2', name: 'B', rating: 4.8, coords: { lat: 22.5726, lng: 88.3639 }, skills: ['Full Home Deep Cleaning'], serviceCategories: ['Cleaning'], availability: 'Available' },
];

// 1. Slots expose ONLY bookability
const slots = getBookableSlots({ date: '2026-09-28', serviceIds: ['clean-2room'], customerCoords: { lat: 22.5726, lng: 88.3639 }, providers, bookings: [] });
assert(slots.length === 4, '4 slots');
assert(slots.every((s) => ['available', 'limited', 'full'].includes(s.status)), 'valid statuses');
const leaked = JSON.stringify(slots);
assert(!/p1|p2|Verified|rating|FairMatch|score/i.test(leaked), 'no provider internals leak into slots');

// 2. Allocation returns ONE partner, never the candidate pool
const res = allocatePartnerForBooking({ providers, bookings: [], customerLocation: { lat: 22.5726, lng: 88.3639 }, requestedService: 'Full Home Deep Cleaning' });
assert(res.assigned && (res.assigned.id === 'p1' || res.assigned.id === 'p2'), 'one partner assigned');
assert(!('rankedCandidates' in res) && !('scores' in res), 'no ranking/candidate pool exposed');

// 3. Customer status language (state machine keys preserved underneath)
assert(customerStatusLabel('CONFIRMED') === 'Finding a Professional', 'matching label');
assert(customerStatusLabel('PROVIDER_ASSIGNED') === 'Professional Confirmed', 'assigned label');
assert(customerStatusLabel('PROVIDER_ON_THE_WAY') === 'On the Way', 'en route label');
assert(customerStatusLabel('SERVICE_STARTED') === 'Service in Progress', 'started label');
assert(customerStatusLabel('SERVICE_COMPLETED') === 'Completed', 'completed label');

console.log(`cartCheckout.test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

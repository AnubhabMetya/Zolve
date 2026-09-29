// Regression test: LiveBookingTracker top panel must reflect assignment DATA.
// The timeline derives from bookingStatus; the panel derives from the SAME
// booking record (status + providerId/providerName). PROVIDER_ACCEPTED with a
// valid provider MUST render the professional card — never a finding/
// replacement message because identity is missing.
// Run: node src/services/professionalPanel.test.js
import { resolveProfessionalPanelState, normalizePartnerForCustomerView } from './partnerViewService.js';
import { allocatePartnerForBooking } from './internalAllocationService.js';
import { haversineKm } from './locationService.js';
import { INITIAL_PROVIDERS } from '../data/mockData.js';

let pass = 0, fail = 0;
const assert = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('FAIL:', msg); } };

const booking = (over = {}) => ({
  id: 'bk-test-01',
  bookingCode: 'ZOL-T1',
  bookingStatus: 'CONFIRMED',
  providerId: null,
  providerName: null,
  serviceName: 'Wall Painting & Waterproofing',
  scheduledDate: '2026-09-29',
  scheduledTime: '09:00 – 11:00',
  customerCoords: { lat: 22.5726, lng: 88.3639 },
  address: 'Flat 402, Salt Lake, Kolkata 700091',
  ...over,
});

// TEST A/B/C: pre-assignment shows finding, identity hidden
for (const s of ['CREATED', 'MATCHING', 'AWAITING_PARTNER', 'PAYMENT_PENDING', 'CONFIRMED']) {
  assert(resolveProfessionalPanelState(booking({ bookingStatus: s })) === 'finding', `${s} → finding`);
}
assert(resolveProfessionalPanelState(booking({ bookingStatus: undefined })) === 'finding', 'missing status → finding');

// TEST D: ACCEPTED + valid provider → assigned (card, never finding/replacement)
const rajesh = INITIAL_PROVIDERS.find((p) => p.id === 'prov-rajesh-01');
assert(!!rajesh, 'fixture provider exists in dataset');
const accepted = booking({ bookingStatus: 'PROVIDER_ACCEPTED', providerId: rajesh.id, providerName: rajesh.name });
assert(resolveProfessionalPanelState(accepted) === 'assigned', 'ACCEPTED + provider → assigned');
const view = normalizePartnerForCustomerView(accepted, rajesh);
assert(view.assigned === true && view.name === 'Rajesh Kumar', 'card shows actual name from record');
assert(view.title && view.rating === 4.9 && view.jobsCompleted === 326, 'card shows actual trade/rating/jobs');
assert(['PROVIDER_ASSIGNED', 'PROVIDER_ACCEPTED'].includes(accepted.bookingStatus), 'confirmed pill condition (status)');
assert(resolveProfessionalPanelState(booking({ bookingStatus: 'PROVIDER_ASSIGNED', providerId: rajesh.id })) === 'assigned', 'ASSIGNED + provider → assigned');

// TEST E/G: same professional persists en route / in service
assert(resolveProfessionalPanelState(booking({ bookingStatus: 'PROVIDER_ON_THE_WAY', providerId: rajesh.id, providerName: rajesh.name })) === 'assigned', 'EN_ROUTE keeps professional');
assert(resolveProfessionalPanelState(booking({ bookingStatus: 'SERVICE_STARTED', providerId: rajesh.id, providerName: rajesh.name })) === 'assigned', 'SERVICE_STARTED keeps professional');

// TEST H: replacement ONLY for REASSIGNING without a partner
assert(resolveProfessionalPanelState(booking({ bookingStatus: 'REASSIGNING' })) === 'replacement', 'REASSIGNING w/o partner → replacement');
assert(resolveProfessionalPanelState(booking({ bookingStatus: 'REASSIGNING', providerId: 'prov-x', providerName: 'New Partner' })) === 'assigned', 'REASSIGNING with partner → assigned (priority)');

// TEST I: replacement accepted shows the NEW partner
const oldP = booking({ bookingStatus: 'PROVIDER_ACCEPTED', providerId: 'prov-old', providerName: 'Old Partner' });
const newP = booking({ bookingStatus: 'PROVIDER_ACCEPTED', providerId: rajesh.id, providerName: rajesh.name });
assert(resolveProfessionalPanelState(newP) === 'assigned', 'replacement accepted → assigned');
assert(normalizePartnerForCustomerView(newP, rajesh).name === 'Rajesh Kumar', 'NEW profile shown, not old');
assert(normalizePartnerForCustomerView(oldP, null).name === 'Old Partner', 'snapshot fallback keeps name without registry');

// LOADING: accepted/en-route WITHOUT identity is data-missing — never silent finding
assert(resolveProfessionalPanelState(booking({ bookingStatus: 'PROVIDER_ACCEPTED' })) === 'loading', 'ACCEPTED w/o provider → loading (diagnostic, not finding)');
assert(resolveProfessionalPanelState(booking({ bookingStatus: 'PROVIDER_ON_THE_WAY' })) === 'loading', 'EN_ROUTE w/o provider → loading');

// ALLOCATION: real dispatch for the Kolkata painting case assigns a local partner
const kolkataCustomer = { lat: 22.5726, lng: 88.3639 };
const { assigned } = allocatePartnerForBooking({
  providers: INITIAL_PROVIDERS,
  bookings: [],
  customerLocation: kolkataCustomer,
  requestedService: { name: 'Wall Painting & Waterproofing' },
  requestedDate: '2026-09-29',
  requestedTime: '09:00 – 11:00',
});
assert(!!assigned && !!assigned.id, 'dispatch assigns a real provider');
const dist = assigned ? haversineKm(kolkataCustomer.lat, kolkataCustomer.lng, assigned.coords.lat, assigned.coords.lng) : Infinity;
assert(dist <= 50, `assigned partner within 50km (got ${dist.toFixed(1)}km: ${assigned?.name})`);
assert(!!assigned?.name && assigned?.rating != null && Array.isArray(assigned?.skills), 'assigned record carries name/rating/skills');
assert(assigned?.title, 'assigned record carries trade/title');
// Snapshot fields the tracker persists (providerName + rating/skills snapshot)
const snap = { providerId: assigned.id, providerName: assigned.name };
assert(resolveProfessionalPanelState(booking({ bookingStatus: 'PROVIDER_ACCEPTED', ...snap })) === 'assigned', 'snapshot identity suffices for card');

// No NaN/undefined leaks from the view layer for the assigned card
const assignedView = normalizePartnerForCustomerView(booking({ providerId: assigned.id, providerName: assigned.name }), assigned);
for (const [k, val] of Object.entries(assignedView)) {
  assert(val !== undefined, `view.${k} never undefined`);
  assert(!(typeof val === 'number' && Number.isNaN(val)), `view.${k} never NaN`);
}

console.log(`professionalPanel.test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

// Partner-view normalization tests — run: node src/services/partnerView.test.js
import { normalizePartnerForCustomerView } from './partnerViewService.js';

let pass = 0, fail = 0;
const assert = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('FAIL:', msg); } };

const booking = { providerId: 'prov-x', providerName: 'Rahul Kumar', providerTitle: 'AC Specialist', providerPhone: '+91 90000 00000', isCoopMember: true };
const provider = {
  id: 'prov-x', name: 'Rahul Kumar', title: 'AC & Appliance Specialist',
  avatar: 'https://img/photo.jpg', rating: 4.8, ratingCount: 200, completedJobs: 642, experienceYears: 6,
  skills: ['AC Repair — Advanced', 'Installation — Certified'],
  verifications: { identity: true, background: true, skill: true, phone: true },
  isCoopMember: true,
};

const full = normalizePartnerForCustomerView(booking, provider);
assert(full.assigned === true, 'assigned with full record');
assert(full.name === 'Rahul Kumar', 'name');
assert(full.photo === 'https://img/photo.jpg', 'photo');
assert(full.rating === 4.8, 'rating from record (not computed)');
assert(full.jobsCompleted === 642, 'jobs completed');
assert(full.experienceLabel === '6+ years experience', 'experience label');
assert(full.skills.length === 2, 'skills preserved');
assert(full.badges.includes('Identity Verified') && full.badges.includes('Zolve Partner'), 'badges from record');

// No sensitive fields leak
const keys = Object.keys(full).join(' ');
assert(!/aadhaar|pan|bank|account|address|document|kyc/i.test(keys), 'no sensitive fields');

// Missing rating → null (UI shows "New Partner")
const nor = normalizePartnerForCustomerView(booking, { ...provider, rating: undefined, ratingCount: 0 });
assert(nor.rating === null, 'missing rating → null');

// Experience variants — never "undefined years"
assert(normalizePartnerForCustomerView(booking, { ...provider, experienceYears: 0 }).experienceLabel === 'New Zolve partner', '0 years');
assert(normalizePartnerForCustomerView(booking, { ...provider, experienceYears: 1 }).experienceLabel === '1+ year experience', '1 year');
assert(normalizePartnerForCustomerView(booking, { ...provider, experienceYears: undefined }).experienceLabel === null, 'missing experience → null (row hidden)');

// Missing photo → null (UI shows placeholder)
assert(normalizePartnerForCustomerView(booking, { ...provider, avatar: null }).photo === null, 'missing photo → null');

// Booking-only fallback (registry miss) still shows identity
const fb = normalizePartnerForCustomerView(booking, null);
assert(fb.assigned === true && fb.name === 'Rahul Kumar' && fb.rating === null, 'booking fallback, no fabricated rating');

// Alternate field names
const alt = normalizePartnerForCustomerView(
  {},
  { fullName: 'Asha Devi', profilePhoto: 'p.jpg', averageRating: 4.5, jobsCompleted: 120, experience: 3, assignedSkills: ['X'] }
);
assert(alt.name === 'Asha Devi' && alt.photo === 'p.jpg' && alt.rating === 4.5 && alt.jobsCompleted === 120, 'alternate names normalized');
assert(alt.experienceLabel === '3+ years experience' && alt.skills.length === 1, 'alt experience/skills');

// No identity anywhere → unavailable state (never crash, never undefined)
const none = normalizePartnerForCustomerView({ providerId: null }, null);
assert(none.assigned === false && none.name === null, 'unresolvable → assigned:false');

console.log(`partnerView.test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

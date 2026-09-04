// Deterministic unit tests for FairMatch (Feature 2)
// Covers: score calculation, distance normalization, workload normalization, fairness normalization, hard eligibility, final ranking

import {
  fairMatchRank,
  normalizeDistanceScore,
  normalizeWorkloadScore,
  normalizeSkillScore,
  normalizeRatingScore,
  calculateFairnessScores,
  isEligible,
  FAIRMATCH_WEIGHTS,
} from './fairMatchService.js';

function assertEqual(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg}: expected ${expected}, got ${actual}`);
}
function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}
function assertClose(actual, expected, delta, msg) {
  if (Math.abs(actual - expected) > delta) throw new Error(`${msg}: expected ~${expected}, got ${actual}`);
}

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); passed++; } catch (e) { console.error(`✗ ${name}: ${e.message}`); failed++; }
}

// --- Distance normalization ---
test('distance 0-2km → 100', () => { assertEqual(normalizeDistanceScore(1.5), 100, 'dist 1.5'); });
test('distance 2-5km → 90', () => { assertEqual(normalizeDistanceScore(3), 90, 'dist 3'); });
test('distance 5-10km → 75', () => { assertEqual(normalizeDistanceScore(7), 75, 'dist 7'); });
test('distance 10-20km → 50', () => { assertEqual(normalizeDistanceScore(15), 50, 'dist 15'); });
test('distance 20-50km → 20', () => { assertEqual(normalizeDistanceScore(30), 20, 'dist 30'); });
test('distance >50km → 0', () => { assertEqual(normalizeDistanceScore(60), 0, 'dist 60'); });
test('distance null → null', () => { assertEqual(normalizeDistanceScore(null), null, 'null'); });

// --- Workload normalization ---
test('workload 0 → 100', () => assertEqual(normalizeWorkloadScore(0), 100, 'wl0'));
test('workload 1 → 85', () => assertEqual(normalizeWorkloadScore(1), 85, 'wl1'));
test('workload 2 → 70', () => assertEqual(normalizeWorkloadScore(2), 70, 'wl2'));
test('workload 5+ → 0', () => assertEqual(normalizeWorkloadScore(5), 0, 'wl5'));
test('workload 10 → 0', () => assertEqual(normalizeWorkloadScore(10), 0, 'wl10'));

// --- Skill normalization ---
test('skill 0.94 → 94', () => assertEqual(normalizeSkillScore(0.94), 94, 'skill'));
test('skill 94 (already 100) → 94', () => assertEqual(normalizeSkillScore(94), 94, 'skill2'));

// --- Rating with shrinkage ---
test('rating 5.0 with 1 review shrunk toward 4.6', () => {
  const p = { rating: 5.0, ratingCount: 1 };
  const s = normalizeRatingScore(p, 4.6);
  assert(s < 98 && s > 88, `shrinkage ${s}`);
});
test('rating 4.8 with 500 reviews ~96', () => {
  const p = { rating: 4.8, ratingCount: 500 };
  const s = normalizeRatingScore(p, 4.6);
  assertEqual(s, 96, 'rating high count'); // (500*4.8+10*4.6)/510/5*100 = 95.9 ->96
});

// --- Fairness: low recent jobs → higher score ---
test('fairness: fewer recent jobs → higher score', () => {
  const candidates = [
    { provider: { id: 'p1', completedJobs: 100 } },
    { provider: { id: 'p2', completedJobs: 100 } },
  ];
  const bookings = [
    { providerId: 'p1', createdAt: new Date().toISOString(), bookingStatus: 'CONFIRMED' },
    { providerId: 'p1', createdAt: new Date().toISOString(), bookingStatus: 'CONFIRMED' },
    { providerId: 'p1', createdAt: new Date().toISOString(), bookingStatus: 'CONFIRMED' },
    // p2 has 0 recent
  ];
  const scores = calculateFairnessScores(candidates, bookings);
  assert(scores[1] > scores[0], `fairness p2 ${scores[1]} > p1 ${scores[0]}`);
  assertEqual(scores[1], 100, 'fewest ->100');
  assertEqual(scores[0], 30, 'most ->30');
});

// --- Hard eligibility: not qualified, outside area, double-booked, unavailable ---
test('isEligible: not qualified (no matching category)', () => {
  const provider = { id: 'p1', serviceCategories: ['Cleaning'], skills: ['Mopping'], availability: 'Available Today', coords: { lat: 12, lng: 77 } };
  const res = isEligible(provider, { requestedService: { name: 'Plumbing Repair & Leakage Fix' }, candidateIds: [] });
  assert(!res.eligible && res.reason === 'not_qualified', 'should be not qualified');
});
test('isEligible: candidateIds does NOT bypass qualification (FIX 1)', () => {
  const provider = { id: 'p1', serviceCategories: ['Cleaning'], skills: ['Mopping'], title: 'Cleaner', availability: 'Available Today', coords: { lat: 12, lng: 77 } };
  const res = isEligible(provider, { requestedService: { name: 'Plumbing', subcategory: 'Plumbing' }, candidateIds: ['p1'] });
  assert(!res.eligible && res.reason === 'not_qualified', 'candidateIds must not bypass qualification');
});
test('isEligible: outside 50km', () => {
  const provider = { id: 'p1', serviceCategories: ['Plumbing'], coords: { lat: 28.6139, lng: 77.2090 } }; // Delhi
  const customerLoc = { lat: 12.9784, lng: 77.6408 }; // Bangalore
  const res = isEligible(provider, { customerLocation: customerLoc, requestedService: { name: 'Plumbing' }, candidateIds: ['p1'] });
  assert(!res.eligible && res.reason === 'outside_service_area', 'outside');
});
test('isEligible: double-booked', () => {
  const provider = { id: 'p1', serviceCategories: ['Plumbing'], coords: { lat: 12.9784, lng: 77.6408 }, availability: 'Available Today' };
  const bookings = [{ providerId: 'p1', scheduledDate: '2026-09-03', scheduledTime: '10:00 AM - 11:00 AM', bookingStatus: 'CONFIRMED' }];
  const res = isEligible(provider, { requestedDate: '2026-09-03', requestedTime: '10:00 AM - 11:00 AM', allBookings: bookings, candidateIds: ['p1'] });
  assert(!res.eligible && res.reason === 'double_booked', 'double booked');
});
test('isEligible: unavailable string', () => {
  const provider = { id: 'p1', serviceCategories: ['Plumbing'], availability: 'Unavailable' };
  const res = isEligible(provider, { candidateIds: ['p1'] });
  assert(!res.eligible, 'unavailable');
});

// --- Scenario 1: Three equally qualified, closest ranks highly ---
test('Scenario 1: equally qualified, closest wins', () => {
  const candidates = [
    { provider: { id: 'p1', serviceCategories: ['Plumbing'], skills: [], title: 'Plumber', bio: '', rating: 4.8, ratingCount: 100, completedJobs: 100, availability: 'Available Today', coords: { lat: 12.9784, lng: 77.6408 }, isCoopMember: true }, semanticScore: 0.9 },
    { provider: { id: 'p2', serviceCategories: ['Plumbing'], skills: [], title: 'Plumber', bio: '', rating: 4.8, ratingCount: 100, completedJobs: 100, availability: 'Available Today', coords: { lat: 12.9884, lng: 77.6508 }, isCoopMember: true }, semanticScore: 0.9 },
    { provider: { id: 'p3', serviceCategories: ['Plumbing'], skills: [], title: 'Plumber', bio: '', rating: 4.8, ratingCount: 100, completedJobs: 100, availability: 'Available Today', coords: { lat: 13.5, lng: 78.0 }, isCoopMember: true }, semanticScore: 0.9 },
  ];
  const res = fairMatchRank({ candidates, customerLocation: { lat: 12.9784, lng: 77.6408 }, allBookings: [] });
  assertEqual(res.rankedCandidates[0].provider.id, 'p1', 'closest should win');
});

// --- Scenario 2: Highest-rated overloaded, lower-rated low workload wins ---
test('Scenario 2: overloaded high-rated vs low workload', () => {
  const pHigh = { id: 'pHigh', serviceCategories: ['Plumbing'], skills: [], title: 'Plumber', bio: '', rating: 4.95, ratingCount: 500, completedJobs: 400, availability: 'Available Today', coords: { lat: 12.9784, lng: 77.6408 }, isCoopMember: true };
  const pLow = { id: 'pLow', serviceCategories: ['Plumbing'], skills: [], title: 'Plumber', bio: '', rating: 4.80, ratingCount: 100, completedJobs: 100, availability: 'Available Today', coords: { lat: 12.9784, lng: 77.6408 }, isCoopMember: true };
  const candidates = [
    { provider: pHigh, semanticScore: 0.92 },
    { provider: pLow, semanticScore: 0.89 },
  ];
  // High has 5 active jobs, low has 0
  const bookings = [
    { providerId: 'pHigh', bookingStatus: 'CONFIRMED', scheduledDate: '2026-09-03', scheduledTime: '09:00 AM - 10:00 AM' },
    { providerId: 'pHigh', bookingStatus: 'CONFIRMED', scheduledDate: '2026-09-03', scheduledTime: '10:00 AM - 11:00 AM' },
    { providerId: 'pHigh', bookingStatus: 'PROVIDER_ON_THE_WAY', scheduledDate: '2026-09-03', scheduledTime: '11:00 AM - 12:00 PM' },
    { providerId: 'pHigh', bookingStatus: 'SERVICE_STARTED', scheduledDate: '2026-09-03', scheduledTime: '12:00 PM - 01:00 PM' },
    { providerId: 'pHigh', bookingStatus: 'CONFIRMED', scheduledDate: '2026-09-04', scheduledTime: '09:00 AM - 10:00 AM' },
  ];
  const res = fairMatchRank({ candidates, customerLocation: { lat: 12.9784, lng: 77.6408 }, allBookings: bookings });
  // pLow should win due to workload penalty on pHigh (0 vs 100, weight 5% + fairness)
  assert(res.rankedCandidates[0].provider.id === 'pLow', `expected pLow wins, got ${res.rankedCandidates[0].provider.id} scores ${res.rankedCandidates.map(c=>c.provider.id+':'+c.finalScore).join(', ')}`);
});

// --- Scenario 3: Similar scores, fairness advantage ---
test('Scenario 3: similar scores, low recent jobs gets fairness boost', () => {
  const pA = { id: 'pA', serviceCategories: ['Plumbing'], skills: [], title: 'Plumber', bio: '', rating: 4.8, ratingCount: 100, completedJobs: 200, availability: 'Available Today', coords: { lat: 12.9784, lng: 77.6408 }, isCoopMember: true };
  const pB = { id: 'pB', serviceCategories: ['Plumbing'], skills: [], title: 'Plumber', bio: '', rating: 4.8, ratingCount: 100, completedJobs: 50, availability: 'Available Today', coords: { lat: 12.9784, lng: 77.6408 }, isCoopMember: true };
  const candidates = [
    { provider: pA, semanticScore: 0.92 },
    { provider: pB, semanticScore: 0.89 },
  ];
  // pA has many recent jobs, pB few
  const now = new Date().toISOString();
  const bookings = [
    { providerId: 'pA', createdAt: now, bookingStatus: 'CONFIRMED' },
    { providerId: 'pA', createdAt: now, bookingStatus: 'CONFIRMED' },
    { providerId: 'pA', createdAt: now, bookingStatus: 'CONFIRMED' },
    { providerId: 'pA', createdAt: now, bookingStatus: 'CONFIRMED' },
    { providerId: 'pA', createdAt: now, bookingStatus: 'CONFIRMED' },
    // pB has 0
  ];
  const res = fairMatchRank({ candidates, customerLocation: { lat: 12.9784, lng: 77.6408 }, allBookings: bookings });
  // With fairness 10%, pB should overtake pA if base diff 3 points and fairness diff 70 points *0.1=7
  assert(res.rankedCandidates[0].provider.id === 'pB', `fairness should let pB win, got ${res.rankedCandidates[0].provider.id}`);
});

// --- Scenario 4: unavailable excluded ---
test('Scenario 4: unavailable excluded regardless of rating', () => {
  const pAvail = { id: 'pAvail', serviceCategories: ['Plumbing'], skills: [], title: 'Plumber', bio: '', rating: 4.5, ratingCount: 10, completedJobs: 10, availability: 'Available Today', coords: { lat: 12.9784, lng: 77.6408 } };
  const pUnavail = { id: 'pUnavail', serviceCategories: ['Plumbing'], skills: [], title: 'Plumber', bio: '', rating: 5.0, ratingCount: 500, completedJobs: 500, availability: 'Unavailable' };
  const candidates = [
    { provider: pUnavail, semanticScore: 0.99 },
    { provider: pAvail, semanticScore: 0.8 },
  ];
  const res = fairMatchRank({ candidates, customerLocation: { lat: 12.9784, lng: 77.6408 }, allBookings: [] });
  assert(res.rankedCandidates.length === 1 && res.rankedCandidates[0].provider.id === 'pAvail', 'unavailable must be excluded');
  assert(res.excluded.some(e => e.provider.id === 'pUnavail'), 'excluded list');
});

// --- FIX 1: Semantic similarity does NOT bypass qualification ---
test('FIX 1: semantically similar but unqualified provider is excluded even with high semantic score', () => {
  // Cleaner with high semantic similarity for plumbing request must still be excluded
  const unqualified = { id: 'pClean', serviceCategories: ['Cleaning'], skills: ['Mopping', 'Housekeeping'], title: 'Generic Cleaner', bio: '', rating: 4.9, ratingCount: 500, completedJobs: 400, availability: 'Available Today', coords: { lat: 12.9784, lng: 77.6408 } };
  const candidates = [{ provider: unqualified, semanticScore: 0.95 }]; // high semantic similarity
  const res = fairMatchRank({ candidates, customerLocation: { lat: 12.9784, lng: 77.6408 }, requestedService: { name: 'Plumbing Repair & Leakage Fix', subcategory: 'Plumbing', category: 'Household Services' }, allBookings: [] });
  assert(res.rankedCandidates.length === 0, 'unqualified cleaner should be excluded despite 0.95 semantic');
  assert(res.excluded.some(e => e.reason === 'not_qualified'), 'excluded reason not_qualified');
});
test('FIX 1: qualified provider is eligible (plumbing)', () => {
  const qualified = { id: 'pPlumb', serviceCategories: ['Plumbing', 'Plumbing Repair & Leakage Fix'], skills: ['Concealed Pipe Leak Detection'], title: 'Senior Hydraulic & Plumbing Specialist', bio: '', rating: 4.88, ratingCount: 156, completedJobs: 280, availability: 'Available Today', coords: { lat: 12.9784, lng: 77.6408 } };
  const candidates = [{ provider: qualified, semanticScore: 0.90 }];
  const res = fairMatchRank({ candidates, customerLocation: { lat: 12.9784, lng: 77.6408 }, requestedService: { name: 'Plumbing Repair & Leakage Fix', subcategory: 'Plumbing', category: 'Household Services' }, allBookings: [] });
  assert(res.rankedCandidates.length === 1 && res.rankedCandidates[0].provider.id === 'pPlumb', 'qualified plumbing provider must be eligible');
});
test('FIX 1: high semantic does not bypass hard qualification (washing machine vs plumber)', () => {
  const plumber = { id: 'pPlumbOnly', serviceCategories: ['Plumbing'], skills: ['Pipe Fitting'], title: 'Plumber', bio: '', rating: 5.0, ratingCount: 500, completedJobs: 500, availability: 'Available Today', coords: { lat: 12.9784, lng: 77.6408 } };
  const candidates = [{ provider: plumber, semanticScore: 0.99 }];
  const res = fairMatchRank({ candidates, customerLocation: { lat: 12.9784, lng: 77.6408 }, requestedService: { name: 'Washing Machine / Appliance Repair', subcategory: 'Appliance Repair', category: 'Household Services' }, allBookings: [] });
  assert(res.rankedCandidates.length === 0, 'plumber must be excluded for washing machine even with 0.99 semantic');
});
test('FIX 1: washing machine request — appliance provider eligible, painter not', () => {
  const appliance = { id: 'pApp', serviceCategories: ['Appliance Repair'], skills: ['Washing Machine Motor Overhaul'], title: 'Appliance Tech', bio: '', rating: 4.9, ratingCount: 100, completedJobs: 100, availability: 'Available Today', coords: { lat: 12.9784, lng: 77.6408 } };
  const painter = { id: 'pPaint', serviceCategories: ['Painting'], skills: ['Wall Painting'], title: 'Painter', bio: '', rating: 4.9, ratingCount: 100, completedJobs: 100, availability: 'Available Today', coords: { lat: 12.9784, lng: 77.6408 } };
  const candidates = [{ provider: appliance, semanticScore: 0.85 }, { provider: painter, semanticScore: 0.95 }];
  const res = fairMatchRank({ candidates, customerLocation: { lat: 12.9784, lng: 77.6408 }, requestedService: { name: 'Washing Machine / Appliance Repair', subcategory: 'Appliance Repair', category: 'Household Services' }, allBookings: [] });
  assert(res.rankedCandidates.length === 1 && res.rankedCandidates[0].provider.id === 'pApp', 'only appliance provider should survive');
  assert(res.excluded.some(e=> e.provider.id==='pPaint' && e.reason==='not_qualified'), 'painter excluded');
});
test('FIX 1: AC request — painter not eligible, AC provider eligible', () => {
  const painter = { id: 'pPaint', serviceCategories: ['Painting'], skills: ['Wall Painting'], title: 'Painter', bio: '', rating: 4.9, ratingCount: 100, completedJobs: 100, availability: 'Available Today', coords: { lat: 12.9784, lng: 77.6408 } };
  const acProvider = { id: 'pAC', serviceCategories: ['Appliance Repair', 'AC Servicing'], skills: ['R32 Gas Charging'], title: 'HVAC Technician', bio: '', rating: 4.9, ratingCount: 100, completedJobs: 100, availability: 'Available Today', coords: { lat: 12.9784, lng: 77.6408 } };
  const candidates = [{ provider: painter, semanticScore: 0.95 }, { provider: acProvider, semanticScore: 0.80 }];
  const res = fairMatchRank({ candidates, customerLocation: { lat: 12.9784, lng: 77.6408 }, requestedService: { name: 'AC Repair / AC Servicing', subcategory: 'Appliance Repair', category: 'Household Services' }, allBookings: [] });
  assert(res.rankedCandidates.length === 1 && res.rankedCandidates[0].provider.id === 'pAC', 'AC provider eligible, painter excluded even with higher semantic');
});

// --- Scenario 6: location unavailable → still works, renormalized ---
test('Scenario 6: location unavailable still ranks', () => {
  const candidates = [
    { provider: { id: 'p1', serviceCategories: ['Plumbing'], skills: [], title: 'Plumber', bio: '', rating: 4.8, ratingCount: 100, completedJobs: 100, availability: 'Available Today', coords: { lat: 12.9784, lng: 77.6408 } }, semanticScore: 0.9 },
    { provider: { id: 'p2', serviceCategories: ['Plumbing'], skills: [], title: 'Plumber', bio: '', rating: 4.7, ratingCount: 100, completedJobs: 100, availability: 'Available Today', coords: { lat: 13.0, lng: 77.7 } }, semanticScore: 0.85 },
  ];
  const res = fairMatchRank({ candidates, customerLocation: null, allBookings: [] });
  assert(res.rankedCandidates.length === 2, 'should still rank without location');
  assert(res.rankedCandidates[0].weightsUsed.distance === 0, 'distance weight renormalized to 0');
});

// --- Scenario 7: insufficient history → neutral fallback ---
test('Scenario 7: insufficient history neutral', () => {
  const p = { id: 'p1', serviceCategories: ['Plumbing'], skills: [], title: 'Plumber', bio: '', rating: 4.8, ratingCount: 100, completedJobs: 5, availability: 'Available Today', coords: { lat: 12.9784, lng: 77.6408 } };
  const candidates = [{ provider: p, semanticScore: 0.9 }];
  const res = fairMatchRank({ candidates, customerLocation: { lat: 12.9784, lng: 77.6408 }, allBookings: [] });
  assert(res.rankedCandidates[0].reliabilityScore >= 40 && res.rankedCandidates[0].reliabilityScore <= 90, 'reliability neutral');
  assert(res.rankedCandidates[0].reliabilityInsufficient === true, 'flag insufficient');
});

// --- Fix: Fairness never overrides hard constraints ---
test('fairness never overrides not_qualified (high fairness still excluded)', () => {
  const unqualified = { id: 'pBad', serviceCategories: ['Cleaning'], skills: ['Mopping'], title: 'Cleaner', bio: '', rating: 4.9, ratingCount: 500, completedJobs: 10, availability: 'Available Today', coords: { lat: 12.9784, lng: 77.6408 } };
  // Cleaner has low recent jobs → high fairness, but still not qualified for plumbing
  const candidates = [{ provider: unqualified, semanticScore: 0.99 }];
  // Give cleaner 0 recent jobs (high fairness) vs no bookings for anyone
  const bookings = [];
  const res = fairMatchRank({ candidates, customerLocation: { lat: 12.9784, lng: 77.6408 }, requestedService: { name: 'Plumbing Repair & Leakage Fix', subcategory: 'Plumbing' }, allBookings: bookings });
  assert(res.rankedCandidates.length === 0, 'unqualified must stay excluded even with high fairness');
  assert(res.excluded[0].reason === 'not_qualified', 'reason not_qualified');
});

// --- Fix 2: Explanation exposes all seven component scores ---
test('explanation exposes all seven component scores', () => {
  const p = { id: 'p1', serviceCategories: ['Plumbing'], skills: [], title: 'Plumber', bio: '', rating: 4.8, ratingCount: 100, completedJobs: 100, availability: 'Available Today', coords: { lat: 12.9784, lng: 77.6408 } };
  const res = fairMatchRank({ candidates: [{ provider: p, semanticScore: 0.9 }], customerLocation: { lat: 12.9784, lng: 77.6408 }, requestedService: { name: 'Plumbing', subcategory: 'Plumbing' }, allBookings: [] });
  const c = res.rankedCandidates[0];
  assert(c.skillScore != null && c.distanceScore != null && c.availabilityScore != null && c.reliabilityScore != null && c.ratingScore != null && c.workloadScore != null && c.fairnessScore != null, 'all seven scores present');
  assert(c.finalScore != null && c.finalScore >= 0 && c.finalScore <= 100, 'final 0-100');
  assert(Array.isArray(c.explanation), 'explanation array');
});

// --- Final score is ranking score 0-100, weights unchanged ---
test('final score 0-100 and weights unchanged (30/20/15/10/10/5/10)', () => {
  assertEqual(FAIRMATCH_WEIGHTS.skill, 0.30, 'skill weight');
  assertEqual(FAIRMATCH_WEIGHTS.distance, 0.20, 'distance weight');
  assertEqual(FAIRMATCH_WEIGHTS.availability, 0.15, 'availability weight');
  assertEqual(FAIRMATCH_WEIGHTS.reliability, 0.10, 'reliability weight');
  assertEqual(FAIRMATCH_WEIGHTS.rating, 0.10, 'rating weight');
  assertEqual(FAIRMATCH_WEIGHTS.workload, 0.05, 'workload weight');
  assertEqual(FAIRMATCH_WEIGHTS.fairness, 0.10, 'fairness weight');
  const sum = Object.values(FAIRMATCH_WEIGHTS).reduce((a,b)=>a+b,0);
  assertClose(sum, 1.0, 0.001, 'weights sum 1.0');
});

// --- Deterministic: changing one component changes score predictably ---
test('changing workload changes final score predictably', () => {
  const p = { id: 'p1', serviceCategories: ['Plumbing'], skills: [], title: 'Plumber', bio: '', rating: 4.8, ratingCount: 100, completedJobs: 100, availability: 'Available Today', coords: { lat: 12.9784, lng: 77.6408 } };
  const cand = [{ provider: p, semanticScore: 0.9 }];
  const res0 = fairMatchRank({ candidates: cand, customerLocation: { lat: 12.9784, lng: 77.6408 }, allBookings: [] });
  const bookings5 = [
    { providerId: 'p1', bookingStatus: 'CONFIRMED', scheduledDate: '2026-09-03', scheduledTime: '09:00' },
    { providerId: 'p1', bookingStatus: 'CONFIRMED', scheduledDate: '2026-09-03', scheduledTime: '10:00' },
    { providerId: 'p1', bookingStatus: 'CONFIRMED', scheduledDate: '2026-09-03', scheduledTime: '11:00' },
    { providerId: 'p1', bookingStatus: 'CONFIRMED', scheduledDate: '2026-09-04', scheduledTime: '09:00' },
    { providerId: 'p1', bookingStatus: 'CONFIRMED', scheduledDate: '2026-09-04', scheduledTime: '10:00' },
  ];
  const res1 = fairMatchRank({ candidates: cand, customerLocation: { lat: 12.9784, lng: 77.6408 }, allBookings: bookings5 });
  assert(res1.rankedCandidates[0].workloadScore < res0.rankedCandidates[0].workloadScore, 'workload increases → score down');
  assert(res1.rankedCandidates[0].finalScore < res0.rankedCandidates[0].finalScore, 'final down with workload');
});

console.log(`\n=== FairMatch Tests: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exitCode = 1;

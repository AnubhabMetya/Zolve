// Deterministic tests for Workforce Allocation — Feature 4 Stage 1
// Covers: capacity, shortage, zero, unavailable, unqualified, distant, workload, additional, utilization, status, prioritization, fairness, no mutation

import {
  calculateProviderCapacity,
  getActiveCount,
  isProviderEligibleForWorkforce,
  allocateWorkforce,
  CITY_HUBS,
  ACTIVE_STATUSES,
  getCityHub,
} from './workforceAllocationService.js';

function assert(condition, msg) { if (!condition) throw new Error(msg); }
function assertEqual(a, b, msg) { if (a !== b) throw new Error(`${msg}: expected ${b}, got ${a}`); }
function assertClose(a, b, delta, msg) { if (Math.abs(a-b) > delta) throw new Error(`${msg}: expected ~${b}, got ${a}`); }

let passed=0, failed=0;
function test(name, fn) { try { fn(); console.log(`✓ ${name}`); passed++; } catch(e) { console.error(`✗ ${name}: ${e.message}`); failed++; } }

// Helper to create provider
function makeProvider({id, city, serviceCategories, availability='Available Today', coords=null, rating=4.8, completedJobs=50}) {
  const hub = CITY_HUBS.find(h=>h.city===city);
  const c = coords || (hub ? {lat: hub.lat+0.01, lng: hub.lng+0.01} : {lat: 12.9716, lng: 77.5946});
  return {
    id,
    name: `Provider ${id}`,
    title: (serviceCategories||[]).join(' ') || 'Provider',
    serviceCategories: serviceCategories || ['Plumbing'],
    skills: [],
    availability,
    coords: c,
    rating,
    ratingCount: 50,
    completedJobs,
    isCoopMember: true,
  };
}

// 1. sufficient capacity
test('1. sufficient capacity → SURPLUS when demand < capacity', () => {
  const providers = [
    makeProvider({id:'p1', city:'Bengaluru', serviceCategories:['Plumbing']}),
    makeProvider({id:'p2', city:'Bengaluru', serviceCategories:['Plumbing']}),
    makeProvider({id:'p3', city:'Bengaluru', serviceCategories:['Plumbing']}),
  ];
  const res = allocateWorkforce({city:'Bengaluru', service_id:'srv-plumb-01', service_name:'Plumbing Repair & Leakage Fix', forecast_date:'2026-08-10', forecast_demand:2, providers, bookings:[]});
  assertEqual(res.status, 'SURPLUS', 'status');
  assert(res.capacity_gap < 0, 'gap negative');
  assertEqual(res.additional_providers_needed, 0, 'no additional');
  assertClose(res.utilization, 2/3, 0.01, 'utilization 0.66');
  assertEqual(res.eligible_provider_count, 3, 'eligible 3');
});

// 2. demand shortage
test('2. demand shortage → SHORTAGE when demand > capacity', () => {
  const providers = [
    makeProvider({id:'p1', city:'Bengaluru', serviceCategories:['Plumbing']}),
    makeProvider({id:'p2', city:'Bengaluru', serviceCategories:['Plumbing']}),
  ];
  const res = allocateWorkforce({city:'Bengaluru', service_id:'srv-plumb-01', service_name:'Plumbing Repair & Leakage Fix', forecast_date:'2026-08-10', forecast_demand:5, providers, bookings:[]});
  assertEqual(res.status, 'SHORTAGE', 'shortage');
  assert(res.capacity_gap > 0, 'gap positive');
  assertEqual(res.additional_providers_needed, 3, 'need 3 more (5-2)');
  assertClose(res.utilization, 5/2, 0.01, 'utilization 2.5');
});

// 3. zero provider capacity
test('3. zero provider capacity (no eligible)', () => {
  const res = allocateWorkforce({city:'Bengaluru', service_id:'srv-plumb-01', service_name:'Plumbing Repair & Leakage Fix', forecast_date:'2026-08-10', forecast_demand:3, providers:[], bookings:[]});
  assertEqual(res.available_capacity, 0, 'capacity 0');
  assertEqual(res.status, 'SHORTAGE', 'shortage when 0 capacity');
  assertEqual(res.additional_providers_needed, 3, 'need 3');
  assert(res.utilization === null, 'utilization null when 0 capacity');
  assertEqual(res.eligible_provider_count, 0, '0 eligible');
  assertEqual(res.allocated_provider_ids.length, 0, 'no allocation');
});

// 4. unavailable providers excluded
test('4. unavailable providers excluded', () => {
  const providers = [
    makeProvider({id:'p1', city:'Bengaluru', serviceCategories:['Plumbing'], availability:'Available Today'}),
    makeProvider({id:'p2', city:'Bengaluru', serviceCategories:['Plumbing'], availability:'Unavailable'}),
    makeProvider({id:'p3', city:'Bengaluru', serviceCategories:['Plumbing'], availability:'Not Available'}),
  ];
  const res = allocateWorkforce({city:'Bengaluru', service_id:'srv-plumb-01', service_name:'Plumbing Repair & Leakage Fix', forecast_date:'2026-08-10', forecast_demand:2, providers, bookings:[]});
  assertEqual(res.eligible_provider_count, 1, 'only 1 eligible');
  assert(res.provider_recommendations.length === 1, 'recommendations 1');
  assertEqual(res.provider_recommendations[0].provider_id, 'p1', 'p1 eligible');
  // capacity only 1, demand 2 => shortage 1
  assertEqual(res.additional_providers_needed, 1, 'need 1');
});

// 5. unqualified providers excluded
test('5. unqualified providers excluded', () => {
  const providers = [
    makeProvider({id:'p1', city:'Bengaluru', serviceCategories:['Cleaning']}),
    makeProvider({id:'p2', city:'Bengaluru', serviceCategories:['Plumbing']}),
  ];
  const res = allocateWorkforce({city:'Bengaluru', service_id:'srv-plumb-01', service_name:'Plumbing Repair & Leakage Fix', forecast_date:'2026-08-10', forecast_demand:1, providers, bookings:[]});
  assertEqual(res.eligible_provider_count, 1, 'only plumbing qualified');
  assertEqual(res.provider_recommendations[0].provider_id, 'p2', 'p2 qualified');
});

// 6. distant providers excluded (50km hard)
test('6. distant providers excluded', () => {
  // p1 near Bengaluru, p2 near Delhi (far)
  const providers = [
    makeProvider({id:'pNear', city:'Bengaluru', serviceCategories:['Plumbing']}),
    makeProvider({id:'pFar', city:'Delhi NCR', serviceCategories:['Plumbing']}), // Delhi far from Bengaluru ~1700km
  ];
  const res = allocateWorkforce({city:'Bengaluru', service_id:'srv-plumb-01', service_name:'Plumbing Repair & Leakage Fix', forecast_date:'2026-08-10', forecast_demand:2, providers, bookings:[]});
  assertEqual(res.eligible_provider_count, 1, 'far excluded');
  assertEqual(res.provider_recommendations[0].provider_id, 'pNear', 'near eligible');
});

// 7. workload affecting capacity
test('7. workload affecting capacity (deterministic formula)', () => {
  assertEqual(calculateProviderCapacity({availability:'Available Today'}, 0), 1, '0 active →1');
  assertEqual(calculateProviderCapacity({availability:'Available Today'}, 1), 0.5, '1 active →0.5');
  assertEqual(calculateProviderCapacity({availability:'Available Today'}, 2), 0.25, '2 active →0.25');
  assertEqual(calculateProviderCapacity({availability:'Available Today'}, 3), 0.1, '3 active →0.1');
  assertEqual(calculateProviderCapacity({availability:'Available Today'}, 4), 0, '4+ →0');
  assertEqual(calculateProviderCapacity({availability:'Unavailable'}, 0), 0, 'unavailable 0');

  // Integration: provider with 1 active job has reduced capacity
  const p1 = makeProvider({id:'p1', city:'Bengaluru', serviceCategories:['Plumbing']});
  const p2 = makeProvider({id:'p2', city:'Bengaluru', serviceCategories:['Plumbing']});
  const bookings = [
    {providerId:'p1', bookingStatus:'CONFIRMED'},
    {providerId:'p1', bookingStatus:'PAYMENT_PENDING'},
  ]; // p1 has 2 active
  const res = allocateWorkforce({city:'Bengaluru', service_id:'srv-plumb-01', service_name:'Plumbing Repair & Leakage Fix', forecast_date:'2026-08-10', forecast_demand:2, providers:[p1,p2], bookings});
  // p1 capacity 0.25, p2 capacity 1 => total 1.25
  assertClose(res.available_capacity, 1.25, 0.01, 'capacity 1.25');
  assertEqual(res.status, 'SHORTAGE', 'shortage 2-1.25=0.75');
  assertEqual(res.additional_providers_needed, 1, 'ceil 0.75 =>1');
});

// 8. additional provider calculation
test('8. additional provider calculation = max(0, ceil(gap))', () => {
  const providers = [makeProvider({id:'p1', city:'Bengaluru', serviceCategories:['Plumbing']})]; // cap 1
  let res = allocateWorkforce({city:'Bengaluru', service_id:'srv-plumb-01', service_name:'Plumbing', forecast_date:'2026-08-10', forecast_demand:1, providers, bookings:[]});
  assertEqual(res.additional_providers_needed, 0, 'balanced 0');
  res = allocateWorkforce({city:'Bengaluru', service_id:'srv-plumb-01', service_name:'Plumbing', forecast_date:'2026-08-10', forecast_demand:2, providers, bookings:[]});
  assertEqual(res.additional_providers_needed, 1, 'gap 1 =>1');
  res = allocateWorkforce({city:'Bengaluru', service_id:'srv-plumb-01', service_name:'Plumbing', forecast_date:'2026-08-10', forecast_demand:2.3, providers, bookings:[]});
  // demand rounded to 2? Actually forecast_demand rounded Math.round(2.3)=2 => gap1 =>1
  assertEqual(res.additional_providers_needed, 1, '2.3 rounded 2 gap1');
  res = allocateWorkforce({city:'Bengaluru', service_id:'srv-plumb-01', service_name:'Plumbing', forecast_date:'2026-08-10', forecast_demand:0, providers, bookings:[]});
  assertEqual(res.additional_providers_needed, 0, '0 demand =>0');
});

// 9. utilization calculation
test('9. utilization = demand / capacity, null when 0', () => {
  const providers = [
    makeProvider({id:'p1', city:'Bengaluru', serviceCategories:['Plumbing']}),
    makeProvider({id:'p2', city:'Bengaluru', serviceCategories:['Plumbing']}),
  ];
  let res = allocateWorkforce({city:'Bengaluru', service_id:'srv-plumb-01', service_name:'Plumbing', forecast_date:'2026-08-10', forecast_demand:4, providers, bookings:[]});
  assertClose(res.utilization, 4/2, 0.01, 'util 2.0');
  res = allocateWorkforce({city:'Bengaluru', service_id:'srv-plumb-01', service_name:'Plumbing', forecast_date:'2026-08-10', forecast_demand:1, providers:[], bookings:[]});
  assert(res.utilization === null, 'null when 0 capacity');
});

// 10. shortage/balanced/surplus status
test('10. shortage/balanced/surplus status', () => {
  const providers = [makeProvider({id:'p1', city:'Bengaluru', serviceCategories:['Plumbing']}), makeProvider({id:'p2', city:'Bengaluru', serviceCategories:['Plumbing']})];
  let res = allocateWorkforce({city:'Bengaluru', service_id:'srv-plumb-01', service_name:'Plumbing', forecast_date:'2026-08-10', forecast_demand:3, providers, bookings:[]});
  assertEqual(res.status, 'SHORTAGE', '3>2 shortage');
  res = allocateWorkforce({city:'Bengaluru', service_id:'srv-plumb-01', service_name:'Plumbing', forecast_date:'2026-08-10', forecast_demand:2, providers, bookings:[]});
  assertEqual(res.status, 'BALANCED', '2==2 balanced');
  res = allocateWorkforce({city:'Bengaluru', service_id:'srv-plumb-01', service_name:'Plumbing', forecast_date:'2026-08-10', forecast_demand:1, providers, bookings:[]});
  assertEqual(res.status, 'SURPLUS', '1<2 surplus');
});

// 11. provider prioritization (FairMatch + workload: lower workload favored)
test('11. provider prioritization favors lower workload when FairMatch similar', () => {
  const pHighLoad = makeProvider({id:'pHigh', city:'Bengaluru', serviceCategories:['Plumbing'], completedJobs:400, rating:4.95});
  const pLowLoad = makeProvider({id:'pLow', city:'Bengaluru', serviceCategories:['Plumbing'], completedJobs:50, rating:4.85});
  const bookings = [
    {providerId:'pHigh', bookingStatus:'CONFIRMED'},
    {providerId:'pHigh', bookingStatus:'CONFIRMED'},
    {providerId:'pHigh', bookingStatus:'CONFIRMED'},
    {providerId:'pHigh', bookingStatus:'CONFIRMED'},
  ]; // pHigh 4 active => capacity 0, pLow 0 active =>1
  const res = allocateWorkforce({city:'Bengaluru', service_id:'srv-plumb-01', service_name:'Plumbing Repair & Leakage Fix', forecast_date:'2026-08-10', forecast_demand:1, providers:[pHighLoad, pLowLoad], bookings});
  // pLow should be prioritized (ranked first) despite high rating of pHigh
  assert(res.provider_recommendations.length === 2, '2 recommendations');
  // Check pLow is first (prioritized)
  assertEqual(res.provider_recommendations[0].provider_id, 'pLow', `expected pLow first, got ${res.provider_recommendations[0].provider_id}`);
  assert(res.provider_recommendations[0].reason.includes('low workload'), 'pLow reason low workload');
  // pHigh should be deprioritized
  const pHighRec = res.provider_recommendations.find(r=>r.provider_id==='pHigh');
  assert(pHighRec.reason.includes('high'), 'pHigh deprioritized high workload');
});

// 12. fairness behavior (workload-adjusted, not rating-only)
test('12. fairness: high-rated overloaded not absorbing all demand (capacity 0)', () => {
  const providers = [
    makeProvider({id:'pStar', city:'Bengaluru', serviceCategories:['Plumbing'], rating:5.0, completedJobs:500}),
    makeProvider({id:'pMid', city:'Bengaluru', serviceCategories:['Plumbing'], rating:4.6, completedJobs:80}),
    makeProvider({id:'pNew', city:'Bengaluru', serviceCategories:['Plumbing'], rating:4.7, completedJobs:20}),
  ];
  const bookings = [
    {providerId:'pStar', bookingStatus:'CONFIRMED'},
    {providerId:'pStar', bookingStatus:'CONFIRMED'},
    {providerId:'pStar', bookingStatus:'CONFIRMED'},
    {providerId:'pStar', bookingStatus:'CONFIRMED'},
    {providerId:'pStar', bookingStatus:'CONFIRMED'}, // 5 active → capacity 0
  ];
  const res = allocateWorkforce({city:'Bengaluru', service_id:'srv-plumb-01', service_name:'Plumbing', forecast_date:'2026-08-10', forecast_demand:2, providers, bookings});
  // pStar capacity 0, should be deprioritized despite 5.0 rating
  const pStarRec = res.provider_recommendations.find(r=>r.provider_id==='pStar');
  assert(pStarRec.capacity === 0, 'star capacity 0');
  assert(pStarRec.reason.includes('high'), 'star deprioritized');
  // Available capacity should be from pMid(1) + pNew(1) =2, total demand 2 => balanced, not shortage due to star overload
  assertEqual(res.available_capacity, 2, 'available 2 (star 0)');
  assertEqual(res.status, 'BALANCED', 'balanced');
  // Fairness: ensure not rating-only — pMid and pNew should be prioritized over pStar
  assert(res.provider_recommendations[0].provider_id !== 'pStar', 'top not star');
});

// 13. no mutation of existing provider/FairMatch data
test('13. no mutation of existing provider/FairMatch data', () => {
  const providers = [makeProvider({id:'p1', city:'Bengaluru', serviceCategories:['Plumbing']})];
  const bookings = [{providerId:'p1', bookingStatus:'CONFIRMED'}];
  const beforeProviders = JSON.stringify(providers);
  const beforeBookings = JSON.stringify(bookings);
  const res = allocateWorkforce({city:'Bengaluru', service_id:'srv-plumb-01', service_name:'Plumbing', forecast_date:'2026-08-10', forecast_demand:3, providers, bookings});
  assertEqual(JSON.stringify(providers), beforeProviders, 'providers not mutated');
  assertEqual(JSON.stringify(bookings), beforeBookings, 'bookings not mutated');
  assert(res.provider_recommendations, 'has recommendations');
});

console.log(`\n=== WorkforceAllocation Tests: ${passed} passed, ${failed} failed ===`);
if (failed>0) process.exitCode=1;

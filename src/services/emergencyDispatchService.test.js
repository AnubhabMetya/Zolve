// Deterministic tests for Emergency Dispatch — Feature 6 Stage 1
// 15 scenarios + existing suite compatibility

import { emergencyDispatch, EMERGENCY_WEIGHTS, isEligibleForEmergency, resolveCustomerLocation } from './emergencyDispatchService.js';
import { CITY_HUBS } from './workforceAllocationService.js';

function assert(cond, msg){ if(!cond) throw new Error(msg); }
function assertEqual(a,b,msg){ if(a!==b) throw new Error(`${msg}: expected ${b}, got ${a}`); }
let passed=0, failed=0;
function test(name, fn){ try{ fn(); console.log(`✓ ${name}`); passed++; } catch(e){ console.error(`✗ ${name}: ${e.message}`); failed++; } }

function hub(city){ return CITY_HUBS.find(h=>h.city===city); }
function makeProvider({id, city, serviceCategories, availability='Available Today', coords=null, rating=4.7, completedJobs=50, title}) {
  const h = hub(city) || hub('Bengaluru');
  const c = coords || {lat: h.lat+0.01, lng: h.lng+0.01};
  return { id, name: `Provider ${id}`, title: title || (serviceCategories||[]).join(' ') || 'Provider', serviceCategories: serviceCategories||['Plumbing'], skills:[], availability, coords: c, rating, ratingCount: 50, completedJobs, isCoopMember:true };
}
function makeBooking(providerId, status='CONFIRMED'){ return { providerId, bookingStatus: status, scheduledDate: '2026-09-03', scheduledTime: '10:00 AM - 11:00 AM' }; }

// Helper to build trustHistory for two providers where one is HIGH
function buildTrustHistoryHighVsLow(city, serviceId) {
  const dates = Array.from({length:30},(_,i)=>{ const d=new Date(2026,6,5); d.setDate(d.getDate()+i); return d.toISOString().slice(0,10); });
  let rows=[];
  // 3 normal providers
  for(let i=0;i<3;i++){
    for(const d of dates) rows.push({provider_id:`prov-norm-${i}`, date:d, city, service_id:serviceId, service_name:serviceId, booking_count:1, completed_count:1, cancelled_count:0, rejected_count:0, rating:4.7, active_jobs:1, daily_earnings_proxy:1000});
  }
  // high anomaly provider - more extreme to guarantee HIGH
  for(const d of dates) rows.push({provider_id:'prov-high', date:d, city, service_id:serviceId, service_name:serviceId, booking_count:6, completed_count:2, cancelled_count:3, rejected_count:2, rating:2.5, active_jobs:6, daily_earnings_proxy:1000});
  // low anomaly provider
  for(const d of dates) rows.push({provider_id:'prov-low', date:d, city, service_id:serviceId, service_name:serviceId, booking_count:1, completed_count:1, cancelled_count:0, rejected_count:0, rating:4.8, active_jobs:0, daily_earnings_proxy:1000});
  return rows;
}

const baseCity='Bengaluru';
const baseServiceId='srv-plumb-01';
const baseServiceName='Plumbing Repair & Leakage Fix';
const baseLoc = {lat: hub(baseCity).lat+0.005, lng: hub(baseCity).lng+0.005};

// 1. nearest qualified available provider wins when other factors equal
test('1. nearest qualified available wins when equal', ()=>{
  const pNear = makeProvider({id:'pNear', city:baseCity, serviceCategories:['Plumbing']});
  const pFar = makeProvider({id:'pFar', city:baseCity, serviceCategories:['Plumbing'], coords:{lat: hub(baseCity).lat+0.2, lng: hub(baseCity).lng+0.2}}); // ~30km
  // Ensure both have same workload/rating/availability
  const res = emergencyDispatch({ service_id:baseServiceId, service_name:baseServiceName, customerLocation: baseLoc, providers:[pNear,pFar], bookings:[] });
  assert(res.recommended_provider.provider_id==='pNear', `expected pNear got ${res.recommended_provider.provider_id}`);
});

// 2. provider outside 50km excluded
test('2. provider outside 50km excluded', ()=>{
  const pNear = makeProvider({id:'pNear', city:baseCity, serviceCategories:['Plumbing']});
  const pFar = makeProvider({id:'pFar', city:'Delhi NCR', serviceCategories:['Plumbing']}); // Delhi far from Bengaluru >1500km
  const res = emergencyDispatch({ service_id:baseServiceId, service_name:baseServiceName, customerLocation: baseLoc, providers:[pNear,pFar], bookings:[] });
  assertEqual(res.eligible_provider_count, 1, 'only near eligible');
  assert(res.recommended_provider.provider_id==='pNear', 'near wins');
  assert(res.alternatives.length===0, 'no alternatives distant');
});

// 3. unqualified provider excluded
test('3. unqualified provider excluded', ()=>{
  const pQual = makeProvider({id:'pQual', city:baseCity, serviceCategories:['Plumbing']});
  const pUnqual = makeProvider({id:'pUnqual', city:baseCity, serviceCategories:['Cleaning']});
  const res = emergencyDispatch({ service_id:baseServiceId, service_name:baseServiceName, customerLocation: baseLoc, providers:[pQual,pUnqual], bookings:[] });
  assertEqual(res.eligible_provider_count, 1, 'only qualified');
  assert(res.recommended_provider.provider_id==='pQual', 'qualified wins');
});

// 4. unavailable provider excluded
test('4. unavailable provider excluded', ()=>{
  const pAvail = makeProvider({id:'pAvail', city:baseCity, serviceCategories:['Plumbing'], availability:'Available Today'});
  const pUnavail = makeProvider({id:'pUnavail', city:baseCity, serviceCategories:['Plumbing'], availability:'Unavailable'});
  const res = emergencyDispatch({ service_id:baseServiceId, service_name:baseServiceName, customerLocation: baseLoc, providers:[pAvail,pUnavail], bookings:[] });
  assertEqual(res.eligible_provider_count, 1, 'unavailable excluded');
  assert(res.recommended_provider.provider_id==='pAvail', 'available wins');
});

// 5. overloaded provider penalized
test('5. overloaded provider penalized', ()=>{
  const pLow = makeProvider({id:'pLow', city:baseCity, serviceCategories:['Plumbing']});
  const pHigh = makeProvider({id:'pHigh', city:baseCity, serviceCategories:['Plumbing']});
  const bookings = [makeBooking('pHigh'), makeBooking('pHigh'), makeBooking('pHigh'), makeBooking('pHigh')]; // 4 active → capacity 0 but still eligible? Actually 4+ capacity 0 but hard eligibility says capacity 0 + active>=4 => ineligible? Check isEligible: capacity 0 && active>=4 => ineligible. So use 3 active to keep eligible but penalized
  const bookings3 = [makeBooking('pHigh'), makeBooking('pHigh'), makeBooking('pHigh')]; // 3 active → capacity 0.1 still eligible
  const res = emergencyDispatch({ service_id:baseServiceId, service_name:baseServiceName, customerLocation: baseLoc, providers:[pLow,pHigh], bookings: bookings3 });
  // pLow 0 active should win over pHigh 3 active (workload 15% weight)
  assert(res.recommended_provider.provider_id==='pLow', `expected pLow got ${res.recommended_provider.provider_id} scores ${res.recommended_provider.emergencyPriorityScore} vs alt ${res.alternatives[0]?.emergencyPriorityScore}`);
  assert(res.reasons.some(r=>r.toLowerCase().includes('workload')) || res.recommended_provider.reason.toLowerCase().includes('workload') || res.alternatives[0].reason.toLowerCase().includes('workload'), 'workload reason');
});

// 6. FairMatch contributes to ranking
test('6. FairMatch contributes to ranking', ()=>{
  // Two providers same distance/workload and same completedJobs (fairness equal), but one has higher rating
  const pHighFM = makeProvider({id:'pHighFM', city:baseCity, serviceCategories:['Plumbing'], rating:4.9, completedJobs:50, title:'Senior Plumbing Specialist'});
  const pLowFM = makeProvider({id:'pLowFM', city:baseCity, serviceCategories:['Plumbing'], rating:4.5, completedJobs:50, title:'Plumbing Helper'});
  // Need same coords and workload
  pHighFM.coords = {lat: hub(baseCity).lat+0.01, lng: hub(baseCity).lng+0.01};
  pLowFM.coords = {lat: hub(baseCity).lat+0.01, lng: hub(baseCity).lng+0.01};
  const res = emergencyDispatch({ service_id:baseServiceId, service_name:baseServiceName, customerLocation: baseLoc, providers:[pLowFM,pHighFM], bookings:[] });
  // Higher rating should give higher FairMatch, thus higher emergency priority (15% weight)
  // So pHighFM should win when fairness equal
  assert(res.recommended_provider.provider_id==='pHighFM', `expected pHighFM got ${res.recommended_provider.provider_id} fm ${res.recommended_provider.fairMatchScore} vs ${res.alternatives[0].fairMatchScore}`);
});

// 7. HIGH anomaly risk reduces dispatch priority
test('7. HIGH anomaly risk reduces dispatch priority', ()=>{
  const city='Kolkata', serviceId='srv-clean-01', serviceName='Full Home Deep Cleaning';
  const pHighTrust = makeProvider({id:'prov-high', city, serviceCategories:['Cleaning']});
  const pLowTrust = makeProvider({id:'prov-low', city, serviceCategories:['Cleaning']});
  // Use same coords to equalize distance
  pHighTrust.coords = {lat: hub(city).lat+0.01, lng: hub(city).lng+0.01};
  pLowTrust.coords = {lat: hub(city).lat+0.01, lng: hub(city).lng+0.01};
  const trustHistory = buildTrustHistoryHighVsLow(city, serviceId);
  const res = emergencyDispatch({ city, service_id:serviceId, service_name:serviceName, customerLocation:{lat: hub(city).lat+0.005, lng: hub(city).lng+0.005}, providers:[pHighTrust,pLowTrust], bookings:[], trustHistory });
  // pLow should win despite same distance, because trust penalty 10%
  assert(res.recommended_provider.provider_id==='prov-low', `expected prov-low got ${res.recommended_provider.provider_id} risk ${res.recommended_provider.trustRiskLevel}`);
  assert(res.recommended_provider.trustRiskLevel==='LOW', 'low risk');
  assert(res.alternatives[0].trustRiskLevel==='HIGH', 'high risk alt');
  assert(res.alternatives[0].reason.toLowerCase().includes('anomaly risk'), 'trust reason');
  assert(!res.recommended_provider.reason.includes('fraudulent'), 'avoid fraud language');
});

// 8. fairness does not override hard emergency eligibility
test('8. fairness does not override hard eligibility', ()=>{
  // Fair provider but unqualified/distant should still be excluded even if fairness high (few jobs)
  const pUnqualFair = makeProvider({id:'pUnqualFair', city:baseCity, serviceCategories:['Cleaning'], completedJobs:1}); // high fairness (few jobs) but unqualified
  const pQualLessFair = makeProvider({id:'pQualLessFair', city:baseCity, serviceCategories:['Plumbing'], completedJobs:500}); // low fairness but qualified
  const res = emergencyDispatch({ service_id:baseServiceId, service_name:baseServiceName, customerLocation: baseLoc, providers:[pUnqualFair,pQualLessFair], bookings:[] });
  assertEqual(res.eligible_provider_count, 1, 'only qualified eligible');
  assert(res.recommended_provider.provider_id==='pQualLessFair', 'qualified wins despite fairness');
});

// 9. zero eligible providers → NO_PROVIDER
test('9. zero eligible → NO_PROVIDER', ()=>{
  const res = emergencyDispatch({ service_id:baseServiceId, service_name:baseServiceName, customerLocation: baseLoc, providers:[], bookings:[] });
  assertEqual(res.dispatch_status, 'NO_PROVIDER', 'NO_PROVIDER');
  assert(res.recommended_provider===null, 'no recommended');
  assertEqual(res.eligible_provider_count, 0, '0 eligible');
  assert(res.estimated_distance_km===null, 'null distance');
});

// 10. constrained eligible providers → LIMITED
test('10. constrained eligible → LIMITED', ()=>{
  // Create eligible providers but all with high workload (capacity constrained) -> should be LIMITED
  const p1 = makeProvider({id:'p1', city:baseCity, serviceCategories:['Plumbing']});
  const p2 = makeProvider({id:'p2', city:baseCity, serviceCategories:['Plumbing']});
  const bookings = [makeBooking('p1'), makeBooking('p1'), makeBooking('p1'), makeBooking('p2'), makeBooking('p2'), makeBooking('p2')]; // both 3 active → capacity 0.1 each
  const res = emergencyDispatch({ service_id:baseServiceId, service_name:baseServiceName, customerLocation: baseLoc, providers:[p1,p2], bookings });
  assertEqual(res.dispatch_status, 'LIMITED', `expected LIMITED got ${res.dispatch_status}`);
  assert(res.eligible_provider_count===2, '2 eligible but constrained');
});

// 11. normal eligible provider → READY
test('11. normal eligible → READY', ()=>{
  const p = makeProvider({id:'pReady', city:baseCity, serviceCategories:['Plumbing']});
  const res = emergencyDispatch({ service_id:baseServiceId, service_name:baseServiceName, customerLocation: baseLoc, providers:[p], bookings:[] });
  assertEqual(res.dispatch_status, 'READY', 'READY');
  assert(res.recommended_provider.provider_id==='pReady', 'recommended');
  assert(res.emergency_priority_score >0 && res.emergency_priority_score <=100, 'score range');
});

// 12. reasons generated
test('12. reasons generated', ()=>{
  const p = makeProvider({id:'pR', city:baseCity, serviceCategories:['Plumbing']});
  const res = emergencyDispatch({ service_id:baseServiceId, service_name:baseServiceName, customerLocation: baseLoc, providers:[p], bookings:[] });
  assert(res.reasons.length>0, 'reasons not empty');
  assert(res.recommended_provider.reason.length>10, 'reason string');
  assert(res.reasons.some(r=>r.toLowerCase().includes('qualified')), 'qualified reason');
  assert(!res.reasons.join(' ').toLowerCase().includes('fraudulent'), 'avoid fraud');
});

// 13. alternatives generated
test('13. alternatives generated', ()=>{
  const providers = [
    makeProvider({id:'p1', city:baseCity, serviceCategories:['Plumbing']}),
    makeProvider({id:'p2', city:baseCity, serviceCategories:['Plumbing']}),
    makeProvider({id:'p3', city:baseCity, serviceCategories:['Plumbing']}),
  ];
  const res = emergencyDispatch({ service_id:baseServiceId, service_name:baseServiceName, customerLocation: baseLoc, providers, bookings:[] });
  assert(res.alternatives.length===2, `expected 2 alternatives got ${res.alternatives.length}`);
  assert(res.alternatives[0].provider_id !== res.recommended_provider.provider_id, 'alt distinct');
});

// 14. no mutation of provider/booking source data
test('14. no mutation of source data', ()=>{
  const providers = [makeProvider({id:'p1', city:baseCity, serviceCategories:['Plumbing']})];
  const bookings = [makeBooking('p1')];
  const beforeProv = JSON.stringify(providers);
  const beforeBook = JSON.stringify(bookings);
  const res = emergencyDispatch({ service_id:baseServiceId, service_name:baseServiceName, customerLocation: baseLoc, providers, bookings });
  assertEqual(JSON.stringify(providers), beforeProv, 'providers not mutated');
  assertEqual(JSON.stringify(bookings), beforeBook, 'bookings not mutated');
});

// 15. emergency score remains 0–100
test('15. emergency score 0–100', ()=>{
  const providers = [makeProvider({id:'p1', city:baseCity, serviceCategories:['Plumbing']})];
  const res = emergencyDispatch({ service_id:baseServiceId, service_name:baseServiceName, customerLocation: baseLoc, providers, bookings:[] });
  assert(res.emergency_priority_score >=0 && res.emergency_priority_score <=100, `score ${res.emergency_priority_score} in 0-100`);
  assert(res.recommended_provider.emergencyPriorityScore >=0 && res.recommended_provider.emergencyPriorityScore <=100, 'provider score range');
});

// Additional: weights sum 100
test('weights sum 100', ()=>{
  const sum = Object.values(EMERGENCY_WEIGHTS).reduce((a,b)=>a+b,0);
  assertEqual(sum, 100, 'weights 100');
});

// City fallback: if only city given, use hub
test('city fallback resolves', ()=>{
  const loc = resolveCustomerLocation({customerLocation:null, city:'Mumbai'});
  assert(loc && loc.lat=== hub('Mumbai').lat, 'hub fallback');
  const p = makeProvider({id:'pMum', city:'Mumbai', serviceCategories:['Plumbing']});
  const res = emergencyDispatch({ service_id:baseServiceId, service_name:baseServiceName, customerLocation: null, city:'Mumbai', providers:[p], bookings:[] });
  assertEqual(res.dispatch_status, 'READY', 'city fallback READY');
});

console.log(`\n=== EmergencyDispatch Tests: ${passed} passed, ${failed} failed ===`);
if (failed>0) process.exitCode=1;

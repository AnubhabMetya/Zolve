// Tests for provider-city/locality availability correction (20-city, 50km hard filter, 5-10 local)
// Run with: node src/services/cityGeo.test.js

import { INITIAL_PROVIDERS, CITY_HUBS, SERVICE_CATEGORIES } from '../data/mockData.js';
import { fairMatchRank, isEligible } from './fairMatchService.js';
import { semanticMatch } from './semanticService.js';
import { haversineKm, SERVICE_RADIUS_KM } from './locationService.js';

function assert(cond, msg){ if(!cond) throw new Error(msg); }
let passed=0, failed=0;
function test(name, fn){ try{ fn(); console.log(`✓ ${name}`); passed++; }catch(e){ console.error(`✗ ${name}: ${e.message}`); failed++; } }

// Helpers
const getHub = (city) => CITY_HUBS.find(h=> h.city.toLowerCase()===city.toLowerCase() || h.city.toLowerCase().includes(city.toLowerCase()));
const kolkataHub = getHub('Kolkata');
const mumbaiHub = getHub('Mumbai');
const bengaluruHub = getHub('Bengaluru');
const delhiHub = getHub('Delhi NCR');
const gurugramHub = getHub('Gurugram');

// A: Kolkata customer → Mumbai provider excluded
test('A: Kolkata customer → Mumbai provider excluded', ()=>{
  const mumbaiProvider = INITIAL_PROVIDERS.find(p=> (p.location||'').toLowerCase().includes('mumbai') && p.serviceCategories?.some(c=>c.includes('Plumbing')));
  assert(mumbaiProvider, 'mumbai plumbing provider exists');
  const res = isEligible(mumbaiProvider, { customerLocation: {lat: kolkataHub.lat, lng: kolkataHub.lng}, requestedService:{name:'Plumbing Repair & Leakage Fix', subcategory:'Plumbing'}, allBookings:[] });
  assert(!res.eligible && res.reason==='outside_service_area', `expected outside_service_area, got ${res.reason} dist ${res.distanceKm}`);
});

// B: Kolkata → Bengaluru excluded
test('B: Kolkata → Bengaluru provider excluded', ()=>{
  const blrProvider = INITIAL_PROVIDERS.find(p=> (p.location||'').toLowerCase().includes('bengaluru') && p.serviceCategories?.some(c=>c.includes('Plumbing')));
  assert(blrProvider, 'blr provider exists');
  const res = isEligible(blrProvider, { customerLocation: {lat: kolkataHub.lat, lng: kolkataHub.lng}, requestedService:{name:'Plumbing Repair & Leakage Fix', subcategory:'Plumbing'} });
  assert(!res.eligible && res.reason==='outside_service_area', 'bengaluru should be excluded for kolkata');
});

// C: Kolkata → Kolkata eligible
test('C: Kolkata → Kolkata provider eligible', ()=>{
  const kolProvider = INITIAL_PROVIDERS.find(p=> (p.location||'').toLowerCase().includes('kolkata') && p.serviceCategories?.some(c=>c.includes('Plumbing')));
  assert(kolProvider, 'kolkata provider exists');
  const res = isEligible(kolProvider, { customerLocation: {lat: kolkataHub.lat, lng: kolkataHub.lng}, requestedService:{name:'Plumbing Repair & Leakage Fix', subcategory:'Plumbing'} });
  assert(res.eligible, `kolkata provider should be eligible, got ${res.reason}`);
});

// D: Gurugram nearby Delhi/Noida within 50km eligible
test('D: Gurugram customer → nearby Delhi provider eligible when within 50km', ()=>{
  const delhiProvider = INITIAL_PROVIDERS.find(p=> (p.location||'').toLowerCase().includes('delhi') && p.coords);
  assert(delhiProvider, 'delhi provider exists');
  const dist = haversineKm(gurugramHub.lat, gurugramHub.lng, delhiProvider.coords.lat, delhiProvider.coords.lng);
  console.log(`  Delhi-Gurugram provider dist ${dist.toFixed(1)}km`);
  const res = isEligible(delhiProvider, { customerLocation: {lat: gurugramHub.lat, lng: gurugramHub.lng}, requestedService:{name: delhiProvider.serviceCategories[0], subcategory: delhiProvider.serviceCategories[0]} });
  if (dist <= SERVICE_RADIUS_KM) assert(res.eligible, 'within 50km should be eligible');
  else assert(!res.eligible, 'outside 50km should be excluded');
  // Also test a provider just within 50km: create synthetic nearby
  const nearbyProvider = { ...delhiProvider, coords: {lat: gurugramHub.lat + 0.2, lng: gurugramHub.lng + 0.2}, serviceCategories:['Plumbing'] };
  const dist2 = haversineKm(gurugramHub.lat, gurugramHub.lng, nearbyProvider.coords.lat, nearbyProvider.coords.lng);
  assert(dist2 < 50, 'synthetic nearby should be <50');
  const res2 = isEligible(nearbyProvider, { customerLocation: {lat: gurugramHub.lat, lng: gurugramHub.lng}, requestedService:{name:'Plumbing Repair & Leakage Fix', subcategory:'Plumbing'} });
  assert(res2.eligible, 'nearby Gurugram/Delhi within 50km eligible');
});

// E: Provider >50km away excluded
test('E: Provider >50km away excluded', ()=>{
  const kolProvider = INITIAL_PROVIDERS.find(p=> (p.location||'').toLowerCase().includes('kolkata'));
  const mumbaiLoc = {lat: mumbaiHub.lat, lng: mumbaiHub.lng};
  const res = isEligible(kolProvider, { customerLocation: mumbaiLoc, requestedService:{name: kolProvider.serviceCategories[0]}});
  assert(!res.eligible && res.reason==='outside_service_area', 'kolkata provider for mumbai customer should be excluded');
});

// F: 10 eligible local providers → return/rank up to 10
test('F: 10 eligible local providers → return up to 10', ()=>{
  const kolProviders = INITIAL_PROVIDERS.filter(p=> (p.location||'').toLowerCase().includes('kolkata')).slice(0,12);
  assert(kolProviders.length >= 10, `need 10 kolkata providers, got ${kolProviders.length}`);
  const candidates = kolProviders.slice(0,12).map(p=> ({provider:p, semanticScore:0.9}));
  const res = fairMatchRank({ candidates, customerLocation:{lat: kolkataHub.lat, lng: kolkataHub.lng}, requestedService:{name:'Plumbing Repair & Leakage Fix', subcategory:'Plumbing'}, allBookings:[] });
  // Should return up to 10, but we have 12 candidates, all within 50km and same service? Check eligibility: some may be not qualified for plumbing
  // For plumbing, only plumbing providers are qualified, others are cleaning etc. So filtered count will be less than 12.
  // Let's use only plumbing providers for kolkata
  const kolPlumbing = INITIAL_PROVIDERS.filter(p=> (p.location||'').toLowerCase().includes('kolkata') && p.serviceCategories?.some(c=>c.toLowerCase().includes('plumbing')));
  console.log(`  Kolkata plumbing count ${kolPlumbing.length}`);
  assert(kolPlumbing.length >= 10, `kolkata plumbing should be >=10, got ${kolPlumbing.length}`);
  const cand2 = kolPlumbing.slice(0,10).map(p=>({provider:p, semanticScore:0.9}));
  const res2 = fairMatchRank({ candidates: cand2, customerLocation:{lat: kolkataHub.lat, lng: kolkataHub.lng}, requestedService:{name:'Plumbing Repair & Leakage Fix', subcategory:'Plumbing'}, allBookings:[] });
  assert(res2.rankedCandidates.length === 10, `expected 10, got ${res2.rankedCandidates.length}`);
  assert(res2.rankedCandidates.length <= 10, 'not more than 10');
});

// G: Only 4 eligible local → return 4, not padded
test('G: Only 4 eligible local → return 4, not padded with distant', ()=>{
  // Create 4 local plumbing providers for Kolkata, rest distant (Mumbai)
  const kolPlumbing = INITIAL_PROVIDERS.filter(p=> (p.location||'').toLowerCase().includes('kolkata') && p.serviceCategories?.some(c=>c.toLowerCase().includes('plumbing'))).slice(0,4);
  const mumbaiPlumbing = INITIAL_PROVIDERS.filter(p=> (p.location||'').toLowerCase().includes('mumbai') && p.serviceCategories?.some(c=>c.toLowerCase().includes('plumbing'))).slice(0,6);
  const candidates = [...kolPlumbing, ...mumbaiPlumbing].map(p=>({provider:p, semanticScore:0.9}));
  const res = fairMatchRank({ candidates, customerLocation:{lat: kolkataHub.lat, lng: kolkataHub.lng}, requestedService:{name:'Plumbing Repair & Leakage Fix', subcategory:'Plumbing'}, allBookings:[] });
  assert(res.rankedCandidates.length === 4, `should return 4, got ${res.rankedCandidates.length}`);
  assert(!res.rankedCandidates.some(c=> (c.provider.location||'').toLowerCase().includes('mumbai')), 'should not contain Mumbai distant');
  assert(res.excluded.length === 6 && res.excluded.every(e=>e.reason==='outside_service_area'), '6 Mumbai excluded');
});

// H: Semantically excellent Mumbai for Kolkata → excluded before FairMatch
test('H: Semantically excellent Mumbai for Kolkata excluded before FairMatch', ()=>{
  const mumbaiExcellent = INITIAL_PROVIDERS.find(p=> (p.location||'').toLowerCase().includes('mumbai'));
  assert(mumbaiExcellent, 'mumbai provider exists');
  const candidates = [{provider: mumbaiExcellent, semanticScore: 0.99}];
  const res = fairMatchRank({ candidates, customerLocation:{lat: kolkataHub.lat, lng: kolkataHub.lng}, requestedService:{name: mumbaiExcellent.serviceCategories[0]}, allBookings:[] });
  assert(res.rankedCandidates.length===0 && res.excluded[0].reason==='outside_service_area', 'Mumbai excellent should be excluded for Kolkata');
});

// I: Qualified nearby provider can be ranked normally
test('I: Qualified nearby provider can be ranked', ()=>{
  const kolProvider = INITIAL_PROVIDERS.find(p=> (p.location||'').toLowerCase().includes('kolkata') && p.serviceCategories?.some(c=>c.includes('Plumbing')));
  const candidates = [{provider: kolProvider, semanticScore:0.85}];
  const res = fairMatchRank({ candidates, customerLocation:{lat: kolkataHub.lat, lng: kolkataHub.lng}, requestedService:{name:'Plumbing Repair & Leakage Fix', subcategory:'Plumbing'}, allBookings:[] });
  assert(res.rankedCandidates.length===1 && res.rankedCandidates[0].provider.id===kolProvider.id, 'nearby qualified should be ranked');
});

// J: Provider unavailable excluded
test('J: Provider unavailable excluded', ()=>{
  const p = { id:'pUnavail', serviceCategories:['Plumbing'], skills:[], title:'Plumber', availability:'Unavailable', coords:{lat: kolkataHub.lat, lng: kolkataHub.lng}, rating:4.8, ratingCount:100, completedJobs:100 };
  const res = isEligible(p, { requestedService:{name:'Plumbing Repair & Leakage Fix', subcategory:'Plumbing'} });
  assert(!res.eligible && res.reason==='unavailable', 'unavailable');
  const fm = fairMatchRank({ candidates:[{provider:p, semanticScore:0.9}], customerLocation:{lat: kolkataHub.lat, lng: kolkataHub.lng}, requestedService:{name:'Plumbing Repair & Leakage Fix', subcategory:'Plumbing'}, allBookings:[] });
  assert(fm.rankedCandidates.length===0, 'unavailable excluded from FairMatch');
});

// K: Provider double-booked excluded
test('K: Provider double-booked excluded', ()=>{
  const p = { id:'p1', serviceCategories:['Plumbing'], skills:[], title:'Plumber', availability:'Available Today', coords:{lat: kolkataHub.lat, lng: kolkataHub.lng}, rating:4.8, ratingCount:100, completedJobs:100 };
  const bookings=[{providerId:'p1', scheduledDate:'2026-09-03', scheduledTime:'10:00 AM - 11:00 AM', bookingStatus:'CONFIRMED'}];
  const res = isEligible(p, { requestedService:{name:'Plumbing Repair & Leakage Fix', subcategory:'Plumbing'}, requestedDate:'2026-09-03', requestedTime:'10:00 AM - 11:00 AM', allBookings:bookings });
  assert(!res.eligible && res.reason==='double_booked', 'double booked');
});

// L: Same-day booking still respects 2-hour advance rule (via availability, not invented travel)
test('L: Same-day 2-hour rule preserved (BookingModal IST logic not changed)', ()=>{
  // We check that FairMatch does NOT invent travel time, only uses distance radius and existing availability
  // The actual 2-hour rule is in BookingModal isSlotEligible, not in FairMatch — ensure FairMatch still allows same-day if available
  const p = { id:'p1', serviceCategories:['Plumbing'], skills:[], title:'Plumber', availability:'Available Today', coords:{lat: kolkataHub.lat, lng: kolkataHub.lng}, rating:4.8, ratingCount:100, completedJobs:100 };
  const res = isEligible(p, { requestedService:{name:'Plumbing Repair & Leakage Fix', subcategory:'Plumbing'}, requestedDate:new Date().toISOString().split('T')[0], requestedTime:'10:00 AM - 11:00 AM', allBookings:[] });
  assert(res.eligible, 'same-day available provider should be eligible (2-hour rule is slot-level, not geo)');
});

// Coverage: every supported city has ≥10 providers per service
test('Coverage: every supported city has ≥10 providers per service (prototype)', ()=>{
  const services = SERVICE_CATEGORIES.flatMap(c=>c.services);
  let min=Infinity; let minInfo='';
  for(const hub of CITY_HUBS){
    // Only check 20 spec cities (exclude Siliguri extra)
    if(hub.city==='Siliguri') continue;
    for(const srv of services){
      const cnt = INITIAL_PROVIDERS.filter(p=>{
        const loc=(p.location||'').toLowerCase();
        const cityMatch = hub.city==='Delhi NCR' ? (loc.includes('delhi')||loc.includes('gurugram')||loc.includes('gurgaon')) : loc.includes(hub.city.toLowerCase());
        if(!cityMatch) return false;
        const qual=[...(p.serviceCategories||[]), ...(p.skills||[]), p.title||''].join(' ').toLowerCase();
        return qual.includes(srv.name.toLowerCase()) || qual.includes(srv.subcategory.toLowerCase());
      }).length;
      if(cnt < min){ min=cnt; minInfo=`${hub.city}/${srv.name}:${cnt}`; }
      assert(cnt >= 10, `City ${hub.city} service ${srv.name} has ${cnt} <10`);
    }
  }
  console.log(`  Coverage min ${minInfo}`);
});

// Semantic geo filter: Kolkata customer with tap leaking should not return Mumbai
test('Semantic geo filter: Kolkata tap leaking → only Kolkata plumbing', ()=>{
  const res = semanticMatch('My bathroom tap is leaking', null, {lat: kolkataHub.lat, lng: kolkataHub.lng});
  assert(res.topProviders.length >0, 'should have local providers');
  for(const tp of res.topProviders.slice(0,5)){
    const dist = haversineKm(kolkataHub.lat, kolkataHub.lng, tp.provider.coords.lat, tp.provider.coords.lng);
    assert(dist <= SERVICE_RADIUS_KM, `provider ${tp.provider.id} dist ${dist} should be <=50 for Kolkata`);
    assert(!(tp.provider.location||'').toLowerCase().includes('mumbai'), 'should not contain Mumbai');
  }
});

console.log(`\n=== City Geo Tests: ${passed} passed, ${failed} failed ===`);
if(failed>0) process.exitCode=1;

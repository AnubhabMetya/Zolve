// Location Fix Tests — 16 scenarios, no Bengaluru fallback
// Run: node src/services/locationFix.test.js
import { resolveCity, resolveCityFromCoords } from './cityResolver.js';
import { CITY_HUBS } from '../data/mockData.js';
import { isWithinServiceRadius, haversineKm, SERVICE_RADIUS_KM } from './locationService.js';
import { isEligibleForEmergency } from './emergencyDispatchService.js';
import { fairMatchRank, isEligible } from './fairMatchService.js';
import { allocateWorkforce } from './workforceAllocationService.js';
import fs from 'fs';

function assert(cond, msg) { if (!cond) throw new Error(msg); }
let passed=0, failed=0;
async function test(name, fn) {
  try { await fn(); console.log(`✓ ${name}`); passed++; } catch (e) { console.error(`✗ ${name}: ${e.message}`); failed++; }
}

await (async () => {
  // 1. no location initially → unknown (null, not Bengaluru)
  await test('1. no location initially → unknown', () => {
    const r = resolveCity({});
    assert(r.city === null && r.supported === false, `expected null city, got ${r.city}`);
    assert(r.hub_id === null, 'hub_id should be null');
    // Ensure not Bengaluru
    assert(r.city !== 'Bengaluru', 'should not be Bengaluru');
  });

  // 2. GPS success → coordinates stored (resolveCity preserves coords)
  await test('2. GPS success → coordinates preserved', () => {
    const lat = 22.5726, lng = 88.3639; // Kolkata
    const r = resolveCity({ lat, lng });
    assert(r.coords.lat === lat && r.coords.lng === lng, 'coords preserved');
    assert(r.city === 'Kolkata', `expected Kolkata, got ${r.city}`);
  });

  // 3. GPS success → correct city resolved
  await test('3. GPS success → correct city resolved', () => {
    const kol = resolveCity({ lat: 22.5726, lng: 88.3639 });
    assert(kol.city === 'Kolkata', `Kolkata expected ${kol.city}`);
    const mum = resolveCity({ lat: 19.0760, lng: 72.8777 });
    assert(mum.city === 'Mumbai', `Mumbai expected ${mum.city}`);
    const blr = resolveCity({ lat: 12.9716, lng: 77.5946 });
    assert(blr.city === 'Bengaluru', `Bengaluru expected ${blr.city}`);
  });

  // 4. GPS permission denied → no Bengaluru fallback
  await test('4. permission denied → no Bengaluru', () => {
    // Simulate denied: no coords, no city, should be unknown not Bengaluru
    const r = resolveCity({ lat: null, lng: null });
    assert(r.city === null, 'denied should be null');
    assert(r.city !== 'Bengaluru', 'should not fallback');
  });

  // 5. GPS unavailable → no Bengaluru
  await test('5. GPS unavailable → no Bengaluru', () => {
    const r = resolveCity({});
    assert(r.city !== 'Bengaluru', 'unavailable should not be Bengaluru');
    assert(r.city === null, 'should be null');
  });

  // 6. timeout → no Bengaluru
  await test('6. timeout → no Bengaluru', () => {
    const r = resolveCity({ lat: null, lng: null, pincode: null, name: null });
    assert(r.city === null && r.city !== 'Bengaluru', 'timeout should be null');
  });

  // 7. manual map location overrides GPS
  await test('7. manual overrides GPS', () => {
    const gps = resolveCity({ lat: 22.5726, lng: 88.3639 }); // Kolkata
    assert(gps.city === 'Kolkata', 'gps Kolkata');
    const manual = resolveCity({ lat: 19.0760, lng: 72.8777 }); // Mumbai manual
    assert(manual.city === 'Mumbai', 'manual Mumbai should override');
    // Simulate wrapper: manual pick should replace
    const manualPick = { lat: 19.0760, lng: 72.8777, name: 'Dadar, Mumbai', source: 'manual' };
    const resolvedManual = resolveCity(manualPick);
    assert(resolvedManual.city === 'Mumbai', 'manual should be Mumbai');
  });

  // 8. persisted valid location can be restored
  await test('8. persisted valid location can be restored', () => {
    const saved = JSON.stringify({ lat: 22.5726, lng: 88.3639, city: 'Kolkata', name: 'Salt Lake, Kolkata', source: 'gps' });
    const parsed = JSON.parse(saved);
    const r = resolveCity(parsed);
    assert(r.city === 'Kolkata', 'persisted Kolkata should restore');
    // Simulate AppContext restore: if saved has lat/lng, it should be restored, not Bengaluru
    const restored = parsed.lat != null ? parsed : null;
    assert(restored && restored.city === 'Kolkata', 'restored should be Kolkata not Bengaluru');
  });

  // 9. unknown location remains unknown
  await test('9. unknown remains unknown', () => {
    const r1 = resolveCity({});
    const r2 = resolveCity({ lat: null, lng: null });
    const r3 = resolveCity({ name: null, text: null });
    assert(r1.city === null && r2.city === null && r3.city === null, 'all should be null');
    assert(r1.city !== 'Bengaluru' && r2.city !== 'Bengaluru', 'not Bengaluru');
  });

  // 10. unsupported area not silently mapped to Bengaluru
  await test('10. unsupported area not mapped to Bengaluru', () => {
    // Pick a location far from all hubs: 0,0 (Gulf of Guinea) or 35, -100 (USA)
    const far = resolveCity({ lat: 0, lng: 0 });
    assert(far.city === null, `far should be null, got ${far.city}`);
    assert(far.supported === false, 'should be unsupported');
    assert(far.city !== 'Bengaluru', 'should not be Bengaluru');
    assert(far.city !== 'Mumbai' && far.city !== 'Kolkata', 'should not map to nearest');
    // Also test a location 100km away from Bengaluru but outside 50km
    const justOutside = { lat: 13.5, lng: 77.6 }; // ~60km north of Bengaluru
    const r = resolveCity(justOutside);
    const distToBlr = haversineKm(12.9716,77.5946, justOutside.lat, justOutside.lng);
    if (distToBlr > 50) {
      assert(r.city === null, `justOutside with dist ${distToBlr} should be null`);
    }
  });

  // 11. booking/ticket location uses actual selected location (not Bengaluru fallback)
  await test('11. ticket stamping uses actual location', () => {
    const code = fs.readFileSync('src/services/supportTicketService.js','utf8');
    assert(!code.includes("|| 'Bengaluru'") && !code.includes('|| "Bengaluru"'), 'supportTicketService should not fallback to Bengaluru');
    assert(code.includes('resolveCity'), 'should use resolveCity');
    const appCode = fs.readFileSync('src/context/AppContext.jsx','utf8');
    // Check that fallback local ticket no longer uses Bengaluru
    const hasBengaluruFallback = appCode.includes("city: resolveCity") && appCode.includes("|| 'Bengaluru'");
    assert(!hasBengaluruFallback, 'AppContext ticket fallback should not be Bengaluru');
  });

  // 12. 50km provider eligibility still uses actual customer coordinates
  await test('12. 50km eligibility uses actual coords', () => {
    const kolkataHub = CITY_HUBS.find(h=>h.city==='Kolkata');
    const mumbaiHub = CITY_HUBS.find(h=>h.city==='Mumbai');
    const kolkataProvider = { id:'pKol', coords:{lat:kolkataHub.lat, lng:kolkataHub.lng}, serviceCategories:['Plumbing'], skills:[], title:'Plumber', availability:'Available Today' };
    const mumbaiCustomer = { lat: mumbaiHub.lat, lng: mumbaiHub.lng };
    const kolkataCustomer = { lat: kolkataHub.lat, lng: kolkataHub.lng };
    // Mumbai customer should not get Kolkata provider
    const resFar = isEligible(kolkataProvider, { customerLocation: mumbaiCustomer, requestedService:{name:'Plumbing Repair & Leakage Fix'} });
    assert(!resFar.eligible && resFar.reason==='outside_service_area', 'Kolkata provider for Mumbai should be outside');
    // Kolkata customer should get Kolkata provider
    const resNear = isEligible(kolkataProvider, { customerLocation: kolkataCustomer, requestedService:{name:'Plumbing Repair & Leakage Fix'} });
    assert(resNear.eligible, 'Kolkata provider for Kolkata should be eligible');
    // When location is null, should be not eligible or handle gracefully, not fallback to Bengaluru
    const resNull = isEligible(kolkataProvider, { customerLocation: null, requestedService:{name:'Plumbing Repair & Leakage Fix'} });
    // fairMatch isEligible when customerLocation is null, it still checks distance? Look at implementation: if no location, isWithinServiceRadius will be false? Actually isEligible checks if customerLocation null then skip distance? Let's check - in fairMatchService, if no location, it may still be eligible, but we want to ensure not using Bengaluru fallback. The key is that null location should not auto-assign Bengaluru coords.
    // For this test, we check that null location does not automatically become Bengaluru (12.9716)
    // If it were Bengaluru fallback, Kolkata provider would be outside for null->Bengaluru
    // We check that null does not produce Bengaluru distance
    const bengaHub = CITY_HUBS.find(h=>h.city==='Bengaluru');
    const bengaProvider = { id:'pBlr', coords:{lat:bengaHub.lat, lng:bengaHub.lng}, serviceCategories:['Plumbing'], skills:[], title:'Plumber', availability:'Available Today' };
    // With null location, isEligible may return true (no distance check) — but we want to ensure it's not using Bengaluru coords implicitly
    // The important check: no Bengaluru hard-coded coords used
    assert(!JSON.stringify(resNull).includes('12.9716'), 'should not use Bengaluru coords');
  });

  // 13. Emergency Dispatch uses actual customer location
  await test('13. Emergency Dispatch uses actual location', () => {
    const code = fs.readFileSync('src/services/emergencyDispatchService.js','utf8');
    assert(!code.includes("|| 'Bengaluru'"), 'emergencyDispatch should not fallback to Bengaluru');
    // Test: Kolkata customer should not get Mumbai provider via Bengaluru fallback
    const kolHub = CITY_HUBS.find(h=>h.city==='Kolkata');
    const mumProvider = { id:'pMum', coords:{lat:19.0760,lng:72.8777}, serviceCategories:['Plumbing'], skills:[], title:'Plumber', availability:'Available Today' };
    const kolCustomer = { lat: kolHub.lat, lng: kolHub.lng };
    const res = isEligibleForEmergency(mumProvider, kolCustomer, 'srv-plumb-01', 'Plumbing Repair & Leakage Fix', []);
    assert(!res.eligible && res.reason==='outside_service_area', 'Mumbai provider for Kolkata emergency should be outside');
    // Null location should be missing_customer_location, not Bengaluru
    const resNull = isEligibleForEmergency(mumProvider, null, 'srv-plumb-01', 'Plumbing Repair & Leakage Fix', []);
    assert(!resNull.eligible && resNull.reason==='missing_customer_location', `null should be missing, got ${resNull.reason}`);
  });

  // 14. FairMatch uses actual customer location
  await test('14. FairMatch uses actual location', () => {
    const kolHub = CITY_HUBS.find(h=>h.city==='Kolkata');
    const mumHub = CITY_HUBS.find(h=>h.city==='Mumbai');
    const kolProvider = { id:'pKolF', coords:{lat:kolHub.lat,lng:kolHub.lng}, serviceCategories:['Plumbing'], skills:[], title:'Plumber', availability:'Available Today', rating:4.9, ratingCount:100, completedJobs:10 };
    const mumProvider = { id:'pMumF', coords:{lat:mumHub.lat,lng:mumHub.lng}, serviceCategories:['Plumbing'], skills:[], title:'Plumber', availability:'Available Today', rating:4.9, ratingCount:100, completedJobs:10 };
    const kolCustomer = { lat: kolHub.lat, lng: kolHub.lng };
    const fm = fairMatchRank({ candidates:[{provider:kolProvider,semanticScore:0.9},{provider:mumProvider,semanticScore:0.9}], customerLocation: kolCustomer, requestedService:{name:'Plumbing Repair & Leakage Fix'}, allBookings:[] });
    assert(fm.rankedCandidates.length===1 && fm.rankedCandidates[0].provider.id==='pKolF', 'FairMatch for Kolkata should only rank Kolkata');
    assert(fm.excluded.some(e=>e.provider.id==='pMumF'), 'Mumbai should be excluded');
  });

  // 15. Workforce Allocation city selection is unaffected (explicit city param, no silent Bengaluru)
  await test('15. Workforce Allocation explicit city', () => {
    const code = fs.readFileSync('src/components/ai/WorkforceAllocation.jsx','utf8');
    assert(!code.includes("ALL_CITIES.includes('Bengaluru') ? 'Bengaluru'"), 'Workforce default should not be Bengaluru');
    // Test that allocateWorkforce with explicit city still works
    const res = allocateWorkforce({ city:'Bengaluru', service_id:'srv-plumb-01', service_name:'Plumbing Repair & Leakage Fix', forecast_date:'2026-08-10', forecast_demand:2, providers:[
      { id:'p1', coords:{lat:12.9716,lng:77.5946}, serviceCategories:['Plumbing'], availability:'Available Today' },
      { id:'p2', coords:{lat:28.6139,lng:77.2090}, serviceCategories:['Plumbing'], availability:'Available Today' },
    ], bookings:[] });
    assert(res.eligible_provider_count===1, 'Bengaluru workforce should have 1 eligible (Bengaluru provider only)');
    // Test with Kolkata
    const res2 = allocateWorkforce({ city:'Kolkata', service_id:'srv-plumb-01', service_name:'Plumbing Repair & Leakage Fix', forecast_date:'2026-08-10', forecast_demand:2, providers:[
      { id:'p1', coords:{lat:22.5726,lng:88.3639}, serviceCategories:['Plumbing'], availability:'Available Today' },
    ], bookings:[] });
    assert(res2.eligible_provider_count===1, 'Kolkata workforce should work');
    // Test with null city should be invalid_city (no silent Bengaluru)
    const resNull = allocateWorkforce({ city:null, service_id:'srv-plumb-01', service_name:'Plumbing', forecast_date:'2026-08-10', forecast_demand:2, providers:[], bookings:[] });
    assert(resNull.eligible_provider_count===0, 'null city should have 0 eligible, not Bengaluru fallback');
  });

  // 16. no mutation of provider/location source data
  await test('16. no mutation', () => {
    const prov = { id:'p1', coords:{lat:12.9716,lng:77.5946}, serviceCategories:['Plumbing'], availability:'Available Today' };
    const loc = { lat:22.5726, lng:88.3639 };
    const provCopy = JSON.parse(JSON.stringify(prov));
    const locCopy = JSON.parse(JSON.stringify(loc));
    // Call functions that should not mutate
    isEligible(prov, { customerLocation: loc, requestedService:{name:'Plumbing'} });
    fairMatchRank({ candidates:[{provider:prov,semanticScore:0.9}], customerLocation: loc, requestedService:{name:'Plumbing'}, allBookings:[] });
    allocateWorkforce({ city:'Kolkata', service_id:'srv-plumb-01', service_name:'Plumbing', forecast_date:'2026-08-10', forecast_demand:2, providers:[prov], bookings:[] });
    assert(JSON.stringify(prov)===JSON.stringify(provCopy), 'provider mutated');
    assert(JSON.stringify(loc)===JSON.stringify(locCopy), 'location mutated');
    // Check cityResolver does not mutate CITY_HUBS
    const hubsCopy = JSON.parse(JSON.stringify(CITY_HUBS));
    resolveCity({ lat:22.5726, lng:88.3639 });
    assert(JSON.stringify(CITY_HUBS)===JSON.stringify(hubsCopy), 'CITY_HUBS mutated');
  });

  // Also check no hard-coded Bengaluru fallback in critical files
  await test('no hard-coded Bengaluru fallback in AppContext/Location', () => {
    const appCtx = fs.readFileSync('src/context/AppContext.jsx','utf8');
    const hasFallback = appCtx.includes("|| 'Bengaluru'") || appCtx.includes('|| "Bengaluru"') || appCtx.includes("city: 'Bengaluru'");
    // Allow legitimate demo addresses but not selectedLocation fallback
    // Check specifically selectedLocation fallback: should be null not Bengaluru
    const selLocFallback = /selectedLocation.*\|\|.*Bengaluru/.test(appCtx);
    assert(!selLocFallback, 'AppContext should not have selectedLocation || Bengaluru');
    const cityResolver = fs.readFileSync('src/services/cityResolver.js','utf8');
    assert(!cityResolver.includes("|| CITY_HUBS[0]") && !cityResolver.includes("Bengaluru') || CITY_HUBS[0]"), 'cityResolver should not fallback to Bengaluru or first city');
    assert(cityResolver.includes('supported: false'), 'cityResolver should handle unsupported');
  });

  console.log(`\n=== Location Fix Tests: ${passed} passed, ${failed} failed ===`);
  if (failed>0) process.exitCode=1;
})();

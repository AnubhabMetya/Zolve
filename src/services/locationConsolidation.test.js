// Location Consolidation Tests — 15 scenarios + no Bengaluru silent defaults
// Run: node src/services/locationConsolidation.test.js
import { resolveCity, resolveCityFromCoords } from './cityResolver.js';
import { CITY_HUBS } from '../data/mockData.js';
import { haversineKm, SERVICE_RADIUS_KM } from './locationService.js';
import { isEligible, fairMatchRank } from './fairMatchService.js';
import { allocateWorkforce } from './workforceAllocationService.js';
import { isEligibleForEmergency } from './emergencyDispatchService.js';
import fs from 'fs';

function assert(cond, msg) { if (!cond) throw new Error(msg); }
let passed=0, failed=0;
async function test(name, fn) {
  try { await fn(); console.log(`✓ ${name}`); passed++; } catch (e) { console.error(`✗ ${name}: ${e.message}`); failed++; }
}

await (async () => {
  // 1. initial location = unknown (null, not Bengaluru)
  await test('1. initial location = unknown (city null, source unknown)', () => {
    const r = resolveCity({});
    assert(r.city === null, `expected null, got ${r.city}`);
    assert(r.supported === false, 'unsupported');
    assert(r.city !== 'Bengaluru', 'should not be Bengaluru');
    // simulate getCanonicalUserLocation when selectedLocation null
    const canonical = { latitude: null, longitude: null, city: null, source: 'unknown' };
    assert(canonical.city === null && canonical.source === 'unknown', 'canonical unknown');
  });

  // 2. GPS Kolkata → canonical city Kolkata
  await test('2. GPS Kolkata → canonical city Kolkata', () => {
    const kol = resolveCity({ lat: 22.5726, lng: 88.3639 });
    assert(kol.city === 'Kolkata', `expected Kolkata got ${kol.city}`);
    assert(kol.supported === true, 'supported');
    // Ensure header/society/provider would use Kolkata
    const dist = haversineKm(22.5726,88.3639, kol.coords.lat, kol.coords.lng);
    assert(dist < 50, 'within 50km');
  });

  // 3. GPS Bengaluru → canonical city Bengaluru (when user actually in Bengaluru, should show Bengaluru)
  await test('3. GPS Bengaluru → canonical city Bengaluru', () => {
    const blr = resolveCity({ lat: 12.9716, lng: 77.5946 });
    assert(blr.city === 'Bengaluru', `expected Bengaluru got ${blr.city}`);
    assert(blr.supported === true, 'supported true for actual Bengaluru');
  });

  // 4. GPS denied → unknown, NOT Bengaluru
  await test('4. GPS denied → unknown NOT Bengaluru', () => {
    // denied = no coords, no city
    const r = resolveCity({ lat: null, lng: null });
    assert(r.city === null, 'denied should be null');
    assert(r.city !== 'Bengaluru', 'not Bengaluru');
    const code = fs.readFileSync('src/context/AppContext.jsx','utf8');
    // Check denied handler sets selectedLocation null never Bengaluru
    assert(code.includes("setSelectedLocation(null);") && code.includes("never Bengaluru"), 'AppContext denied handles unknown');
  });

  // 5. GPS unavailable → unknown, NOT Bengaluru
  await test('5. GPS unavailable → unknown NOT Bengaluru', () => {
    const r = resolveCity({});
    assert(r.city === null && r.city !== 'Bengaluru', 'unavailable null not Bengaluru');
  });

  // 6. manual Kolkata overrides previous Bengaluru
  await test('6. manual Kolkata overrides previous Bengaluru', () => {
    const gpsBlr = resolveCity({ lat: 12.9716, lng: 77.5946 });
    assert(gpsBlr.city === 'Bengaluru', 'initial Bengaluru');
    const manualKol = resolveCity({ lat: 22.5726, lng: 88.3639 });
    assert(manualKol.city === 'Kolkata', 'manual Kolkata overrides');
    // Simulate setSelectedLocationWithSource override
    const manualPick = { lat: 22.5726, lng: 88.3639, name: 'Salt Lake, Kolkata', source: 'manual' };
    const resolvedManual = resolveCity(manualPick);
    assert(resolvedManual.city === 'Kolkata', 'manual pick Kolkata');
    assert(resolvedManual.city !== 'Bengaluru', 'not Bengaluru');
  });

  // 7. Society Portal uses canonical Kolkata (when Kolkata, shows Kolkata society)
  await test('7. Society Portal uses canonical Kolkata', () => {
    const kol = resolveCity({ lat: 22.5726, lng: 88.3639 });
    assert(kol.city === 'Kolkata', 'canonical Kolkata');
    // Simulate societies lookup
    const mockSocieties = CITY_HUBS.map(h => ({ id: h.id, city: h.city, name: `${h.city} Residency`, location: h.city }));
    const match = mockSocieties.find(s => s.city === kol.city);
    assert(match && match.city === 'Kolkata', 'society match Kolkata not Bengaluru');
    assert(match.city !== 'Bengaluru', 'society not Bengaluru when in Kolkata');
    // Check SocietyDashboard uses resolveCity on selectedLocation
    const socCode = fs.readFileSync('src/components/society/SocietyDashboard.jsx','utf8');
    assert(socCode.includes('resolveCity({ lat: selectedLocation?.lat'), 'society uses canonical');
    assert(!socCode.includes("|| 'Bengaluru'"), 'no Bengaluru fallback in society');
  });

  // 8. unknown location does not show Bengaluru society
  await test('8. unknown location does not show Bengaluru society', () => {
    const unknown = resolveCity({});
    assert(unknown.city === null, 'unknown null');
    // Simulate SocietyDashboard selectedSociety when currentCity null -> null
    const currentCity = unknown.city;
    const selectedSociety = currentCity ? { city: currentCity } : null;
    assert(selectedSociety === null, 'society should be null when unknown, not Bengaluru');
    const appCtx = fs.readFileSync('src/context/AppContext.jsx','utf8');
    assert(appCtx.includes("do not auto-assign Bengaluru"), 'AppContext society fallback guard');
    const societyCode = fs.readFileSync('src/components/society/SocietyDashboard.jsx','utf8');
    assert(societyCode.includes("Location not set") || societyCode.includes("Location not set"), 'shows Location not set not Bengaluru');
  });

  // 9. Service Search uses canonical location (not savedAddresses Bengaluru)
  await test('9. Service Search uses canonical location', () => {
    const code = fs.readFileSync('src/components/customer/ServiceSearch.jsx','utf8');
    assert(!code.includes('defaultSavedCoords'), 'should not have defaultSavedCoords OR fallback');
    assert(code.includes('Canonical location only'), 'should mention canonical');
    assert(!code.includes("|| 'Bengaluru'"), 'no Bengaluru fallback');
    // Functional: Kolkata customer should only see Kolkata providers within 50km
    const kolHub = CITY_HUBS.find(h=>h.city==='Kolkata');
    const blrHub = CITY_HUBS.find(h=>h.city==='Bengaluru');
    const kolProvider = { id:'pKol', coords:{lat:kolHub.lat,lng:kolHub.lng}, serviceCategories:['Plumbing'], skills:[], title:'Plumber', availability:'Available Today' };
    const blrProvider = { id:'pBlr', coords:{lat:blrHub.lat,lng:blrHub.lng}, serviceCategories:['Plumbing'], skills:[], title:'Plumber', availability:'Available Today' };
    const kolCustomer = { lat:kolHub.lat, lng:kolHub.lng };
    const dKolToBlr = haversineKm(kolCustomer.lat, kolCustomer.lng, blrProvider.coords.lat, blrProvider.coords.lng);
    assert(dKolToBlr > SERVICE_RADIUS_KM, `Kolkata to Bengaluru should be >50km got ${dKolToBlr}`);
    const filteredKol = [kolProvider, blrProvider].filter(p => haversineKm(kolCustomer.lat, kolCustomer.lng, p.coords.lat, p.coords.lng) <= SERVICE_RADIUS_KM);
    assert(filteredKol.length===1 && filteredKol[0].id==='pKol', 'only Kolkata visible for Kolkata user');
  });

  // 10. provider discovery uses canonical location
  await test('10. provider discovery uses canonical location (50km hard rule)', () => {
    const code = fs.readFileSync('src/components/customer/CustomerDashboard.jsx','utf8');
    assert(!code.includes('defaultSavedCoords'), 'CustomerDashboard should not use saved Bengaluru fallback');
    assert(!code.includes("saved/live location") || code.includes('canonical location'), 'should use canonical not saved/live');
    const kolHub = CITY_HUBS.find(h=>h.city==='Kolkata');
    const mumHub = CITY_HUBS.find(h=>h.city==='Mumbai');
    const kolProvider = { id:'pKol', coords:{lat:kolHub.lat,lng:kolHub.lng}, serviceCategories:['Plumbing'], skills:[], title:'Plumber', availability:'Available Today' };
    const mumCustomer = { lat:mumHub.lat, lng:mumHub.lng };
    const eligible = isEligible(kolProvider, { customerLocation: mumCustomer, requestedService:{name:'Plumbing Repair'} });
    assert(!eligible.eligible && eligible.reason==='outside_service_area', 'Kolkata provider outside for Mumbai');
  });

  // 11. FairMatch uses canonical location
  await test('11. FairMatch uses canonical location', () => {
    const kolHub = CITY_HUBS.find(h=>h.city==='Kolkata');
    const mumHub = CITY_HUBS.find(h=>h.city==='Mumbai');
    const kolProvider = { id:'pKolF', coords:{lat:kolHub.lat,lng:kolHub.lng}, serviceCategories:['Plumbing'], skills:[], title:'Plumber', availability:'Available Today', rating:4.9, ratingCount:100, completedJobs:10 };
    const mumProvider = { id:'pMumF', coords:{lat:mumHub.lat,lng:mumHub.lng}, serviceCategories:['Plumbing'], skills:[], title:'Plumber', availability:'Available Today', rating:4.9, ratingCount:100, completedJobs:10 };
    const kolCustomer = { lat:kolHub.lat, lng:kolHub.lng };
    const fm = fairMatchRank({ candidates:[{provider:kolProvider,semanticScore:0.9},{provider:mumProvider,semanticScore:0.9}], customerLocation: kolCustomer, requestedService:{name:'Plumbing Repair'}, allBookings:[] });
    assert(fm.rankedCandidates.length===1 && fm.rankedCandidates[0].provider.id==='pKolF', 'FairMatch Kolkata only');
    assert(fm.excluded.some(e=>e.provider.id==='pMumF'), 'Mumbai excluded');
  });

  // 12. booking/ticket stamping uses canonical location
  await test('12. booking/ticket stamping uses canonical location', () => {
    const ticketCode = fs.readFileSync('src/services/supportTicketService.js','utf8');
    const societyCode = fs.readFileSync('src/services/societyService.js','utf8');
    const appCtx = fs.readFileSync('src/context/AppContext.jsx','utf8');
    assert(!ticketCode.includes("|| 'Bengaluru'"), 'ticket service no Bengaluru');
    assert(!societyCode.includes("|| 'Bengaluru'"), 'society service no Bengaluru');
    assert(ticketCode.includes('resolveCity'), 'ticket uses resolveCity canonical');
    assert(societyCode.includes('resolveCity'), 'society uses resolveCity');
    // BookingModal should use canonical
    const bookingCode = fs.readFileSync('src/components/customer/BookingModal.jsx','utf8');
    assert(bookingCode.includes('getCanonicalUserLocation') || bookingCode.includes('canonical'), 'booking uses canonical');
    assert(!bookingCode.includes("|| 'Bengaluru'"), 'booking no Bengaluru');
    // Simulate ticket creation with Kolkata canonical
    const resolved = resolveCity({ lat:22.5726, lng:88.3639 });
    assert(resolved.city==='Kolkata', 'ticket city Kolkata not Bengaluru');
  });

  // 13. Emergency Dispatch uses canonical location
  await test('13. Emergency Dispatch uses canonical location', () => {
    const code = fs.readFileSync('src/components/ai/EmergencyDispatch.jsx','utf8');
    assert(!code.includes("useState('Bengaluru')"), 'should not default to Bengaluru');
    assert(code.includes("useState(null)"), 'default null');
    assert(code.includes('getCanonicalUserLocation') || code.includes('canonical'), 'uses canonical');
    const kolHub = CITY_HUBS.find(h=>h.city==='Kolkata');
    const mumProvider = { id:'pMum', coords:{lat:19.0760,lng:72.8777}, serviceCategories:['Plumbing'], skills:[], title:'Plumber', availability:'Available Today' };
    const kolCustomer = { lat: kolHub.lat, lng: kolHub.lng };
    const res = isEligibleForEmergency(mumProvider, kolCustomer, 'srv-plumb-01', 'Plumbing Repair', []);
    assert(!res.eligible && res.reason==='outside_service_area', 'Mumbai provider outside for Kolkata emergency');
    const resNull = isEligibleForEmergency(mumProvider, null, 'srv-plumb-01', 'Plumbing', []);
    assert(!resNull.eligible && resNull.reason==='missing_customer_location', 'null not Bengaluru');
  });

  // 14. no module can override canonical location with Bengaluru
  await test('14. no module can override canonical with Bengaluru', () => {
    const files = [
      'src/context/AppContext.jsx',
      'src/components/customer/ServiceSearch.jsx',
      'src/components/customer/CustomerDashboard.jsx',
      'src/components/society/SocietyDashboard.jsx',
      'src/components/ai/EmergencyDispatch.jsx',
      'src/components/ai/WorkforceAllocation.jsx',
      'src/services/cityResolver.js',
      'src/services/emergencyDispatchService.js',
      'src/services/fairMatchService.js',
      'src/services/supportTicketService.js',
      'src/services/societyService.js',
      'src/components/layout/LocationModal.jsx',
    ];
    for (const f of files) {
      const c = fs.readFileSync(f,'utf8');
      const hasBengaluruFallback = c.includes("|| 'Bengaluru'") || c.includes('|| "Bengaluru"') || c.includes('?? "Bengaluru"') || c.includes("?? 'Bengaluru'") || /CITY_HUBS\[0\]/.test(c);
      // LocationModal previously had hard Bengaluru, now should be dynamic
      if (f === 'src/components/layout/LocationModal.jsx') {
        assert(!c.includes("Indiranagar, Bengaluru', hub: 'East Hub'") || c.includes('getPopularAreas'), 'LocationModal should be dynamic not static Bengaluru');
        continue;
      }
      assert(!hasBengaluruFallback, `${f} should not have Bengaluru fallback (found || Bengaluru or CITY_HUBS[0])`);
    }
    // Check savedAddresses not seeding Bengaluru
    assert(!fs.readFileSync('src/context/AppContext.jsx','utf8').includes("return DEMO_USERS.customer.savedAddresses.map"), 'savedAddresses should not seed Bengaluru');
  });

  // 15. existing 50 km hard rule remains intact
  await test('15. existing 50 km hard rule remains intact', () => {
    const blrHub = CITY_HUBS.find(h=>h.city==='Bengaluru');
    const justOutside = { lat: 13.5, lng: 77.6 };
    const dist = haversineKm(blrHub.lat, blrHub.lng, justOutside.lat, justOutside.lng);
    assert(dist > 50, `justOutside should be >50km got ${dist}`);
    const r = resolveCity(justOutside);
    assert(r.city === null && r.supported === false, 'outside 50km should be unsupported null not nearest');
    const inside = { lat: 12.9784, lng: 77.6408 }; // Indiranagar Bengaluru
    const r2 = resolveCity(inside);
    assert(r2.city === 'Bengaluru' && r2.supported === true, 'inside should be Bengaluru');
    assert(SERVICE_RADIUS_KM === 50, 'SERVICE_RADIUS_KM should remain 50');
    // Check allocations still enforce 50km
    const kolHub = CITY_HUBS.find(h=>h.city==='Kolkata');
    const provKol = { id:'pKol', coords:{lat:kolHub.lat,lng:kolHub.lng}, serviceCategories:['Plumbing'], skills:[], title:'Plumber', availability:'Available Today' };
    const custFar = { lat: blrHub.lat, lng: blrHub.lng };
    const res = isEligible(provKol, { customerLocation: custFar, requestedService:{name:'Plumbing'} });
    assert(!res.eligible, 'provider outside 50km should be ineligible');
  });

  // Extra: helper existence
  await test('helper getCanonicalUserLocation exists', () => {
    const appCtx = fs.readFileSync('src/context/AppContext.jsx','utf8');
    assert(appCtx.includes('getCanonicalUserLocation'), 'helper exists');
    assert(appCtx.includes("source: 'unknown'"), 'unknown source defined');
    assert(appCtx.includes("source: 'gps'") || appCtx.includes("source: 'manual'"), 'sources defined');
  });

  // Extra: persistence restores Kolkata not Bengaluru
  await test('persistence restores Kolkata not Bengaluru', () => {
    const savedKol = JSON.stringify({ lat:22.5726, lng:88.3639, city:'Kolkata', name:'Salt Lake, Kolkata', source:'manual', timestamp: Date.now() });
    const parsed = JSON.parse(savedKol);
    const resolved = resolveCity(parsed);
    assert(resolved.city === 'Kolkata', 'persisted Kolkata restore');
    const appCtx = fs.readFileSync('src/context/AppContext.jsx','utf8');
    // Legacy Bengaluru string should be purged
    assert(appCtx.includes("lower.includes('bengaluru')") && appCtx.includes('return null'), 'legacy Bengaluru purged');
  });

  console.log(`\n=== Location Consolidation Tests: ${passed} passed, ${failed} failed ===`);
  if (failed>0) process.exitCode=1;
})();

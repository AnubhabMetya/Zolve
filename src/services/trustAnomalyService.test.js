// Deterministic tests for Trust & Anomaly — Feature 5 Stage 1
// Covers: normal LOW, volume, cancellation, rejection, workload, spike, multiple→HIGH, peer-aware, reasons, no mutation

import { evaluateTrust, TRUST_WEIGHTS, RISK_THRESHOLDS } from './trustAnomalyService.js';

function assert(cond, msg){ if(!cond) throw new Error(msg); }
function assertEqual(a,b,msg){ if(a!==b) throw new Error(`${msg}: expected ${b}, got ${a}`); }

let passed=0, failed=0;
function test(name, fn){ try{ fn(); console.log(`✓ ${name}`); passed++; } catch(e){ console.error(`✗ ${name}: ${e.message}`); failed++; } }

// Helper to build trust history rows
function makeRows(providerId, city, serviceId, dates, overrides={}) {
  return dates.map(date => ({
    provider_id: providerId,
    date,
    city,
    service_id: serviceId,
    service_name: serviceId,
    booking_count: overrides.booking_count ?? 1,
    completed_count: overrides.completed_count ?? 1,
    cancelled_count: overrides.cancelled_count ?? 0,
    rejected_count: overrides.rejected_count ?? 0,
    rating: overrides.rating ?? 4.7,
    active_jobs: overrides.active_jobs ?? 1,
    daily_earnings_proxy: 1000,
    ...overrides,
    provider_id: providerId,
    date,
    city,
    service_id: serviceId,
  }));
}
function buildHistoryCityService(city, serviceId, providerConfigs, dates) {
  let rows=[];
  for(const cfg of providerConfigs){
    const provRows = makeRows(cfg.id, city, serviceId, dates, cfg.overrides||{});
    // Allow per-provider overrides as function
    if (typeof cfg.gen === 'function') {
      const genRows = cfg.gen(dates, city, serviceId);
      rows.push(...genRows);
    } else {
      rows.push(...provRows);
    }
  }
  return rows;
}

const dates = Array.from({length:30}, (_,i)=>{
  const d = new Date(2026,6,5); // July 5
  d.setDate(d.getDate()+i);
  return d.toISOString().slice(0,10);
});

// 1. normal provider → LOW
test('1. normal provider → LOW', ()=>{
  const city='Bengaluru', service='srv-plumb-01';
  const providers = [
    {id:'prov-normal-01', overrides:{booking_count:1, cancelled_count:0, rejected_count:0, rating:4.7, active_jobs:1}},
    {id:'prov-normal-02', overrides:{booking_count:1, cancelled_count:0, rejected_count:0, rating:4.6, active_jobs:1}},
    {id:'prov-normal-03', overrides:{booking_count:1, cancelled_count:0, rejected_count:0, rating:4.8, active_jobs:1}},
    {id:'prov-target', overrides:{booking_count:1, cancelled_count:0, rejected_count:0, rating:4.7, active_jobs:1}},
  ];
  const history = buildHistoryCityService(city, service, providers, dates);
  const res = evaluateTrust({providerId:'prov-target', city, serviceId:service, trustHistory: history});
  assert(res.riskLevel==='LOW', `expected LOW got ${res.riskLevel} score ${res.anomalyScore}`);
  assert(res.anomalyScore < 40, `score ${res.anomalyScore} <40`);
});

// 2. high booking volume → elevated
test('2. high booking volume → elevated anomaly', ()=>{
  const city='Mumbai', service='srv-clean-01';
  const normal = Array.from({length:4}, (_,i)=> ({id:`prov-norm-${i}`, overrides:{booking_count:1, cancelled_count:0, rejected_count:0, rating:4.7, active_jobs:1}}));
  const history = buildHistoryCityService(city, service, [...normal, {id:'prov-high-vol', overrides:{booking_count:4, cancelled_count:0, rejected_count:0, rating:4.7, active_jobs:1}}], dates);
  const res = evaluateTrust({providerId:'prov-high-vol', city, serviceId:service, trustHistory: history});
  assert(res.scores.bookingVolume > 40, `volume score ${res.scores.bookingVolume} >40`);
  assert(res.anomalyScore > 20, `anomaly ${res.anomalyScore} elevated`);
  assert(res.reasons.some(r=>r.toLowerCase().includes('booking volume')), 'reason booking volume');
});

// 3. high cancellation → elevated
test('3. high cancellation → elevated anomaly', ()=>{
  const city='Kolkata', service='srv-plumb-01';
  const normal = Array.from({length:4}, (_,i)=> ({id:`prov-norm-${i}`, overrides:{booking_count:2, cancelled_count:0, rejected_count:0}}));
  const history = buildHistoryCityService(city, service, [...normal, {id:'prov-high-canc', overrides:{booking_count:2, cancelled_count:1, rejected_count:0}}], dates); // 50% cancel
  const res = evaluateTrust({providerId:'prov-high-canc', city, serviceId:service, trustHistory: history});
  assert(res.scores.cancellation > 40, `canc score ${res.scores.cancellation}`);
  assert(res.reasons.some(r=>r.toLowerCase().includes('cancellation')), 'cancellation reason');
});

// 4. high rejection → elevated
test('4. high rejection → elevated anomaly', ()=>{
  const city='Chennai', service='srv-elec-01';
  const normal = Array.from({length:4}, (_,i)=> ({id:`prov-norm-${i}`, overrides:{booking_count:2, cancelled_count:0, rejected_count:0}}));
  const history = buildHistoryCityService(city, service, [...normal, {id:'prov-high-rej', overrides:{booking_count:4, cancelled_count:0, rejected_count:1}}], dates); // 25% reject
  const res = evaluateTrust({providerId:'prov-high-rej', city, serviceId:service, trustHistory: history});
  assert(res.scores.rejection > 40, `rejection ${res.scores.rejection}`);
  assert(res.reasons.some(r=>r.toLowerCase().includes('rejection')), 'rejection reason');
});

// 5. abnormal workload → elevated
test('5. abnormal workload → elevated anomaly', ()=>{
  const city='Delhi NCR', service='srv-ac-01';
  const normal = Array.from({length:4}, (_,i)=> ({id:`prov-norm-${i}`, overrides:{booking_count:1, active_jobs:1}}));
  const history = buildHistoryCityService(city, service, [...normal, {id:'prov-high-work', overrides:{booking_count:1, active_jobs:5}}], dates);
  const res = evaluateTrust({providerId:'prov-high-work', city, serviceId:service, trustHistory: history});
  assert(res.scores.workload > 40, `workload ${res.scores.workload}`);
  assert(res.reasons.some(r=>r.toLowerCase().includes('workload')), 'workload reason');
});

// 6. sudden spike → elevated
test('6. sudden spike → elevated anomaly', ()=>{
  const city='Pune', service='srv-garden-01';
  // Build peer normal history flat
  const normal = Array.from({length:3}, (_,i)=> ({id:`prov-norm-${i}`, overrides:{booking_count:1, active_jobs:1}}));
  // For spike provider: first 23 days booking 1, last 7 days booking 5 (spike)
  const spikeGen = (dates, city, serviceId)=>{
    return dates.map((date, idx)=>{
      const booking = idx >= 23 ? 5 : 1;
      return {provider_id:'prov-spike', date, city, service_id:serviceId, service_name:serviceId, booking_count:booking, completed_count:booking, cancelled_count:0, rejected_count:0, rating:4.7, active_jobs:1, daily_earnings_proxy:1000};
    });
  };
  let rows=[];
  for(const p of normal) rows.push(...makeRows(p.id, city, service, dates, p.overrides));
  rows.push(...spikeGen(dates, city, service));
  const res = evaluateTrust({providerId:'prov-spike', city, serviceId:service, trustHistory: rows});
  assert(res.scores.suddenSpike > 30, `spike score ${res.scores.suddenSpike}`);
  assert(res.reasons.some(r=>r.toLowerCase().includes('sharply') || r.toLowerCase().includes('spike')), 'spike reason');
});

// 7. multiple anomalies → HIGH
test('7. multiple anomalies → HIGH', ()=>{
  const city='Hyderabad', service='srv-pest-01';
  const normal = Array.from({length:4}, (_,i)=> ({id:`prov-norm-${i}`, overrides:{booking_count:1, cancelled_count:0, rejected_count:0, rating:4.7, active_jobs:1}}));
  const history = buildHistoryCityService(city, service, [...normal, {id:'prov-multi', overrides:{booking_count:6, cancelled_count:2, rejected_count:2, rating:2.9, active_jobs:6}}], dates);
  const res = evaluateTrust({providerId:'prov-multi', city, serviceId:service, trustHistory: history});
  assert(res.riskLevel==='HIGH', `expected HIGH got ${res.riskLevel} score ${res.anomalyScore}`);
  assert(res.anomalyScore >=70, `score ${res.anomalyScore} >=70`);
  assert(res.reasons.length >=2, `reasons ${res.reasons.length} >=2`);
});

// 8. peer comparison is city/service aware
test('8. peer comparison is city/service aware', ()=>{
  const cityA='Bengaluru', cityB='Mumbai', service='srv-plumb-01', otherService='srv-clean-01';
  // Build history: Bengaluru plumbers normal volume 1, Mumbai plumbers high volume 5, Bengaluru cleaners high volume 5
  // Target is Bengaluru plumber with volume 1 — should be LOW when compared to Bengaluru plumber peers, not Mumbai
  let rows=[];
  // Bengaluru plumbers (peer group for target)
  for(let i=0;i<4;i++) rows.push(...makeRows(`prov-blr-plumb-${i}`, cityA, service, dates, {booking_count:1}));
  // Mumbai plumbers (different city, high volume)
  for(let i=0;i<4;i++) rows.push(...makeRows(`prov-mum-plumb-${i}`, cityB, service, dates, {booking_count:5}));
  // Bengaluru cleaners (different service, high volume)
  for(let i=0;i<4;i++) rows.push(...makeRows(`prov-blr-clean-${i}`, cityA, otherService, dates, {booking_count:5}));
  // Target
  rows.push(...makeRows('prov-target', cityA, service, dates, {booking_count:1}));
  const res = evaluateTrust({providerId:'prov-target', city:cityA, serviceId:service, trustHistory: rows});
  // Should be LOW because peer is Bengaluru plumbers at 1, not affected by Mumbai high volume
  assert(res.riskLevel==='LOW', `city/service aware: expected LOW got ${res.riskLevel} score ${res.anomalyScore}`);
  // Now test cross-city leakage: if we incorrectly compared to Mumbai, target 1 vs Mumbai 5 would still be low, but we test high volume case
  const highRows = makeRows('prov-high-blr', cityA, service, dates, {booking_count:4});
  const history2 = [...rows, ...highRows];
  const res2 = evaluateTrust({providerId:'prov-high-blr', city:cityA, serviceId:service, trustHistory: history2});
  assert(res2.scores.bookingVolume > 40, `high volume within same city/service should be flagged`);

  // Verify distant not compared: Mumbai provider with high volume should not affect Bengaluru evaluation
  assert(res2.riskLevel !== 'LOW' || res2.anomalyScore > res.anomalyScore, 'high volume should score higher than normal');
});

// 9. anomaly reasons are generated
test('9. anomaly reasons are generated for non-trivial', ()=>{
  const city='Patna', service='srv-move-01';
  const normal = Array.from({length:3}, (_,i)=> ({id:`prov-norm-${i}`, overrides:{booking_count:1}}));
  const history = buildHistoryCityService(city, service, [...normal, {id:'prov-reason', overrides:{booking_count:5, cancelled_count:1, rating:3.0, active_jobs:5}}], dates);
  const res = evaluateTrust({providerId:'prov-reason', city, serviceId:service, trustHistory: history});
  assert(res.reasons.length >0, 'reasons not empty');
  for(const r of res.reasons){
    assert(typeof r === 'string' && r.length>10, 'reason string');
    assert(!r.toLowerCase().includes('fraudulent'), 'avoid fraud language');
  }
  assert(res.reasons.some(r=>r.includes('review recommended') || r.includes('peer baseline') || r.includes('unusually')), 'human readable');
});

// 10. no mutation of source provider/booking data
test('10. no mutation of source data', ()=>{
  const city='Jaipur', service='srv-paint-01';
  const providers = [{id:'prov-a', booking_count:1}];
  const history = buildHistoryCityService(city, service, [{id:'prov-a', overrides:{booking_count:1}}], dates);
  const before = JSON.stringify(history);
  const res = evaluateTrust({providerId:'prov-a', city, serviceId:service, trustHistory: history});
  assertEqual(JSON.stringify(history), before, 'history not mutated');
  assert(res.provider_id==='prov-a', 'result ok');
});

// Additional: weights sum 100 and thresholds
test('weights sum 100 and risk thresholds', ()=>{
  const sum = Object.values(TRUST_WEIGHTS).reduce((a,b)=>a+b,0);
  assertEqual(sum, 100, 'weights sum 100');
  assertEqual(RISK_THRESHOLDS.LOW, 39, 'LOW threshold');
  assertEqual(RISK_THRESHOLDS.MEDIUM, 69, 'MEDIUM threshold');
});

console.log(`\n=== TrustAnomaly Tests: ${passed} passed, ${failed} failed ===`);
if (failed>0) process.exitCode=1;

// ====================================================================
// ZOLVE EMERGENCY DISPATCH — Feature 6 Stage 1
// Explainable recommendation engine, deterministic, no auto-booking
// Reuses: FairMatch, Workforce capacity, Trust, geographic rules
// ====================================================================

import { haversineKm, SERVICE_RADIUS_KM } from './locationService.js';
import { fairMatchRank } from './fairMatchService.js';
import { calculateProviderCapacity, getActiveCount, getCityHub, ACTIVE_STATUSES } from './workforceAllocationService.js';
import { evaluateTrust } from './trustAnomalyService.js';

// --------------------------------------------------------------------
// Emergency priority weights (centralized, sum 100)
// --------------------------------------------------------------------
export const EMERGENCY_WEIGHTS = {
  distance: 30,
  availability: 25,
  workload: 15,
  fairMatch: 15,
  trust: 10,
  fairness: 5,
};
const EMERGENCY_WEIGHT_SUM = Object.values(EMERGENCY_WEIGHTS).reduce((a,b)=>a+b,0);
if (EMERGENCY_WEIGHT_SUM !== 100) console.warn(`Emergency weights sum ${EMERGENCY_WEIGHT_SUM} !=100`);

// Distance → proximity score (hard 50km already excluded, closer = higher)
function proximityScore(distanceKm) {
  if (distanceKm == null) return 50;
  if (distanceKm <= 2) return 100;
  if (distanceKm <= 5) return 90;
  if (distanceKm <= 10) return 75;
  if (distanceKm <= 20) return 50;
  if (distanceKm <= 50) return 20;
  return 0;
}

// Availability → score (reuse workforce logic but simpler)
function availabilityScore(provider) {
  const avail = (provider.availability || '').toLowerCase();
  if (avail.includes('unavailable') || avail.includes('not available')) return 0;
  if (avail.includes('available')) return 100;
  // Where ambiguous, lower priority rather than invent
  if (avail.includes('emergency') || avail.includes('24')) return 95;
  return 60; // ambiguous → lower
}

// Workload suitability (reuse ACTIVE_STATUSES, capacity model)
// 0 active →100, 1→70, 2→40, 3→15, 4+→0
function workloadSuitabilityScore(activeCount) {
  if (activeCount === 0) return 100;
  if (activeCount === 1) return 70;
  if (activeCount === 2) return 40;
  if (activeCount === 3) return 15;
  return 0;
}

// Trust safety: invert anomalyScore → safetyScore
function trustSafetyScore(trustResult) {
  if (!trustResult) return 70; // neutral if no history
  const anomaly = trustResult.anomalyScore; // 0-100, higher = anomalous
  const safety = 100 - anomaly;
  // Clamp and ensure HIGH risk strongly penalized but not auto-ban
  return Math.max(0, Math.min(100, Math.round(safety)));
}

// Fairness small weighting: use FairMatch fairness concept → lower recent jobs = higher fairness
// For emergency, fairness is tie-breaker only (5%). Reuse FairMatch fairness logic simplified: if provider has low completedJobs / low recent, higher
function fairnessScoreForEmergency(provider, allProviders) {
  // Simple: normalize completedJobs within eligible set
  // Fewer completedJobs → higher fairness (to avoid star absorbing)
  const jobs = allProviders.map(p => Number(p.completedJobs || 0));
  const min = Math.min(...jobs);
  const max = Math.max(...jobs);
  const range = max - min || 1;
  const myJobs = Number(provider.completedJobs || 0);
  const normalized = (myJobs - min) / range; // 0 fewest, 1 most
  return Math.round(100 - normalized * 70); // 100 →30 like FairMatch
}

// --------------------------------------------------------------------
// Hard eligibility (BEFORE ranking)
// --------------------------------------------------------------------
function isQualifiedForService(provider, serviceId, serviceName) {
  const svcNameLower = (serviceName || '').toLowerCase();
  const svcIdLower = (serviceId || '').toLowerCase();
  const qualText = [
    ...(provider.serviceCategories || []),
    ...(provider.skills || []),
    provider.title || '',
  ].join(' ').toLowerCase();
  const map = {
    'srv-clean-01': ['cleaning', 'deep cleaning', 'sanitization'],
    'srv-plumb-01': ['plumbing', 'plumb', 'pipe', 'leak', 'drain', 'tap', 'faucet', 'sink', 'toilet'],
    'srv-elec-01': ['electrical', 'electric', 'wiring', 'mcb', 'switch', 'inverter'],
    'srv-carp-01': ['carpentry', 'carpenter', 'wood', 'wardrobe', 'furniture'],
    'srv-ac-01': ['ac', 'air conditioner', 'hvac', 'cooling', 'ac repair', 'ac servicing', 'appliance'],
    'srv-paint-01': ['painting', 'paint', 'waterproofing'],
    'srv-garden-01': ['gardening', 'garden', 'balcony greenery'],
    'srv-pest-01': ['pest', 'pest control'],
    'srv-cook-01': ['cooking', 'chef', 'meal preparation', 'home chef'],
    'srv-elder-01': ['elder', 'elder assistance', 'companionship'],
    'srv-move-01': ['moving', 'heavy lifting', 'shifting', 'movers'],
    'srv-soc-clean-01': ['society', 'common area', 'sanitization', 'apartment maintenance'],
    'srv-soc-tank-01': ['sump', 'tank', 'water sump', 'overhead tank'],
    'srv-soc-event-01': ['event', 'community event', 'sound', 'electrical setup'],
  };
  const required = map[svcIdLower] || [svcNameLower.split(' ')[0]];
  return required.some(kw => qualText.includes(kw));
}

export function isEligibleForEmergency(provider, customerLocation, serviceId, serviceName, bookings = []) {
  if (!provider || !provider.id) return { eligible: false, reason: 'invalid_provider_data' };
  if (!provider.coords || provider.coords.lat == null || provider.coords.lng == null) return { eligible: false, reason: 'invalid_provider_data' };
  // 1. Qualified
  if (!isQualifiedForService(provider, serviceId, serviceName)) return { eligible: false, reason: 'not_qualified' };
  // 2. Available
  const availScore = availabilityScore(provider);
  if (availScore === 0) return { eligible: false, reason: 'unavailable' };
  // 3. Within 50km
  if (!customerLocation || customerLocation.lat == null || customerLocation.lng == null) {
    // If no location, we cannot verify distance — treat as not eligible unless city fallback provided elsewhere
    // For emergency, require location; if missing, skip distance check but mark lower priority later
    // Here we require at least city hub fallback already resolved before calling
    return { eligible: false, reason: 'missing_customer_location' };
  }
  const dist = haversineKm(customerLocation.lat, customerLocation.lng, provider.coords.lat, provider.coords.lng);
  if (dist > SERVICE_RADIUS_KM) return { eligible: false, reason: 'outside_service_area', distanceKm: dist };
  // 4. Not completely capacity-constrained (4+ active → capacity 0)
  const activeCount = getActiveCount(provider.id, bookings);
  const capacity = calculateProviderCapacity(provider, activeCount);
  if (capacity === 0 && activeCount >= 4) return { eligible: false, reason: 'capacity_constrained', distanceKm: dist, activeCount, capacity };
  // If available but 0 capacity due to unavailable already handled, but high workload still eligible but low priority
  return { eligible: true, distanceKm: dist, activeCount, capacity };
}

// --------------------------------------------------------------------
// Resolve customer location: coordinates > city hub fallback
// --------------------------------------------------------------------
export function resolveCustomerLocation({ customerLocation, city }) {
  if (customerLocation && customerLocation.lat != null && customerLocation.lng != null) {
    return customerLocation;
  }
  if (city) {
    const hub = getCityHub(city);
    if (hub) return { lat: hub.lat, lng: hub.lng };
  }
  return null;
}

// --------------------------------------------------------------------
// Main dispatch
// --------------------------------------------------------------------
export function emergencyDispatch({
  service_id,
  service_name,
  customerLocation, // {lat,lng} or null
  city, // fallback if no coords
  emergencyType = 'general', // not used for scoring Stage1 but kept for future
  requestedTime = null,
  providers = [],
  bookings = [],
  trustHistory = null, // optional synthetic trust history for safety signal
}) {
  const resolvedLocation = resolveCustomerLocation({ customerLocation, city });
  const request = {
    service_id,
    service_name,
    customerLocation: resolvedLocation,
    city: city || (resolvedLocation ? 'custom' : null),
    emergencyType,
    requestedTime,
  };

  // Defensive copy (no mutation)
  const providersCopy = providers.slice();

  // Hard eligibility BEFORE ranking
  const eligible = [];
  const ineligible = [];
  for (const p of providersCopy) {
    const elig = isEligibleForEmergency(p, resolvedLocation, service_id, service_name, bookings);
    if (elig.eligible) {
      eligible.push({ provider: p, distanceKm: elig.distanceKm, activeCount: elig.activeCount, capacity: elig.capacity });
    } else {
      ineligible.push({ provider: p, reason: elig.reason, distanceKm: elig.distanceKm });
    }
  }

  // If no eligible, return NO_PROVIDER
  if (eligible.length === 0) {
    return {
      request,
      eligible_provider_count: 0,
      recommended_provider: null,
      alternatives: [],
      dispatch_status: 'NO_PROVIDER',
      emergency_priority_score: 0,
      estimated_distance_km: null,
      reasons: ['No eligible provider can currently respond within 50 km for this service.'],
      ineligible_count: ineligible.length,
    };
  }

  // Compute FairMatch scores for eligible (reuse, but not replacing)
  let fairMatchMap = new Map();
  try {
    const candidates = eligible.map(e => ({ provider: e.provider, semanticScore: 0.75 }));
    const fm = fairMatchRank({
      candidates,
      customerLocation: resolvedLocation,
      requestedService: { id: service_id, name: service_name },
      allBookings: bookings,
    });
    for (const r of fm.rankedCandidates) {
      fairMatchMap.set(r.provider.id, r.finalScore);
    }
    // For any eligible not in ranked (should be all), default 70
    for (const e of eligible) if (!fairMatchMap.has(e.provider.id)) fairMatchMap.set(e.provider.id, 70);
  } catch {
    for (const e of eligible) fairMatchMap.set(e.provider.id, 70);
  }

  // Compute trust safety scores if history available
  const trustMap = new Map();
  const trustRiskMap = new Map();
  if (trustHistory && Array.isArray(trustHistory) && trustHistory.length) {
    for (const e of eligible) {
      try {
        // Need city for peer; use provided city or hub fallback city — never Bengaluru when unknown
        const trustCity = city || getCityHub(city)?.city || null;
        const evalCity = city || null;
        if (!evalCity) {
          trustMap.set(e.provider.id, 70);
          trustRiskMap.set(e.provider.id, 'LOW');
          continue;
        }
        const tr = evaluateTrust({ providerId: e.provider.id, city: evalCity, serviceId: service_id, trustHistory });
        trustMap.set(e.provider.id, trustSafetyScore(tr));
        trustRiskMap.set(e.provider.id, tr.riskLevel);
      } catch {
        trustMap.set(e.provider.id, 70);
        trustRiskMap.set(e.provider.id, 'LOW');
      }
    }
  } else {
    for (const e of eligible) {
      trustMap.set(e.provider.id, 70);
      trustRiskMap.set(e.provider.id, 'LOW');
    }
  }

  // Compute per-provider emergency priority score
  const scored = eligible.map(e => {
    const distanceScore = proximityScore(e.distanceKm);
    const availScore = availabilityScore(e.provider);
    const workloadScore = workloadSuitabilityScore(e.activeCount);
    const fairScore = fairMatchMap.get(e.provider.id) ?? 70;
    const trustScore = trustMap.get(e.provider.id) ?? 70;
    const fairnessScore = fairnessScoreForEmergency(e.provider, eligible.map(x=>x.provider));

    const emergencyPriorityScore = Math.round(
      distanceScore * EMERGENCY_WEIGHTS.distance / 100 +
      availScore * EMERGENCY_WEIGHTS.availability / 100 +
      workloadScore * EMERGENCY_WEIGHTS.workload / 100 +
      fairScore * EMERGENCY_WEIGHTS.fairMatch / 100 +
      trustScore * EMERGENCY_WEIGHTS.trust / 100 +
      fairnessScore * EMERGENCY_WEIGHTS.fairness / 100
    );

    // Build human-readable reasons
    const reasons = [];
    reasons.push(`Qualified for ${service_name}, within ${e.distanceKm.toFixed(1)} km (50 km limit), available.`);

    if (e.activeCount === 0) reasons.push(`Low current workload (${e.activeCount} active jobs).`);
    else if (e.activeCount === 1) reasons.push(`Moderate workload (${e.activeCount} active job).`);
    else if (e.activeCount >= 2) reasons.push(`Priority reduced because current workload is high (${e.activeCount} active jobs).`);

    if (fairScore >= 80) reasons.push(`Strong FairMatch suitability (${fairScore}/100).`);
    else if (fairScore <= 50) reasons.push(`Lower FairMatch suitability (${fairScore}/100).`);

    const trustRisk = trustRiskMap.get(e.provider.id);
    if (trustRisk === 'HIGH') {
      reasons.push(`Dispatch priority reduced due to elevated anomaly risk (${trustRisk}, safety ${trustScore}/100).`);
    } else if (trustRisk === 'MEDIUM') {
      reasons.push(`Trust signal medium risk — review recommended.`);
    } else {
      reasons.push(`Low anomaly risk (${trustRisk}).`);
    }

    if (fairnessScore >= 85) reasons.push(`Fairness tie-breaker favored (fewer recent jobs).`);
    else if (fairnessScore <= 40) reasons.push(`Fairness: provider has high recent volume, but emergency suitability outweighs.`);

    // Final explainability summary
    let summary;
    if (e.activeCount >= 3 || trustRisk === 'HIGH') {
      summary = `Priority reduced because ${e.activeCount >=3 ? 'current workload is high' : ''}${e.activeCount>=3 && trustRisk==='HIGH' ? ' and ' : ''}${trustRisk==='HIGH' ? 'elevated anomaly risk' : ''}.`;
    } else {
      summary = `Recommended because the provider is qualified, available, ${e.distanceKm.toFixed(1)} km away, has low current workload, and has a low anomaly risk.`;
    }

    return {
      provider: e.provider,
      distanceKm: e.distanceKm,
      activeWorkload: e.activeCount,
      capacity: e.capacity,
      fairMatchScore: fairScore,
      trustRiskLevel: trustRisk,
      trustAnomalyScore: trustRisk === 'HIGH' ? 100 - trustScore : null, // approximate
      trustSafetyScore: trustScore,
      workloadScore,
      distanceScore,
      availabilityScore: availScore,
      fairnessScore,
      emergencyPriorityScore: Math.max(0, Math.min(100, emergencyPriorityScore)),
      reasons,
      summary,
    };
  });

  // Sort by emergencyPriorityScore desc (deterministic, then distance asc, then workload asc)
  scored.sort((a,b)=>{
    if (b.emergencyPriorityScore !== a.emergencyPriorityScore) return b.emergencyPriorityScore - a.emergencyPriorityScore;
    if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
    if (a.activeWorkload !== b.activeWorkload) return a.activeWorkload - b.activeWorkload;
    return b.fairMatchScore - a.fairMatchScore;
  });

  const recommended = scored[0];
  const alternatives = scored.slice(1, 4); // next 3

  // Dispatch status
  let dispatch_status;
  if (!recommended) dispatch_status = 'NO_PROVIDER';
  else {
    const hasCapacity = scored.some(s=> s.capacity > 0);
    const allConstrained = scored.every(s=> s.capacity <= 0.25 || s.activeWorkload >= 3);
    if (!hasCapacity || allConstrained) dispatch_status = 'LIMITED';
    else if (recommended.capacity === 0) dispatch_status = 'LIMITED';
    else dispatch_status = 'READY';
  }

  // Override to LIMITED if eligible but all have high workload or trust high
  if (scored.length > 0 && scored.every(s=> s.activeWorkload >=2) && dispatch_status==='READY') {
    // If all have moderate workload, still READY but could be LIMITED if all >=3
    if (scored.every(s=> s.activeWorkload >=3)) dispatch_status = 'LIMITED';
  }

  // Ensure alternatives do not include distant/unqualified (already filtered)
  return {
    request,
    eligible_provider_count: eligible.length,
    recommended_provider: recommended ? {
      provider_id: recommended.provider.id,
      provider_name: recommended.provider.name,
      service_qualification: recommended.provider.serviceCategories?.join(', ') || recommended.provider.title,
      distanceKm: Math.round(recommended.distanceKm*10)/10,
      activeWorkload: recommended.activeWorkload,
      capacity: recommended.capacity,
      fairMatchScore: recommended.fairMatchScore,
      trustRiskLevel: recommended.trustRiskLevel,
      trustAnomalyScore: recommended.trustAnomalyScore,
      emergencyPriorityScore: recommended.emergencyPriorityScore,
      reason: recommended.summary,
      reasons: recommended.reasons,
      provider: recommended.provider,
    } : null,
    alternatives: alternatives.map(a=> ({
      provider_id: a.provider.id,
      provider_name: a.provider.name,
      distanceKm: Math.round(a.distanceKm*10)/10,
      activeWorkload: a.activeWorkload,
      capacity: a.capacity,
      fairMatchScore: a.fairMatchScore,
      trustRiskLevel: a.trustRiskLevel,
      emergencyPriorityScore: a.emergencyPriorityScore,
      reason: a.summary,
      provider: a.provider,
    })),
    dispatch_status,
    emergency_priority_score: recommended ? recommended.emergencyPriorityScore : 0,
    estimated_distance_km: recommended ? Math.round(recommended.distanceKm*10)/10 : null,
    reasons: recommended ? recommended.reasons : [],
    ineligible_count: ineligible.length,
  };
}

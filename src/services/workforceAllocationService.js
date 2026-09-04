// ====================================================================
// ZOLVE WORKFORCE ALLOCATION — Feature 4 Stage 1
// Deterministic, explainable capacity-gap engine (no ML, no Supabase writes)
// Connects Feature 3 forecast (predicted_booking_count) with provider capacity + FairMatch
// ====================================================================

import { haversineKm, SERVICE_RADIUS_KM } from './locationService.js';
import { fairMatchRank } from './fairMatchService.js';

// --------------------------------------------------------------------
// City hubs (canonical 20, same as CITY_HUBS in mockData.js)
// --------------------------------------------------------------------
export const CITY_HUBS = [
  { city: 'Delhi NCR', lat: 28.6139, lng: 77.2090 },
  { city: 'Gurugram', lat: 28.4595, lng: 77.0266 },
  { city: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { city: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { city: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { city: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { city: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { city: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { city: 'Pune', lat: 18.5204, lng: 73.8567 },
  { city: 'Surat', lat: 21.1702, lng: 72.8311 },
  { city: 'Visakhapatnam', lat: 17.6868, lng: 83.2185 },
  { city: 'Coimbatore', lat: 11.0168, lng: 77.0555 },
  { city: 'Vadodara', lat: 22.3072, lng: 73.1812 },
  { city: 'Nagpur', lat: 21.1458, lng: 79.0882 },
  { city: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  { city: 'Lucknow', lat: 26.8467, lng: 80.9462 },
  { city: 'Kochi', lat: 9.9312, lng: 76.2673 },
  { city: 'Indore', lat: 22.7196, lng: 75.8577 },
  { city: 'Patna', lat: 25.5941, lng: 85.1376 },
  { city: 'Bhopal', lat: 23.2599, lng: 77.4126 },
];

export const ACTIVE_STATUSES = new Set([
  'CONFIRMED',
  'PROVIDER_ASSIGNED',
  'PROVIDER_ACCEPTED',
  'PROVIDER_ON_THE_WAY',
  'SERVICE_STARTED',
  'PAYMENT_PENDING',
]);

// --------------------------------------------------------------------
// Helper: city hub lookup
// --------------------------------------------------------------------
export function getCityHub(city) {
  return CITY_HUBS.find(h => h.city === city) || null;
}

// --------------------------------------------------------------------
// 1. Capacity formula — SINGLE REPLACEMENT POINT (Stage 1 deterministic)
// --------------------------------------------------------------------
/**
 * Calculate provider capacity for Stage 1 (deterministic, explainable).
 * Assumptions:
 * - unavailable provider → 0
 * - 0 active jobs → 1
 * - 1 active → 0.5
 * - 2 active → 0.25
 * - 3 active → 0.1
 * - 4+ active → 0
 * Keep this function isolated so real scheduling can replace it later.
 */
export function calculateProviderCapacity(provider, activeCount) {
  const avail = (provider.availability || '').toLowerCase();
  if (avail.includes('unavailable') || avail.includes('not available')) return 0;
  if (activeCount === 0) return 1;
  if (activeCount === 1) return 0.5;
  if (activeCount === 2) return 0.25;
  if (activeCount === 3) return 0.1;
  return 0;
}

// --------------------------------------------------------------------
// Helper: count active bookings for a provider
// --------------------------------------------------------------------
export function getActiveCount(providerId, allBookings = []) {
  return allBookings.filter(b => b.providerId === providerId && ACTIVE_STATUSES.has(b.bookingStatus)).length;
}

// --------------------------------------------------------------------
// Helper: qualification check (hard, reused from FairMatch logic simplified)
// --------------------------------------------------------------------
function isQualifiedForService(provider, serviceId, serviceName) {
  const svcNameLower = (serviceName || '').toLowerCase();
  const svcIdLower = (serviceId || '').toLowerCase();

  // Build provider qualification text
  const qualText = [
    ...(provider.serviceCategories || []),
    ...(provider.skills || []),
    provider.title || '',
  ].join(' ').toLowerCase();

  // For Stage 1 we use the same keyword mapping as FairMatch isEligible
  // Simplified: check if service name keywords appear in provider qual text
  // Map serviceId to required keywords
  const serviceKeywordMap = {
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

  const required = serviceKeywordMap[svcIdLower] || [svcNameLower.split(' ')[0]];
  return required.some(kw => qualText.includes(kw));
}

// --------------------------------------------------------------------
// Hard eligibility (must never be overridden)
// --------------------------------------------------------------------
export function isProviderEligibleForWorkforce(provider, city, serviceId, serviceName) {
  if (!provider || !provider.id) return { eligible: false, reason: 'invalid_provider_data' };
  if (!provider.coords || provider.coords.lat == null || provider.coords.lng == null) {
    return { eligible: false, reason: 'invalid_provider_data' };
  }
  // 1. Qualified
  if (!isQualifiedForService(provider, serviceId, serviceName)) {
    return { eligible: false, reason: 'not_qualified' };
  }
  // 2. City / 50km radius
  const hub = getCityHub(city);
  if (!hub) return { eligible: false, reason: 'invalid_city' };
  const dist = haversineKm(hub.lat, hub.lng, provider.coords.lat, provider.coords.lng);
  if (dist > SERVICE_RADIUS_KM) {
    return { eligible: false, reason: 'outside_service_area', distanceKm: dist };
  }
  // 3. Available
  const avail = (provider.availability || '').toLowerCase();
  if (avail.includes('unavailable') || avail.includes('not available')) {
    return { eligible: false, reason: 'unavailable' };
  }
  return { eligible: true, distanceKm: dist };
}

// --------------------------------------------------------------------
// Main allocation engine (deterministic, explainable)
// --------------------------------------------------------------------
export function allocateWorkforce({
  city,
  service_id,
  service_name,
  forecast_date, // YYYY-MM-DD
  forecast_demand, // predicted_booking_count (int)
  providers = [],
  bookings = [], // allBookings for workload
}) {
  // Defensive copy to ensure no mutation
  const providersCopy = providers; // read-only, we do not mutate

  const demand = Math.max(0, Math.round(Number(forecast_demand) || 0));

  // Find eligible providers (hard filter)
  const eligible = [];
  const ineligible = [];
  for (const p of providersCopy) {
    const elig = isProviderEligibleForWorkforce(p, city, service_id, service_name);
    if (elig.eligible) {
      const activeCount = getActiveCount(p.id, bookings);
      const capacity = calculateProviderCapacity(p, activeCount);
      eligible.push({ provider: p, activeCount, capacity, distanceKm: elig.distanceKm });
    } else {
      ineligible.push({ provider: p, reason: elig.reason, distanceKm: elig.distanceKm });
    }
  }

  // Sum available capacity
  const availableCapacity = eligible.reduce((sum, e) => sum + e.capacity, 0);
  // Round capacity to 2 decimals for display but keep raw for calc
  const availableCapacityRounded = Math.round(availableCapacity * 100) / 100;

  const capacityGap = Math.round((demand - availableCapacity) * 100) / 100;
  const utilization = availableCapacity === 0 ? null : Math.round((demand / availableCapacity) * 100) / 100;
  let status;
  if (capacityGap > 0) status = 'SHORTAGE';
  else if (capacityGap === 0) status = 'BALANCED';
  else status = 'SURPLUS';

  const additionalProvidersNeeded = Math.max(0, Math.ceil(capacityGap));

  // Allocation priority: use FairMatch where practical + workload fairness
  // Build FairMatch candidates from eligible providers
  let fairMatchResult = null;
  let ranked = [];
  if (eligible.length > 0) {
    const hub = getCityHub(city);
    const candidates = eligible.map(e => ({ provider: e.provider, semanticScore: 0.75 }));
    const requestedService = { id: service_id, name: service_name };
    try {
      fairMatchResult = fairMatchRank({
        candidates,
        customerLocation: hub ? { lat: hub.lat, lng: hub.lng } : null,
        requestedService,
        allBookings: bookings,
      });
      // fairMatchResult.rankedCandidates already sorted by finalScore
      // Now adjust for workload fairness: deprioritize high workload
      // Create workload-adjusted score: finalScore - (activeCount * 12)
      // This prevents small high-rated group absorbing all demand
      ranked = fairMatchResult.rankedCandidates.map(r => {
        const active = r.workloadActive != null ? r.workloadActive : eligible.find(e => e.provider.id === r.provider.id)?.activeCount || 0;
        const adjusted = r.finalScore - active * 12;
        return { ...r, activeCount: active, adjustedScore: adjusted };
      });
      ranked.sort((a, b) => {
        // Primary: adjustedScore desc, secondary: activeCount asc, tertiary: finalScore desc
        if (b.adjustedScore !== a.adjustedScore) return b.adjustedScore - a.adjustedScore;
        if (a.activeCount !== b.activeCount) return a.activeCount - b.activeCount;
        return b.finalScore - a.finalScore;
      });
    } catch (e) {
      // Fallback to simple workload sort if FairMatch fails
      ranked = eligible.map(e => ({
        provider: e.provider,
        finalScore: 70,
        workloadActive: e.activeCount,
        activeCount: e.activeCount,
        adjustedScore: 70 - e.activeCount * 12,
        distanceKm: e.distanceKm,
      })).sort((a, b) => a.activeCount - b.activeCount);
    }
  } else {
    ranked = [];
  }

  // Build provider_recommendations with explanations (human-readable, cooperative fairness)
  const providerRecommendations = ranked.map(r => {
    const provider = r.provider;
    const workload = r.activeCount != null ? r.activeCount : r.workloadActive;
    const fairScore = r.finalScore;
    const capacity = eligible.find(e => e.provider.id === provider.id)?.capacity ?? calculateProviderCapacity(provider, workload);
    let reason;
    let prioritized;
    if (capacity === 0) {
      reason = 'Provider deprioritized because current workload is high.';
      prioritized = false;
    } else if (workload >= 3) {
      reason = 'Provider deprioritized because current workload is high.';
      prioritized = false;
    } else if (workload >= 2) {
      reason = 'Provider deprioritized because current workload is high.';
      prioritized = false;
    } else if (workload <= 1) {
      reason = 'Provider prioritized because they are qualified, available, within 50 km, and currently have low workload.';
      prioritized = true;
    } else {
      reason = 'Provider prioritized because they are qualified, available, and within 50 km.';
      prioritized = true;
    }
    return {
      provider_id: provider.id,
      provider_name: provider.name,
      fairMatchScore: fairScore,
      workload,
      capacity,
      distanceKm: r.distanceKm,
      reason,
      prioritized,
      explanation: reason,
    };
  });

  // Allocated IDs: top N providers where N = min(eligible.length, demand) if demand>0, else all eligible?
  // For shortage, all eligible are allocated; for surplus, allocate demand number
  const allocatedCount = demand === 0 ? 0 : Math.min(ranked.length, Math.ceil(demand));
  // But if shortage, demand > capacity, we allocate all eligible
  const allocatedProviderIds = ranked.slice(0, demand > 0 ? Math.min(ranked.length, Math.ceil(demand)) : 0).map(r => r.provider.id);
  // If demand==0, no allocation; if shortage, all eligible are needed so allocate all
  // For clearer semantics, if shortage (capacityGap>0) allocate all eligible
  const finalAllocated = status === 'SHORTAGE' ? ranked.map(r => r.provider.id) : allocatedProviderIds;

  return {
    city,
    service_id,
    service_name,
    forecast_date,
    forecast_demand: demand,
    available_capacity: availableCapacityRounded,
    capacity_gap: capacityGap,
    utilization,
    status,
    additional_providers_needed: additionalProvidersNeeded,
    eligible_provider_count: eligible.length,
    allocated_provider_ids: finalAllocated,
    provider_recommendations: providerRecommendations,
    // debug
    eligible_details: eligible.map(e => ({ id: e.provider.id, capacity: e.capacity, activeCount: e.activeCount })),
    ineligible_count: ineligible.length,
  };
}

// --------------------------------------------------------------------
// Convenience: load forecast demand for a given city/service/date from predictions CSV data
// (For UI, pass parsed predictions array)
// --------------------------------------------------------------------
export function findForecastDemand(predictions, city, service_id, forecast_date) {
  const row = predictions.find(p => p.city === city && p.service_id === service_id && p.date === forecast_date);
  if (!row) return null;
  return {
    forecast_demand: Number(row.predicted_booking_count),
    actual: Number(row.actual_booking_count),
    service_name: row.service_name,
  };
}

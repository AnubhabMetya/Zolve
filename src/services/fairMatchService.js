// ====================================================================
// ZOLVE FAIRMATCH: Cooperative Provider Ranking — Feature 2
// Candidate providers (from Feature 1 semantic search) → FairMatch scoring → Recommended provider
// Isolated module for Feature 3 consumption. No auth/RLS/booking logic modified.
// ====================================================================

import { haversineKm, SERVICE_RADIUS_KM } from './locationService.js';

// --- Configurable Weights (must sum to 1.0) ---
export const FAIRMATCH_WEIGHTS = {
  skill: 0.30,
  distance: 0.20,
  availability: 0.15,
  reliability: 0.10,
  rating: 0.10,
  workload: 0.05,
  fairness: 0.10,
};

// Distance thresholds → normalized score (configurable)
export const DISTANCE_THRESHOLDS = [
  { maxKm: 2, score: 100 },
  { maxKm: 5, score: 90 },
  { maxKm: 10, score: 75 },
  { maxKm: 20, score: 50 },
  { maxKm: 50, score: 20 },
  { maxKm: Infinity, score: 0 },
];

// Workload thresholds → score (configurable)
export const WORKLOAD_THRESHOLDS = [
  { maxActive: 0, score: 100 },
  { maxActive: 1, score: 85 },
  { maxActive: 2, score: 70 },
  { maxActive: 3, score: 50 },
  { maxActive: 4, score: 25 },
  { maxActive: Infinity, score: 0 },
];

// --- Helpers ---
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function haversineDistanceKm(a, b) {
  if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  return haversineKm(a.lat, a.lng, b.lat, b.lng);
}

export function normalizeDistanceScore(distanceKm) {
  if (distanceKm == null) return null;
  for (const t of DISTANCE_THRESHOLDS) {
    if (distanceKm <= t.maxKm) return t.score;
  }
  return 0;
}

export function normalizeWorkloadScore(activeCount) {
  for (const t of WORKLOAD_THRESHOLDS) {
    if (activeCount <= t.maxActive) return t.score;
  }
  return 0;
}

export function normalizeSkillScore(semanticMatchScore) {
  // semanticMatchScore is 0..1 cosine (raw) or 0..100 confidence
  if (semanticMatchScore == null) return 70;
  let v = semanticMatchScore;
  if (v <= 1) v = v * 100;
  return clamp(Math.round(v), 0, 100);
}

export function normalizeRatingScore(provider, globalAvg = 4.6) {
  if (!provider || provider.rating == null) return 70;
  const r = Number(provider.rating);
  const count = Number(provider.ratingCount || 0);
  // Shrinkage toward global average: m=10 handles low-count inflation
  const m = 10;
  const adjusted = count > 0 ? (count * r + m * globalAvg) / (count + m) : globalAvg;
  const score = (adjusted / 5) * 100;
  return clamp(Math.round(score), 0, 100);
}

export function calculateReliabilityScore(provider, providerBookings = []) {
  // Prefer real cancellation data if available, else use completedJobs + ratingCount as proxy
  if (!provider) return { score: 70, insufficientData: true };
  const totalForProvider = providerBookings.length;
  if (totalForProvider > 0) {
    const cancelled = providerBookings.filter(b => b.bookingStatus === 'CANCELLED').length;
    const cancellationRate = cancelled / totalForProvider;
    const reliability = 1 - cancellationRate;
    // Also factor completedJobs if available (log scale 0-100)
    const completedJobs = Number(provider.completedJobs || 0);
    const jobsFactor = clamp(Math.log(completedJobs + 1) / Math.log(500) * 100, 0, 100);
    // Weighted: 70% cancellation reliability, 30% jobs factor if jobs data exists
    const base = reliability * 100;
    const blended = completedJobs > 0 ? Math.round(base * 0.7 + jobsFactor * 0.3) : Math.round(base);
    return { score: clamp(blended, 0, 100), insufficientData: false, cancellationRate, completedJobs };
  }
  // No booking history: fallback neutral with insufficient flag, use completedJobs if present
  if (provider.completedJobs != null) {
    const jobsFactor = clamp(Math.log(Number(provider.completedJobs) + 1) / Math.log(500) * 100, 0, 100);
    // Neutral 70 blended with jobsFactor to avoid fabricating
    const blended = Math.round(70 * 0.5 + jobsFactor * 0.5);
    return { score: clamp(blended, 40, 90), insufficientData: true, completedJobs: Number(provider.completedJobs) };
  }
  return { score: 70, insufficientData: true };
}

export function calculateAvailabilityScore(provider, requestedDate, requestedTime, providerBookings = []) {
  // If no date/time requested, neutral 80 (coarse availability)
  if (!requestedDate || !requestedTime) {
    // Use availability string coarse check
    const avail = (provider.availability || '').toLowerCase();
    if (avail.includes('available')) return 85;
    if (avail.includes('unavailable')) return 20;
    return 80;
  }
  // Check double-booking: same provider, same date+time active booking
  const isDoubleBooked = providerBookings.some(b =>
    b.providerId === provider.id &&
    b.scheduledDate === requestedDate &&
    b.scheduledTime === requestedTime &&
    !['SERVICE_COMPLETED', 'CANCELLED', 'REFUNDED'].includes(b.bookingStatus)
  );
  if (isDoubleBooked) return 0;
  // Coarse availability string check (do not rewrite booking system)
  const avail = (provider.availability || '').toLowerCase();
  // If availability explicitly says "Available Today" and requestedDate is today-ish, boost; else neutral
  // For now, treat most providers as available (85-100) unless double-booked
  if (avail.includes('available')) return 100;
  if (avail.includes('unavailable') || avail.includes('not available')) return 0;
  return 85;
}

export function calculateWorkloadScore(provider, allBookings = []) {
  const activeStatuses = new Set(['CONFIRMED', 'PROVIDER_ASSIGNED', 'PROVIDER_ACCEPTED', 'PROVIDER_ON_THE_WAY', 'SERVICE_STARTED', 'PAYMENT_PENDING']);
  const activeCount = allBookings.filter(b => b.providerId === provider.id && activeStatuses.has(b.bookingStatus)).length;
  const score = normalizeWorkloadScore(activeCount);
  return { score, activeCount };
}

export function calculateFairnessScores(candidates, allBookings = []) {
  // Recent jobs: bookings in last 7 days per provider + total completedJobs weighting
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recentCounts = candidates.map(({ provider }) => {
    const recent = allBookings.filter(b => {
      if (b.providerId !== provider.id) return false;
      const t = b.createdAt ? new Date(b.createdAt).getTime() : (b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0);
      return t >= sevenDaysAgo;
    }).length;
    // Also consider completedJobs as long-term distribution (scaled down)
    const completed = Number(provider.completedJobs || 0);
    // Composite: 70% recent + 30% normalized completed (log)
    const completedNorm = Math.log(completed + 1) / Math.log(600);
    const composite = recent * 0.7 + completedNorm * 3; // scale completed to ~ 0-2
    return { providerId: provider.id, recent, completed, composite };
  });

  const composites = recentCounts.map(c => c.composite);
  const min = Math.min(...composites);
  const max = Math.max(...composites);
  const range = max - min;

  // If all equal, neutral 70
  if (range < 0.01) {
    return candidates.map(() => 70);
  }
  // Normalize: fewest composite -> 100, most -> 30 (modest adjustment, not dominating)
  return recentCounts.map(c => {
    const normalized = (c.composite - min) / range; // 0 = fewest jobs, 1 = most jobs
    const score = Math.round(100 - normalized * 70); // 100 -> 30
    return clamp(score, 30, 100);
  });
}

// Hard eligibility filter (must NEVER be overridden by fairness or semantic similarity)
// FIX 1: Semantic retrieval is NOT qualification — verify actual serviceCategories/skills/title
export function isEligible(provider, context) {
  const { requestedService, requestedDate, requestedTime, customerLocation, allBookings = [] } = context;

  // 1. Not qualified for requested service: verify provider's actual qualification fields
  if (requestedService && requestedService.name) {
    const svcNameLower = (requestedService.name || '').toLowerCase();
    const svcSubLower = (requestedService.subcategory || '').toLowerCase();
    const svcCatLower = (requestedService.category || '').toLowerCase();
    const combinedLower = `${svcNameLower} ${svcSubLower} ${svcCatLower}`;

    // Build provider qualification text from existing fields (no invented certifications)
    const qualText = [
      ...(provider.serviceCategories || []),
      ...(provider.skills || []),
      provider.title || '',
    ].join(' ').toLowerCase();

    // Determine required keywords for the requested service (robust, not strict equality)
    let requiredKeywords = [];
    // Appliance Repair sub-types
    if (svcSubLower.includes('appliance') || svcNameLower.includes('appliance')) {
      if (svcNameLower.includes('washing machine') || svcNameLower.includes('washer') || combinedLower.includes('washing')) {
        requiredKeywords = ['washing machine', 'washer', 'washing', 'laundry', 'appliance'];
      } else if (svcNameLower.includes('refrigerator') || svcNameLower.includes('fridge') || svcNameLower.includes('freezer')) {
        requiredKeywords = ['refrigerator', 'fridge', 'freezer', 'appliance'];
      } else if (svcNameLower.includes('microwave') || svcNameLower.includes('magnetron')) {
        requiredKeywords = ['microwave', 'magnetron', 'appliance'];
      } else if (svcNameLower.includes('ac') || combinedLower.includes('air conditioner') || combinedLower.includes('hvac') || combinedLower.includes('cooling')) {
        requiredKeywords = ['ac', 'air conditioner', 'hvac', 'cooling', 'ac repair', 'ac servicing', 'appliance'];
      } else {
        requiredKeywords = ['appliance'];
      }
    } else if (svcSubLower.includes('plumbing') || svcNameLower.includes('plumbing') || svcNameLower.includes('leak') || svcNameLower.includes('tap') || svcNameLower.includes('pipe') || svcNameLower.includes('faucet')) {
      requiredKeywords = ['plumbing', 'plumb', 'pipe', 'tap', 'faucet', 'leak', 'drain', 'sink', 'toilet', 'flush'];
    } else if (svcSubLower.includes('electrical') || svcNameLower.includes('electrical') || svcNameLower.includes('wiring') || svcNameLower.includes('mcb')) {
      requiredKeywords = ['electrical', 'electric', 'wiring', 'mcb', 'switch', 'inverter'];
    } else if (svcSubLower.includes('cleaning') || svcNameLower.includes('cleaning')) {
      requiredKeywords = ['cleaning', 'deep cleaning', 'sanitization', 'sanitize'];
    } else if (svcSubLower.includes('carpentry') || svcNameLower.includes('carpentry') || svcNameLower.includes('furniture')) {
      requiredKeywords = ['carpentry', 'carpenter', 'wood', 'wardrobe', 'furniture'];
    } else if (svcSubLower.includes('painting') || svcNameLower.includes('painting')) {
      requiredKeywords = ['painting', 'paint', 'waterproofing'];
    } else if (svcSubLower.includes('gardening') || svcNameLower.includes('gardening')) {
      requiredKeywords = ['gardening', 'garden', 'balcony greenery'];
    } else if (svcSubLower.includes('pest')) {
      requiredKeywords = ['pest', 'pest control'];
    } else {
      // Fallback: use subcategory or first meaningful token of service name
      const fallback = svcSubLower || svcNameLower.split(' ')[0];
      requiredKeywords = [fallback];
    }

    const isQualified = requiredKeywords.some(kw => qualText.includes(kw));
    if (!isQualified) {
      return { eligible: false, reason: 'not_qualified' };
    }
  }

  // 2. Outside service area (hard rule per ServiceSearch 50km)
  if (customerLocation && provider.coords && customerLocation.lat != null) {
    const dist = haversineDistanceKm(customerLocation, provider.coords);
    if (dist != null && dist > SERVICE_RADIUS_KM) {
      return { eligible: false, reason: 'outside_service_area', distanceKm: dist };
    }
  }

  // 3. Double-booked for requested slot
  if (requestedDate && requestedTime) {
    const doubleBooked = allBookings.some(b =>
      b.providerId === provider.id &&
      b.scheduledDate === requestedDate &&
      b.scheduledTime === requestedTime &&
      !['SERVICE_COMPLETED', 'CANCELLED', 'REFUNDED'].includes(b.bookingStatus)
    );
    if (doubleBooked) {
      return { eligible: false, reason: 'double_booked' };
    }
  }

  // 4. Unavailable (explicit string)
  const avail = (provider.availability || '').toLowerCase();
  if (avail.includes('unavailable') || avail.includes('not available')) {
    return { eligible: false, reason: 'unavailable' };
  }

  return { eligible: true };
}

// Main FairMatch ranking
export function fairMatchRank({
  candidates, // array of { provider, semanticScore (0..1 or 0..100), rawScore? }
  customerLocation = null, // {lat,lng} or null
  requestedService = null, // {id,name,category,subcategory}
  requestedDate = null,
  requestedTime = null,
  allBookings = [],
  globalAvgRating = 4.6,
}) {
  if (!candidates || candidates.length === 0) {
    return { recommendedProvider: null, rankedCandidates: [], explanations: [] };
  }

  // Prepare candidateIds for eligibility leniency
  const candidateIds = candidates.map(c => c.provider?.id || c.id);

  // Fairness scores computed across all candidates (need all bookings)
  const fairnessScores = calculateFairnessScores(candidates.map(c => ({ provider: c.provider || c })), allBookings);

  let results = [];
  let excluded = [];

  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    const provider = cand.provider || cand;
    const semanticScore = cand.semanticScore != null ? cand.semanticScore : (cand.score != null ? cand.score : (cand.confidence != null ? cand.confidence / 100 : 0.5));

    // Hard eligibility first
    const eligibility = isEligible(provider, {
      requestedService,
      requestedDate,
      requestedTime,
      customerLocation,
      allBookings,
      candidateIds,
    });
    if (!eligibility.eligible) {
      excluded.push({ provider, reason: eligibility.reason, distanceKm: eligibility.distanceKm });
      continue;
    }

    // Component scores 0-100
    const skillScore = normalizeSkillScore(semanticScore);
    // Distance
    const distanceKm = haversineDistanceKm(customerLocation, provider.coords);
    let distanceScore = normalizeDistanceScore(distanceKm);
    const distanceMissing = distanceScore == null;
    if (distanceMissing) distanceScore = 70; // neutral if location unavailable

    const availabilityScore = calculateAvailabilityScore(provider, requestedDate, requestedTime, allBookings);
    if (availabilityScore === 0) {
      // Hard exclude unavailable (if availability 0 due to double-booking)
      excluded.push({ provider, reason: 'unavailable' });
      continue;
    }

    const reliabilityRes = calculateReliabilityScore(provider, allBookings.filter(b => b.providerId === provider.id));
    const reliabilityScore = reliabilityRes.score;

    const ratingScore = normalizeRatingScore(provider, globalAvgRating);

    const workloadRes = calculateWorkloadScore(provider, allBookings);
    const workloadScore = workloadRes.score;

    const fairnessScore = fairnessScores[i];

    // Weighted final, handle missing distance reneg
    let weights = { ...FAIRMATCH_WEIGHTS };
    let divisor = 1.0;
    if (distanceMissing) {
      // Reduce distance weight and renormalize remaining
      const distW = weights.distance;
      weights.distance = 0;
      divisor = 1 - distW;
      // Renormalize: scale remaining weights to sum 1
      if (divisor > 0) {
        for (const k of Object.keys(weights)) {
          if (k !== 'distance') weights[k] = weights[k] / divisor;
        }
      }
    }

    const finalScore = Math.round(
      skillScore * weights.skill +
      distanceScore * weights.distance +
      availabilityScore * weights.availability +
      reliabilityScore * weights.reliability +
      ratingScore * weights.rating +
      workloadScore * weights.workload +
      fairnessScore * weights.fairness
    );

    const explanation = buildExplanation({
      provider,
      skillScore,
      distanceScore,
      distanceKm,
      availabilityScore,
      reliabilityScore,
      ratingScore,
      workloadScore,
      fairnessScore,
      finalScore,
      workloadActive: workloadRes.activeCount,
      distanceMissing,
    });

    results.push({
      provider,
      semanticScore,
      skillScore,
      distanceScore,
      distanceKm,
      availabilityScore,
      reliabilityScore,
      ratingScore,
      workloadScore,
      fairnessScore,
      finalScore,
      explanation,
      reliabilityInsufficient: reliabilityRes.insufficientData,
      workloadActive: workloadRes.activeCount,
      weightsUsed: weights,
    });
  }

  // Sort descending by finalScore
  results.sort((a, b) => b.finalScore - a.finalScore);

  const recommendedProvider = results[0] || null;

  return {
    recommendedProvider,
    rankedCandidates: results,
    excluded,
    totalCandidates: candidates.length,
    evaluatedCount: results.length,
  };
}

function buildExplanation({ provider, skillScore, distanceScore, distanceKm, availabilityScore, reliabilityScore, ratingScore, workloadScore, fairnessScore, finalScore, workloadActive, distanceMissing }) {
  const reasons = [];
  if (skillScore >= 80) reasons.push('strong semantic skill match');
  else if (skillScore >= 60) reasons.push('good skill match');
  if (!distanceMissing && distanceScore >= 80) reasons.push(distanceKm < 2 ? 'very nearby' : 'nearby');
  else if (distanceMissing) reasons.push('location unavailable — distance not factored');
  if (availabilityScore >= 90) reasons.push('available at requested time');
  if (workloadScore >= 80) reasons.push('low current workload');
  else if (workloadScore <= 30) reasons.push('high workload — penalized');
  if (reliabilityScore >= 85) reasons.push('good reliability');
  if (fairnessScore >= 80) reasons.push('improves cooperative opportunity balance');
  else if (fairnessScore <= 40) reasons.push('recently received many jobs — fairness adjusted down');
  if (ratingScore >= 85) reasons.push('high customer rating');
  return reasons;
}

// Helper for UI: get display labels
export function getScoreLabel(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Low';
}

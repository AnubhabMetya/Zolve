// ====================================================================
// ZOLVE TRUST & ANOMALY DETECTION — Feature 5 Stage 1
// Explainable prototype, deterministic, peer-aware, no auto-suspension
// ====================================================================

export const TRUST_WEIGHTS = {
  bookingVolume: 20,
  cancellation: 20,
  rejection: 15,
  rating: 10,
  workload: 15,
  suddenSpike: 15,
  concentration: 5,
};
// Verify sum 100
const WEIGHT_SUM = Object.values(TRUST_WEIGHTS).reduce((a,b)=>a+b,0);
if (WEIGHT_SUM !== 100) console.warn(`Trust weights sum ${WEIGHT_SUM} !=100`);

export const RISK_THRESHOLDS = {
  LOW: 39,
  MEDIUM: 69,
  // HIGH 70-100
};

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a,b)=>a+b,0)/arr.length;
}
function std(arr, m = mean(arr)) {
  if (arr.length < 2) return 0;
  const variance = arr.reduce((s,v)=>s+ Math.pow(v - m, 2),0)/arr.length;
  return Math.sqrt(variance);
}
function clampScore(v) { return Math.max(0, Math.min(100, Math.round(v))); }

// --------------------------------------------------------------------
// Peer group: same city + same service_id
// --------------------------------------------------------------------
export function getPeerGroup(trustHistory, city, serviceId) {
  return trustHistory.filter(r => r.city === city && r.service_id === serviceId);
}
export function getProviderHistory(trustHistory, providerId) {
  return trustHistory.filter(r => r.provider_id === providerId);
}

// --------------------------------------------------------------------
// Signal scoring helpers (each returns {score 0-100, reason|null, metric})
// --------------------------------------------------------------------
function scoreBookingVolume(providerAvg, peerMean, peerStd) {
  if (peerMean === 0) return {score: 0, reason: null};
  const ratio = providerAvg / (peerMean || 1);
  const z = peerStd > 0.1 ? (providerAvg - peerMean) / peerStd : 0;
  let score = 0;
  let reason = null;
  if (ratio > 2.5 || z > 3) { score = 92; reason = "Booking volume is significantly above the peer baseline."; }
  else if (ratio > 1.8 || z > 2) { score = 72; reason = "Booking volume is notably above the peer baseline."; }
  else if (ratio > 1.4 || z > 1.2) { score = 45; reason = "Booking volume is moderately above the peer baseline."; }
  else if (ratio > 1.2) { score = 25; }
  else { score = 5; }
  return {score, reason, metric: {providerAvg, peerMean, peerStd, ratio, z}};
}

function scoreCancellation(providerRate, peerMeanRate, peerStd) {
  // providerRate 0-1
  const z = peerStd > 0.01 ? (providerRate - peerMeanRate) / peerStd : 0;
  let score = 0;
  let reason = null;
  if (providerRate > 0.35) { score = 95; reason = "Cancellation rate is unusually high for this provider's service category."; }
  else if (providerRate > 0.25 && z > 2) { score = 80; reason = "Cancellation rate is unusually high for this provider's service category."; }
  else if (providerRate > 0.18) { score = 55; reason = "Cancellation rate is elevated compared with peers."; }
  else if (providerRate > 0.12 && z > 1) { score = 35; reason = "Cancellation rate is slightly above peer baseline."; }
  else { score = 5; }
  // If peer mean also high, reduce anomaly (peer-aware)
  if (peerMeanRate > 0.20 && providerRate - peerMeanRate < 0.05) score = Math.min(score, 30);
  return {score, reason, metric: {providerRate, peerMeanRate, peerStd, z}};
}

function scoreRejection(providerRate, peerMeanRate, peerStd) {
  let score = 0;
  let reason = null;
  if (providerRate > 0.25) { score = 90; reason = "Rejection rate is unusually high — review recommended."; }
  else if (providerRate > 0.18) { score = 70; reason = "Rejection rate is elevated compared with peers."; }
  else if (providerRate > 0.10) { score = 40; reason = "Rejection rate is moderately above peer baseline."; }
  else { score = 5; }
  if (peerMeanRate > 0.15 && providerRate - peerMeanRate < 0.04) score = Math.min(score, 25);
  return {score, reason, metric: {providerRate, peerMeanRate, peerStd}};
}

function scoreRating(providerRating, peerMeanRating, peerStd) {
  // Lower rating is anomalous
  const diff = peerMeanRating - providerRating; // positive if provider worse
  let score = 0;
  let reason = null;
  if (providerRating < 3.0) { score = 90; reason = "Rating is significantly below the peer baseline — review recommended."; }
  else if (diff > 0.8) { score = 80; reason = "Rating is significantly below the peer baseline."; }
  else if (diff > 0.5) { score = 55; reason = "Rating is notably below peer baseline."; }
  else if (diff > 0.3) { score = 30; }
  else { score = 5; }
  return {score, reason, metric: {providerRating, peerMeanRating, peerStd, diff}};
}

function scoreWorkload(providerAvgActive, peerMeanActive, peerStd) {
  const z = peerStd > 0.1 ? (providerAvgActive - peerMeanActive) / peerStd : 0;
  let score = 0;
  let reason = null;
  if (providerAvgActive >= 4.5) { score = 92; reason = "Current workload is unusually high relative to comparable providers."; }
  else if (providerAvgActive >= 3.5 && z > 2) { score = 78; reason = "Current workload is unusually high relative to comparable providers."; }
  else if (providerAvgActive >= 2.5) { score = 50; reason = "Workload is elevated compared with peers."; }
  else if (z > 1.2) { score = 30; reason = "Workload is moderately above peer baseline."; }
  else { score = 5; }
  return {score, reason, metric: {providerAvgActive, peerMeanActive, peerStd, z}};
}

function scoreSuddenSpike(recentAvg, baselineAvg) {
  if (baselineAvg === 0) {
    if (recentAvg > 2) return {score: 70, reason: "Recent booking activity increased sharply compared with the provider's baseline.", metric: {recentAvg, baselineAvg, ratio: Infinity}};
    return {score: 5, reason: null, metric: {recentAvg, baselineAvg}};
  }
  const ratio = recentAvg / baselineAvg;
  let score = 0;
  let reason = null;
  if (ratio > 3.0) { score = 88; reason = "Recent booking activity increased sharply compared with the provider's baseline."; }
  else if (ratio > 2.0) { score = 65; reason = "Recent activity shows a notable spike versus baseline."; }
  else if (ratio > 1.5) { score = 35; reason = "Recent activity is moderately elevated versus baseline."; }
  else { score = 5; }
  return {score, reason, metric: {recentAvg, baselineAvg, ratio}};
}

function scoreConcentration(providerShare, peerCount) {
  // providerShare = provider bookings / total peer bookings for same date window (0-1)
  // Only relevant if share unusually high
  let score = 0;
  let reason = null;
  if (providerShare > 0.40) { score = 85; reason = "Booking concentration is unusually high relative to peer providers — review recommended."; }
  else if (providerShare > 0.25) { score = 55; reason = "Booking concentration is elevated — provider holds large share of local bookings."; }
  else if (providerShare > 0.15) { score = 25; }
  else { score = 5; }
  // If peer count small, concentration naturally higher, reduce
  if (peerCount < 5 && score > 30) score = Math.min(score, 30);
  return {score, reason, metric: {providerShare, peerCount}};
}

// --------------------------------------------------------------------
// Main evaluation (pure, no mutation)
// --------------------------------------------------------------------
export function evaluateTrust({
  providerId,
  city,
  serviceId,
  trustHistory, // full array
  windowDays = 30, // recent window for aggregate
}) {
  if (!providerId) throw new Error("providerId required");
  if (!city || !serviceId) throw new Error("city and serviceId required");
  if (!trustHistory || !trustHistory.length) throw new Error("trustHistory required");

  // Deep copy not needed; we do not mutate
  const providerRows = trustHistory.filter(r => r.provider_id === providerId);
  if (providerRows.length === 0) {
    return {
      provider_id: providerId,
      city,
      service_id: serviceId,
      anomalyScore: 0,
      riskLevel: "LOW",
      reasons: [],
      metrics: {},
      note: "No history for provider — insufficient data",
    };
  }

  // Use recent windowDays for evaluation (most recent dates)
  const sortedDates = Array.from(new Set(trustHistory.map(r => r.date))).sort();
  const recentDates = sortedDates.slice(-windowDays);
  const providerRecent = providerRows.filter(r => recentDates.includes(r.date));
  const peerGroup = getPeerGroup(trustHistory, city, serviceId).filter(r => recentDates.includes(r.date));

  // Peer providers distinct
  const peerProviderIds = Array.from(new Set(peerGroup.map(r => r.provider_id)));
  const peerCount = peerProviderIds.length;

  // Aggregate per provider for peer comparison (avg per day)
  // For peer baseline, compute per-provider averages then aggregate
  const peerPerProviderAvg = peerProviderIds.map(pid => {
    const rows = peerGroup.filter(r => r.provider_id === pid);
    const avgBooking = mean(rows.map(r => r.booking_count));
    const avgActive = mean(rows.map(r => r.active_jobs));
    const cancelRate = rows.reduce((s,r)=>s+r.cancelled_count,0) / Math.max(1, rows.reduce((s,r)=>s+r.booking_count,0));
    const rejectRate = rows.reduce((s,r)=>s+r.rejected_count,0) / Math.max(1, rows.reduce((s,r)=>s+r.booking_count,0));
    const avgRating = mean(rows.map(r => r.rating));
    return { pid, avgBooking, avgActive, cancelRate, rejectRate, avgRating, totalBooking: rows.reduce((s,r)=>s+r.booking_count,0) };
  });

  const providerAvgBooking = mean(providerRecent.map(r => r.booking_count));
  const providerCancelRate = providerRecent.reduce((s,r)=>s+r.cancelled_count,0) / Math.max(1, providerRecent.reduce((s,r)=>s+r.booking_count,0));
  const providerRejectRate = providerRecent.reduce((s,r)=>s+r.rejected_count,0) / Math.max(1, providerRecent.reduce((s,r)=>s+r.booking_count,0));
  const providerAvgRating = mean(providerRecent.map(r => r.rating));
  const providerAvgActive = mean(providerRecent.map(r => r.active_jobs));
  const providerTotalBooking = providerRecent.reduce((s,r)=>s+r.booking_count,0);
  const peerTotalBooking = peerGroup.reduce((s,r)=>s+r.booking_count,0);
  const providerShare = peerTotalBooking >0 ? providerTotalBooking / peerTotalBooking : 0;

  // Peer baselines
  const peerBookingAvgs = peerPerProviderAvg.map(p=>p.avgBooking);
  const peerCancelRates = peerPerProviderAvg.map(p=>p.cancelRate);
  const peerRejectRates = peerPerProviderAvg.map(p=>p.rejectRate);
  const peerRatings = peerPerProviderAvg.map(p=>p.avgRating);
  const peerActiveAvgs = peerPerProviderAvg.map(p=>p.avgActive);

  const peerMeanBooking = mean(peerBookingAvgs);
  const peerStdBooking = std(peerBookingAvgs, peerMeanBooking);
  const peerMeanCancel = mean(peerCancelRates);
  const peerStdCancel = std(peerCancelRates, peerMeanCancel);
  const peerMeanReject = mean(peerRejectRates);
  const peerStdReject = std(peerRejectRates, peerMeanReject);
  const peerMeanRating = mean(peerRatings);
  const peerStdRating = std(peerRatings, peerMeanRating);
  const peerMeanActive = mean(peerActiveAvgs);
  const peerStdActive = std(peerActiveAvgs, peerMeanActive);

  // Sudden spike: recent 7 days vs previous 14 days baseline for same provider
  const sortedProviderRecentByDate = providerRecent.slice().sort((a,b)=> a.date.localeCompare(b.date));
  // Need full provider history sorted for baseline
  const providerAllSorted = providerRows.slice().sort((a,b)=> a.date.localeCompare(b.date));
  // Take last 7 and previous 14
  const last7 = providerAllSorted.slice(-7);
  const prev14 = providerAllSorted.slice(-21, -7);
  const recentAvg = mean(last7.map(r=>r.booking_count));
  const baselineAvg = prev14.length ? mean(prev14.map(r=>r.booking_count)) : mean(providerAllSorted.slice(0, -7).map(r=>r.booking_count)) || peerMeanBooking;

  // Score each signal
  const sVol = scoreBookingVolume(providerAvgBooking, peerMeanBooking, peerStdBooking);
  const sCanc = scoreCancellation(providerCancelRate, peerMeanCancel, peerStdCancel);
  const sRej = scoreRejection(providerRejectRate, peerMeanReject, peerStdReject);
  const sRat = scoreRating(providerAvgRating, peerMeanRating, peerStdRating);
  const sWork = scoreWorkload(providerAvgActive, peerMeanActive, peerStdActive);
  const sSpike = scoreSuddenSpike(recentAvg, baselineAvg);
  const sConc = scoreConcentration(providerShare, peerCount);

  const scores = {
    bookingVolume: sVol.score,
    cancellation: sCanc.score,
    rejection: sRej.score,
    rating: sRat.score,
    workload: sWork.score,
    suddenSpike: sSpike.score,
    concentration: sConc.score,
  };

  const weighted = (
    scores.bookingVolume * TRUST_WEIGHTS.bookingVolume +
    scores.cancellation * TRUST_WEIGHTS.cancellation +
    scores.rejection * TRUST_WEIGHTS.rejection +
    scores.rating * TRUST_WEIGHTS.rating +
    scores.workload * TRUST_WEIGHTS.workload +
    scores.suddenSpike * TRUST_WEIGHTS.suddenSpike +
    scores.concentration * TRUST_WEIGHTS.concentration
  ) / 100;

  const anomalyScore = clampScore(weighted);
  let riskLevel;
  if (anomalyScore >= 70) riskLevel = "HIGH";
  else if (anomalyScore >= 40) riskLevel = "MEDIUM";
  else riskLevel = "LOW";

  const reasons = [];
  if (sVol.reason) reasons.push(sVol.reason);
  if (sCanc.reason) reasons.push(sCanc.reason);
  if (sRej.reason) reasons.push(sRej.reason);
  if (sRat.reason) reasons.push(sRat.reason);
  if (sWork.reason) reasons.push(sWork.reason);
  if (sSpike.reason) reasons.push(sSpike.reason);
  if (sConc.reason) reasons.push(sConc.reason);

  // Ensure every non-trivial anomaly has reason; if score medium/high but no reason, add generic
  if (reasons.length === 0 && anomalyScore >= 40) {
    reasons.push("Anomaly detected — review recommended.");
  }

  const metrics = {
    bookingVolume: { providerAvg: providerAvgBooking, peerMean: peerMeanBooking, peerStd: peerStdBooking, score: sVol.score },
    cancellationRate: { provider: providerCancelRate, peerMean: peerMeanCancel, score: sCanc.score },
    rejectionRate: { provider: providerRejectRate, peerMean: peerMeanReject, score: sRej.score },
    rating: { provider: providerAvgRating, peerMean: peerMeanRating, score: sRat.score },
    workload: { providerAvgActive, peerMean: peerMeanActive, score: sWork.score },
    suddenSpike: { recentAvg, baselineAvg, ratio: sSpike.metric.ratio, score: sSpike.score },
    concentration: { providerShare, peerCount, peerTotalBooking, providerTotalBooking, score: sConc.score },
    windowDays,
    providerRecentCount: providerRecent.length,
    peerGroupSize: peerCount,
  };

  return {
    provider_id: providerId,
    city,
    service_id: serviceId,
    anomalyScore,
    riskLevel,
    reasons,
    scores,
    metrics,
    // Supporting display metrics
    bookingVolume: providerAvgBooking,
    cancellationRate: providerCancelRate,
    rejectionRate: providerRejectRate,
    rating: providerAvgRating,
    currentWorkload: providerAvgActive,
    peerCount,
  };
}

// Helper for UI: evaluate all providers in a city/service
export function evaluateAllForCityService(trustHistory, city, serviceId) {
  const peerGroup = getPeerGroup(trustHistory, city, serviceId);
  const providerIds = Array.from(new Set(peerGroup.map(r=>r.provider_id)));
  return providerIds.map(pid => evaluateTrust({providerId: pid, city, serviceId, trustHistory}))
    .sort((a,b)=> b.anomalyScore - a.anomalyScore);
}

export function getRiskLabel(score) {
  if (score >=70) return "HIGH";
  if (score >=40) return "MEDIUM";
  return "LOW";
}

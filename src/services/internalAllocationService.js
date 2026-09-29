// Internal partner allocation — invisible to the customer.
// Reuses existing fairMatchRank + eligibility; never exposes candidates to UI.
// 50km hard radius: without a customer location allocation FAILS CLOSED
// (returns unassigned) instead of falling back to a far-away provider.
import { fairMatchRank } from './fairMatchService.js';

const hasFiniteCoords = (loc) =>
  !!loc && Number.isFinite(Number(loc.lat)) && Number.isFinite(Number(loc.lng));

export const allocatePartnerForBooking = ({ providers = [], bookings = [], customerLocation = null, requestedService = '', requestedDate = null, requestedTime = null } = {}) => {
  const candidates = (providers || []).map((provider) => ({ provider, semanticScore: 0.7, score: 70 }));
  if (candidates.length === 0) return { assigned: null, reason: 'no_candidates' };
  // Normalize: callers may pass the service name as a plain string.
  // fairMatch eligibility reads requestedService.name — a raw string would
  // silently skip the qualification check, so wrap it here.
  const service = typeof requestedService === 'string' ? { name: requestedService } : (requestedService || {});
  // Hard 50km gate: no customer coords → no assignment (never a far-city fallback).
  if (!hasFiniteCoords(customerLocation)) return { assigned: null, reason: 'no_customer_location' };
  try {
    const ranked = fairMatchRank({
      candidates,
      customerLocation,
      requestedService: service,
      requestedDate,
      requestedTime,
      allBookings: bookings || [],
    });
    if (ranked && ranked.recommendedProvider) {
      // fairMatchRank wraps the winner as { provider, ...scores } — unwrap to the provider only.
      const winner = ranked.recommendedProvider.provider || ranked.recommendedProvider;
      return { assigned: winner, reason: 'fairmatch', excluded: ranked.excluded?.length || 0 };
    }
    return { assigned: null, reason: 'no_eligible' };
  } catch (e) {
    console.warn('[allocation] fairMatchRank failed, no assignment (fail closed)', e?.message || e);
    return { assigned: null, reason: 'rank_failed' };
  }
};

// Customer-safe status language mapping (existing state machine keys preserved).
export const CUSTOMER_STATUS_LABELS = {
  CONFIRMED: 'Finding a Professional',
  MATCHING: 'Finding a Professional',
  PROVIDER_ASSIGNED: 'Professional Confirmed',
  PROVIDER_ACCEPTED: 'Professional Confirmed',
  PROVIDER_ON_THE_WAY: 'On the Way',
  SERVICE_STARTED: 'Service in Progress',
  SERVICE_COMPLETED: 'Completed',
};

export const customerStatusLabel = (status) => CUSTOMER_STATUS_LABELS[status] || 'Finding a Professional';

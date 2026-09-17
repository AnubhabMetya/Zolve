// ====================================================================
// INSURANCE & WELFARE SERVICE — 4% cooperative reserve → ₹5L cover
// On SERVICE_COMPLETED, auto-create coverage; provider can file claim
// LocalStorage fallback when Supabase not configured — jury demo ready
// ====================================================================
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const LS_KEY = 'zolve_insurance_v1';
const LS_CLAIMS = 'zolve_insurance_claims_v1';

function loadPol() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } }
function savePol(arr) { try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch {} }
function loadClaims() { try { return JSON.parse(localStorage.getItem(LS_CLAIMS) || '[]'); } catch { return []; } }
function saveClaims(arr) { try { localStorage.setItem(LS_CLAIMS, JSON.stringify(arr)); } catch {} }

export const INSURANCE_COVER_AMOUNT = 500000; // ₹5 Lakh
export const WELFARE_PCT = 0.04;

export const createCoverageForBooking = async ({ bookingId, providerId, providerName, city, amount }) => {
  const policy = {
    id: `pol_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    bookingId,
    providerId,
    providerName: providerName || providerId,
    city: city || '—',
    coverAmount: INSURANCE_COVER_AMOUNT,
    premiumFromReserve: Math.round((amount || 800) * WELFARE_PCT),
    status: 'active',
    createdAt: new Date().toISOString(),
    validTill: new Date(Date.now() + 365*24*60*60*1000).toISOString(),
  };
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('insurance_policies').insert({
        id: policy.id, booking_id: bookingId, provider_id: providerId, provider_name: providerName,
        cover_amount: policy.coverAmount, city, status: 'active'
      });
      if (error) throw error;
    } catch (e) { console.warn('insurance insert fallback to local', e); }
  }
  const arr = loadPol();
  arr.unshift(policy);
  savePol(arr);
  // broadcast for UI
  try { window.dispatchEvent(new CustomEvent('zolve:insurance', { detail: { type: 'POLICY_CREATED', policy } })); } catch {}
  return policy;
};

export const getPoliciesForProvider = (providerId) => {
  return loadPol().filter(p => p.providerId === providerId);
};
export const getAllPolicies = () => loadPol();

export const fileClaim = async ({ policyId, providerId, reason, amount }) => {
  const claim = {
    id: `clm_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    policyId,
    providerId,
    reason: reason || 'Medical / Tool replacement',
    amount: amount || 10000,
    status: 'under_review',
    filedAt: new Date().toISOString(),
  };
  if (isSupabaseConfigured()) {
    try { await supabase.from('insurance_claims').insert({ id: claim.id, policy_id: policyId, provider_id: providerId, reason, amount, status: 'under_review' }); } catch {}
  }
  const arr = loadClaims();
  arr.unshift(claim);
  saveClaims(arr);
  try { window.dispatchEvent(new CustomEvent('zolve:insurance', { detail: { type: 'CLAIM_FILED', claim } })); } catch {}
  return claim;
};

export const getClaimsForProvider = (providerId) => loadClaims().filter(c => c.providerId === providerId);
export const getAllClaims = () => loadClaims();

export const updateClaimStatus = async (claimId, status) => {
  const arr = loadClaims();
  const idx = arr.findIndex(c => c.id === claimId);
  if (idx >= 0) { arr[idx].status = status; arr[idx].updatedAt = new Date().toISOString(); saveClaims(arr); }
  if (isSupabaseConfigured()) { try { await supabase.from('insurance_claims').update({ status }).eq('id', claimId); } catch {} }
  return { success: true };
};

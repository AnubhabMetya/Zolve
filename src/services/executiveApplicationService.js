// ====================================================================
// EXECUTIVE APPLICATION SERVICE — Supabase persisted, RLS protected
// Table: public.executive_applications
// Status values: 'pending' | 'approved' | 'rejected'  (DB canonical)
// Frontend display: PENDING -> "Awaiting Approval", APPROVED -> "Application Approved", REJECTED -> "Application Rejected"
// Compatibility layer maps legacy 'pending_approval'/'active' to new values when reading local fallback.
// ====================================================================
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { EXECUTIVE_VERTICALS } from '../data/mockData'

const TABLE = 'executive_applications'

function mapDbRow(row) {
  if (!row) return null
  return {
    id: row.id,
    applicantId: row.applicant_id,
    applicantName: row.full_name,
    fullName: row.full_name,
    applicantEmail: row.email,
    email: row.email,
    applicantPhone: row.phone,
    phone: row.phone,
    vertical: row.vertical,
    services: row.services || (EXECUTIVE_VERTICALS.find(v => v.id === row.vertical)?.services || []),
    status: row.status, // 'pending'|'approved'|'rejected'
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    rejectionReason: row.rejection_reason,
    // legacy aliases for AppContext compatibility if needed
    created_at: row.created_at,
    applicant_id: row.applicant_id,
  }
}

function verticalServices(verticalId) {
  const v = EXECUTIVE_VERTICALS.find(x => x.id === verticalId)
  return v?.services || []
}

// Normalizes incoming formData shapes from JoinExecutivePage / AppContext
function normalizePayload(formData) {
  const vertical = formData.executiveVertical || formData.vertical || formData.selectedVertical?.id
  return {
    vertical,
    fullName: formData.fullName || formData.applicantName || formData.name || '',
    email: formData.gmailAddress || formData.applicantEmail || formData.email || '',
    phone: (formData.mobileNumber || formData.applicantPhone || formData.phone || '').toString().replace(/\D/g, '').slice(-10),
    services: formData.services || formData.requestedServices || verticalServices(vertical),
  }
}

export const broadcastExecutiveEvent = (event) => {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zolve:executive-sync', { detail: event }));
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('zolve_executive_channel');
        bc.postMessage(event);
        bc.close();
      }
    }
  } catch {}
};

function getLocalApps() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('zolve_exec_apps') : null;
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocalApps(apps) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('zolve_exec_apps', JSON.stringify(apps));
    }
  } catch {}
}

export const ExecutiveApplicationService = {
  broadcastExecutiveEvent,

  async submitApplication(formData, supaUser) {
    const { fullName, email, phone, vertical, services } = normalizePayload(formData)
    if (!fullName || !email || !phone || !vertical) {
      throw new Error('Missing required fields: fullName, email, phone, vertical')
    }
    const requiresApproval = vertical === 'community'
    const status = requiresApproval ? 'pending' : 'approved'

    const localResult = {
      id: `exec-app-${Date.now()}`,
      applicantId: supaUser?.id || `local-${Date.now()}`,
      fullName,
      applicantName: fullName,
      email,
      applicantEmail: email,
      phone,
      applicantPhone: phone,
      vertical,
      services,
      status,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      _fallback: true,
      requiresApproval,
    }

    if (!isSupabaseConfigured()) {
      const existing = getLocalApps();
      saveLocalApps([localResult, ...existing]);
      broadcastExecutiveEvent({ type: 'EXEC_APP_SUBMITTED', application: localResult });
      return localResult;
    }

    // Guest registration (no sign-in required) — persist with applicant_id = null so admin can review via RLS "Guests can insert ..."
    // When user is signed in, applicant_id = auth.uid() for ownership
    const effectiveApplicantId = supaUser?.id || null

    const row = {
      applicant_id: effectiveApplicantId,
      full_name: fullName,
      email: email.toLowerCase().trim(),
      phone,
      vertical,
      services,
      status,
      // approved_by/approved_at remain null for pending; for auto-approved set to applicant if signed in, else null
      ...(status === 'approved' ? { approved_by: effectiveApplicantId, approved_at: new Date().toISOString() } : {}),
    }

    try {
      const { data, error } = await supabase.from(TABLE).insert(row).select().single()
      if (error) throw error
      const mapped = mapDbRow(data)
      mapped.requiresApproval = requiresApproval
      const existing = getLocalApps();
      saveLocalApps([mapped, ...existing.filter(x => x.id !== mapped.id)]);
      broadcastExecutiveEvent({ type: 'EXEC_APP_SUBMITTED', application: mapped });
      return mapped
    } catch (err) {
      console.warn('[ExecutiveApplicationService] Supabase insert failed, saving locally:', err?.message || err);
      const existing = getLocalApps();
      saveLocalApps([localResult, ...existing]);
      broadcastExecutiveEvent({ type: 'EXEC_APP_SUBMITTED', application: localResult });
      return localResult;
    }
  },

  async fetchMyApplications(supaUser) {
    const localApps = getLocalApps();
    const myLocal = localApps.filter(a => {
      if (supaUser?.id && (a.applicantId === supaUser.id || a.applicant_id === supaUser.id)) return true;
      if (supaUser?.email && (a.email?.toLowerCase() === supaUser.email.toLowerCase() || a.applicantEmail?.toLowerCase() === supaUser.email.toLowerCase())) return true;
      return false;
    });

    if (!isSupabaseConfigured() || !supaUser?.id) return myLocal;

    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('applicant_id', supaUser.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      const remote = (data || []).map(mapDbRow);
      // Merge remote with local deduplicated
      const remoteIds = new Set(remote.map(r => r.id));
      const combined = [...remote, ...myLocal.filter(l => !remoteIds.has(l.id))];
      return combined;
    } catch (e) {
      console.warn('[ExecutiveApplicationService] fetchMyApplications remote error, returning local:', e?.message || e);
      return myLocal;
    }
  },

  async fetchMyLatestApplication(supaUser) {
    const apps = await this.fetchMyApplications(supaUser)
    return apps[0] || null
  },

  async fetchPendingApplications() {
    const localPending = getLocalApps().filter(a => a.status === 'pending' || a.status === 'pending_approval' || a.canonicalStatus === 'pending');

    if (!isSupabaseConfigured()) return localPending;

    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      const remote = (data || []).map(mapDbRow);
      const remoteIds = new Set(remote.map(r => r.id));
      const remoteEmails = new Set(remote.map(r => (r.email || '').toLowerCase()));
      // Include any local pending applications not yet in remote
      const missingLocal = localPending.filter(l => !remoteIds.has(l.id) && !remoteEmails.has((l.email || l.applicantEmail || '').toLowerCase()));
      return [...remote, ...missingLocal];
    } catch (e) {
      console.warn('[ExecutiveApplicationService] fetchPendingApplications remote error, returning local:', e?.message || e);
      return localPending;
    }
  },

  async fetchAllApplications() {
    const localApps = getLocalApps();
    if (!isSupabaseConfigured()) return localApps;

    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      const remote = (data || []).map(mapDbRow);
      const remoteIds = new Set(remote.map(r => r.id));
      return [...remote, ...localApps.filter(l => !remoteIds.has(l.id))];
    } catch (e) {
      return localApps;
    }
  },

  async approveApplication(applicationId, adminUser) {
    if (!isSupabaseConfigured()) {
      // Local fallback approval
      const existing = getLocalApps();
      const updated = existing.map(a => a.id === applicationId ? { ...a, status: 'approved', canonicalStatus: 'approved', approvedBy: adminUser?.id || 'admin', approvedAt: new Date().toISOString() } : a);
      saveLocalApps(updated);
      const match = updated.find(a => a.id === applicationId) || { id: applicationId, status: 'approved' };
      broadcastExecutiveEvent({ type: 'EXEC_APP_APPROVED', applicationId, application: match });
      return match;
    }

    let remoteUpdated = null;
    if (adminUser?.id) {
      try {
        const { data, error } = await supabase
          .from(TABLE)
          .update({
            status: 'approved',
            approved_by: adminUser.id,
            approved_at: new Date().toISOString(),
            rejection_reason: null,
          })
          .eq('id', applicationId)
          .select()
          .single()
        if (!error && data) remoteUpdated = mapDbRow(data);
      } catch (e) {
        console.warn('[approveApplication] Remote update failed, approving locally:', e?.message || e);
      }
    }

    // Always update local cache and broadcast
    const existing = getLocalApps();
    const updated = existing.map(a => a.id === applicationId ? { ...a, status: 'approved', canonicalStatus: 'approved', approvedBy: adminUser?.id || 'admin', approvedAt: new Date().toISOString() } : a);
    saveLocalApps(updated);
    const finalResult = remoteUpdated || updated.find(a => a.id === applicationId) || { id: applicationId, status: 'approved' };
    broadcastExecutiveEvent({ type: 'EXEC_APP_APPROVED', applicationId, application: finalResult });
    return finalResult;
  },

  async rejectApplication(applicationId, adminUser, rejectionReason) {
    if (!rejectionReason || !String(rejectionReason).trim()) throw new Error('Rejection reason required')

    if (!isSupabaseConfigured()) {
      const existing = getLocalApps();
      const updated = existing.map(a => a.id === applicationId ? { ...a, status: 'rejected', canonicalStatus: 'rejected', rejectionReason: String(rejectionReason).trim(), approvedBy: adminUser?.id || 'admin', approvedAt: new Date().toISOString() } : a);
      saveLocalApps(updated);
      const match = updated.find(a => a.id === applicationId) || { id: applicationId, status: 'rejected', rejectionReason };
      broadcastExecutiveEvent({ type: 'EXEC_APP_REJECTED', applicationId, rejectionReason, application: match });
      return match;
    }

    let remoteUpdated = null;
    if (adminUser?.id) {
      try {
        const { data, error } = await supabase
          .from(TABLE)
          .update({
            status: 'rejected',
            approved_by: adminUser.id,
            approved_at: new Date().toISOString(),
            rejection_reason: String(rejectionReason).trim(),
          })
          .eq('id', applicationId)
          .select()
          .single()
        if (!error && data) remoteUpdated = mapDbRow(data);
      } catch (e) {
        console.warn('[rejectApplication] Remote reject failed, rejecting locally:', e?.message || e);
      }
    }

    const existing = getLocalApps();
    const updated = existing.map(a => a.id === applicationId ? { ...a, status: 'rejected', canonicalStatus: 'rejected', rejectionReason: String(rejectionReason).trim(), approvedBy: adminUser?.id || 'admin', approvedAt: new Date().toISOString() } : a);
    saveLocalApps(updated);
    const finalResult = remoteUpdated || updated.find(a => a.id === applicationId) || { id: applicationId, status: 'rejected', rejectionReason };
    broadcastExecutiveEvent({ type: 'EXEC_APP_REJECTED', applicationId, rejectionReason, application: finalResult });
    return finalResult;
  },

  // Helper for UI display
  statusLabel(status) {
    const s = String(status || '').toLowerCase()
    if (s === 'pending' || s === 'pending_approval') return 'Awaiting Approval'
    if (s === 'approved' || s === 'active') return 'Application Approved'
    if (s === 'rejected') return 'Application Rejected'
    return s
  },

  statusBadge(status) {
    const s = String(status || '').toLowerCase()
    if (s === 'pending' || s === 'pending_approval') return 'PENDING'
    if (s === 'approved' || s === 'active') return 'APPROVED'
    if (s === 'rejected') return 'REJECTED'
    return s.toUpperCase()
  },
}

export default ExecutiveApplicationService

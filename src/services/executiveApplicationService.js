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

export const ExecutiveApplicationService = {
  async submitApplication(formData, supaUser) {
    const { fullName, email, phone, vertical, services } = normalizePayload(formData)
    if (!fullName || !email || !phone || !vertical) {
      throw new Error('Missing required fields: fullName, email, phone, vertical')
    }
    const requiresApproval = vertical === 'community'
    const status = requiresApproval ? 'pending' : 'approved'

    if (!isSupabaseConfigured()) {
      // Dev-only fallback when Supabase not configured (no DB available) — still local
      return {
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
    const { data, error } = await supabase.from(TABLE).insert(row).select().single()
    if (error) throw error
    const mapped = mapDbRow(data)
    mapped.requiresApproval = requiresApproval
    return mapped
  },

  async fetchMyApplications(supaUser) {
    if (!isSupabaseConfigured() || !supaUser?.id) return []
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('applicant_id', supaUser.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map(mapDbRow)
  },

  async fetchMyLatestApplication(supaUser) {
    const apps = await this.fetchMyApplications(supaUser)
    return apps[0] || null
  },

  async fetchPendingApplications() {
    if (!isSupabaseConfigured()) return []
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map(mapDbRow)
  },

  async fetchAllApplications() {
    if (!isSupabaseConfigured()) return []
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map(mapDbRow)
  },

  async approveApplication(applicationId, adminUser) {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    if (!adminUser?.id) throw new Error('Admin not authenticated')
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
    if (error) throw error
    return mapDbRow(data)
  },

  async rejectApplication(applicationId, adminUser, rejectionReason) {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    if (!adminUser?.id) throw new Error('Admin not authenticated')
    if (!rejectionReason || !String(rejectionReason).trim()) throw new Error('Rejection reason required')
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
    if (error) throw error
    return mapDbRow(data)
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

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { resolveCity } from './cityResolver.js';

const TABLE = 'support_tickets';

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    ticketCode: row.ticket_code,
    ticket_code: row.ticket_code,
    userId: row.user_id,
    user_id: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    userPhone: row.user_phone,
    userRole: row.user_role,
    bookingId: row.booking_id,
    bookingCode: row.booking_code,
    category: row.category,
    description: row.description,
    status: row.status,
    resolutionNotes: row.resolution_notes,
    resolution_notes: row.resolution_notes,
    assignedAdminId: row.assigned_admin_id,
    city: row.city,
    hub_id: row.hub_id,
    hubId: row.hub_id,
    lat: row.lat,
    lng: row.lng,
    pincode: row.pincode,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    created_at: row.created_at,
  };
}

function genTicketCode() {
  return `TCK-${Math.floor(1000 + Math.random() * 9000)}`;
}

export const SupportTicketService = {
  async createTicket({ bookingCode, bookingId, category, description, city, hub_id, lat, lng, pincode, selectedLocation }, supaUser, supaProfile) {
    if (!isSupabaseConfigured() || !supaUser?.id) throw new Error('Supabase not configured or not authenticated');
    if (!category || !String(description || '').trim()) throw new Error('Category and description required');
    // Resolve city via both selectedLocation coords + text
    const resolved = resolveCity({
      lat: lat ?? selectedLocation?.lat,
      lng: lng ?? selectedLocation?.lng,
      pincode,
      name: selectedLocation?.name,
      text: city || selectedLocation?.name || description,
    });
    const finalCity = city || resolved.city;
    const finalHubId = hub_id || resolved.hub_id;
    const finalLat = lat ?? selectedLocation?.lat ?? resolved.coords?.lat ?? null;
    const finalLng = lng ?? selectedLocation?.lng ?? resolved.coords?.lng ?? null;
    const finalPincode = pincode || resolved.pincode || null;

    const row = {
      ticket_code: genTicketCode(),
      user_id: supaUser.id,
      user_name: supaProfile?.full_name || supaUser?.user_metadata?.full_name || supaUser?.email?.split('@')[0] || 'User',
      user_email: supaUser.email || supaProfile?.email || null,
      user_phone: supaProfile?.phone || supaUser?.user_metadata?.phone || null,
      user_role: supaProfile?.role || 'customer',
      booking_id: bookingId || null,
      booking_code: bookingCode || null,
      category,
      description: String(description).trim(),
      status: 'open',
      city: finalCity,
      hub_id: finalHubId,
      lat: finalLat,
      lng: finalLng,
      pincode: finalPincode,
    };
    const { data, error } = await supabase.from(TABLE).insert(row).select().single();
    if (error) throw error;
    return mapRow(data);
  },

  async fetchMyTickets(supaUser) {
    if (!isSupabaseConfigured() || !supaUser?.id) return [];
    const { data, error } = await supabase.from(TABLE).select('*').eq('user_id', supaUser.id).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapRow);
  },

  async fetchAllTicketsAdmin(filters = {}) {
    if (!isSupabaseConfigured()) return [];
    let query = supabase.from(TABLE).select('*').order('created_at', { ascending: false });
    if (filters.city && filters.city !== 'All') query = query.eq('city', filters.city);
    if (filters.status && filters.status !== 'All') query = query.eq('status', filters.status);
    if (filters.category && filters.category !== 'All') query = query.eq('category', filters.category);
    const { data, error } = await query;
    if (error) throw error;
    let rows = (data || []).map(mapRow);
    if (filters.search) {
      const s = String(filters.search).toLowerCase();
      rows = rows.filter(r => (r.ticketCode?.toLowerCase().includes(s) || r.userName?.toLowerCase().includes(s) || r.userEmail?.toLowerCase().includes(s) || r.description?.toLowerCase().includes(s) || r.city?.toLowerCase().includes(s)));
    }
    return rows;
  },

  async updateTicketStatus(ticketId, { status, resolution_notes }, adminUser) {
    if (!isSupabaseConfigured() || !adminUser?.id) throw new Error('Admin not authenticated');
    if (!['open','under_review','resolved','dismissed'].includes(status)) throw new Error('Invalid status');
    const patch = { status, updated_at: new Date().toISOString(), assigned_admin_id: adminUser.id };
    if (resolution_notes != null) patch.resolution_notes = resolution_notes;
    const { data, error } = await supabase.from(TABLE).update(patch).eq('id', ticketId).select().single();
    if (error) throw error;
    return mapRow(data);
  },
};

export default SupportTicketService;

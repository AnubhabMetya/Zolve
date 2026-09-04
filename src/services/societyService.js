import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { resolveCity } from './cityResolver.js';

export const SocietyService = {
  async fetchAllSocieties() {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase.from('societies').select('*').order('city', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async fetchSocietiesByCity(city) {
    if (!city || city === 'All') return this.fetchAllSocieties();
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase.from('societies').select('*').eq('city', city).order('name');
    if (error) throw error;
    return data || [];
  },

  async fetchSocietyById(id) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase.from('societies').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async fetchSocietyRequests({ city, society_id } = {}) {
    if (!isSupabaseConfigured()) return [];
    let q = supabase.from('society_requests').select('*').order('created_at', { ascending: false });
    if (city && city !== 'All') q = q.eq('city', city);
    if (society_id) q = q.eq('society_id', society_id);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async fetchMySocietyRequests(supaUser) {
    if (!isSupabaseConfigured() || !supaUser?.id) return [];
    const { data, error } = await supabase.from('society_requests').select('*').eq('requester_id', supaUser.id).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createSocietyRequest({ society_id, society_name, city, hub_id, unit_or_block, service_type, priority, description, lat, lng, pincode, selectedLocation }, supaUser, supaProfile) {
    if (!isSupabaseConfigured() || !supaUser?.id) throw new Error('Not authenticated');
    if (!unit_or_block || !description) throw new Error('Unit and description required');
    // Resolve society if not provided: use city resolver
    let finalSocietyId = society_id;
    let finalSocietyName = society_name;
    let finalCity = city;
    let finalHubId = hub_id;

    if (!finalSocietyId) {
      const resolved = resolveCity({ lat: lat ?? selectedLocation?.lat, lng: lng ?? selectedLocation?.lng, pincode, name: selectedLocation?.name, text: city || selectedLocation?.name });
      finalCity = finalCity || resolved.city;
      finalHubId = finalHubId || resolved.hub_id;
      // fetch society for city
      const societies = await this.fetchSocietiesByCity(finalCity);
      if (societies.length) {
        finalSocietyId = societies[0].id;
        finalSocietyName = societies[0].name;
        finalCity = societies[0].city;
        finalHubId = societies[0].hub_id;
      } else {
        throw new Error('No society found for city ' + finalCity);
      }
    } else if (!finalCity || !finalSocietyName) {
      const soc = await this.fetchSocietyById(finalSocietyId);
      if (soc) {
        finalCity = soc.city;
        finalHubId = soc.hub_id;
        finalSocietyName = soc.name;
      }
    }

    const resolved = resolveCity({ lat: lat ?? selectedLocation?.lat, lng: lng ?? selectedLocation?.lng, pincode, name: selectedLocation?.name, text: finalCity });
    const row = {
      society_id: finalSocietyId,
      society_name: finalSocietyName,
      city: finalCity,
      hub_id: finalHubId || resolved.hub_id,
      requester_id: supaUser.id,
      requester_name: supaProfile?.full_name || supaUser?.email?.split('@')[0] || 'User',
      unit_or_block: String(unit_or_block).trim(),
      service_type: service_type || 'General',
      priority: priority || 'Normal',
      description: String(description).trim(),
      status: 'PENDING',
      lat: lat ?? selectedLocation?.lat ?? resolved.coords?.lat ?? null,
      lng: lng ?? selectedLocation?.lng ?? resolved.coords?.lng ?? null,
      pincode: pincode || resolved.pincode || null,
    };
    const { data, error } = await supabase.from('society_requests').insert(row).select().single();
    if (error) throw error;
    return data;
  },

  async updateRequestStatus(requestId, { status, provider_id, assigned_provider_name }, adminUser) {
    if (!isSupabaseConfigured() || !adminUser?.id) throw new Error('Admin not authenticated');
    if (!['PENDING','ASSIGNED','IN_PROGRESS','SCHEDULED','COMPLETED','CANCELLED'].includes(status)) throw new Error('Invalid status');
    const patch = { status, updated_at: new Date().toISOString() };
    if (provider_id !== undefined) patch.provider_id = provider_id;
    if (assigned_provider_name !== undefined) patch.assigned_provider_name = assigned_provider_name;
    const { data, error } = await supabase.from('society_requests').update(patch).eq('id', requestId).select().single();
    if (error) throw error;
    return data;
  },
};

export default SocietyService;

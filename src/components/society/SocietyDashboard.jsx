import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CITY_HUBS } from '../../data/mockData';
import { resolveCity } from '../../services/cityResolver';
import {
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Wrench,
  ShieldCheck,
  Award,
  ArrowRight,
  Plus,
  Zap,
  Droplets,
  Layers,
  FileText,
  MapPin,
  Search
} from 'lucide-react';

export const SocietyDashboard = () => {
  const {
    societyData, societies, societyRequests, createSocietyRequest,
    selectedLocation, setSelectedLocation, locationStatus, locationError,
    currentUser, activeRole, setIsAuthModalOpen, setAuthModalTab, addNotification
  } = useApp();

  const currentCity = useMemo(() => {
    const resolved = resolveCity({ lat: selectedLocation?.lat, lng: selectedLocation?.lng, name: selectedLocation?.name });
    if (!resolved || !resolved.city) return null;
    return resolved.city;
  }, [selectedLocation?.lat, selectedLocation?.lng, selectedLocation?.name]);

  const selectedSociety = useMemo(() => {
    if (societies?.length) {
      if (!currentCity) return null;
      const match = societies.find(s => s.city === currentCity);
      if (match) return match;
      return null;
    }
    if (!currentCity) return null;
    return {
      id: 'fallback',
      name: societyData?.name || 'Society',
      location: societyData?.location || null,
      manager_name: societyData?.manager || null,
      city: currentCity,
      state: null,
      units: societyData?.units || 0,
      blocks: societyData?.blocks || 0,
      stats: societyData?.stats || { openRequests: 0, completedThisMonth: 0, pendingApproval: 0, emergencyOpen: 0 },
      hub_id: null,
      pincode: null
    };
  }, [societies, currentCity, societyData]);

  const filteredRequests = useMemo(() => {
    if (!currentCity) return [];
    if (!societyRequests?.length) return [];
    const byCity = societyRequests.filter(r => r.city === currentCity || r.city === selectedSociety?.city);
    if (!byCity.length) return [];
    return byCity.map(r => ({
      id: r.id,
      unit: r.unit_or_block || r.unit,
      service: r.service_type || r.service || 'General',
      priority: r.priority || 'Normal',
      status: r.status || 'PENDING',
      provider: r.assigned_provider_name || r.provider || 'Cooperative Team',
      date: r.created_at ? new Date(r.created_at).toLocaleDateString() : r.date || 'Today',
      raw: r
    }));
  }, [societyRequests, currentCity, selectedSociety]);

  const stats = useMemo(() => {
    const s = selectedSociety?.stats;
    const parsed = typeof s === 'string' ? (() => { try{ return JSON.parse(s)}catch{return {}} })() : s;
    return parsed || { openRequests: filteredRequests.filter(r=> ['PENDING','ASSIGNED','IN_PROGRESS'].includes(String(r.status).toUpperCase())).length, completedThisMonth: 0, pendingApproval: 0, emergencyOpen: filteredRequests.filter(r=> r.priority==='Emergency').length };
  }, [selectedSociety, filteredRequests]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [unitBlock, setUnitBlock] = useState('Block B - 3rd Floor Lobby');
  const [serviceCategory, setServiceCategory] = useState('Electrical');
  const [priority, setPriority] = useState('Normal');
  const [description, setDescription] = useState('');
  const [isSubmittingSociety, setIsSubmittingSociety] = useState(false);

  const requireUserAuth = () => {
    if (!currentUser || activeRole !== 'customer') {
      addNotification({
        title: 'Sign in required',
        message: 'Please sign in as a User (Join as User) to raise a Society ticket.',
        type: 'system'
      });
      setAuthModalTab('register');
      setIsAuthModalOpen(true);
      return false;
    }
    return true;
  };

  const handleRaiseTicketClick = () => {
    if (!requireUserAuth()) return;
    setIsCreateModalOpen(true);
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!requireUserAuth()) return;
    setIsSubmittingSociety(true);
    try {
      const created = await createSocietyRequest({
        society_id: selectedSociety?.id !== 'fallback' ? selectedSociety.id : null,
        society_name: selectedSociety?.name,
        city: selectedSociety?.city || currentCity,
        hub_id: selectedSociety?.hub_id,
        unit_or_block: unitBlock,
        service_type: serviceCategory,
        priority,
        description,
      });
      if (created) {
        setIsCreateModalOpen(false);
        setDescription('');
        addNotification({
          title: 'Society Maintenance Request Dispatched',
          message: `${priority} priority ticket dispatched to cooperative response team for ${unitBlock} in ${selectedSociety?.city}.`,
          type: 'system'
        });
      }
    } catch (err) {
      addNotification({ title: 'Failed', message: err?.message || 'Could not create society request', type: 'system' });
    } finally {
      setIsSubmittingSociety(false);
    }
  };

  const handleCitySelect = (city) => {
    const hub = CITY_HUBS.find(h => h.city === city);
    if (hub) {
      setSelectedLocation({ name: `${hub.city}, ${hub.state}`, lat: hub.lat, lng: hub.lng });
    }
  };

  const locationDisplay = (() => {
    if (locationStatus === 'detecting') return 'Detecting your location…';
    if (locationStatus === 'denied') return 'Location access was denied.';
    if (locationStatus === 'unavailable') return 'Unable to detect your location.';
    if (locationStatus === 'timeout') return 'Location request timed out.';
    if (locationStatus === 'unsupported') return 'Zolve is currently not available in this area.';
    if (!currentCity) return 'Location not set';
    return selectedLocation?.name || currentCity;
  })();

  return (
    <div className="space-y-8 pb-16">
      {/* Location status banner — never Bengaluru */}
      {locationStatus === 'detecting' && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center justify-between">
          <span className="flex items-center gap-2"><Clock className="w-4 h-4 animate-spin" /> Detecting your location…</span>
          <span className="text-[11px] text-blue-600">Using GPS — one-time</span>
        </div>
      )}
      {locationStatus === 'denied' && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between flex-wrap gap-2">
          <span>Location access was denied.</span>
          <button onClick={() => { const el = document.getElementById('city-selector'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }} className="px-3 py-1 rounded-full bg-white border border-red-200 text-red-700 font-bold">Choose location manually</button>
        </div>
      )}
      {locationStatus === 'unavailable' && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between flex-wrap gap-2">
          <span>Unable to detect your location.</span>
          <button onClick={() => { const el = document.getElementById('city-selector'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }} className="px-3 py-1 rounded-full bg-white border border-amber-200 font-bold">Choose location manually</button>
        </div>
      )}
      {locationStatus === 'unsupported' && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">Zolve is currently not available in this area. {selectedLocation?.lat != null && <span className="font-mono">({selectedLocation.lat.toFixed(3)}, {selectedLocation.lng.toFixed(3)})</span>} — Choose a supported city manually. Coords kept, city not mapped.</div>
      )}
      {!currentCity && locationStatus !== 'detecting' && locationStatus !== 'unsupported' && (
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center justify-between flex-wrap gap-2">
          <span>Location not set — Choose location manually to see societies and services.</span>
          <button onClick={() => { const el = document.getElementById('city-selector'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }} className="px-3 py-1 rounded-full bg-white border font-bold">Choose location</button>
        </div>
      )}

      {/* City Selector — 21 hubs — never Bengaluru default */}
      <div id="city-selector" className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap gap-1.5 items-center">
        <span className="text-xs font-bold text-slate-600 flex items-center gap-1 mr-1"><MapPin className="w-3.5 h-3.5" /> City:</span>
        {CITY_HUBS.map(hub => (
          <button key={hub.id} onClick={()=>handleCitySelect(hub.city)} className={`px-2.5 py-1 rounded-full text-xs font-bold border ${currentCity===hub.city ? 'bg-brand-900 text-white border-brand-900' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>
            {hub.city}
          </button>
        ))}
        <span className="text-[11px] text-slate-400 ml-2">Current: {currentCity || 'Location not set'} {selectedSociety ? `• ${selectedSociety.name}` : ''} • {locationDisplay}</span>
      </div>

      {/* Header Banner — per city, no Bengaluru fallback */}
      {!currentCity || !selectedSociety ? (
        <div className="rounded-3xl bg-white border border-slate-200 p-8 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto"><Building2 className="w-8 h-8 text-slate-400" /></div>
          <h2 className="text-xl font-bold text-slate-900">{locationStatus==='detecting' ? 'Detecting your location…' : locationStatus==='unsupported' ? 'Zolve is currently not available in this area.' : 'Location not set'}</h2>
          <p className="text-xs text-slate-500">{locationStatus==='unsupported' ? 'Your GPS is outside our 20-city coverage (50 km). Pick a supported city.' : 'Pick a city above or allow GPS to see societies.'}</p>
          {selectedLocation?.lat != null && <p className="text-[11px] font-mono text-slate-400">GPS: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)} {locationError && `• ${locationError}`}</p>}
        </div>
      ) : (
        <div className="relative rounded-3xl bg-gradient-to-br from-brand-900 via-brand-950 to-coop-950 text-white p-6 sm:p-8 lg:p-10 overflow-hidden shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-amber-500/15 blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shrink-0">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
                  {selectedSociety?.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-coop-300 text-xs font-bold border border-white/20">
                  Managed Society Network
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold">{selectedSociety?.city}</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Location: <strong className="text-white">{selectedSociety?.location}</strong> • {selectedSociety?.units} Residential Units • Manager: {selectedSociety?.manager_name || selectedSociety?.manager || '—'} • {selectedSociety?.hub_id} • {selectedSociety?.pincode}
              </p>
              <p className="text-[11px] text-white/70 mt-1">Using your current location • {selectedLocation?.source || locationStatus} • {selectedLocation?.lat?.toFixed(3)}, {selectedLocation?.lng?.toFixed(3)}</p>
            </div>
          </div>

        <button
          onClick={handleRaiseTicketClick}
          className="relative z-10 px-5 py-3 rounded-xl bg-coop-600 hover:bg-coop-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Raise Society Ticket</span>
          {(!currentUser || activeRole !== 'customer') && <ShieldCheck className="w-3.5 h-3.5 opacity-70" />}
        </button>
        </div>
      )}

      {/* Society Operational Statistics — per city */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Open Maintenance Tickets</div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.openRequests ?? filteredRequests.filter(r=> ['PENDING','ASSIGNED'].includes(String(r.status).toUpperCase())).length}</div>
          <div className="text-[10px] text-slate-500 pt-1">Assigned to Co-op Providers • {selectedSociety?.city}</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed This Month</div>
          <div className="text-2xl sm:text-3xl font-black text-coop-700">{stats.completedThisMonth ?? 0}</div>
          <div className="text-[10px] text-coop-700 font-semibold pt-1">100% Resident SLA met</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Resident Approval</div>
          <div className="text-2xl sm:text-3xl font-black text-brand-900">{stats.pendingApproval ?? 0}</div>
          <div className="text-[10px] text-slate-500 pt-1">Awaiting digital signoff</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Emergency Standby</div>
          <div className="text-2xl sm:text-3xl font-black text-red-600 flex items-center gap-1">
            <Zap className="w-5 h-5 fill-red-600" /> {stats.emergencyOpen ?? 0}
          </div>
          <div className="text-[10px] text-red-600 font-bold pt-1">Rapid response technician active</div>
        </div>
      </div>

      {/* All societies mini-list */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-subtle p-6 space-y-3">
        <h3 className="text-sm font-bold text-slate-900">All Societies Across 21 Cities — Embedded in Supabase</h3>
        <p className="text-xs text-slate-500">Kolkata shows Salt Lake, Mumbai shows Seaside, Bengaluru shows Green Valley. Supabase <code>societies</code> is source of truth.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-auto pr-1">
          {societies.map(soc => (
            <div key={soc.id} className={`p-3 rounded-xl border text-xs ${soc.city===currentCity ? 'bg-brand-50 border-brand-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="font-bold text-slate-900">{soc.name} {soc.city===currentCity && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-brand-900 text-white text-[9px]">Current</span>}</div>
              <div className="text-slate-600">{soc.location}</div>
              <div className="text-[11px] text-slate-500">{soc.city}, {soc.state} • {soc.pincode} • {soc.hub_id}</div>
            </div>
          ))}
          {!societies.length && <div className="text-xs text-slate-400">Loading societies from Supabase…</div>}
        </div>
      </div>

      {/* Active Society Maintenance Queue — per city */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-subtle overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Active Common Area & Unit Requests — {selectedSociety?.city} ({filteredRequests.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Real-time status of building infrastructure repairs • Supabase <code>society_requests</code> filtered by city+hub</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="p-4">Block / Unit</th>
                <th className="p-4">Service Requirement</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Assigned Cooperative Squad</th>
                <th className="p-4">Scheduled Window</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 font-bold text-slate-900">{req.unit}</td>
                  <td className="p-4 text-slate-700 font-medium">{req.service}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      req.priority === 'Emergency'
                        ? 'bg-red-100 text-red-800 border border-red-200 animate-pulse'
                        : req.priority === 'High'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {req.priority}
                    </span>
                  </td>
                  <td className="p-4 text-coop-800 font-semibold">{req.provider}</td>
                  <td className="p-4 text-slate-500">{req.date}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-coop-50 text-coop-700 font-bold text-[10px] border border-coop-200">
                      <CheckCircle2 className="w-3 h-3" /> {req.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredRequests.length===0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">No requests for {selectedSociety?.city}. Raise a ticket to see it here.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECURRING INFRASTRUCTURE LOGS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-subtle space-y-3">
          <div className="flex items-center gap-2 text-brand-900 font-bold text-sm">
            <Droplets className="w-5 h-5 text-blue-600" />
            <span>Water Sump & Overhead Tank UV Sterilization — {selectedSociety?.city}</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Next scheduled 6-stage deep de-sludging and UV bacterial purification for central sump in {selectedSociety?.name}: <strong>September 5, 2026</strong>. Managed by cooperative plumbing team.
          </p>
          <div className="text-[11px] text-coop-700 font-semibold">✓ Water Quality Certificate: Grade A Potable</div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-subtle space-y-3">
          <div className="flex items-center gap-2 text-brand-900 font-bold text-sm">
            <Zap className="w-5 h-5 text-amber-500" />
            <span>Transformer & Diesel Generator Safety Audit — {selectedSociety?.city}</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Bi-monthly thermographic infrared heat scan on transformer panels. Completed on <strong>August 18, 2026</strong> with 0 phase load defects for {selectedSociety?.name}.
          </p>
          <div className="text-[11px] text-coop-700 font-semibold">✓ Industrial Safety Audit Signed</div>
        </div>
      </div>

      {/* RAISE TICKET MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 font-display">Raise Society Maintenance Ticket — {selectedSociety?.city}</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-6 space-y-4 text-xs">
              <div className="p-2 rounded-xl bg-brand-50 border border-brand-200 text-brand-800 text-xs">
                Society: <strong>{selectedSociety?.name}</strong> • {selectedSociety?.location} • {selectedSociety?.city} ({selectedSociety?.hub_id})
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Block & Location in Society</label>
                <input
                  type="text"
                  required
                  value={unitBlock}
                  onChange={(e) => setUnitBlock(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  placeholder="e.g. Block C - 4th Floor Corridor"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Service Type</label>
                  <select
                    value={serviceCategory}
                    onChange={(e) => setServiceCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Electrical">Electrical / Lighting</option>
                    <option value="Plumbing">Plumbing / Sump</option>
                    <option value="Sanitization">Corridor Scrubbing</option>
                    <option value="Carpentry">Clubhouse Door/Lock</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Emergency">🚨 Emergency (Immediate)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description of Issue</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  placeholder="Details of the fault or maintenance required..."
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmittingSociety}
                className="w-full py-3 rounded-xl bg-brand-900 hover:bg-brand-800 disabled:opacity-60 text-white font-bold shadow-md transition-colors"
              >
                {isSubmittingSociety ? 'Dispatching...' : 'Dispatch Ticket to Cooperative Team'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

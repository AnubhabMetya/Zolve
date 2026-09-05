import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { emergencyDispatch } from '../../services/emergencyDispatchService';
import { formatDistanceKm, haversineKm } from '../../services/locationService';
import { resolveCity } from '../../services/cityResolver';
import {
  Siren,
  AlertTriangle,
  Zap,
  Droplets,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  UserCheck,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export const EmergencyDispatchPanel = ({
  executiveUser,
  executiveCoords,
  executiveCity,
}) => {
  const { providers = [], bookings = [], addNotification } = useApp();

  const [respondingId, setRespondingId] = useState(null);
  const [dispatchedId, setDispatchedId] = useState(null);
  const [filterPriority, setFilterPriority] = useState('ALL');

  // Real-time Community Emergencies queue (seeded with realistic society incidents within service radius)
  const [emergencyIncidents, setEmergencyIncidents] = useState([
    {
      id: 'emg-soc-101',
      code: 'EMG-819',
      priority: 'CRITICAL',
      title: 'Water Sump Main Valve Burst',
      serviceRequired: 'Water Sump & Overhead Tank Cleaning',
      societyName: 'Silver Oaks Resident Welfare Association',
      location: 'Block C Sump Room, Silver Oaks Complex',
      city: executiveCity || 'Kolkata',
      timeReported: '14 mins ago',
      reportedAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
      requiredSkill: 'Water Sump & Overhead Tank Cleaning',
      description: 'Main discharge pipe cracked under pressure. Basement pumping chamber flooding.',
      customerCoords: executiveCoords ? { lat: executiveCoords.lat + 0.012, lng: executiveCoords.lng + 0.009 } : { lat: 22.578, lng: 88.371 },
      status: 'UNASSIGNED',
    },
    {
      id: 'emg-soc-102',
      code: 'EMG-742',
      priority: 'HIGH',
      title: 'Main Transformer Neutral Spark & Line Surge',
      serviceRequired: 'Community Event Sound & Electrical Setup',
      societyName: 'Greenfield Heights Housing Society',
      location: 'Substation DG Enclosure, Greenfield Heights',
      city: executiveCity || 'Kolkata',
      timeReported: '28 mins ago',
      reportedAt: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
      requiredSkill: 'Community Event Sound & Electrical Setup',
      description: 'Frequent neutral arcing observed during evening peak hours. Lift circuit flickering.',
      customerCoords: executiveCoords ? { lat: executiveCoords.lat - 0.015, lng: executiveCoords.lng - 0.012 } : { lat: 22.562, lng: 88.354 },
      status: 'UNASSIGNED',
    }
  ]);

  // Compute emergency dispatch metrics for each incident
  const enrichedIncidents = useMemo(() => {
    return emergencyIncidents.map((incident) => {
      let distanceKm = null;
      if (executiveCoords && incident.customerCoords) {
        distanceKm = haversineKm(
          executiveCoords.lat,
          executiveCoords.lng,
          incident.customerCoords.lat,
          incident.customerCoords.lng
        );
      }

      // Check eligible responders via emergencyDispatch service
      const dispatchEngineResult = emergencyDispatch({
        service_name: incident.serviceRequired,
        customerLocation: incident.customerCoords || executiveCoords,
        city: incident.city || executiveCity,
        providers,
        bookings
      });

      const eligibleResponders = (dispatchEngineResult?.eligible_providers || []).slice(0, 3);
      const recommended = dispatchEngineResult?.recommended_provider || null;

      return {
        ...incident,
        distanceKm,
        distanceText: distanceKm != null ? formatDistanceKm(distanceKm) : 'Within 50 km',
        eligibleResponders,
        recommended,
        dispatchStatus: dispatchEngineResult?.dispatch_status || 'READY'
      };
    });
  }, [emergencyIncidents, executiveCoords, executiveCity, providers, bookings]);

  const handleRespond = (incidentId) => {
    setRespondingId(incidentId);
    setTimeout(() => {
      setEmergencyIncidents((prev) =>
        prev.map((inc) => (inc.id === incidentId ? { ...inc, status: 'RESPONDING' } : inc))
      );
      setRespondingId(null);
      addNotification({
        title: 'Emergency Response Activated 🚨',
        message: `You have taken on-site lead for Incident #${incidentId.slice(-6)}. Society management notified.`,
        type: 'system'
      });
    }, 400);
  };

  const handleDispatch = (incidentId, providerName) => {
    setDispatchedId(incidentId);
    setTimeout(() => {
      setEmergencyIncidents((prev) =>
        prev.map((inc) => (inc.id === incidentId ? { ...inc, status: 'DISPATCHED', assignedTo: providerName } : inc))
      );
      setDispatchedId(null);
      addNotification({
        title: 'Rapid Squad Dispatched ⚡',
        message: `${providerName || 'Certified Technician'} dispatched to incident site. Estimated arrival in 22 mins.`,
        type: 'system'
      });
    }, 400);
  };

  const filtered = enrichedIncidents.filter((inc) => {
    if (filterPriority === 'ALL') return true;
    return inc.priority === filterPriority;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Siren className="w-5 h-5 text-red-600 animate-pulse" />
            <span>Community Rapid Emergency Dispatch</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time critical maintenance escalations within your 50 km service radius.
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={() => setFilterPriority('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              filterPriority === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Priority ({enrichedIncidents.length})
          </button>
          <button
            onClick={() => setFilterPriority('CRITICAL')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              filterPriority === 'CRITICAL'
                ? 'bg-red-700 text-white'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Critical
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((inc) => {
          const isCritical = inc.priority === 'CRITICAL';
          const isTaken = inc.status === 'RESPONDING' || inc.status === 'DISPATCHED';

          return (
            <div
              key={inc.id}
              className={`bg-white rounded-2xl border p-5 transition-all shadow-subtle space-y-4 ${
                isCritical ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200'
              }`}
            >
              {/* HEADER ROW */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold text-[10px]">
                      #{inc.code}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                        isCritical
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      <Zap className="w-3 h-3 fill-current" /> {inc.priority} PRIORITY
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Reported {inc.timeReported}
                    </span>
                  </div>

                  <h4 className="text-base font-extrabold text-slate-900 pt-0.5">
                    {inc.title}
                  </h4>
                  <div className="text-xs text-brand-900 font-semibold flex items-center gap-1">
                    <span>{inc.societyName}</span>
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                      isTaken
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {inc.status === 'RESPONDING'
                      ? '✓ Self-Assigned'
                      : inc.status === 'DISPATCHED'
                      ? `✓ Dispatched (${inc.assignedTo})`
                      : 'Pending Dispatch'}
                  </span>
                </div>
              </div>

              {/* DESCRIPTION */}
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
                {inc.description}
              </p>

              {/* META INFO */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div>
                  <span className="text-slate-400">Location:</span>{' '}
                  <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                    <span className="truncate">{inc.location}</span>
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Distance:</span>{' '}
                  <div className="font-semibold text-emerald-700 mt-0.5">
                    {inc.distanceText} (within 50 km)
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Required Skill:</span>{' '}
                  <div className="font-semibold text-slate-800 mt-0.5 truncate">
                    {inc.requiredSkill}
                  </div>
                </div>
              </div>

              {/* ELIGIBLE RESPONDERS FROM EXISTING ENGINE */}
              {inc.eligibleResponders?.length > 0 && !isTaken && (
                <div className="p-3 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-2">
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-coop-700" />
                    <span>Eligible Squad Responders ({inc.eligibleResponders.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {inc.eligibleResponders.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleDispatch(inc.id, p.name)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-brand-500 text-xs font-medium text-slate-800 flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <span className="font-bold">{p.name}</span>
                        <span className="text-[10px] text-slate-400">({p.rating}★)</span>
                        <span className="text-[10px] text-brand-700 font-bold ml-1">Dispatch →</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ACTIONS */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-100">
                {!isTaken ? (
                  <>
                    <button
                      type="button"
                      disabled={dispatchedId === inc.id}
                      onClick={() => handleDispatch(inc.id, inc.recommended?.name || 'Rapid Response Unit')}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Dispatch Qualified Executive</span>
                    </button>

                    <button
                      type="button"
                      disabled={respondingId === inc.id}
                      onClick={() => handleRespond(inc.id)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{respondingId === inc.id ? 'Taking Lead…' : 'Respond (Take Lead)'}</span>
                    </button>
                  </>
                ) : (
                  <div className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Incident actively managed by cooperative rapid team.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EmergencyDispatchPanel;

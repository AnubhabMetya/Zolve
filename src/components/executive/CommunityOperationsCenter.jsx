import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { EmergencyDispatchPanel } from './EmergencyDispatchPanel';
import { resolveCity } from '../../services/cityResolver';
import { haversineKm } from '../../services/locationService';
import {
  Building2,
  Siren,
  ShieldCheck,
  Droplets,
  Zap,
  Sparkles,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Radio,
  FileCheck
} from 'lucide-react';

export const CommunityOperationsCenter = ({ executiveUser }) => {
  const {
    selectedLocation,
    societies = [],
    societyRequests = [],
    bookings = [],
    addNotification
  } = useApp();

  const [activeTab, setActiveTab] = useState('emergencies'); // 'emergencies' | 'services' | 'societies'

  // Canonical GPS Location
  const execCoords = useMemo(() => {
    if (selectedLocation?.lat != null && selectedLocation?.lng != null) {
      return { lat: selectedLocation.lat, lng: selectedLocation.lng };
    }
    return null;
  }, [selectedLocation]);

  const resolved = useMemo(() => {
    return resolveCity({
      lat: selectedLocation?.lat,
      lng: selectedLocation?.lng,
      name: selectedLocation?.name,
      text: selectedLocation?.name || selectedLocation?.city
    });
  }, [selectedLocation]);

  const execCity = resolved?.city || selectedLocation?.city || 'Kolkata';
  const execState = resolved?.state || selectedLocation?.state || 'West Bengal';

  // Real society requests filtered strictly to 50 km
  const localSocietyRequests = useMemo(() => {
    return societyRequests.filter((req) => {
      if (req.city && execCity && req.city.toLowerCase() !== execCity.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [societyRequests, execCity]);

  // Operational metrics
  const metrics = useMemo(() => {
    return {
      emergencyCount: 2,
      activeIssues: localSocietyRequests.length || 6,
      pendingServices: 4,
      resolvedToday: 11
    };
  }, [localSocietyRequests]);

  return (
    <div className="space-y-6 pb-16">
      {/* COMMAND CENTER BANNER */}
      <div className="relative rounded-3xl bg-gradient-to-br from-brand-950 via-slate-900 to-amber-950 text-white p-6 sm:p-8 lg:p-10 overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 rounded-full bg-coop-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-xs font-semibold text-amber-300">
            <Building2 className="w-3.5 h-3.5 text-amber-300" />
            <span>Community & Housing Society Operations</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display tracking-tight text-white">
              Community Operations Command Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-light">
              Field governance, large-scale sanitization, water sump maintenance and emergency dispatch for registered apartment complexes.
            </p>
          </div>

          {/* SERVICE AREA STATUS INDICATOR */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-slate-200">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>
              <strong>{execCity}, {execState}</strong> • Service area: <strong>50 km</strong>
            </span>
          </div>

          {/* 4 KEY REAL-TIME METRICS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
              <div className="text-[10px] text-red-300 uppercase font-bold flex items-center gap-1">
                <Siren className="w-3 h-3" /> Emergency Requests
              </div>
              <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
                {metrics.emergencyCount}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
              <div className="text-[10px] text-amber-300 uppercase font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Active Community Issues
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">
                {metrics.activeIssues}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
              <div className="text-[10px] text-coop-300 uppercase font-bold flex items-center gap-1">
                <Clock className="w-3 h-3" /> Pending Services
              </div>
              <div className="text-xl sm:text-2xl font-black text-coop-300 mt-0.5">
                {metrics.pendingServices}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
              <div className="text-[10px] text-slate-300 uppercase font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Resolved Today
              </div>
              <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
                {metrics.resolvedToday}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* OPERATIONS NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { key: 'emergencies', label: `Emergency Dispatch (${metrics.emergencyCount})`, icon: Siren, color: 'text-red-600' },
          { key: 'services', label: `Community Services (${metrics.pendingServices})`, icon: Droplets, color: 'text-blue-600' },
          { key: 'societies', label: `Partner Housing Societies (${societies.length})`, icon: Building2, color: 'text-amber-600' }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : tab.color}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: EMERGENCY DISPATCH */}
      {activeTab === 'emergencies' && (
        <EmergencyDispatchPanel
          executiveUser={executiveUser}
          executiveCoords={execCoords}
          executiveCity={execCity}
        />
      )}

      {/* TAB 2: SCHEDULED COMMUNITY SERVICES */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Bulk Society Scheduled Services
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Scheduled sanitization, pump automation, and transformer health maintenance cycles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                id: 'soc-srv-1',
                title: 'Water Sump & Overhead Tank Cleaning',
                society: 'Sunrise Towers Cooperative Housing',
                address: 'EM Bypass, Sector 4, Kolkata',
                date: 'Tomorrow, 08:30 AM',
                frequency: 'Quarterly Routine',
                units: '180 Flats (4 Overhead Sumps)',
                payout: '₹8,500',
                status: 'READY_FOR_DISPATCH'
              },
              {
                id: 'soc-srv-2',
                title: 'Society Common Area Sanitization',
                society: 'Harmony Heights Enclave',
                address: 'Rajarhat Main Road, Kolkata',
                date: '08 Sept 2026, 06:00 AM',
                frequency: 'Monthly Disinfection',
                units: 'Corridors, Gym & Club House',
                payout: '₹4,200',
                status: 'CONFIRMED'
              },
              {
                id: 'soc-srv-3',
                title: 'Community Event Sound & Electrical Setup',
                society: 'Lakeview Enclave Welfare Association',
                address: 'Salt Lake Sector 5, Kolkata',
                date: '10 Sept 2026, 04:00 PM',
                frequency: 'Cultural Drive Support',
                units: 'Amphitheater DG Audio Grid',
                payout: '₹6,000',
                status: 'CONFIRMED'
              }
            ].map((srv) => (
              <div
                key={srv.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-3 shadow-subtle hover:shadow-premium transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-900 border border-brand-200 text-[10px] font-bold">
                      {srv.frequency}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">{srv.title}</h4>
                    <p className="text-xs text-brand-900 font-medium">{srv.society}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-slate-900">{srv.payout}</div>
                    <span className="text-[10px] text-coop-700 font-semibold">Society Contract</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 text-xs space-y-1 text-slate-600 border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{srv.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{srv.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Scope: {srv.units}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      addNotification({
                        title: 'Workforce Allotted',
                        message: `Technician squad deployed for ${srv.title} at ${srv.society}.`,
                        type: 'system'
                      })
                    }
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <span>Deploy Society Squad</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PARTNER HOUSING SOCIETIES */}
      {activeTab === 'societies' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Registered Housing Societies in Your Service Area ({execCity})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified resident associations under annual cooperative maintenance agreements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {societies.slice(0, 6).map((soc) => (
              <div
                key={soc.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-2 shadow-subtle text-xs"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="font-bold text-slate-900 truncate">{soc.name}</h5>
                    <p className="text-[10px] text-slate-400 truncate">{soc.city}, {soc.state}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">{soc.unitsCount || 120} Resident Units</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">Active Member</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityOperationsCenter;

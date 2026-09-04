import React, { useState, useMemo } from 'react';
import { Users, TrendingUp, AlertTriangle, CheckCircle2, Scale, MapPin, Award, Clock, Info } from 'lucide-react';
import { allocateWorkforce } from '../../services/workforceAllocationService.js';
import { INITIAL_PROVIDERS, SERVICE_CATEGORIES, CITY_HUBS } from '../../data/mockData.js';

// Flatten services for selector
const ALL_SERVICES = SERVICE_CATEGORIES.flatMap(cat => cat.services.map(s => ({ id: s.id, name: s.name, category: cat.name })));
const ALL_CITIES = CITY_HUBS.filter(h => h.city !== 'Siliguri').map(h => h.city); // 20 canonical
// Available forecast dates from predictions (if provided)
const DEFAULT_DATE = '2026-08-15';

export const WorkforceAllocation = ({ providers = INITIAL_PROVIDERS, bookings = [], forecastPredictions = [] }) => {
  const availableDates = useMemo(() => {
    if (!forecastPredictions.length) return [];
    const s = new Set(forecastPredictions.map(p => p.date));
    return Array.from(s).sort();
  }, [forecastPredictions]);

  const defaultCity = ALL_CITIES.includes('Bengaluru') ? 'Bengaluru' : ALL_CITIES[0];
  const defaultService = ALL_SERVICES.find(s => s.id === 'srv-plumb-01')?.id || ALL_SERVICES[0]?.id;

  const [selectedCity, setSelectedCity] = useState(defaultCity);
  const [selectedServiceId, setSelectedServiceId] = useState(defaultService);
  const [selectedDate, setSelectedDate] = useState(() => {
    if (forecastPredictions.length) return forecastPredictions[0].date;
    return DEFAULT_DATE;
  });
  const [forecastDemandInput, setForecastDemandInput] = useState('');

  // Sync default date when predictions load asynchronously (e.g., fetch)
  React.useEffect(() => {
    if (forecastPredictions.length && !availableDates.includes(selectedDate)) {
      // Prefer a date that exists for current city/service if possible
      const forCityService = forecastPredictions.filter(p => p.city === selectedCity && p.service_id === selectedServiceId).map(p => p.date).sort();
      if (forCityService.length) setSelectedDate(forCityService[0]);
      else setSelectedDate(forecastPredictions[0].date);
    }
  }, [forecastPredictions, availableDates, selectedCity, selectedServiceId, selectedDate]);

  const selectedService = ALL_SERVICES.find(s => s.id === selectedServiceId) || ALL_SERVICES[0];

  // Find forecast demand from predictions if available
  const forecastRow = useMemo(() => {
    if (forecastPredictions.length) {
      return forecastPredictions.find(p => p.city === selectedCity && p.service_id === selectedServiceId && p.date === selectedDate);
    }
    return null;
  }, [selectedCity, selectedServiceId, selectedDate, forecastPredictions]);

  const hasForecast = !!forecastRow;
  const hasAnyForecast = forecastPredictions.length > 0;
  const effectiveDemand = useMemo(() => {
    if (forecastDemandInput !== '' && !isNaN(Number(forecastDemandInput))) return Math.max(0, Math.round(Number(forecastDemandInput)));
    if (forecastRow) return Math.round(Number(forecastRow.predicted_booking_count));
    return null; // no forecast available
  }, [forecastDemandInput, forecastRow]);

  const allocation = useMemo(() => {
    if (effectiveDemand == null) return null;
    return allocateWorkforce({
      city: selectedCity,
      service_id: selectedServiceId,
      service_name: selectedService?.name || 'Service',
      forecast_date: selectedDate,
      forecast_demand: effectiveDemand,
      providers,
      bookings,
    });
  }, [selectedCity, selectedServiceId, selectedDate, effectiveDemand, providers, bookings]);

  const statusColor = !allocation ? 'text-slate-600 bg-slate-50 border-slate-200' : allocation.status === 'SHORTAGE' ? 'text-red-700 bg-red-50 border-red-200' : allocation.status === 'SURPLUS' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200';

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-subtle overflow-hidden">
      <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-brand-900 to-coop-800 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-black tracking-wider uppercase">Workforce Allocation — Stage 1</div>
            <div className="text-xs text-white/70">Forecast demand is compared with qualified local provider capacity.</div>
          </div>
          <span className="ml-auto px-2 py-1 rounded-full bg-white/15 text-white text-[10px] font-bold border border-white/20">Synthetic prototype data</span>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {/* Synthetic disclaimer */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>Forecast data is currently <strong>synthetic prototype data — not real customer bookings</strong>. Capacity and gap are explainable estimates for SIH demonstration.</span>
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase">City (20 supported, 50 km radius)</span>
            <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
              {ALL_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase">Service (14)</span>
            <select value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
              {ALL_SERVICES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase">Forecast Date {hasAnyForecast && `(${availableDates.length} available)`}</span>
            {hasAnyForecast ? (
              <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
                {availableDates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            ) : (
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
            )}
          </label>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex-1 space-y-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase">Forecast Demand (override, else from predictions)</span>
            <input type="number" placeholder={forecastRow ? String(Math.round(forecastRow.predicted_booking_count)) : 'e.g. 5'} value={forecastDemandInput} onChange={e => setForecastDemandInput(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" min="0" />
          </label>
          <div className="text-xs text-slate-500 pt-6">Showing: <strong className="text-slate-900">{selectedCity}</strong> • {selectedService?.name} • {selectedDate}</div>
        </div>

        {/* States: loading / no forecast / normal */}
        {!hasAnyForecast && forecastPredictions.length === 0 && providers.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 mx-auto flex items-center justify-center"><Clock className="w-4 h-4 text-slate-500" /></div>
            <div className="text-sm font-bold text-slate-700 mt-2">Loading workforce data…</div>
          </div>
        ) : effectiveDemand == null ? (
          <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center">
            <div className="text-sm font-bold text-amber-800">No forecast available for this city/service/date.</div>
            <div className="text-xs text-amber-700 mt-1">Try another combination from the 20 cities, 14 services, and dates {availableDates[0]} → {availableDates[availableDates.length-1]}. Or enter a manual forecast demand above.</div>
          </div>
        ) : (
        <>
        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <div className="text-[11px] font-bold text-slate-500 uppercase">Forecast Demand</div>
            <div className="text-xl font-black text-slate-900">{allocation.forecast_demand}</div>
            <div className="text-[11px] text-slate-400">predicted_bookings {forecastRow ? `• actual ${forecastRow.actual_booking_count}` : ''}</div>
          </div>
          <div className="p-3 rounded-2xl bg-white border border-slate-200 text-center">
            <div className="text-[11px] font-bold text-slate-500 uppercase">Available Capacity</div>
            <div className="text-xl font-black text-slate-900">{allocation.available_capacity}</div>
            <div className="text-[11px] text-slate-400">sum eligible capacity</div>
          </div>
          <div className="p-3 rounded-2xl bg-white border border-slate-200 text-center">
            <div className="text-[11px] font-bold text-slate-500 uppercase">Capacity Gap</div>
            <div className={`text-xl font-black ${allocation.capacity_gap > 0 ? 'text-red-700' : allocation.capacity_gap < 0 ? 'text-emerald-700' : 'text-slate-900'}`}>{allocation.capacity_gap}</div>
            <div className="text-[11px] text-slate-400">demand − capacity</div>
          </div>
          <div className="p-3 rounded-2xl bg-white border border-slate-200 text-center">
            <div className="text-[11px] font-bold text-slate-500 uppercase">Utilization</div>
            <div className="text-xl font-black text-slate-900">{allocation.utilization == null ? '—' : allocation.utilization.toFixed(2)}</div>
            <div className="text-[11px] text-slate-400">demand / capacity</div>
          </div>
          <div className={`p-3 rounded-2xl border text-center ${statusColor}`}>
            <div className="text-[11px] font-bold uppercase">Status</div>
            <div className="text-sm font-black flex items-center justify-center gap-1">
              {allocation.status === 'SHORTAGE' && <AlertTriangle className="w-4 h-4" />}
              {allocation.status === 'BALANCED' && <Scale className="w-4 h-4" />}
              {allocation.status === 'SURPLUS' && <CheckCircle2 className="w-4 h-4" />}
              {allocation.status}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-center">
            <div className="text-[11px] font-bold text-amber-700 uppercase">Additional Providers Needed</div>
            <div className="text-xl font-black text-amber-900">{allocation.additional_providers_needed}</div>
            <div className="text-[11px] text-amber-700/70">approx. prototype staffing</div>
          </div>
        </div>

        <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
          <strong>How it works:</strong> Forecast demand is compared with qualified local provider capacity (service qualification + 50 km hard radius + availability + workload). <strong>Additional Providers Needed = max(0, ceil(capacityGap))</strong> — approximate prototype staffing, not guaranteed hires.
          <span className="block mt-1">Eligible providers: {allocation.eligible_provider_count} • Recommended workforce: {allocation.allocated_provider_ids.length} • Total providers considered: {providers.length}</span>
        </div>

        {/* Recommended Providers */}
        <div>
          <div className="text-sm font-black text-slate-900 flex items-center gap-2">Recommended workforce <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">{allocation.provider_recommendations.length}</span></div>
          <div className="text-xs text-slate-500 mb-3">Recommended provider pool — not an actual booking assignment. Qualified, within 50 km, fair opportunity — not rating-only. Overloaded providers are deprioritized.</div>
          {allocation.provider_recommendations.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-sm text-slate-500">
              No eligible providers for {selectedService?.name} in {selectedCity} within 50 km. All qualified providers are unavailable or distant — staffing needed.
              {allocation.available_capacity === 0 && <div className="text-xs text-amber-700 mt-2">Zero capacity — utilization — (demand with no local supply).</div>}
            </div>
          ) : (
            <div className="space-y-2">
              {allocation.provider_recommendations.slice(0, 8).map((rec, idx) => (
                <div key={rec.provider_id} className={`p-3 rounded-2xl border flex items-start gap-3 ${rec.prioritized ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-90'}`}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${idx < allocation.allocated_provider_ids.length ? 'bg-brand-900 text-white' : 'bg-slate-200 text-slate-700'}`}>{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{rec.provider_name} <span className="font-normal text-slate-400">• {rec.provider_id}</span></div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap mt-0.5">
                      {rec.fairMatchScore != null && <span className="flex items-center gap-1"><Scale className="w-3 h-3" /> FairMatch {rec.fairMatchScore}/100</span>}
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Workload {rec.workload} active</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {rec.distanceKm != null ? `${rec.distanceKm.toFixed(1)} km` : 'nearby'}</span>
                      <span className="flex items-center gap-1"><Award className="w-3 h-3" /> Capacity {rec.capacity}</span>
                    </div>
                    <div className={`mt-1 text-xs px-2.5 py-1.5 rounded-xl border ${rec.prioritized ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>{rec.reason}</div>
                  </div>
                </div>
              ))}
              {allocation.provider_recommendations.length > 8 && <div className="text-xs text-slate-400 text-center">+{allocation.provider_recommendations.length - 8} more eligible (ranked)</div>}
            </div>
          )}
        </div>
        </>
        )}

        <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-100">
          <TrendingUp className="w-3 h-3" />
          <span>Deterministic Stage 1 engine — capacity formula <code className="px-1 py-0.5 bg-slate-100 rounded">calculateProviderCapacity</code> is isolated for future replacement by real scheduling.</span>
        </div>
      </div>
    </div>
  );
};

export default WorkforceAllocation;

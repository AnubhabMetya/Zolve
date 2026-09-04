import React, { useState, useMemo } from 'react';
import { Siren, MapPin, Clock, ShieldAlert, Scale, Award, Users, Info, AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import { emergencyDispatch, resolveCustomerLocation } from '../../services/emergencyDispatchService.js';
import { CITY_HUBS } from '../../data/mockData.js';
import { SERVICE_CATEGORIES, INITIAL_PROVIDERS } from '../../data/mockData.js';
import { loadTrustHistory } from '../../services/aiDataLoader.js';

const ALL_CITIES = CITY_HUBS.filter(h=> h.city !== 'Siliguri').map(h=> h.city);
const ALL_SERVICES = SERVICE_CATEGORIES.flatMap(cat=> cat.services.map(s=> ({id:s.id, name:s.name, category:cat.name})));

const EMERGENCY_TYPES = [
  {id:'general', label:'General Emergency'},
  {id:'plumbing_burst', label:'Burst Pipe / Flooding'},
  {id:'electrical_spark', label:'Electrical Spark / Outage'},
  {id:'appliance_failure', label:'Appliance Failure'},
  {id:'pest_urgent', label:'Pest Urgent'},
];

export const EmergencyDispatch = ({ providers = INITIAL_PROVIDERS, bookings = [] }) => {
  const [selectedCity, setSelectedCity] = useState('Bengaluru');
  const [selectedServiceId, setSelectedServiceId] = useState('srv-plumb-01');
  const [emergencyType, setEmergencyType] = useState('general');
  const [requestedTime, setRequestedTime] = useState('');
  const [useCoords, setUseCoords] = useState(false);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [trustHistory, setTrustHistory] = useState([]);
  const [trustLoading, setTrustLoading] = useState(true);
  const [trustError, setTrustError] = useState(null);

  React.useEffect(() => {
    let cancelled = false;
    loadTrustHistory()
      .then((data) => {
        if (!cancelled) {
          setTrustHistory(data);
          setTrustLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setTrustError(err?.message || 'Failed to load trust history');
          setTrustLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const selectedService = ALL_SERVICES.find(s=> s.id===selectedServiceId) || ALL_SERVICES[0];
  const cityHub = CITY_HUBS.find(h=> h.city===selectedCity);

  const customerLocation = useMemo(()=>{
    if (useCoords && lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
      return {lat: parseFloat(lat), lng: parseFloat(lng)};
    }
    if (cityHub) return {lat: cityHub.lat, lng: cityHub.lng};
    return null;
  }, [useCoords, lat, lng, cityHub]);

  const result = useMemo(()=>{
    return emergencyDispatch({
      service_id: selectedServiceId,
      service_name: selectedService?.name || 'Service',
      customerLocation,
      city: selectedCity,
      emergencyType,
      requestedTime: requestedTime || null,
      providers,
      bookings,
      trustHistory,
    });
  }, [selectedServiceId, selectedService, customerLocation, selectedCity, emergencyType, requestedTime, providers, bookings, trustHistory]);

  const statusColor = result.dispatch_status==='READY' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : result.dispatch_status==='LIMITED' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-red-700 bg-red-50 border-red-200';
  const rec = result.recommended_provider;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-subtle overflow-hidden">
      <div className="p-5 sm:p-6 bg-gradient-to-br from-red-900 via-slate-900 to-amber-900 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
            <Siren className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-black tracking-wider uppercase">Emergency Dispatch — Stage 1</div>
            <div className="text-xs text-white/70">Emergency Dispatch recommends a suitable nearby provider using qualification, availability, distance, workload, FairMatch, and Trust & Safety signals.</div>
          </div>
          <span className="ml-auto hidden sm:inline px-2 py-1 rounded-full bg-white/15 text-white text-[10px] font-bold border border-white/20">Recommendation only — no booking has been automatically assigned.</span>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span><strong>AI prototype — emergency response recommendation, not guaranteed ETA.</strong> Trust & Safety anomaly detection is based on synthetic historical behavior. No provider is automatically booked or suspended.</span>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase">Emergency Service (14)</span>
            <select value={selectedServiceId} onChange={e=> setSelectedServiceId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-red-500 focus:outline-none">
              {ALL_SERVICES.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase">Customer City (20, 50 km hard limit)</span>
            <select value={selectedCity} onChange={e=> setSelectedCity(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-red-500 focus:outline-none">
              {ALL_CITIES.map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase">Emergency Type</span>
            <select value={emergencyType} onChange={e=> setEmergencyType(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-red-500 focus:outline-none">
              {EMERGENCY_TYPES.map(t=> <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase">Requested Time</span>
            <input type="time" value={requestedTime} onChange={e=> setRequestedTime(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
          </label>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <input type="checkbox" checked={useCoords} onChange={e=> setUseCoords(e.target.checked)} className="w-4 h-4 rounded border-slate-300" />
            Use exact coordinates (otherwise city hub fallback)
          </label>
          {useCoords && (
            <div className="flex gap-2 ml-auto">
              <input placeholder="lat e.g. 12.971" value={lat} onChange={e=> setLat(e.target.value)} className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 text-xs" />
              <input placeholder="lng e.g. 77.594" value={lng} onChange={e=> setLng(e.target.value)} className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 text-xs" />
            </div>
          )}
          <span className="ml-auto text-xs text-slate-500 hidden sm:inline">Customer: <strong className="text-slate-900">{selectedCity}</strong> {customerLocation ? `• ${customerLocation.lat.toFixed(3)}, ${customerLocation.lng.toFixed(3)}` : ''} • Service: <strong className="text-slate-900">{selectedService?.name}</strong></span>
        </div>

        {trustLoading && (
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">Loading trust signals…</div>
        )}
        {trustError && (
          <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 text-center">Trust signals unavailable: {trustError} — using neutral safety.</div>
        )}
        {!trustLoading && !trustError && trustHistory.length===0 && (
          <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 text-center">No trust history available — synthetic dataset empty, using neutral safety.</div>
        )}

        {/* Status */}
        <div className={`p-4 rounded-2xl border text-center ${statusColor}`}>
          <div className="text-[11px] font-bold uppercase tracking-wider">Emergency Status</div>
          <div className="text-xl font-black flex items-center justify-center gap-2">
            {result.dispatch_status==='READY' && <CheckCircle2 className="w-5 h-5" />}
            {result.dispatch_status==='LIMITED' && <AlertTriangle className="w-5 h-5" />}
            {result.dispatch_status==='NO_PROVIDER' && <ShieldAlert className="w-5 h-5" />}
            {result.dispatch_status === 'NO_PROVIDER' ? 'NO PROVIDER' : result.dispatch_status}
          </div>
          <div className="text-xs opacity-70 mt-1">{result.eligible_provider_count} eligible within 50 km • {result.ineligible_count} ineligible filtered (hard constraints before ranking)</div>
        </div>

        {/* Metrics */}
        {result.recommended_provider ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-2xl bg-slate-900 text-white text-center">
              <div className="text-[11px] font-bold text-white/60 uppercase">Emergency Priority Score</div>
              <div className="text-2xl font-black">{result.emergency_priority_score}</div>
              <div className="text-[11px] text-white/60">0–100</div>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-slate-200 text-center">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Distance</div>
              <div className="text-xl font-black text-slate-900">{result.estimated_distance_km} km</div>
              <div className="text-[11px] text-slate-400">Haversine</div>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-slate-200 text-center">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Current Workload</div>
              <div className="text-xl font-black text-slate-900">{rec.activeWorkload}</div>
              <div className="text-[11px] text-slate-400">active jobs</div>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-slate-200 text-center">
              <div className="text-[11px] font-bold text-slate-500 uppercase">FairMatch Score</div>
              <div className="text-xl font-black text-slate-900">{rec.fairMatchScore}</div>
              <div className="text-[11px] text-slate-400">15% weight</div>
            </div>
            <div className={`p-3 rounded-2xl border text-center ${rec.trustRiskLevel==='HIGH' ? 'bg-red-50 border-red-200 text-red-700' : rec.trustRiskLevel==='MEDIUM' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
              <div className="text-[11px] font-bold uppercase">Trust Risk</div>
              <div className="text-sm font-black">{rec.trustRiskLevel}</div>
              <div className="text-[11px] opacity-70">{rec.trustAnomalyScore ? `anomaly ${rec.trustAnomalyScore}` : 'safety'}</div>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-slate-200 text-center">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Capacity</div>
              <div className="text-xl font-black text-slate-900">{rec.capacity}</div>
              <div className="text-[11px] text-slate-400">Stage 1</div>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center">
            <div className="text-sm font-bold text-red-800">No eligible provider can currently respond.</div>
            <div className="text-xs text-red-700 mt-1">All qualified providers are outside 50 km, unqualified, unavailable, or capacity-constrained. Try another city/service or check provider availability. No booking has been automatically assigned.</div>
          </div>
        )}

        {/* Recommended Provider */}
        {rec && (
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
            <div className="text-sm font-black text-slate-900">Recommended provider pool — recommendation only</div>
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <img src={rec.provider.avatar || `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100`} alt={rec.provider_name} className="w-14 h-14 rounded-2xl object-cover" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black text-slate-900">{rec.provider_name} <span className="font-normal text-slate-400">• {rec.provider_id}</span></div>
                <div className="text-xs text-slate-600">{rec.service_qualification}</div>
                <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap mt-1">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{rec.distanceKm} km away</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{rec.activeWorkload} active</span>
                  <span className="flex items-center gap-1"><Scale className="w-3 h-3" />FairMatch {rec.fairMatchScore}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${rec.trustRiskLevel==='HIGH' ? 'bg-red-100 text-red-700 border-red-200' : rec.trustRiskLevel==='MEDIUM' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>{rec.trustRiskLevel} risk</span>
                </div>
                <div className="mt-2 text-xs px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">{rec.reason}</div>
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-black">Priority {rec.emergencyPriorityScore}</span>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-700">Explainability — why this was flagged / recommended</div>
              <ul className="space-y-1">
                {result.reasons.map((r,i)=>(
                  <li key={i} className="text-xs text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">{i+1}</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Alternatives */}
        {result.alternatives.length>0 && (
          <div className="space-y-2">
            <div className="text-sm font-black text-slate-900">Alternative providers <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px]">{result.alternatives.length}</span></div>
            <div className="grid gap-2">
              {result.alternatives.map((alt, idx)=>(
                <div key={alt.provider_id} className="p-3 rounded-2xl border border-slate-200 bg-white flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-black shrink-0">{idx+2}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900">{alt.provider_name} <span className="font-normal text-slate-400">• {alt.provider_id}</span></div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <span>{alt.distanceKm} km</span>
                      <span>• Workload {alt.activeWorkload}</span>
                      <span>• FairMatch {alt.fairMatchScore}</span>
                      <span className={`px-1 py-0.5 rounded-full text-[10px] font-bold border ${alt.trustRiskLevel==='HIGH' ? 'bg-red-50 text-red-700 border-red-200' : alt.trustRiskLevel==='MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{alt.trustRiskLevel}</span>
                      <span>• Priority {alt.emergencyPriorityScore}</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">{alt.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
          Weights: Distance 30% • Availability 25% • Workload 15% • FairMatch 15% • Trust 10% • Fairness 5% → Emergency Priority Score 0–100 (FairMatch is input, not replaced). Hard 50 km before ranking. <span className="block">Recommendation only — no booking has been automatically assigned. AI prototype — emergency response recommendation, not guaranteed ETA.</span>
        </div>
      </div>
    </div>
  );
};

export default EmergencyDispatch;

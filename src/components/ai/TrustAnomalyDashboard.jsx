import React, { useState, useMemo } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Info, Scale, Users, TrendingUp, Star, Clock, Award, Search } from 'lucide-react';
import { evaluateTrust, TRUST_WEIGHTS } from '../../services/trustAnomalyService.js';
import { CITY_HUBS, SERVICE_CATEGORIES } from '../../data/mockData.js';
import { loadTrustHistory } from '../../services/aiDataLoader.js';

const ALL_CITIES = [
  "Delhi NCR","Gurugram","Mumbai","Bengaluru","Chennai","Hyderabad","Kolkata","Ahmedabad","Pune","Surat",
  "Visakhapatnam","Coimbatore","Vadodara","Nagpur","Jaipur","Lucknow","Kochi","Indore","Patna","Bhopal",
];
const ALL_SERVICES = SERVICE_CATEGORIES.flatMap(cat=> cat.services.map(s=> ({id:s.id, name:s.name})));

// Helper to get providers for city/service (trustHistory passed explicitly for async loading)
function getProvidersForCityService(trustHistory, city, serviceId) {
  if (!trustHistory || !trustHistory.length) return [];
  const filtered = trustHistory.filter(r=> r.city===city && r.service_id===serviceId);
  const ids = Array.from(new Set(filtered.map(r=> r.provider_id)));
  return ids.sort();
}

export const TrustAnomalyDashboard = () => {
  const [selectedCity, setSelectedCity] = useState('Bengaluru');
  const [selectedServiceId, setSelectedServiceId] = useState('srv-plumb-01');
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [trustHistory, setTrustHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    let cancelled = false;
    loadTrustHistory()
      .then((data) => {
        if (!cancelled) {
          setTrustHistory(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || 'Failed to load trust history');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const availableProviders = useMemo(()=> getProvidersForCityService(trustHistory, selectedCity, selectedServiceId), [trustHistory, selectedCity, selectedServiceId]);

  // Auto-select first provider when city/service changes
  React.useEffect(()=>{
    if (availableProviders.length && !availableProviders.includes(selectedProviderId)) {
      setSelectedProviderId(availableProviders[0]);
    } else if (!availableProviders.length) {
      setSelectedProviderId('');
    }
  }, [availableProviders, selectedProviderId]);

  const evaluation = useMemo(()=>{
    if (!selectedProviderId) return null;
    try {
      return evaluateTrust({ providerId: selectedProviderId, city: selectedCity, serviceId: selectedServiceId, trustHistory });
    } catch(e){
      console.warn('[TrustAnomaly] evaluation failed', e);
      return null;
    }
  }, [selectedProviderId, selectedCity, selectedServiceId]);

  const selectedService = ALL_SERVICES.find(s=> s.id===selectedServiceId);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-subtle overflow-hidden">
      <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-black tracking-wider uppercase">Trust & Safety — Anomaly Detection (Stage 1)</div>
            <div className="text-xs text-white/70">Explainable prototype — peer-aware, city/service scoped.</div>
          </div>
          <span className="ml-auto hidden sm:inline px-2 py-1 rounded-full bg-white/15 text-white text-[10px] font-bold border border-white/20">Synthetic historical behavior</span>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>Trust & Safety anomaly detection is a <strong>prototype decision-support system based on synthetic historical behavior</strong>. It does not automatically suspend or ban providers.</span>
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase">City (20)</span>
            <select value={selectedCity} onChange={e=> setSelectedCity(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none">
              {ALL_CITIES.map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase">Service (14)</span>
            <select value={selectedServiceId} onChange={e=> setSelectedServiceId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none">
              {ALL_SERVICES.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase">Provider ({availableProviders.length} in peer group)</span>
            <select value={selectedProviderId} onChange={e=> setSelectedProviderId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none">
              {availableProviders.length===0 && <option value="">No providers</option>}
              {availableProviders.map(pid=> <option key={pid} value={pid}>{pid}</option>)}
            </select>
          </label>
        </div>

        <div className="text-xs text-slate-500">Showing: <strong className="text-slate-900">{selectedCity}</strong> • {selectedService?.name} • {selectedProviderId || '—'} <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px]">Peer group: {selectedCity} + {selectedService?.name} ({availableProviders.length} providers)</span></div>

        {loading && (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-sm text-slate-500">Loading trust history…</div>
        )}
        {error && (
          <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center text-sm text-red-600">Failed to load trust history: {error}</div>
        )}
        {!loading && !error && !trustHistory.length && (
          <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center text-sm text-amber-700">No trust history available — synthetic dataset empty.</div>
        )}
        {!loading && !error && trustHistory.length > 0 && !selectedProviderId ? (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-sm text-slate-500">No eligible providers for this city/service. Try another combination.</div>
        ) : !evaluation ? (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-sm text-slate-500">Loading evaluation…</div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              <div className="p-3 rounded-2xl bg-slate-900 text-white text-center col-span-2 sm:col-span-1">
                <div className="text-[11px] font-bold text-white/60 uppercase">Anomaly Score</div>
                <div className="text-2xl font-black">{evaluation.anomalyScore}</div>
                <div className="text-[11px] text-white/60">0–100</div>
              </div>
              <div className={`p-3 rounded-2xl border text-center ${evaluation.riskLevel==='HIGH' ? 'bg-red-50 border-red-200 text-red-700' : evaluation.riskLevel==='MEDIUM' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                <div className="text-[11px] font-bold uppercase">Risk Level</div>
                <div className="text-sm font-black flex items-center justify-center gap-1">
                  {evaluation.riskLevel==='HIGH' && <AlertTriangle className="w-4 h-4" />}
                  {evaluation.riskLevel==='MEDIUM' && <Scale className="w-4 h-4" />}
                  {evaluation.riskLevel==='LOW' && <CheckCircle2 className="w-4 h-4" />}
                  {evaluation.riskLevel}
                </div>
                <div className="text-[11px] opacity-70">{evaluation.riskLevel==='HIGH' ? 'Review recommended' : evaluation.riskLevel==='MEDIUM' ? 'Review recommended' : 'No action'}</div>
              </div>
              <div className="p-3 rounded-2xl bg-white border border-slate-200 text-center">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Booking Volume</div>
                <div className="text-xl font-black text-slate-900">{evaluation.bookingVolume.toFixed(1)}</div>
                <div className="text-[11px] text-slate-400">avg/day</div>
              </div>
              <div className="p-3 rounded-2xl bg-white border border-slate-200 text-center">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Cancellation Rate</div>
                <div className="text-xl font-black text-slate-900">{(evaluation.cancellationRate*100).toFixed(1)}%</div>
              </div>
              <div className="p-3 rounded-2xl bg-white border border-slate-200 text-center">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Rejection Rate</div>
                <div className="text-xl font-black text-slate-900">{(evaluation.rejectionRate*100).toFixed(1)}%</div>
              </div>
              <div className="p-3 rounded-2xl bg-white border border-slate-200 text-center">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Rating</div>
                <div className="text-xl font-black text-slate-900 flex items-center justify-center gap-1"><Star className="w-4 h-4 text-amber-500" />{evaluation.rating.toFixed(2)}</div>
              </div>
              <div className="p-3 rounded-2xl bg-white border border-slate-200 text-center">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Current Workload</div>
                <div className="text-xl font-black text-slate-900 flex items-center justify-center gap-1"><Clock className="w-4 h-4 text-slate-500" />{evaluation.currentWorkload.toFixed(1)}</div>
              </div>
            </div>

            {/* Why flagged */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-sm font-black text-slate-900 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" /> Why this was flagged</div>
              {evaluation.reasons.length===0 ? (
                <div className="text-xs text-slate-600 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> No significant anomalies — provider behavior is within peer baseline. Anomaly detected — review recommended not needed.</div>
              ) : (
                <ul className="space-y-1.5">
                  {evaluation.reasons.map((r,i)=>(
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2">
                      <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[11px] font-black shrink-0">{i+1}</span>
                      <span>{r} <span className="text-slate-400">— Review recommended.</span></span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="text-[11px] text-slate-500">Weights: Booking 20% • Cancellation 20% • Rejection 15% • Rating 10% • Workload 15% • Spike 15% • Concentration 5% → Anomaly Score 0–100 (LOW 0–39, MEDIUM 40–69, HIGH 70–100). Peer-aware: same city + same service ({evaluation.peerCount} providers).</div>
            </div>

            {/* Supporting metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <div className="font-bold text-slate-700">Peer Booking Avg</div>
                <div className="text-slate-900">{evaluation.metrics.bookingVolume.peerMean.toFixed(2)} (provider {evaluation.metrics.bookingVolume.providerAvg.toFixed(2)})</div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <div className="font-bold text-slate-700">Peer Cancel Avg</div>
                <div className="text-slate-900">{(evaluation.metrics.cancellationRate.peerMean*100).toFixed(1)}% (provider {(evaluation.metrics.cancellationRate.provider*100).toFixed(1)}%)</div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <div className="font-bold text-slate-700">Peer Rating Avg</div>
                <div className="text-slate-900">{evaluation.metrics.rating.peerMean.toFixed(2)} (provider {evaluation.metrics.rating.provider.toFixed(2)})</div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <div className="font-bold text-slate-700">Concentration</div>
                <div className="text-slate-900">{(evaluation.metrics.concentration.providerShare*100).toFixed(1)}% share of {evaluation.metrics.concentration.peerCount} peers</div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
              Do not describe as fraud probability. This is <strong>Anomaly Score</strong> for decision-support. {evaluation.riskLevel !== 'LOW' ? 'Anomaly detected — review recommended.' : 'No suspension or ban is automatic.'}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TrustAnomalyDashboard;

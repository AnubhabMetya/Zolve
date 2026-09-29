import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, Clock, AlertCircle, CheckCircle2, Brain, Zap } from 'lucide-react';
import { semanticMatch, rebuildProviderEmbeddings } from '../../services/semanticService';
import { findCategoryForServiceName } from '../../data/serviceCatalog.js';
import { useApp } from '../../context/AppContext';

export const SemanticServiceMatcher = ({ compact = false, onSelectServiceName }) => {
  const { providers, selectedLocation, savedAddresses } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Geo-filter semantic retrieval to 50km local providers (city hard filter).
  // Provider identities are used ONLY for matching signal — never displayed.
  const customerLocation = React.useMemo(() => {
    if (selectedLocation && typeof selectedLocation !== 'string' && selectedLocation.lat != null) return selectedLocation;
    const def = savedAddresses?.find(a => a.isDefault) || savedAddresses?.[0];
    return def?.coords || null;
  }, [selectedLocation, savedAddresses]);

  // After the customer confirms an AI suggestion → normal service catalog.
  const handleViewServices = (serviceName) => {
    if (onSelectServiceName) {
      onSelectServiceName(serviceName);
      return;
    }
    const cat = findCategoryForServiceName(serviceName);
    if (cat) navigate(`/services/${cat.id}`);
  };

  // Keep provider embeddings in sync when Supabase providers update
  React.useEffect(() => {
    if (providers && providers.length) {
      try { rebuildProviderEmbeddings(providers); } catch {}
    }
  }, [providers]);

  const handleSearch = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    setIsSearching(true);
    // Small debounce to show AI thinking state
    setTimeout(() => {
      // GEO FILTER: pass customerLocation so semantic retrieval is limited to 50km local providers (city hard filter)
      const res = semanticMatch(q, providers, customerLocation);
      setResult(res);
      setHasSearched(true);
      setIsSearching(false);
    }, 320);
  }, [query, providers, customerLocation]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const showLow = result?.isLowConfidence;

  return (
    <div className={`bg-white rounded-3xl border border-slate-200/80 shadow-subtle overflow-hidden ${compact ? 'p-5' : 'p-6 sm:p-7'}`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-900 to-coop-700 flex items-center justify-center shadow-sm">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
            AI Service Understanding
            <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[9px] font-extrabold border border-amber-200">SEMANTIC</span>
          </h3>
          <p className="text-[11px] text-slate-500">Describe your problem in natural language — AI finds the right service & providers.</p>
        </div>
      </div>

      {/* Input */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-800">Describe your problem</label>
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='e.g. My bathroom tap is leaking, AC is blowing warm air...'
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-colors"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!query.trim() || isSearching}
            className="px-5 py-3 rounded-xl bg-brand-900 hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shrink-0"
          >
            {isSearching ? <Sparkles className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            <span>{isSearching ? 'Analyzing…' : 'Find Best Service'}</span>
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium self-center">Try:</span>
          {['My bathroom tap is leaking','My AC is running but not cooling','My washing machine is making a strange noise','My kitchen sink is clogged'].map(ex => (
            <button
              key={ex}
              onClick={() => setQuery(ex)}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-[11px] text-slate-600 border border-slate-200 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {hasSearched && result && (
        <div className="mt-6 space-y-5 animate-in fade-in slide-in-from-top-1">
          {/* Low confidence fallback */}
          {showLow && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-amber-900">Low confidence — please clarify</div>
                <p className="text-xs text-amber-800 mt-1">We couldn't confidently match your request. Try adding details like location (kitchen/bathroom), device (AC/washing machine/tap), and symptom (leaking / not cooling / noise). You can still browse all services below.</p>
                <div className="text-[11px] text-amber-700 mt-1">Best guess: <strong>{result.detectedService?.name}</strong> ({result.confidencePercent}% match) — below threshold {12}%</div>
              </div>
            </div>
          )}

          {/* Detected service card */}
          {result.detectedService && !showLow && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-50 to-coop-50 border border-brand-200/60 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold text-brand-700 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI Detected Service
                  </div>
                  <div className="text-base font-black text-slate-900 mt-1">{result.detectedService.name}</div>
                  <div className="text-xs text-slate-600">{result.detectedService.category} • {result.detectedService.subcategory}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Confidence</div>
                  <div className={`text-lg font-black ${result.confidencePercent >= 70 ? 'text-emerald-700' : result.confidencePercent >= 40 ? 'text-amber-700' : 'text-slate-700'}`}>{result.confidencePercent}%</div>
                  <div className="w-20 h-1.5 rounded-full bg-slate-200 mt-1 overflow-hidden ml-auto">
                    <div className={`h-full ${result.confidencePercent >= 70 ? 'bg-emerald-600' : result.confidencePercent >= 40 ? 'bg-amber-500' : 'bg-slate-400'}`} style={{ width: `${Math.min(100, result.confidencePercent)}%` }} />
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{result.detectedService.description}</p>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="px-2 py-1 rounded-full bg-white border border-slate-200 font-semibold">Starts from ₹{result.detectedService.basePrice}</span>
                <button onClick={() => handleViewServices(result.detectedService.name)} className="px-3 py-1 rounded-full bg-brand-900 text-white font-bold hover:bg-brand-800">View services →</button>
              </div>
              <p className="text-[11px] text-slate-500">Zolve assigns the best qualified partner after booking — no need to choose.</p>
            </div>
          )}

          {/* Matched categories */}
          {result.allServiceScores && result.allServiceScores.length > 0 && !showLow && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800">Matched service categories</div>
              <div className="flex flex-wrap gap-1.5">
                {result.allServiceScores.slice(0,4).map(s => (
                  <span key={s.name} className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {s.name} <span className="text-[10px] text-slate-400">{s.percent}%</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Related skills */}
          {result.relatedSkills && result.relatedSkills.length > 0 && !showLow && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800">Related skills</div>
              <div className="flex flex-wrap gap-1.5">
                {result.relatedSkills.map(skill => (
                  <span key={skill} className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Internal coverage note — never exposes the partner candidate pool */}
          {hasSearched && result && !showLow && result.topProviders.length === 0 && (
            <div className="p-3 rounded-2xl border border-red-200 bg-red-50 flex items-center gap-2 text-xs text-red-800">
              <AlertCircle className="w-4 h-4" />
              <span>Services not available in this area. Try another city or service.</span>
            </div>
          )}
          <p className="text-[11px] text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Describe your problem in your own words — AI matches it to the right service catalog.</p>
        </div>
      )}

      {!hasSearched && (
        <p className="text-[11px] text-slate-400 mt-4">Examples: "My bathroom tap is leaking" → Plumbing • "My AC is blowing warm air" → AC Repair • "My washing machine is making noise" → Appliance Repair</p>
      )}
    </div>
  );
};

export default SemanticServiceMatcher;

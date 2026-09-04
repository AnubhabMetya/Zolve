import React, { useState } from 'react';
import { Award, MapPin, Clock, Star, ShieldCheck, ChevronDown, ChevronUp, Scale, Users, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';

export const FairMatchRecommendation = ({ rankedResult, onBook, onViewProfile }) => {
  const [showDetails, setShowDetails] = useState(false);
  if (!rankedResult || !rankedResult.recommendedProvider) return null;

  const rec = rankedResult.recommendedProvider;
  const provider = rec.provider;

  return (
    <div className="bg-gradient-to-br from-coop-50 via-white to-brand-50 rounded-3xl border border-coop-200 shadow-subtle overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-coop-600 to-brand-700 flex items-center justify-center">
            <Scale className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-xs font-black text-coop-800 uppercase tracking-wider flex items-center gap-1.5">
              AI Recommended Provider <span className="px-1.5 py-0.5 rounded bg-coop-600 text-white text-[8px] font-extrabold">FAIRMATCH</span>
            </div>
            <div className="text-[11px] text-slate-500">Balanced for skill, distance, availability & cooperative fairness</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">FairMatch Score</div>
            <div className={`text-xl font-black ${rec.finalScore >= 85 ? 'text-emerald-700' : rec.finalScore >= 70 ? 'text-amber-700' : 'text-slate-700'}`}>{rec.finalScore}/100</div>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
            {provider.avatar ? <img src={provider.avatar} alt={provider.name} className="w-full h-full object-cover" /> : <ShieldCheck className="w-6 h-6 text-coop-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black text-slate-900 truncate">{provider.name}</div>
            <div className="text-xs text-slate-600 truncate">{provider.title}</div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
              <span className="flex items-center gap-1 font-bold text-amber-600"><Star className="w-3 h-3 fill-amber-500" />{provider.rating}</span>
              <span>• {provider.completedJobs} jobs</span>
              {rec.distanceKm != null && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{rec.distanceKm < 1 ? `${Math.round(rec.distanceKm*1000)}m` : `${rec.distanceKm.toFixed(1)}km`} away</span>}
              {provider.isCoopMember && <span className="px-1.5 py-0.5 rounded-full bg-coop-50 text-coop-700 text-[9px] font-extrabold border border-coop-200 flex items-center gap-0.5"><Award className="w-3 h-3" />Co-op</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4 text-center">
          <div className="p-2 rounded-xl bg-white border border-slate-200">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Semantic Skill Match</div>
            <div className="text-sm font-black text-slate-900">{rec.skillScore}</div>
          </div>
          <div className="p-2 rounded-xl bg-white border border-slate-200">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Distance</div>
            <div className="text-sm font-black text-slate-900">{rec.distanceScore}</div>
          </div>
          <div className="p-2 rounded-xl bg-white border border-slate-200">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Availability</div>
            <div className="text-sm font-black text-slate-900">{rec.availabilityScore}</div>
          </div>
          <div className="p-2 rounded-xl bg-white border border-slate-200">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Current Workload</div>
            <div className="text-sm font-black text-slate-900">{rec.workloadScore}</div>
          </div>
        </div>

        <div className="mt-3 space-y-1">
          {rec.explanation.slice(0,4).map((e,i)=>(
            <div key={i} className="flex items-center gap-1.5 text-xs text-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{e}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button onClick={() => onBook && onBook(provider)} className="flex-1 px-4 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold">Book Provider</button>
          <button onClick={()=> setShowDetails(!showDetails)} className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1">
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showDetails ? 'Hide Why' : 'View Why'}
          </button>
        </div>

        {showDetails && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in">
            <div className="text-xs font-black text-slate-900">FairMatch Breakdown</div>
            <div className="space-y-2 text-xs">
              {[
                {label:'Semantic Skill Match (30%)', value: rec.skillScore, desc: 'Semantic similarity from Feature 1'},
                {label:'Distance (20%)', value: rec.distanceScore, desc: rec.distanceKm != null ? `${rec.distanceKm.toFixed(1)}km` : 'Location unavailable — renormalized', missing: rec.distanceKm==null},
                {label:'Availability (15%)', value: rec.availabilityScore, desc: 'Requested time eligibility'},
                {label:'Reliability (10%)', value: rec.reliabilityScore, desc: rec.reliabilityInsufficient ? 'Insufficient data — neutral fallback' : 'Cancellation/completion history'},
                {label:'Customer Rating (10%)', value: rec.ratingScore, desc: `Rating ${provider.rating} (${provider.ratingCount} reviews)`},
                {label:'Current Workload (5%)', value: rec.workloadScore, desc: `${rec.workloadActive} active jobs`},
                {label:'Cooperative Fairness (10%)', value: rec.fairnessScore, desc: 'Lower recent jobs → higher score'},
              ].map(row=>(
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-800">{row.label}</div>
                    <div className="text-[11px] text-slate-500">{row.desc}</div>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-xs font-black border ${row.value >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : row.value >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{row.value}</div>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-black">
                <span>Final FairMatch Score</span>
                <span className="text-brand-900">{rec.finalScore}/100</span>
              </div>
            </div>
            {rankedResult.excluded && rankedResult.excluded.length>0 && (
              <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2">
                <div className="font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {rankedResult.excluded.length} provider(s) excluded (hard constraints):</div>
                <div className="mt-1">{rankedResult.excluded.slice(0,3).map(e=> `${e.provider.id} (${e.reason})`).join(', ')}</div>
              </div>
            )}
            <div className="text-[11px] text-slate-400">Weights: Skill 30% • Distance 20% • Availability 15% • Reliability 10% • Rating 10% • Workload 5% • Fairness 10%. Distance renormalized if location missing.</div>
          </div>
        )}
      </div>

      {rankedResult.rankedCandidates.length > 1 && (
        <div className="px-5 pb-5">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Ranked Local Candidates ({rankedResult.rankedCandidates.length}{rankedResult.rankedCandidates.length >= 10 ? ' — showing top 10' : ''})</div>
          <div className="space-y-1.5">
            {rankedResult.rankedCandidates.slice(0,10).map((c,i)=>(
              <div key={c.provider.id} className={`flex items-center justify-between p-2.5 rounded-xl border ${i===0 ? 'bg-brand-900 text-white border-brand-900' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${i===0 ? 'bg-white text-brand-900' : 'bg-slate-100 text-slate-700'}`}>{i+1}</span>
                  <span className={`text-xs font-bold truncate ${i===0 ? 'text-white' : 'text-slate-900'}`}>{c.provider.name} <span className={`font-normal ${i===0 ? 'text-brand-200' : 'text-slate-400'}`}>• {c.provider.title.slice(0,24)}</span></span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${i===0 ? 'bg-white text-brand-900' : 'bg-slate-100 text-slate-700'}`}>{c.finalScore}/100</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FairMatchRecommendation;

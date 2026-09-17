import React, { useState, useEffect } from 'react';
import { ShieldCheck, Heart, Award, FileText, AlertTriangle, CheckCircle2, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getPoliciesForProvider, getClaimsForProvider, fileClaim, INSURANCE_COVER_AMOUNT } from '../../services/insuranceService';

export const WelfareInsurancePanel = () => {
  const { currentUser, addNotification } = useApp();
  const providerId = currentUser?.id || 'demo-provider-01';
  const [policies, setPolicies] = useState(() => getPoliciesForProvider(providerId));
  const [claims, setClaims] = useState(() => getClaimsForProvider(providerId));
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('10000');
  const [selectedPolicy, setSelectedPolicy] = useState('');

  const refresh = () => {
    setPolicies(getPoliciesForProvider(providerId));
    setClaims(getClaimsForProvider(providerId));
  };
  useEffect(() => {
    const h = () => refresh();
    window.addEventListener('zolve:insurance', h);
    return () => window.removeEventListener('zolve:insurance', h);
  }, [providerId]);

  const handleFileClaim = async () => {
    const pid = selectedPolicy || policies[0]?.id;
    if (!pid) { alert('No active policy — complete a job to auto-generate coverage'); return; }
    if (!reason.trim()) { alert('Add reason'); return; }
    await fileClaim({ policyId: pid, providerId, reason, amount: Number(amount) || 10000 });
    addNotification({ title: 'Insurance Claim Filed', message: `Claim for ${reason} under review.`, type: 'system' });
    setReason(''); refresh();
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-subtle p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-coop-600 to-emerald-600 text-white flex items-center justify-center"><Heart className="w-5 h-5" /></div>
        <div>
          <h3 className="text-sm font-black text-slate-900">Worker Welfare & Insurance — ₹5 Lakh Cover</h3>
          <p className="text-xs text-slate-500">4% cooperative reserve per booking funds accident & tool insurance. Coverage auto-created on SERVICE_COMPLETED.</p>
        </div>
        <span className="ml-auto hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-coop-50 text-coop-700 text-[11px] font-bold border border-coop-200"><ShieldCheck className="w-3.5 h-3.5" /> Active</span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200"><div className="text-[11px] font-bold text-slate-500 uppercase">Policies</div><div className="text-xl font-black text-slate-900">{policies.length}</div></div>
        <div className="p-3 rounded-2xl bg-coop-50 border border-coop-200"><div className="text-[11px] font-bold text-coop-700 uppercase">Cover per Policy</div><div className="text-lg font-black text-coop-800">₹{(INSURANCE_COVER_AMOUNT/100000).toFixed(0)} Lakh</div></div>
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200"><div className="text-[11px] font-bold text-amber-700 uppercase">Claims</div><div className="text-xl font-black text-amber-800">{claims.length}</div></div>
      </div>

      {policies.length === 0 ? (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-center">No coverage yet — complete a service job to auto-generate ₹5L policy. Demo: mark a booking as <strong>SERVICE_COMPLETED</strong> in Provider queue.</div>
      ) : (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase">Active Policies</h4>
          {policies.slice(0,3).map(p => (
            <div key={p.id} className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
              <div><div className="font-bold text-slate-900">{p.id} • {p.city}</div><div className="text-slate-500">Booking {p.bookingId?.slice(0,8)} • Premium from reserve ₹{p.premiumFromReserve}</div></div>
              <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">Active till {new Date(p.validTill).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><FileText className="w-4 h-4 text-slate-600" /> File a Claim</h4>
        {policies.length > 0 && (
          <select value={selectedPolicy} onChange={e=>setSelectedPolicy(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
            <option value="">Auto-select latest policy</option>
            {policies.map(p=><option key={p.id} value={p.id}>{p.id} — {p.city}</option>)}
          </select>
        )}
        <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason — e.g. Tool damage on site, medical" className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs" />
        <div className="flex gap-2">
          <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Amount" className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs" />
          <button onClick={handleFileClaim} className="px-4 py-2 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> File Claim</button>
        </div>
        {claims.length > 0 && (
          <div className="space-y-1.5 pt-2">
            {claims.slice(0,3).map(c=>(
              <div key={c.id} className="p-2 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between">
                <span>{c.reason} • ₹{c.amount}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.status==='under_review'?'bg-amber-50 text-amber-700 border-amber-200':c.status==='approved'?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-slate-100'}`}>{c.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-500"><Award className="w-3.5 h-3.5 text-coop-600" /><span>Transparent economics: provider 88% + 8% platform + 4% welfare reserve pooled for insurance & tool grants.</span></div>
    </div>
  );
};

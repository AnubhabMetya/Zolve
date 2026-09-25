import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Briefcase } from 'lucide-react';

export const PartnerAccessGate = () => {
  const navigate = useNavigate();
  const enableDemo = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('demo', '1');
    window.location.href = url.toString();
  };
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-premium p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-black text-white flex items-center justify-center mx-auto font-black text-xl">Z</div>
        <div>
          <h2 className="text-xl font-black text-slate-900">Partner App</h2>
          <p className="text-xs text-slate-500 mt-1">Exclusive workspace for Zolve Executives. Sign in or continue with demo to preview the operational dashboard.</p>
        </div>
        <div className="flex items-center justify-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
          <ShieldCheck className="w-3.5 h-3.5" /> Secure Partner Area
        </div>
        <div className="space-y-2">
          <button onClick={() => navigate('/login')} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2">
            Sign In <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => navigate('/join-executive')} className="w-full py-3 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm font-bold flex items-center justify-center gap-2">
            <Briefcase className="w-4 h-4" /> Join as Executive
          </button>
          <button onClick={enableDemo} className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold">
            Continue as Demo Executive (Arjun Patel) →
          </button>
        </div>
        <p className="text-[10px] text-slate-400">Demo mode uses mock data — no real bookings are created.</p>
      </div>
    </div>
  );
};
export default PartnerAccessGate;

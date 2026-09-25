import React from 'react';
import { CheckCircle2, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';

export const PartnerActivationScreen = ({ selectedSkills = [], derivedVerticalTitle, onGoDashboard, persistedApp, selectedLocation }) => {
  return (
    <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
      </div>
      <div>
        <h1 className="text-2xl font-black font-display text-slate-900">Your Zolve Partner Profile is Ready</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">All onboarding stages completed. Your profile is now activated.</p>
      </div>

      <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-left space-y-3 max-w-lg mx-auto shadow-sm">
        <div className="flex items-center gap-2 text-emerald-700 font-bold"><CheckCircle2 className="w-4 h-4" /> Services Selected ✓</div>
        <div className="flex flex-wrap gap-1.5">
          {selectedSkills.map((sid) => (
            <span key={sid} className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px] border border-emerald-300">✓ {sid}</span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-emerald-700 font-bold"><ShieldCheck className="w-4 h-4" /> Details Verified ✓</div>
        <div className="flex items-center gap-2 text-emerald-700 font-bold"><ShieldCheck className="w-4 h-4" /> Identity Verified ✓</div>
        <div className="flex items-center gap-2 text-emerald-700 font-bold"><Sparkles className="w-4 h-4" /> Profile Completed ✓</div>
        <div className="pt-2 border-t border-emerald-200 flex items-center justify-between">
          <span className="font-bold text-slate-700">Status:</span>
          <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black">Partner Profile Activated</span>
        </div>
        <div className="text-[11px] text-slate-500">Operating radius: 50 km from {selectedLocation?.city || selectedLocation?.name || 'your area'} • FairMatch: Enabled</div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-800 text-left max-w-lg mx-auto">
        <strong>Next:</strong> Go online in the Partner App. Live selfie verification will be required only when you tap <strong>GO ONLINE</strong> to receive service requests.
      </div>

      <button onClick={onGoDashboard} className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md inline-flex items-center gap-2">
        Enter Partner App <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default PartnerActivationScreen;

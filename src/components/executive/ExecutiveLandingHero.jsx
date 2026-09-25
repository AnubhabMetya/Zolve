import React from 'react';
import { CheckCircle2, MapPin, Zap } from 'lucide-react';

export const ExecutiveLandingHero = ({ user, onGoJobs }) => {
  const isWelcome = new URLSearchParams(window.location.search).has('welcome');
  if (!isWelcome && user) return null;
  return (
    <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 shadow-premium relative overflow-hidden">
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
      <div className="relative">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-xs font-bold">
          <Zap className="w-3 h-3" /> Welcome aboard — Profile Activated ✅
        </div>
        <h2 className="text-lg font-black mt-2">Welcome, {user?.name || 'Partner'} — ready to earn?</h2>
        <p className="text-xs text-blue-100 mt-1">Your executive workspace is live. Complete your first 3 steps to get your first booking.</p>
        <div className="grid grid-cols-3 gap-2 mt-4 text-[11px]">
          <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-2"><CheckCircle2 className="w-3.5 h-3.5" /> Verify location ✓</div>
          <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-2"><MapPin className="w-3.5 h-3.5" /> Browse jobs</div>
          <div className="flex items-center gap-1.5 bg-white rounded-xl px-3 py-2 text-blue-700 font-bold">Go Online</div>
        </div>
        {onGoJobs && <button onClick={onGoJobs} className="mt-4 px-4 py-2 rounded-xl bg-white text-blue-700 text-xs font-black">Explore Opportunities →</button>}
      </div>
    </div>
  );
};
export default ExecutiveLandingHero;

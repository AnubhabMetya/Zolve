import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Award,
  AlertTriangle,
  FileText,
  Clock,
  PhoneCall,
  UserCheck,
  Building
} from 'lucide-react';

export const TrustAndSafety = () => {
  const { setIsReportProblemOpen, supportTickets } = useApp();

  return (
    <div className="space-y-12 pb-16">
      {/* Hero */}
      <div className="relative rounded-3xl bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900 text-white p-6 sm:p-10 lg:p-12 overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-xs font-semibold text-coop-300">
            <ShieldCheck className="w-4 h-4 text-coop-400" />
            <span>Zolve Trust, Safety & Quality Standards</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display tracking-tight text-white leading-tight">
            Built on Absolute Trust, Verified Skill & Escrow Safety
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-light">
            Every service professional on Zolve is vetted through a rigorous 4-step verification framework. Payments are secured in escrow, and disputes are judged transparently by the community council.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsReportProblemOpen(true)}
              className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Report a Problem / Raise Dispute</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4-TIER VERIFICATION PROCESS */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-display">
            The 4-Tier Provider Verification Framework
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Only 18% of applying service professionals qualify for full Zolve verified accreditation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-subtle space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center font-black">
              1
            </div>
            <h3 className="text-base font-bold text-slate-900 font-display">Govt ID & Address KYC</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Biometric Aadhaar authentication, PAN verification, and permanent residential address confirmation.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-subtle space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-coop-100 text-coop-700 flex items-center justify-center font-black">
              2
            </div>
            <h3 className="text-base font-bold text-slate-900 font-display">Practical Skill Benchmark</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              In-person practical trade evaluation conducted by senior cooperative delegates with standard toolkits.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-subtle space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
              3
            </div>
            <h3 className="text-base font-bold text-slate-900 font-display">Criminal Background Check</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Police verification records cross-referenced against state court registries and identity databases.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-subtle space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-black">
              4
            </div>
            <h3 className="text-base font-bold text-slate-900 font-display">Co-op Code of Ethics</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Customer de-escalation, punctuality commitment, and zero-tolerance policy for unauthorized pricing markups.
            </p>
          </div>
        </div>
      </section>

      {/* DISPUTE RESOLUTION TICKETS */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-subtle space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-display">Active & Resolved Support Disputes</h3>
            <p className="text-xs text-slate-500">Every ticket is assigned a dedicated arbitration officer</p>
          </div>
        </div>

        <div className="space-y-3">
          {supportTickets.map((tkt) => (
            <div
              key={tkt.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-brand-700">#{tkt.ticketCode}</span>
                  <span className="font-bold text-slate-900">{tkt.category}</span>
                  <span className="px-2 py-0.5 rounded-full bg-coop-100 text-coop-800 text-[10px] font-bold">
                    {tkt.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-slate-600 italic">"{tkt.description}"</p>
                {tkt.resolutionNotes && (
                  <div className="text-[11px] text-coop-800 font-medium">
                    Resolution: {tkt.resolutionNotes}
                  </div>
                )}
              </div>

              <div className="text-slate-400 text-[10px] shrink-0">
                Created on {new Date(tkt.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

import React from 'react';
import { ShieldCheck, Heart, Sparkles, Building2, Users, Award, ExternalLink } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Footer = () => {
  const { setActiveTab, setIsCopilotOpen } = useApp();

  return (
    <footer className="bg-brand-950 text-slate-300 border-t border-slate-800 pt-16 pb-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800/80">
          {/* Brand & Mission Statement */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-black border border-white/20 flex items-center justify-center text-white font-black text-xl shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                Z
              </div>
              <div>
                <span className="text-2xl font-extrabold text-white tracking-tight font-display">
                  Zolve
                </span>
                <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-coop-900/60 text-coop-300 border border-coop-700/50">
                  Cooperative Gig Platform
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Connecting households and housing societies with certified local service professionals while empowering providers through cooperative governance, transparent earnings, and shared community value.
            </p>
            <div className="flex items-center gap-3 pt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1 text-coop-400 font-semibold">
                <ShieldCheck className="w-4 h-4" /> 100% Verified Providers
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Award className="w-4 h-4" /> Razorpay Escrow Safe
              </span>
            </div>
          </div>

          {/* Service Categories */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Household Services
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><button onClick={() => setActiveTab('home')} className="hover:text-white transition-colors">Full Home Deep Cleaning</button></li>
              <li><button onClick={() => setActiveTab('home')} className="hover:text-white transition-colors">Plumbing & Concealed Leak Fixes</button></li>
              <li><button onClick={() => setActiveTab('home')} className="hover:text-white transition-colors">Electrical & MCB Tripping</button></li>
              <li><button onClick={() => setActiveTab('home')} className="hover:text-white transition-colors">AC Deep Foam Jet Service</button></li>
              <li><button onClick={() => setActiveTab('home')} className="hover:text-white transition-colors">Artisan Carpentry & Furniture</button></li>
              <li><button onClick={() => setActiveTab('home')} className="hover:text-white transition-colors">Organic Pest Control</button></li>
            </ul>
          </div>

          {/* Cooperative & Community */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              The Cooperative
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><button onClick={() => setActiveTab('cooperative')} className="hover:text-white transition-colors">Cooperative Model & 4 Pillars</button></li>
              <li><button onClick={() => setActiveTab('cooperative')} className="hover:text-white transition-colors">Governance & Digital Voting</button></li>
              <li><button onClick={() => setActiveTab('training')} className="hover:text-white transition-colors">Skill Training Academy</button></li>
              <li><button onClick={() => setActiveTab('community')} className="hover:text-white transition-colors">Neighborhood Civic Projects</button></li>
              <li><button onClick={() => setActiveTab('society')} className="hover:text-white transition-colors">Housing Society Management</button></li>
            </ul>
          </div>

          {/* Trust & Architecture */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Trust & Safety
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><button onClick={() => setActiveTab('trust')} className="hover:text-white transition-colors">4-Tier Provider Verification</button></li>
              <li><button onClick={() => setActiveTab('trust')} className="hover:text-white transition-colors">Dispute Resolution Council</button></li>
              <li><button onClick={() => setIsCopilotOpen(true)} className="hover:text-white text-coop-400 font-semibold transition-colors flex items-center gap-1">AI Assistant Copilot</button></li>
              <li><span className="text-[11px] text-slate-500 block pt-2">Powered by PostgreSQL, n8n Cloud & Razorpay</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Zolve Cooperative Platform. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Primary Tagline: <strong className="text-slate-300 font-medium">Trusted Services. Stronger Communities.</strong></span>
          </div>
        </div>
      </div>
    </footer>
  );
};

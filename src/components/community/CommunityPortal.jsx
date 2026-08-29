import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  HeartHandshake,
  Users,
  Building2,
  ShieldCheck,
  Award,
  Sparkles,
  Calendar,
  MapPin,
  ArrowRight,
  Droplets,
  Zap,
  CheckCircle2,
  TreePine,
  HelpCircle,
  Plus
} from 'lucide-react';

export const CommunityPortal = () => {
  const { communityProjects, joinedProjects, joinCommunityProject, currentUser, activeRole, setActiveTab } = useApp();

  return (
    <div className="space-y-12 pb-16">
      {/* 1. DARK HERO BANNER (MATCHING EXPLORE SERVICE) */}
      <div className="relative rounded-3xl bg-gradient-to-br from-brand-900 via-brand-950 to-coop-950 text-white p-6 sm:p-10 lg:p-12 overflow-hidden shadow-2xl">
        {/* Subtle decorative glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-brand-500/15 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 rounded-full bg-coop-500/15 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-xs font-semibold text-coop-300">
            <HeartHandshake className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>Cooperative Community Impact & Civic Action</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display tracking-tight text-white leading-tight">
            Stronger Neighborhoods Through Shared Local Service
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl font-light">
            In traditional gig apps, value is extracted outside your city. In Zolve's cooperative model, 4% of every booking fund powers local stormwater cleanups, free electrical safety audits for seniors, and apprentice tool grants for neighborhood youth.
          </p>

          {/* Real-time Community Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
              <div className="text-[10px] text-coop-300 uppercase font-bold">Households Served</div>
              <div className="text-lg sm:text-xl font-black text-white mt-0.5">10,450+</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
              <div className="text-[10px] text-coop-300 uppercase font-bold">Civic Drives Completed</div>
              <div className="text-lg sm:text-xl font-black text-coop-300 mt-0.5">38 Drives</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
              <div className="text-[10px] text-coop-300 uppercase font-bold">Senior Home Audits</div>
              <div className="text-lg sm:text-xl font-black text-amber-300 mt-0.5">84 Free Audits</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
              <div className="text-[10px] text-coop-300 uppercase font-bold">Member Welfare Fund</div>
              <div className="text-lg sm:text-xl font-black text-white mt-0.5">₹14.8 Lakhs</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ACTIVE CIVIC PROJECTS & DRIVES */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-display flex items-center gap-2">
              <TreePine className="w-5 h-5 text-coop-600" />
              <span>Active Neighborhood Initiatives & Projects</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Volunteer or join forces with cooperative trade squads in your local area
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {communityProjects.map((proj) => {
            const hasJoined = joinedProjects[proj.id];
            return (
              <div
                key={proj.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-subtle hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between group"
              >
                <div className="relative h-48 bg-slate-100 overflow-hidden">
                  <img
                    src={proj.image}
                    alt={proj.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-brand-900/80 backdrop-blur-md text-white text-[10px] font-bold">
                    {proj.category}
                  </span>
                  <span className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-md text-slate-200 text-[10px] font-semibold flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-coop-400" />
                    {proj.date}
                  </span>
                </div>

                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-900 transition-colors">
                      {proj.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {proj.impact}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-2.5">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{proj.location}</span>
                    </div>

                    <div className="text-[11px] text-coop-700 font-bold flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{proj.participants}</span>
                    </div>

                    <button
                      onClick={() => joinCommunityProject(proj.id)}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        hasJoined
                          ? 'bg-coop-50 text-coop-700 border border-coop-300'
                          : 'bg-brand-900 hover:bg-brand-800 text-white shadow-sm'
                      }`}
                    >
                      {hasJoined ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-coop-600" />
                          <span>Registered Volunteer ✓</span>
                        </>
                      ) : (
                        <>
                          <span>Join / Volunteer for Drive</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. HOUSING SOCIETY PARTNERSHIP SPOTLIGHT */}
      <section className="bg-white rounded-3xl border border-slate-200/90 shadow-subtle p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-500" />
              <span>Housing Society & Resident Welfare Partnerships</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Bulk managed services for apartment complexes with dedicated cooperative technicians
            </p>
          </div>

          <button
            onClick={() => setActiveTab('society')}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors self-start"
          >
            Open Society Portal →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-blue-600" />
              <span>Central Water Sump Sanitation</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Automated 6-stage UV sterilizer cleaning for society sumps with certified water purity reports.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Transformer & DG Safety Audits</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Bi-monthly thermographic scans on power panels by certified Level 2 electrical safety engineers.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-coop-600" />
              <span>Dedicated Emergency Rapid Squad</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              30-minute priority dispatch for lift emergencies, water mains bursts, and power panel outages.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

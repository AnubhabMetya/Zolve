import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Award,
  Users,
  Vote,
  HeartHandshake,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  PieChart,
  Layers,
  HelpCircle
} from 'lucide-react';

export const CooperativePortal = () => {
  const {
    currentUser,
    proposals,
    voteOnProposal,
    trainingModules,
    enrollTraining,
    communityProjects,
    addNotification
  } = useApp();

  const [activeTab, setActiveTab] = useState('governance'); // 'governance' | 'training' | 'pillars' | 'projects'

  const handleVote = (proposalId, choice) => {
    voteOnProposal(proposalId, choice);
      };

  return (
    <div className="space-y-12 pb-16">
      {/* 1. HERO SECTION (MATCHING EXPLORE SERVICE DARK GRADIENT) */}
      <div className="relative rounded-3xl bg-gradient-to-br from-brand-900 via-brand-950 to-coop-950 text-white p-6 sm:p-10 lg:p-12 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-brand-500/15 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 rounded-full bg-coop-500/15 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-xs font-semibold text-coop-300">
            <Award className="w-3.5 h-3.5 text-amber-300" />
            <span>Zolve Democratic Member Ecosystem</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display tracking-tight text-white leading-tight">
            A Platform Built With Its Community
          </h1>

          <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-light">
            Zolve is designed to give eligible service providers more than access to jobs. The cooperative model gives members a democratic voice in the ecosystem and creates opportunities for skill training, community development, and shared value.
          </p>

          {/* Member Stats Snapshot if logged in */}
          {currentUser && (
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
                <div className="text-[10px] text-coop-300 uppercase font-bold">Membership Status</div>
                <div className="text-sm font-extrabold text-white mt-0.5">
                  {currentUser.isCoopMember ? "Active Member ✓" : "Standard Tier"}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
                <div className="text-[10px] text-coop-300 uppercase font-bold">Member Since</div>
                <div className="text-sm font-extrabold text-white mt-0.5">August 2024</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
                <div className="text-[10px] text-coop-300 uppercase font-bold">Governance Participation</div>
                <div className="text-sm font-extrabold text-coop-300 mt-0.5">94% of Votes</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
                <div className="text-[10px] text-coop-300 uppercase font-bold">Training Certifications</div>
                <div className="text-sm font-extrabold text-amber-300 mt-0.5">3 Modules Completed</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('governance')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'governance'
              ? 'bg-brand-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Vote className="w-4 h-4" />
          <span>Governance & Voting ({proposals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('training')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'training'
              ? 'bg-brand-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Skill Training Academy ({trainingModules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pillars')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'pillars'
              ? 'bg-brand-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>The 4 Cooperative Pillars</span>
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'projects'
              ? 'bg-brand-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <HeartHandshake className="w-4 h-4" />
          <span>Community Civic Projects</span>
        </button>
      </div>

      {/* TAB 1: GOVERNANCE & VOTING */}
      {activeTab === 'governance' && (
        <section className="space-y-6 animate-in fade-in">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-display">
              Active Member Proposals & Digital Voting
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Every eligible member casts one vote. Proposals achieving quorum shape platform policies and welfare grants.
            </p>
          </div>

          <div className="space-y-6">
            {proposals.map((prop) => {
              const totalVotes = prop.votes.total || (prop.votes.yes + prop.votes.no + prop.votes.abstain);
              const yesPercent = totalVotes > 0 ? Math.round((prop.votes.yes / totalVotes) * 100) : 0;
              const noPercent = totalVotes > 0 ? Math.round((prop.votes.no / totalVotes) * 100) : 0;
              const quorumPercent = Math.min(100, Math.round((totalVotes / prop.quorumRequired) * 100));

              return (
                <div
                  key={prop.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-subtle p-6 sm:p-8 space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-coop-50 text-coop-700 text-[10px] font-extrabold border border-coop-200">
                          {prop.code}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                          {prop.category}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          prop.status === 'active' ? 'bg-amber-100 text-amber-800' : 'bg-coop-100 text-coop-800'
                        }`}>
                          {prop.status.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-display">
                        {prop.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Proposed by: <strong className="text-slate-800">{prop.proposer}</strong>
                      </p>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Funding Impact</div>
                      <div className="text-xs font-bold text-coop-800 bg-coop-50 px-3 py-1.5 rounded-xl border border-coop-200 mt-1">
                        {prop.budgetAllocation}
                      </div>
                    </div>
                  </div>

                  {/* Summary Text */}
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    {prop.summary}
                  </p>

                  {/* Quorum and Voting Breakdown Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700">
                        Total Votes Cast: <strong>{totalVotes}</strong> / {prop.quorumRequired} (Quorum: {quorumPercent}%)
                      </span>
                      <span className="text-coop-700 font-bold">{yesPercent}% Approval</span>
                    </div>

                    {/* Progress multi-bar */}
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                      <div style={{ width: `${yesPercent}%` }} className="bg-coop-600 h-full transition-all"></div>
                      <div style={{ width: `${noPercent}%` }} className="bg-red-500 h-full transition-all"></div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span className="text-coop-700 font-bold">YES: {prop.votes.yes} votes</span>
                      <span className="text-red-600 font-bold">NO: {prop.votes.no} votes</span>
                      <span className="text-slate-400">ABSTAIN: {prop.votes.abstain}</span>
                    </div>
                  </div>

                  {/* Interactive Voting Actions */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-slate-500">
                      {prop.userVoted ? (
                        <span className="flex items-center gap-1.5 text-coop-700 font-bold">
                          <CheckCircle2 className="w-4 h-4" /> You voted "{prop.userVoted}" on this proposal
                        </span>
                      ) : (
                        <span>Cast your ballot as a verified cooperative delegate</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleVote(prop.id, 'YES')}
                        className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                          prop.userVoted === 'YES'
                            ? 'bg-coop-700 text-white ring-2 ring-coop-500 shadow-sm'
                            : 'bg-coop-50 hover:bg-coop-100 text-coop-800 border border-coop-200'
                        }`}
                      >
                        VOTE YES
                      </button>

                      <button
                        onClick={() => handleVote(prop.id, 'NO')}
                        className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                          prop.userVoted === 'NO'
                            ? 'bg-red-600 text-white ring-2 ring-red-400 shadow-sm'
                            : 'bg-red-50 hover:bg-red-100 text-red-800 border border-red-200'
                        }`}
                      >
                        VOTE NO
                      </button>

                      <button
                        onClick={() => handleVote(prop.id, 'ABSTAIN')}
                        className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          prop.userVoted === 'ABSTAIN'
                            ? 'bg-slate-700 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        ABSTAIN
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 2: TRAINING ACADEMY */}
      {activeTab === 'training' && (
        <section className="space-y-6 animate-in fade-in">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-display">
              Cooperative Skill Academy & Certifications
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Subsidized, industry-benchmarked masterclasses to upgrade provider skills and service earnings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trainingModules.map((mod) => (
              <div
                key={mod.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-subtle overflow-hidden flex flex-col justify-between"
              >
                <div className="relative h-44 bg-slate-100">
                  <img
                    src={mod.image}
                    alt={mod.title}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-brand-900/80 backdrop-blur-md text-white text-[10px] font-bold">
                    {mod.category}
                  </span>
                  <span className={`absolute bottom-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md ${
                    mod.status === 'Completed'
                      ? 'bg-coop-500 text-white'
                      : mod.status === 'Enrolled'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-900/80 text-white'
                  }`}>
                    {mod.status}
                  </span>
                </div>

                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                      {mod.title}
                    </h3>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{mod.duration}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Instructor: <strong className="text-slate-700">{mod.instructor}</strong>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    {mod.status === 'Enrolled' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-600">
                          <span>Course Progress</span>
                          <span>{mod.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${mod.progress}%` }}
                            className="bg-coop-600 h-full"
                          ></div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-coop-700 font-semibold">
                        Badge: {mod.badge}
                      </span>
                      {mod.status === 'Available to Join' ? (
                        <button
                          onClick={() => enrollTraining(mod.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-coop-700 hover:bg-coop-800 text-white text-xs font-bold transition-colors shadow-sm"
                        >
                          Enroll Free
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-slate-700">
                          {mod.status === 'Completed' ? "Certified ✓" : "In Progress"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 3: THE 4 PILLARS */}
      {activeTab === 'pillars' && (
        <section className="space-y-8 animate-in fade-in">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-display">
              The 4 Founding Pillars of Zolve
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              How our cooperative framework transforms traditional gig exploitation into shared community prosperity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-subtle space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center font-black">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-display">Shared Value & Dividends</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Operating surplus is not pocketed by external venture capitalists. Instead, annual patronage dividends distribute platform earnings directly back to high-performing cooperative technicians based on verified hours and ratings.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-subtle space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-coop-100 text-coop-700 flex items-center justify-center font-black">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-display">Democratic Member Participation</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Providers hold digital voting rights on all critical policies—from minimum service rates and safety protocols to welfare reserve allocations. One member, one vote.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-subtle space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-display">Fair & Transparent Economics</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Zero arbitrary algorithm penalties or surge gouging. Fixed transparent 8% platform fee and 4% member welfare fund. Providers keep 88% of every rupee paid by customers.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-subtle space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-black">
                4
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-display">Community Development</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Cooperative members lead neighborhood civic drives, storm drain cleanups, apprentice tool sponsorships, and free electrical safety audits for vulnerable senior citizens.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: COMMUNITY PROJECTS */}
      {activeTab === 'projects' && (
        <section className="space-y-6 animate-in fade-in">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-display">
              Neighborhood Civic Action & Welfare Drives
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Tangible community impact organized jointly by cooperative members and residential societies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {communityProjects.map((proj) => (
              <div
                key={proj.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-subtle overflow-hidden flex flex-col justify-between"
              >
                <div className="relative h-44 bg-slate-100">
                  <img
                    src={proj.image}
                    alt={proj.title}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-brand-900/80 backdrop-blur-md text-white text-[10px] font-bold">
                    {proj.category}
                  </span>
                </div>

                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-900">{proj.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{proj.impact}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                    <div><strong>Location:</strong> {proj.location}</div>
                    <div className="text-coop-700 font-semibold">👥 {proj.participants}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

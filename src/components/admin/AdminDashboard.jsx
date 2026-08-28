import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Briefcase,
  Award,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Plus,
  Vote,
  Layers,
  Search
} from 'lucide-react';
import { getAdminDemandForecast, getFraudAnomalyFlags } from '../../services/aiEngine';

export const AdminDashboard = () => {
  const {
    providers,
    approveProviderKYC,
    supportTickets,
    bookings,
    proposals,
    createProposal,
    addNotification
  } = useApp();

  const [activeAdminTab, setActiveAdminTab] = useState('overview'); // 'overview' | 'kyc' | 'disputes' | 'proposals' | 'ai_demand'
  const [isNewProposalModalOpen, setIsNewProposalModalOpen] = useState(false);

  // New Proposal state
  const [newPropTitle, setNewPropTitle] = useState('');
  const [newPropSummary, setNewPropSummary] = useState('');
  const [newPropCategory, setNewPropCategory] = useState('Member Welfare');
  const [newPropBudget, setNewPropBudget] = useState('₹3,50,000 from Reserve');

  const demandForecast = getAdminDemandForecast();
  const anomalyFlags = getFraudAnomalyFlags();

  // Handle Proposal Submission
  const handleCreateProposal = (e) => {
    e.preventDefault();
    createProposal({
      title: newPropTitle,
      summary: newPropSummary,
      category: newPropCategory,
      proposer: "Platform Operations Delegate",
      budgetAllocation: newPropBudget,
      deadline: "2026-09-30T23:59:59Z"
    });
    setIsNewProposalModalOpen(false);
      };

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-brand-900 via-brand-950 to-purple-950 text-white p-6 sm:p-8 lg:p-10 overflow-hidden shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-purple-500/15 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-xs font-semibold text-purple-300">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
            <span>Zolve Operations & Governance Command</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            Platform Administration Center
          </h1>
          <p className="text-xs text-slate-300">
            Real-time platform metrics, KYC verification queue, arbitration council & AI demand prediction
          </p>
        </div>

        <button
          onClick={() => setIsNewProposalModalOpen(true)}
          className="relative z-10 px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Launch Cooperative Proposal</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { key: 'overview', label: 'Platform Overview & GMV' },
          { key: 'kyc', label: `Provider KYC Verification Queue (${providers.length})` },
          { key: 'disputes', label: `Trust & Safety Disputes (${supportTickets.length})` },
          { key: 'ai_demand', label: 'AI Demand Prediction & Fraud Monitor' },
          { key: 'proposals', label: `Governance Proposals (${proposals.length})` }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveAdminTab(tab.key)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeAdminTab === tab.key
                ? 'bg-purple-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW METRICS */}
      {activeAdminTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Gross Platform GMV</div>
              <div className="text-2xl sm:text-3xl font-black text-purple-900">₹2.41 Cr</div>
              <div className="text-[10px] text-coop-700 font-semibold pt-1">↑ +24% Year-over-Year</div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Total Completed Jobs</div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">23,450</div>
              <div className="text-[10px] text-slate-500 pt-1">99.2% customer satisfaction</div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Active Cooperative Members</div>
              <div className="text-2xl sm:text-3xl font-black text-coop-700">620 / 1,180</div>
              <div className="text-[10px] text-coop-700 font-medium pt-1">52.5% democratic membership</div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Cooperative Reserve Fund</div>
              <div className="text-2xl sm:text-3xl font-black text-amber-500">₹14.8 Lakhs</div>
              <div className="text-[10px] text-slate-500 pt-1">Held for insurance & tool grants</div>
            </div>
          </div>

          {/* Recent Bookings Stream */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-subtle p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Live System Bookings Stream ({bookings.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3">Code</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Provider</th>
                    <th className="p-3">Service</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-purple-700">#{b.bookingCode}</td>
                      <td className="p-3 font-medium text-slate-900">{b.customerName}</td>
                      <td className="p-3 text-slate-700">{b.providerName}</td>
                      <td className="p-3 text-slate-600">{b.serviceName}</td>
                      <td className="p-3 font-bold text-slate-900">₹{b.totalAmount}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold">
                          {b.bookingStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROVIDER KYC QUEUE */}
      {activeAdminTab === 'kyc' && (
        <div className="space-y-6 animate-in fade-in">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-display">
              Provider Accreditation & Verification Queue
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review trade licenses, Aadhaar biometric verification, and practical benchmark ratings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {providers.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-subtle p-6 space-y-4"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={p.avatar}
                    alt={p.name}
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-coop-500/20"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-bold text-slate-900">{p.name}</h4>
                      <span className="text-xs font-bold text-slate-500">Exp: {p.experienceYears} yrs</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">{p.title}</p>
                    <div className="text-[11px] text-slate-400 mt-1">{p.phone} • {p.email}</div>
                  </div>
                </div>

                {/* Verification checklist */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-coop-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Govt ID Verified
                  </div>
                  <div className="flex items-center gap-1.5 text-coop-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Practical Benchmark ✓
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Status: <strong className="text-coop-700">Accredited Pro</strong>
                  </span>
                  <button
                    onClick={() => approveProviderKYC(p.id)}
                    className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm transition-colors"
                  >
                    Re-Verify & Approve KYC
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DISPUTES ARBITRATION */}
      {activeAdminTab === 'disputes' && (
        <div className="space-y-6 animate-in fade-in">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-display">
              Trust & Safety Arbitration Council
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review customer disputes, price adjustments, and contractor quality compliance.
            </p>
          </div>

          <div className="space-y-4">
            {supportTickets.map((tkt) => (
              <div
                key={tkt.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-subtle p-6 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-purple-700 text-sm">#{tkt.ticketCode}</span>
                    <span className="text-xs font-bold text-slate-900">• {tkt.category}</span>
                    <span className="px-2 py-0.5 rounded-full bg-coop-100 text-coop-800 text-[10px] font-bold">
                      {tkt.status.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">Related Booking: #{tkt.bookingCode}</span>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  "{tkt.description}"
                </p>

                {tkt.resolutionNotes && (
                  <div className="text-xs text-coop-800 font-medium">
                    Arbitration Officer Note: {tkt.resolutionNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: AI DEMAND PREDICTION & FRAUD MONITOR */}
      {activeAdminTab === 'ai_demand' && (
        <div className="space-y-8 animate-in fade-in">
          {/* Demand Prediction */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>AI Regional Demand Forecasting (Next 14 Days)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Machine learning forecast based on monsoon rainfall records, temperature variance, and housing society maintenance cycles.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {demandForecast.map((item, idx) => (
                <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">{item.category}</h4>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-extrabold text-xs">
                      {item.forecastGrowth} Surge
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Fraud & Anomaly Flags */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Real-Time Security & Fraud Anomaly Flags
            </h3>
            <div className="space-y-3">
              {anomalyFlags.map((flag) => (
                <div
                  key={flag.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{flag.type}</span>
                      <span className="px-2 py-0.5 rounded-full bg-coop-50 text-coop-700 text-[10px] font-bold">
                        {flag.status}
                      </span>
                    </div>
                    <p className="text-slate-600">{flag.description}</p>
                  </div>
                  <div className="text-[10px] text-slate-400 shrink-0">{flag.timestamp}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LAUNCH PROPOSAL MODAL */}
      {isNewProposalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-purple-50/50 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 font-display">Create Cooperative Proposal</h3>
              <button
                onClick={() => setIsNewProposalModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProposal} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Proposal Title</label>
                <input
                  type="text"
                  required
                  value={newPropTitle}
                  onChange={(e) => setNewPropTitle(e.target.value)}
                  placeholder="e.g. Subsidize EV Battery Swapping for Member Commutes"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newPropCategory}
                    onChange={(e) => setNewPropCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Member Welfare">Member Welfare</option>
                    <option value="Tool Grants">Tool & Equipment Grants</option>
                    <option value="Safety Standards">Safety Standards</option>
                    <option value="Economic Dividend">Economic Dividend</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reserve Budget</label>
                  <input
                    type="text"
                    value={newPropBudget}
                    onChange={(e) => setNewPropBudget(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Summary / Policy Text</label>
                <textarea
                  rows={4}
                  required
                  value={newPropSummary}
                  onChange={(e) => setNewPropSummary(e.target.value)}
                  placeholder="Detailed justification and terms for cooperative voting..."
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold shadow-md transition-colors"
              >
                Publish Proposal to Member Voting Ledger
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

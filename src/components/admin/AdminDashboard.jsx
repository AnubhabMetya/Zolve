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
  Search,
  Clock,
  Mail,
  Phone,
  Building2
} from 'lucide-react';
import { getAdminDemandForecast, getFraudAnomalyFlags } from '../../services/aiEngine';
import { WorkforceAllocation } from '../ai/WorkforceAllocation';
import { TrustAnomalyDashboard } from '../ai/TrustAnomalyDashboard';
import { EmergencyDispatch } from '../ai/EmergencyDispatch';
import { loadForecastPredictions } from '../../services/aiDataLoader.js';
import { useAuth } from '../../context/AuthContext';
import { ExecutiveApplicationService } from '../../services/executiveApplicationService';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';

export const AdminDashboard = () => {
  const {
    providers,
    approveProviderKYC,
    supportTickets,
    societies,
    societyRequests,
    updateSupportTicketStatus,
    updateSocietyRequestStatus,
    bookings,
    proposals,
    createProposal,
    addNotification,
    executiveApplications,
    approveExecutiveApplication,
    rejectExecutiveApplication,
    activeRole,
    currentUser
  } = useApp();

  const [activeAdminTab, setActiveAdminTab] = useState('overview'); // 'overview' | 'kyc' | 'disputes' | 'proposals' | 'ai_demand' | 'workforce' | 'trust' | 'emergency' | 'executive_approvals'
  const [isNewProposalModalOpen, setIsNewProposalModalOpen] = useState(false);
  const [forecastPredictions, setForecastPredictions] = useState([]);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [forecastError, setForecastError] = useState(null);

  // Executive Approvals state
  const { user: adminUser, profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'society_admin' || activeRole === 'admin' || activeRole === 'society_admin' || currentUser?.role === 'admin' || currentUser?.role === 'society_admin';
  const [execApps, setExecApps] = useState([]);
  const [execLoading, setExecLoading] = useState(false);
  const [execError, setExecError] = useState(null);
  const [rejectReasons, setRejectReasons] = useState({});
  const [rejectingId, setRejectingId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);

  // Unified disputes filters (global admin, city-specific)
  const [selectedDisputeCity, setSelectedDisputeCity] = useState('All');
  const [selectedDisputeStatus, setSelectedDisputeStatus] = useState('All');
  const [selectedDisputeCategory, setSelectedDisputeCategory] = useState('All');
  const [disputeSearch, setDisputeSearch] = useState('');
  const [resolutionInputs, setResolutionInputs] = useState({});
  const [ticketActionLoading, setTicketActionLoading] = useState(null);
  const [selectedSocietyCity, setSelectedSocietyCity] = useState('All');
  const [societyActionLoading, setSocietyActionLoading] = useState(null);

  // New Proposal state
  const [newPropTitle, setNewPropTitle] = useState('');
  const [newPropSummary, setNewPropSummary] = useState('');
  const [newPropCategory, setNewPropCategory] = useState('Member Welfare');
  const [newPropBudget, setNewPropBudget] = useState('₹3,50,000 from Reserve');

  const demandForecast = getAdminDemandForecast();
  const anomalyFlags = getFraudAnomalyFlags();

  // Async load forecast predictions (cached, out of main bundle)
  React.useEffect(() => {
    let cancelled = false;
    loadForecastPredictions()
      .then((data) => {
        if (!cancelled) {
          setForecastPredictions(data);
          setForecastLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setForecastError(err?.message || 'Failed to load forecast');
          setForecastLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Stabilize unstable dependencies: executiveApplications array and addNotification function are recreated each render
  const executiveApplicationsRef = React.useRef(executiveApplications);
  React.useEffect(() => { executiveApplicationsRef.current = executiveApplications; }, [executiveApplications]);
  const addNotificationRef = React.useRef(addNotification);
  React.useEffect(() => { addNotificationRef.current = addNotification; }, [addNotification]);

  const fetchExecutiveApprovals = React.useCallback(async () => {
    setExecLoading(true); setExecError(null);
    try {
      const remoteData = await ExecutiveApplicationService.fetchPendingApplications();
      const localPending = (executiveApplicationsRef.current || []).filter(a => {
        const s = String(a.canonicalStatus || a.status || '').toLowerCase();
        return s === 'pending' || s === 'pending_approval';
      });
      const remoteIds = new Set((remoteData || []).map(r => r.id));
      const remoteEmails = new Set((remoteData || []).map(r => (r.email || r.applicantEmail || '').toLowerCase()));
      const combined = [
        ...(remoteData || []),
        ...localPending.filter(l => !remoteIds.has(l.id) && !remoteEmails.has((l.email || l.applicantEmail || '').toLowerCase()))
      ];
      setExecApps(combined);
    } catch (e) {
      setExecError(e?.message || 'Failed to load pending applications');
    } finally { setExecLoading(false); }
  }, []);

  React.useEffect(() => {
    if (activeAdminTab === 'executive_approvals') fetchExecutiveApprovals();
  }, [activeAdminTab, fetchExecutiveApprovals]);

  // Fetch count for badge even before opening tab, and subscribe realtime so admin gets message instantly
  React.useEffect(() => {
    fetchExecutiveApprovals();
    let channel = null;
    if (isSupabaseConfigured()) {
      try {
        channel = supabase
          .channel('exec-approvals-admin')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'executive_applications' }, (payload) => {
            fetchExecutiveApprovals();
            if (payload.eventType === 'INSERT' && payload.new?.status === 'pending') {
              const v = payload.new.vertical || 'community';
              const name = payload.new.full_name || 'New applicant';
              addNotificationRef.current({ title: 'New Executive Approval Required', message: `${name} applied for ${v} — Community & Society Services. Review in Admin → Executive Approvals.`, type: 'system' });
            }
          })
          .subscribe();
      } catch {}
    }

    const onSync = (e) => {
      fetchExecutiveApprovals();
      if (e?.detail?.type === 'EXEC_APP_SUBMITTED') {
        const app = e.detail.application;
        addNotificationRef.current({
          title: 'New Executive Approval Required',
          message: `${app?.fullName || app?.applicantName || 'New applicant'} applied for Community & Society Services. Review in Admin → Executive Approvals.`,
          type: 'system'
        });
      }
    };
    window.addEventListener('zolve:executive-sync', onSync);

    let bc = null;
    try {
      if ('BroadcastChannel' in window) {
        bc = new BroadcastChannel('zolve_executive_channel');
        bc.onmessage = (msg) => {
          fetchExecutiveApprovals();
          if (msg.data?.type === 'EXEC_APP_SUBMITTED') {
            const app = msg.data.application;
            addNotificationRef.current({
              title: 'New Executive Approval Required',
              message: `${app?.fullName || app?.applicantName || 'New applicant'} applied for Community & Society Services. Review in Admin → Executive Approvals.`,
              type: 'system'
            });
          }
        };
      }
    } catch {}

    return () => {
      try { if (channel) supabase.removeChannel(channel); } catch {}
      window.removeEventListener('zolve:executive-sync', onSync);
      try { if (bc) bc.close(); } catch {}
    };
  }, [fetchExecutiveApprovals]);

  const handleApproveExec = async (appId) => {
    setApprovingId(appId);
    try {
      if (approveExecutiveApplication) {
        await approveExecutiveApplication(appId);
      } else {
        await ExecutiveApplicationService.approveApplication(appId, adminUser);
        addNotification({ title: 'Executive Approved', message: `Application ${appId} approved.`, type: 'system' });
      }
      await fetchExecutiveApprovals();
    } catch (e) {
      setExecError(e?.message || 'Approve failed');
    } finally { setApprovingId(null); }
  };

  const handleRejectExec = async (appId) => {
    const reason = rejectReasons[appId];
    if (!reason || !String(reason).trim()) { alert('Please provide a rejection reason'); return; }
    setRejectingId(appId);
    try {
      if (rejectExecutiveApplication) {
        await rejectExecutiveApplication(appId, reason);
      } else {
        await ExecutiveApplicationService.rejectApplication(appId, adminUser, reason);
        addNotification({ title: 'Executive Rejected', message: `Application ${appId} rejected.`, type: 'system' });
      }
      setRejectReasons(prev => { const n={...prev}; delete n[appId]; return n; });
      await fetchExecutiveApprovals();
    } catch (e) {
      setExecError(e?.message || 'Reject failed');
    } finally { setRejectingId(null); }
  };

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
          { key: 'executive_approvals', label: `Executive Approvals ${execApps.length ? `(${execApps.length})` : ''}` },
          { key: 'kyc', label: `Provider KYC Verification Queue (${providers.length})` },
          { key: 'disputes', label: `Trust & Safety Disputes (${supportTickets.length})` },
          { key: 'ai_demand', label: 'AI Demand Prediction & Fraud Monitor' },
          { key: 'workforce', label: 'Workforce Allocation (Stage 1)' },
          { key: 'trust', label: 'Trust & Safety (Anomaly)' },
          { key: 'emergency', label: 'Emergency Dispatch' },
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

      {/* TAB 3: DISPUTES ARBITRATION — Unified (billing, overcharge, society tickets) + Societies per City */}
      {activeAdminTab === 'disputes' && (
        <div className="space-y-8 animate-in fade-in">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-display">
              Trust & Safety Arbitration Council — Unified Disputes
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review all customer disputes: billing, overcharge, payment, provider, safety & society tickets — city-stamped via both GPS + pincode. Global admin can access every city.
            </p>
          </div>

          {/* Societies per City — Global Admin View */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-subtle p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Building2 className="w-4 h-4 text-brand-700" /> Societies by City ({societies.length} societies across 21 hubs)</h3>
              <span className="text-[11px] text-slate-500">Select a city to review its societies & issues</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['All', ...Array.from(new Set(societies.map(s=>s.city))).sort()].map(city => (
                <button key={city} onClick={()=>setSelectedSocietyCity(city)} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${selectedSocietyCity===city ? 'bg-brand-900 text-white border-brand-900' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>{city}</button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(selectedSocietyCity==='All' ? societies : societies.filter(s=>s.city===selectedSocietyCity)).map(soc => (
                <div key={soc.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="text-sm font-bold text-slate-900">{soc.name}</div>
                  <div className="text-xs text-slate-600">{soc.location} • {soc.city}, {soc.state} — {soc.pincode}</div>
                  <div className="text-[11px] text-slate-500">Manager: {soc.manager_name || '—'} • {soc.units} units • {soc.blocks} blocks</div>
                  <div className="flex flex-wrap gap-2 text-[10px] pt-1">
                    <span className="px-2 py-1 rounded-full bg-white border font-bold">Open: {(() => { try{ const st = typeof soc.stats==='string'?JSON.parse(soc.stats):soc.stats; return st?.openRequests ?? 0 }catch{return 0} })()}</span>
                    <span className="px-2 py-1 rounded-full bg-white border">Coords: {(() => { try{ const c = typeof soc.coords==='string'?JSON.parse(soc.coords):soc.coords; return c ? `${Number(c.lat).toFixed(2)},${Number(c.lng).toFixed(2)}` : '—'}catch{return '—'} })()}</span>
                    <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">{soc.hub_id}</span>
                  </div>
                </div>
              ))}
              {(selectedSocietyCity==='All' ? societies : societies.filter(s=>s.city===selectedSocietyCity)).length===0 && <div className="col-span-full text-center text-xs text-slate-400 py-6">No societies for {selectedSocietyCity}</div>}
            </div>
            {/* Society Requests for selected city */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Society Requests — {selectedSocietyCity} ({(selectedSocietyCity==='All' ? societyRequests : societyRequests.filter(r=>r.city===selectedSocietyCity)).length})</h4>
              {(selectedSocietyCity==='All' ? societyRequests : societyRequests.filter(r=>r.city===selectedSocietyCity)).slice(0, 8).map(req => (
                <div key={req.id} className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900">{req.society_name} • {req.unit_or_block}</div>
                    <div className="text-slate-600">{req.service_type} — {req.description?.slice(0,80)}</div>
                    <div className="text-[11px] text-slate-500">{req.city} • {req.priority} • {req.status} • {new Date(req.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {['ASSIGNED','IN_PROGRESS','COMPLETED'].map(st => (
                      <button key={st} disabled={societyActionLoading===req.id} onClick={async()=>{
                        if(!isAdmin){ alert('Admin only'); return; }
                        setSocietyActionLoading(req.id);
                        try{ await updateSocietyRequestStatus(req.id, { status: st }); addNotification({ title:`Society ${st}`, message:`Request ${req.id.slice(0,8)} → ${st}`, type:'system'}); }catch(e){ alert(e?.message||'Failed'); } finally{ setSocietyActionLoading(null); }
                      }} className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${req.status===st ? 'bg-brand-900 text-white border-brand-900' : 'bg-white hover:bg-slate-50'}`}>{st}</button>
                    ))}
                  </div>
                </div>
              ))}
              {(selectedSocietyCity==='All' ? societyRequests : societyRequests.filter(r=>r.city===selectedSocietyCity)).length===0 && <div className="text-xs text-slate-400 text-center py-3">No society requests for {selectedSocietyCity}.</div>}
            </div>
          </div>

          {/* Unified Support Tickets — Filters */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-subtle p-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">Unified Dispute Tickets — All Categories ({supportTickets.length})</h3>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input value={disputeSearch} onChange={e=>setDisputeSearch(e.target.value)} placeholder="Search ticket, email, city..." className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs w-36" />
                </div>
                <select value={selectedDisputeCity} onChange={e=>setSelectedDisputeCity(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white">
                  {['All', ...Array.from(new Set([...societies.map(s=>s.city), ...supportTickets.map(t=>t.city).filter(Boolean)])).sort()].map(c=> <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={selectedDisputeStatus} onChange={e=>setSelectedDisputeStatus(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white">
                  {['All','open','under_review','resolved','dismissed'].map(s=> <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={selectedDisputeCategory} onChange={e=>setSelectedDisputeCategory(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white">
                  {['All',"Provider didn't arrive (No Show)",'Service not completed / Incomplete work','Poor quality of service','Property damage during repair','Overcharging / Price mismatch','Payment or billing issue','Safety or conduct concern','Society ticket','Other query','Billing / Overcharge Query'].map(c=> <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {supportTickets
                .filter(t=> selectedDisputeCity==='All' || t.city===selectedDisputeCity)
                .filter(t=> selectedDisputeStatus==='All' || t.status===selectedDisputeStatus)
                .filter(t=> selectedDisputeCategory==='All' || t.category===selectedDisputeCategory)
                .filter(t=>{
                  if(!disputeSearch) return true;
                  const s=disputeSearch.toLowerCase();
                  return (t.ticketCode||'').toLowerCase().includes(s) || (t.userName||'').toLowerCase().includes(s) || (t.userEmail||'').toLowerCase().includes(s) || (t.city||'').toLowerCase().includes(s) || (t.description||'').toLowerCase().includes(s);
                })
                .map((tkt) => (
                <div key={tkt.id} className="bg-slate-50 rounded-3xl border border-slate-200/90 p-6 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-purple-700 text-sm">#{tkt.ticketCode || tkt.ticket_code}</span>
                      <span className="text-xs font-bold text-slate-900">• {tkt.category}</span>
                      <span className="px-2 py-0.5 rounded-full bg-coop-100 text-coop-800 text-[10px] font-bold">{String(tkt.status||'').toUpperCase()}</span>
                      {tkt.city && <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-[10px] font-bold">{tkt.city}</span>}
                      {tkt.hub_id && <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[9px] border border-amber-200">{tkt.hub_id}</span>}
                    </div>
                    <span className="text-xs text-slate-400">Booking: #{tkt.bookingCode || tkt.booking_code || '—'} • {tkt.createdAt ? new Date(tkt.createdAt).toLocaleDateString() : (tkt.created_at ? new Date(tkt.created_at).toLocaleDateString() : '')}</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-900">{tkt.userName || tkt.user_name}</span>
                    {tkt.userEmail && <span className="text-slate-500"> • {tkt.userEmail}</span>}
                    {tkt.userPhone && <span className="text-slate-500"> • {tkt.userPhone}</span>}
                  </div>
                  <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-100">"{tkt.description}"</p>
                  {tkt.resolutionNotes && <div className="text-xs text-coop-800 font-medium">Arbitration Note: {tkt.resolutionNotes || tkt.resolution_notes}</div>}
                  {isAdmin && (
                    <div className="pt-3 border-t border-slate-200 space-y-2">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          value={resolutionInputs[tkt.id]||''}
                          onChange={e=>setResolutionInputs(prev=>({ ...prev, [tkt.id]: e.target.value }))}
                          placeholder="Resolution notes (required for resolve/dismiss)"
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                        <div className="flex gap-1.5 shrink-0">
                          <button disabled={ticketActionLoading===tkt.id} onClick={async()=>{
                            setTicketActionLoading(tkt.id);
                            try{ await updateSupportTicketStatus(tkt.id, { status:'under_review' }); }catch(e){ alert(e?.message||'Failed'); } finally{ setTicketActionLoading(null); }
                          }} className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-xs font-bold">Under Review</button>
                          <button disabled={ticketActionLoading===tkt.id} onClick={async()=>{
                            const notes=resolutionInputs[tkt.id];
                            if(!notes||!String(notes).trim()){ alert('Add resolution notes'); return; }
                            setTicketActionLoading(tkt.id);
                            try{ await updateSupportTicketStatus(tkt.id, { status:'resolved', resolution_notes: notes, resolutionNotes: notes }); }catch(e){ alert(e?.message||'Failed'); } finally{ setTicketActionLoading(null); }
                          }} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold">Resolve</button>
                          <button disabled={ticketActionLoading===tkt.id} onClick={async()=>{
                            const notes=resolutionInputs[tkt.id];
                            if(!notes||!String(notes).trim()){ alert('Add resolution notes for dismiss'); return; }
                            setTicketActionLoading(tkt.id);
                            try{ await updateSupportTicketStatus(tkt.id, { status:'dismissed', resolution_notes: notes, resolutionNotes: notes }); }catch(e){ alert(e?.message||'Failed'); } finally{ setTicketActionLoading(null); }
                          }} className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold">Dismiss</button>
                        </div>
                      </div>
                      {ticketActionLoading===tkt.id && <div className="text-[11px] text-slate-500">Updating...</div>}
                    </div>
                  )}
                </div>
              ))}
              {supportTickets.filter(t=> selectedDisputeCity==='All' || t.city===selectedDisputeCity).filter(t=> selectedDisputeStatus==='All' || t.status===selectedDisputeStatus).filter(t=> selectedDisputeCategory==='All' || t.category===selectedDisputeCategory).filter(t=>{
                if(!disputeSearch) return true;
                const s=disputeSearch.toLowerCase(); return (t.ticketCode||'').toLowerCase().includes(s) || (t.userName||'').toLowerCase().includes(s) || (t.city||'').toLowerCase().includes(s);
              }).length===0 && <div className="text-center text-xs text-slate-400 py-8">No tickets match filters. Try All cities or different category.</div>}
            </div>
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

      {/* TAB 5: WORKFORCE ALLOCATION (Stage 1) — AI Feature 4 */}
      {activeAdminTab === 'workforce' && (
        <div className="space-y-6 animate-in fade-in">
          {forecastLoading ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-sm text-slate-500">Loading forecast predictions…</div>
          ) : forecastError ? (
            <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center text-sm text-red-600">Failed to load forecast: {forecastError}</div>
          ) : !forecastPredictions.length ? (
            <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center text-sm text-amber-700">No forecast data available — empty dataset.</div>
          ) : (
            <WorkforceAllocation providers={providers} bookings={bookings} forecastPredictions={forecastPredictions} />
          )}
        </div>
      )}

      {/* TAB 6: TRUST & ANOMALY (Stage 1) — AI Feature 5 */}
      {activeAdminTab === 'trust' && (
        <div className="space-y-6 animate-in fade-in">
          <TrustAnomalyDashboard />
        </div>
      )}

      {/* TAB 7: EMERGENCY DISPATCH — AI Feature 6 Stage 1 */}
      {activeAdminTab === 'emergency' && (
        <div className="space-y-6 animate-in fade-in">
          <EmergencyDispatch providers={providers} bookings={bookings} />
        </div>
      )}

      {/* TAB: EXECUTIVE APPROVALS — Community & Society Executive queue */}
      {activeAdminTab === 'executive_approvals' && (
        <div className="space-y-6 animate-in fade-in">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-display">Executive Approvals — Community & Society Services</h2>
            <p className="text-xs text-slate-500 mt-0.5">Review pending Community & Society Executive applications. Approve or reject with reason. Data from Supabase executive_applications.</p>
          </div>

          {!isAdmin && isSupabaseConfigured() && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700">Access restricted — admin role required (profiles.role = admin).</div>
          )}
          {isAdmin && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Pending Applications ({execApps.length})</h3>
                <button onClick={fetchExecutiveApprovals} disabled={execLoading} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-60">{execLoading ? 'Loading…' : 'Refresh'}</button>
              </div>
              {execError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{execError}</div>}
              {execLoading ? (
                <div className="p-8 rounded-3xl bg-white border text-center text-sm text-slate-500">Loading pending applications…</div>
              ) : execApps.length === 0 ? (
                <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto"><Building2 className="w-6 h-6 text-slate-400" /></div>
                  <p className="text-sm text-slate-500">No pending Community & Society Executive applications.</p>
                  <p className="text-[11px] text-slate-400">New submissions will appear here in real time.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {execApps.map((app) => (
                    <div key={app.id} className="bg-white rounded-3xl border border-slate-200 shadow-subtle p-6 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-base font-bold text-slate-900">{app.fullName || app.applicantName}</h4>
                          <p className="text-xs text-slate-600 font-medium flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-amber-600" /> Community & Society Services</p>
                          <p className="text-[11px] text-slate-500 capitalize">{app.vertical} vertical</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-extrabold">PENDING</span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /><span className="font-semibold">Email:</span> <span className="text-slate-700">{app.email || app.applicantEmail}</span></div>
                        <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /><span className="font-semibold">Phone:</span> <span className="text-slate-700">+91 {app.phone || app.applicantPhone}</span></div>
                        {app.services?.length ? <div className="pt-1"><span className="font-semibold">Services/category:</span> <span className="text-slate-600">{app.services.join(', ')}</span></div> : null}
                        <div><span className="font-semibold">Submitted:</span> <span className="text-slate-600">{app.createdAt ? new Date(app.createdAt).toLocaleString() : '-'}</span></div>
                        <div><span className="font-semibold">Status:</span> <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">{String(app.status || '').toUpperCase()}</span></div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 space-y-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveExec(app.id)}
                            disabled={approvingId === app.id || rejectingId === app.id}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" /> {approvingId === app.id ? 'Approving…' : 'Approve'}
                          </button>
                          <button
                            onClick={() => {
                              const el = document.getElementById(`reject-reason-${app.id}`);
                              if (el) el.focus();
                            }}
                            className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5"
                          >
                            <XCircle className="w-4 h-4" /> Reject
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input
                            id={`reject-reason-${app.id}`}
                            value={rejectReasons[app.id] || ''}
                            onChange={(e) => setRejectReasons(prev => ({ ...prev, [app.id]: e.target.value }))}
                            placeholder="Rejection reason (required for reject)"
                            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                          />
                          <button
                            onClick={() => handleRejectExec(app.id)}
                            disabled={rejectingId === app.id}
                            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-bold"
                          >
                            {rejectingId === app.id ? 'Rejecting…' : 'Confirm Reject'}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400">Approve stores approved_by = authenticated admin ID and approved_at; Reject persists rejected status and rejection metadata; list refreshes.</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
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

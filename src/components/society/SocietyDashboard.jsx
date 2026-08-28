import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Wrench,
  ShieldCheck,
  Award,
  ArrowRight,
  Plus,
  Zap,
  Droplets,
  Layers,
  FileText
} from 'lucide-react';

export const SocietyDashboard = () => {
  const { societyData, addNotification, executiveApplications, approveExecutiveApplication, rejectExecutiveApplication, currentUser } = useApp();

  const [requests, setRequests] = useState(societyData.activeRequests);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Request Form Inputs
  const [unitBlock, setUnitBlock] = useState('Block B - 3rd Floor Lobby');
  const [serviceCategory, setServiceCategory] = useState('Electrical');
  const [priority, setPriority] = useState('Normal');
  const [description, setDescription] = useState('');

  const handleCreateRequest = (e) => {
    e.preventDefault();
    const newReq = {
      id: `soc-req-${Date.now()}`,
      unit: unitBlock,
      service: `${serviceCategory} - ${description.substring(0, 30)}...`,
      priority,
      status: 'ASSIGNED',
      provider: serviceCategory === 'Electrical' ? 'Rajesh Kumar' : 'Amit Das Team',
      date: 'Today, Scheduled'
    };

    setRequests([newReq, ...requests]);
    setIsCreateModalOpen(false);

        addNotification({
      title: 'Society Maintenance Request Dispatched',
      message: `${priority} priority ticket dispatched to cooperative response team for ${unitBlock}.`,
      type: 'system'
    });
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-brand-900 via-brand-950 to-coop-950 text-white p-6 sm:p-8 lg:p-10 overflow-hidden shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-amber-500/15 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shrink-0">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
                {societyData.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-coop-300 text-xs font-bold border border-white/20">
                Managed Society Network
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Location: <strong className="text-white">{societyData.location}</strong> • {societyData.units} Residential Units • Manager: {societyData.manager}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="relative z-10 px-5 py-3 rounded-xl bg-coop-600 hover:bg-coop-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Raise Society Ticket</span>
        </button>
      </div>

      {/* Society Operational Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Open Maintenance Tickets</div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{societyData.stats.openRequests}</div>
          <div className="text-[10px] text-slate-500 pt-1">Assigned to Co-op Providers</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed This Month</div>
          <div className="text-2xl sm:text-3xl font-black text-coop-700">{societyData.stats.completedThisMonth}</div>
          <div className="text-[10px] text-coop-700 font-semibold pt-1">100% Resident SLA met</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Resident Approval</div>
          <div className="text-2xl sm:text-3xl font-black text-brand-900">{societyData.stats.pendingApproval}</div>
          <div className="text-[10px] text-slate-500 pt-1">Awaiting digital signoff</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Emergency Standby</div>
          <div className="text-2xl sm:text-3xl font-black text-red-600 flex items-center gap-1">
            <Zap className="w-5 h-5 fill-red-600" /> {societyData.stats.emergencyOpen}
          </div>
          <div className="text-[10px] text-red-600 font-bold pt-1">Rapid response technician active</div>
        </div>
      </div>

      {/* Pending Executive Approvals — only for society_admin, community vertical */}
      {executiveApplications.filter(a=>a.vertical==='community' && a.status==='pending_approval').length>0 && (
        <div className="bg-white rounded-3xl border border-amber-200 shadow-subtle overflow-hidden">
          <div className="p-6 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-amber-900">Pending Executive Approvals — Community & Society ({executiveApplications.filter(a=>a.vertical==='community' && a.status==='pending_approval').length})</h3>
            <span className="text-[11px] text-amber-700">Society Admin action required</span>
          </div>
          <div className="divide-y divide-amber-100">
            {executiveApplications.filter(a=>a.vertical==='community' && a.status==='pending_approval').map(app=>(
              <div key={app.id} className="p-4 flex items-center justify-between">
                <div className="text-xs"><div className="font-bold text-slate-900">{app.applicantName} — {app.applicantPhone}</div><div className="text-slate-500">{app.applicantEmail} • Vertical: {app.vertical}</div></div>
                {currentUser?.role==='society_admin' ? (
                  <div className="flex gap-2">
                    <button onClick={()=>approveExecutiveApplication(app.id)} className="px-3 py-1.5 rounded-xl bg-coop-600 text-white text-xs font-bold">Approve</button>
                    <button onClick={()=>rejectExecutiveApplication(app.id)} className="px-3 py-1.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold">Reject</button>
                  </div>
                ) : <span className="text-[11px] text-slate-400">Awaiting Society Admin</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Society Maintenance Queue */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-subtle overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Active Common Area & Unit Requests ({requests.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Real-time status of building infrastructure repairs</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="p-4">Block / Unit</th>
                <th className="p-4">Service Requirement</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Assigned Cooperative Squad</th>
                <th className="p-4">Scheduled Window</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 font-bold text-slate-900">{req.unit}</td>
                  <td className="p-4 text-slate-700 font-medium">{req.service}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      req.priority === 'Emergency'
                        ? 'bg-red-100 text-red-800 border border-red-200 animate-pulse'
                        : req.priority === 'High'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {req.priority}
                    </span>
                  </td>
                  <td className="p-4 text-coop-800 font-semibold">{req.provider}</td>
                  <td className="p-4 text-slate-500">{req.date}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-coop-50 text-coop-700 font-bold text-[10px] border border-coop-200">
                      <CheckCircle2 className="w-3 h-3" /> {req.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECURRING INFRASTRUCTURE LOGS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-subtle space-y-3">
          <div className="flex items-center gap-2 text-brand-900 font-bold text-sm">
            <Droplets className="w-5 h-5 text-blue-600" />
            <span>Water Sump & Overhead Tank UV Sterilization</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Next scheduled 6-stage deep de-sludging and UV bacterial purification for 200,000L central sump: <strong>September 5, 2026</strong>. Managed by Amit Das master plumbing team.
          </p>
          <div className="text-[11px] text-coop-700 font-semibold">✓ Water Quality Certificate: Grade A Potable</div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-subtle space-y-3">
          <div className="flex items-center gap-2 text-brand-900 font-bold text-sm">
            <Zap className="w-5 h-5 text-amber-500" />
            <span>Transformer & Diesel Generator Safety Audit</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Bi-monthly thermographic infrared heat scan on 500kVA transformer panels and automatic transfer switch (AMF). Completed on <strong>August 18, 2026</strong> with 0 phase load defects.
          </p>
          <div className="text-[11px] text-coop-700 font-semibold">✓ Industrial Safety Audit Signed</div>
        </div>
      </div>

      {/* RAISE TICKET MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 font-display">Raise Society Maintenance Ticket</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Block & Location in Society</label>
                <input
                  type="text"
                  required
                  value={unitBlock}
                  onChange={(e) => setUnitBlock(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  placeholder="e.g. Block C - 4th Floor Corridor"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Service Type</label>
                  <select
                    value={serviceCategory}
                    onChange={(e) => setServiceCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Electrical">Electrical / Lighting</option>
                    <option value="Plumbing">Plumbing / Sump</option>
                    <option value="Sanitization">Corridor Scrubbing</option>
                    <option value="Carpentry">Clubhouse Door/Lock</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Emergency">🚨 Emergency (Immediate)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description of Issue</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  placeholder="Details of the fault or maintenance required..."
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-brand-900 hover:bg-brand-800 text-white font-bold shadow-md transition-colors"
              >
                Dispatch Ticket to Cooperative Team
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

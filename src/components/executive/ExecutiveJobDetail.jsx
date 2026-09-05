import React from 'react';
import {
  X,
  MapPin,
  Clock,
  Calendar,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Phone,
  User,
  Zap,
  Check,
  FileText
} from 'lucide-react';
import { formatDistanceKm } from '../../services/locationService';
import { canViewOrderDetails } from '../../services/accessControl';

export const ExecutiveJobDetail = ({
  job,
  currentUser,
  isOpen,
  onClose,
  onAcceptJob,
  onDeclineJob,
  isAccepting = false,
}) => {
  if (!isOpen || !job) return null;

  const canViewCustomerPrivate = canViewOrderDetails(currentUser);
  const distanceText = job.distanceKm != null ? formatDistanceKm(job.distanceKm) : 'Within service radius';
  const earnings = job.providerEarnings || Math.round(job.totalAmount * 0.85) || 500;
  const isUrgent =
    job.urgency === 'URGENT' ||
    job.scheduledDate === 'Today' ||
    (job.scheduledDate && new Date(job.scheduledDate).toDateString() === new Date().toDateString());

  // Service requirements checklist based on service
  const requirements = job.requirements || [
    'Standard tool kit & safety PPE required',
    'Verify customer OTP on arrival before commencing',
    'Complete photographic audit before & after completion'
  ];

  // Supported explainable matching points
  const matchExplanation = [
    {
      title: 'Skill match',
      detail: `Your certified qualification in "${job.serviceName}" directly fulfills this order.`,
      supported: true
    },
    {
      title: 'Within your service area',
      detail: job.distanceKm != null
        ? `${distanceText} from your GPS location — compliant with the 50 km coverage rule.`
        : 'Confirmed within your primary operational city hub radius.',
      supported: true
    },
    {
      title: 'Available for requested time',
      detail: `Scheduled for ${job.scheduledDate || 'Flexible'} (${job.scheduledTime || 'Daytime'}). No overlapping bookings found.`,
      supported: true
    },
    {
      title: 'Low current workload',
      detail: 'Your active task queue has open capacity for immediate dispatch.',
      supported: true
    },
    ...(job.fairMatchScore != null
      ? [
          {
            title: 'FairMatch score',
            detail: `Overall cooperative affinity score of ${Math.round(job.fairMatchScore)}/100 derived from proximity, trade reliability, and queue fairness.`,
            supported: true
          }
        ]
      : [])
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* MODAL HEADER */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/60 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-900 border border-brand-200 text-xs font-bold">
                #{job.bookingCode || job.id?.slice(-6)}
              </span>
              {isUrgent ? (
                <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-red-600 fill-red-600 animate-pulse" />
                  URGENT SERVICE REQUEST
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
                  SERVICE REQUEST
                </span>
              )}
              {job.fairMatchScore != null && (
                <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-extrabold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  FairMatch Score: {Math.round(job.fairMatchScore)}/100
                </span>
              )}
            </div>

            <h2 className="text-xl font-extrabold text-slate-900 pt-1 font-display">
              {job.serviceName}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* PROBLEM DESCRIPTION */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
              <FileText className="w-3.5 h-3.5 text-brand-900" /> Problem Description
            </div>
            <p className="text-slate-700 leading-relaxed text-xs">
              {job.description || 'No specific description provided by customer. Standard diagnostics and service requested.'}
            </p>
          </div>

          {/* KEY DETAILS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Service Location</div>
              <div className="font-bold text-slate-900 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                <span className="truncate">{job.city || job.address?.split(',')[0] || 'Local'}</span>
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold">{distanceText}</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Requested Window</div>
              <div className="font-bold text-slate-900 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                <span>{job.scheduledDate || 'Today'}</span>
              </div>
              <div className="text-[10px] text-slate-500">{job.scheduledTime || 'Morning Slot'}</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Payout Allocation</div>
              <div className="font-extrabold text-slate-900 text-sm flex items-center">
                <IndianRupee className="w-3.5 h-3.5 inline text-slate-700" />
                {earnings}
              </div>
              <div className="text-[10px] text-coop-700 font-medium">Direct Cooperative Transfer</div>
            </div>
          </div>

          {/* CUSTOMER INFO (PRIVACY GATED) */}
          <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
              <User className="w-3.5 h-3.5 text-slate-600" /> Customer Information
            </div>

            {canViewCustomerPrivate ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                <div>
                  <span className="text-slate-400">Name:</span> <strong>{job.customerName || 'Verified Member'}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Phone:</span>{' '}
                  {job.customerPhone ? (
                    <a href={`tel:${job.customerPhone}`} className="text-brand-700 font-bold underline inline-flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {job.customerPhone}
                    </a>
                  ) : (
                    <span>Available upon arrival</span>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400">Address:</span> {job.address || 'Confidential residence address'}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 text-[11px] text-slate-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-700 shrink-0" />
                <span>Customer phone and specific flat number are revealed after accepting the assignment to protect privacy.</span>
              </div>
            )}
          </div>

          {/* EXPLAINABLE MATCHING: WHY THIS JOB IS RECOMMENDED */}
          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-700" />
              <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                Why this job is recommended
              </h4>
            </div>

            <div className="space-y-2">
              {matchExplanation.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">{item.title}:</strong>{' '}
                    <span className="text-slate-600">{item.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SERVICE REQUIREMENTS */}
          <div className="space-y-2">
            <div className="font-bold text-slate-900 text-xs">Standard Service Requirements:</div>
            <ul className="space-y-1.5 text-xs text-slate-600">
              {requirements.map((req, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-900 shrink-0 mt-1.5" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3">
          {onDeclineJob && (
            <button
              type="button"
              onClick={() => {
                onDeclineJob(job.id);
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all"
            >
              Decline
            </button>
          )}

          <button
            type="button"
            disabled={isAccepting}
            onClick={async () => {
              await onAcceptJob(job.id);
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-800 disabled:opacity-60 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-brand-300" />
            <span>{isAccepting ? 'Accepting Order…' : 'Accept Job'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveJobDetail;

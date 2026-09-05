import React from 'react';
import {
  MapPin,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Tag,
  ShieldCheck,
  Zap,
  IndianRupee,
  X
} from 'lucide-react';
import { formatDistanceKm } from '../../services/locationService';

export const ExecutiveJobCard = ({
  job,
  onViewDetails,
  onAcceptJob,
  onDeclineJob,
  isAccepting = false,
}) => {
  if (!job) return null;

  const distanceText = job.distanceKm != null ? formatDistanceKm(job.distanceKm) : null;
  const earnings = job.providerEarnings || Math.round(job.totalAmount * 0.85) || 500;
  const isUrgent =
    job.urgency === 'URGENT' ||
    job.scheduledDate === 'Today' ||
    (job.scheduledDate && new Date(job.scheduledDate).toDateString() === new Date().toDateString());

  const matchReasons = job.matchReasons || [
    '✓ Skill match',
    job.distanceKm != null ? `✓ Within service area (${Math.round(job.distanceKm)} km)` : '✓ In service area',
    '✓ FairMatch verified'
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 hover:border-brand-300 shadow-subtle hover:shadow-premium transition-all p-4 sm:p-5 flex flex-col justify-between gap-4 group relative">
      {/* TOP ROW: SERVICE & URGENCY & STATUS */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-900 border border-brand-200 text-[10px] font-bold">
                #{job.bookingCode || job.id?.slice(-6)}
              </span>
              {isUrgent && (
                <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                  <Zap className="w-3 h-3 text-red-600 fill-red-600" /> Urgent Service
                </span>
              )}
              {job.fairMatchScore != null && (
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-extrabold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600" /> FairMatch {Math.round(job.fairMatchScore)}
                </span>
              )}
            </div>

            <h3 className="text-base font-extrabold text-slate-900 group-hover:text-brand-900 transition-colors pt-0.5">
              {job.serviceName}
            </h3>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs text-slate-400 font-medium">Est. Payout</div>
            <div className="text-base font-black text-slate-900 flex items-center justify-end">
              <IndianRupee className="w-3.5 h-3.5 inline text-slate-700" />
              {earnings}
            </div>
          </div>
        </div>

        {/* DESCRIPTION */}
        <p className="text-xs text-slate-600 line-clamp-2 mt-2 leading-relaxed">
          {job.description || `Service requested for ${job.serviceName}. Customer notes awaiting arrival.`}
        </p>

        {/* META DETAILS: LOCATION & TIME */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              {job.address?.split(',')[0] || job.city || 'Local area'}
              {distanceText ? ` • ${distanceText}` : ''}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              {job.scheduledDate || 'Flexible'} {job.scheduledTime ? `(${job.scheduledTime})` : ''}
            </span>
          </div>
        </div>

        {/* WHY THIS JOB IS RECOMMENDED TAGS */}
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          {matchReasons.slice(0, 3).map((reason, idx) => (
            <span
              key={idx}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200"
            >
              {reason}
            </span>
          ))}
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onViewDetails(job)}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
        >
          <span>View Details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {onDeclineJob && (
          <button
            type="button"
            onClick={() => onDeclineJob(job.id)}
            title="Decline job"
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          disabled={isAccepting}
          onClick={() => onAcceptJob(job.id)}
          className="flex-1 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-800 disabled:opacity-60 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-brand-300" />
          <span>{isAccepting ? 'Accepting…' : 'Accept Job'}</span>
        </button>
      </div>
    </div>
  );
};

export default ExecutiveJobCard;

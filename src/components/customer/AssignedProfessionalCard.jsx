import React from 'react';
import { Star, ShieldCheck, Phone, MessageSquare, BadgeCheck, Clock, CheckCircle2 } from 'lucide-react';
import { normalizePartnerForCustomerView, resolveProfessionalPanelState } from '../../services/partnerViewService.js';
import { formatINR } from '../../services/pricingService.js';

// Branch switch used by LiveBookingTracker (and MatchingStatusPage).
// Decision logic lives in resolveProfessionalPanelState (pure, unit-tested):
// single source of truth = bookingStatus + providerId/providerName.
export const ProfessionalStatusPanel = ({ booking, provider, onMessage, totalAmount }) => {
  const panelState = resolveProfessionalPanelState(booking);
  if (panelState === 'assigned') {
    return <AssignedProfessionalCard booking={booking} provider={provider} onMessage={onMessage} totalAmount={totalAmount} />;
  }
  if (panelState === 'replacement') {
    return (
      <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-center space-y-1.5">
        <div className="mx-auto w-11 h-11 rounded-full bg-white border border-amber-200 flex items-center justify-center">
          <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
        </div>
        <div className="text-sm font-black text-slate-900">Finding a replacement professional...</div>
        <p className="text-[11px] text-slate-500">Your previous partner is unavailable. Zolve is assigning a replacement — the new profile will appear here.</p>
      </div>
    );
  }
  if (panelState === 'loading') {
    return <AssignmentMissingCard booking={booking} />;
  }
  return (
    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-1.5">
      <div className="mx-auto w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center">
        <Clock className="w-5 h-5 text-slate-400 animate-pulse" />
      </div>
      <div className="text-sm font-black text-slate-900">Finding a Professional...</div>
      <p className="text-[11px] text-slate-500">Zolve is assigning a qualified Service Partner based on skill, location, availability and workload.</p>
    </div>
  );
};

// Diagnostic state: booking claims an assigned/accepted/en-route stage but
// carries no partner identity. Never silent — visible card + console signal.
// Non-sensitive fields only.
export const AssignmentMissingCard = ({ booking }) => {
  React.useEffect(() => {
    console.warn('ASSIGNMENT DATA MISSING', {
      bookingStatus: booking?.bookingStatus,
      providerId: booking?.providerId ?? null,
      providerName: booking?.providerName ?? null,
    });
  }, [booking?.id, booking?.bookingStatus]);
  return (
    <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-center space-y-1.5">
      <div className="mx-auto w-11 h-11 rounded-full bg-white border border-blue-200 flex items-center justify-center">
        <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
      </div>
      <div className="text-sm font-black text-slate-900">Professional assigned — profile loading</div>
      <p className="text-[11px] text-slate-500">Your professional is confirmed. Their profile is syncing and will appear here momentarily.</p>
    </div>
  );
};

// Post-assignment professional card. Renders ONLY when a partner is assigned —
// the tracker shows "Finding a Professional..." otherwise (privacy preserved).
export const AssignedProfessionalCard = ({ booking, provider, onMessage, totalAmount }) => {
  const [photoBroken, setPhotoBroken] = React.useState(false);
  const view = normalizePartnerForCustomerView(booking, provider);

  if (!view.assigned) {
    return (
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
        <div className="text-xs font-bold text-slate-700">Professional assigned</div>
        <p className="text-[11px] text-slate-500 mt-0.5">Professional details are temporarily unavailable.</p>
      </div>
    );
  }

  const showPhoto = view.photo && !photoBroken;
  const initial = (view.name || 'Z').charAt(0).toUpperCase();
  const isConfirmed = booking?.bookingStatus === 'PROVIDER_ASSIGNED' || booking?.bookingStatus === 'PROVIDER_ACCEPTED';

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      {isConfirmed && (
        <div className="mb-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-black border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" /> Professional Confirmed
        </div>
      )}
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Zolve Professional</div>
      <div className="mt-2.5 flex flex-col sm:flex-row sm:items-start gap-4">
        {showPhoto ? (
          <img
            src={view.photo}
            alt={view.name}
            onError={() => setPhotoBroken(true)}
            className="w-20 h-20 rounded-2xl object-cover ring-2 ring-slate-200 shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-3xl font-black shrink-0" aria-label={view.name}>
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-base font-black text-slate-900">{view.name}</h4>
            {view.isCoopMember && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                Co-op Member
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{view.title || 'Zolve Service Professional'}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600 flex-wrap">
            {view.rating != null ? (
              <span className="flex items-center gap-1 font-extrabold text-amber-600">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                {view.rating.toFixed(1)}{view.ratingCount != null ? <span className="font-medium text-slate-400"> / 5.0</span> : null}
              </span>
            ) : (
              <span className="font-bold text-slate-500">New Partner</span>
            )}
            {view.jobsCompleted != null && <span className="font-semibold">{view.jobsCompleted.toLocaleString('en-IN')} jobs completed</span>}
            {view.experienceLabel && <span className="font-semibold">{view.experienceLabel}</span>}
          </div>
          {view.skills.length > 0 && (
            <div className="mt-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Qualifications</div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {view.skills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                    <BadgeCheck className="w-3 h-3 text-emerald-600" /> {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {view.badges.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {view.badges.map((badge) => (
                <span key={badge} className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5" /> {badge}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-left sm:text-right shrink-0">
          <div className="text-[10px] text-slate-400 font-bold uppercase">Paid via Razorpay</div>
          <div className="text-base font-extrabold text-slate-900">{formatINR(totalAmount)}</div>
        </div>
      </div>
      <div className="mt-3.5 grid grid-cols-2 gap-2">
        {view.phone ? (
          <a
            href={`tel:${String(view.phone).replace(/\s/g, '')}`}
            className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Phone className="w-4 h-4" /> Call
          </a>
        ) : (
          <button onClick={onMessage} className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5">
            <Phone className="w-4 h-4" /> Call
          </button>
        )}
        <button onClick={onMessage} className="py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5">
          <MessageSquare className="w-4 h-4" /> Message
        </button>
      </div>
    </div>
  );
};

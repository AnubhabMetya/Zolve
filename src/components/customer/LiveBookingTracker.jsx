import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import MapView from '../common/MapView';
import { ProfessionalStatusPanel } from './AssignedProfessionalCard';
import { interpolatePosition, resolveCoordsFromText, resolveTrackerPositions, demoPartnerLocationForBooking, nearestProviderToLocation } from '../../services/locationService';
import { allocatePartnerForBooking } from '../../services/internalAllocationService.js';
import { subscribeBookingLocation, publishLocation, isRealtimeEnabled } from '../../services/realtimeService';
import {
  X,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  Send,
  AlertTriangle,
  RotateCcw,
  Star,
  FileText,
  CreditCard,
  User,
  Sparkles,
  ArrowRight
} from 'lucide-react';

const STATUS_STAGES = [
  { key: 'CONFIRMED', label: 'Booking Created & Payment Confirmed', desc: 'Securely verified via Razorpay' },
  { key: 'PROVIDER_ACCEPTED', label: 'Provider Assigned & Accepted', desc: 'Provider confirmed tools & slot' },
  { key: 'PROVIDER_ON_THE_WAY', label: 'Provider On The Way', desc: 'In transit with diagnostic kit' },
  { key: 'SERVICE_STARTED', label: 'Service In Progress', desc: 'Work underway at premises' },
  { key: 'SERVICE_COMPLETED', label: 'Service Completed', desc: 'Job inspected & verified' }
];

export const LiveBookingTracker = () => {
  const {
    activeBookingForTracking,
    setActiveBookingForTracking,
    updateBookingStatus,
    sendBookingChatMessage,
    setActiveBookingForReview,
    setActivePaymentForInvoice,
    setIsReportProblemOpen,
    currentUser,
    activeRole,
    setIsAuthModalOpen,
    setAuthModalTab,
    addNotification,
    providerLiveLocations,
    updateProviderLiveLocation,
    providers,
    bookings,
    assignBookingProvider
  } = useApp();

  const handleDisputeClick = () => {
    if (!currentUser || activeRole !== 'customer') {
      addNotification({
        title: 'Sign in required',
        message: 'Please join as a User to raise a dispute.',
        type: 'system'
      });
      setAuthModalTab('register');
      setIsAuthModalOpen(true);
      return;
    }
    setIsReportProblemOpen(true);
  };

  const [chatInput, setChatInput] = useState('');
  const [livePos, setLivePos] = useState(null);
  const [advancing, setAdvancing] = useState(false);
  const mockIntervalRef = useRef(null);

  // Subscribe to realtime location + mock interpolation fallback
  useEffect(() => {
    if (!activeBookingForTracking) return;
    const booking = activeBookingForTracking;
    const bookingId = booking.id;
    // Partner seed: live GPS > assigned provider coords > deterministic demo
    // near the customer — NEVER the customer coords themselves (that fakes
    // 0.00 km). Demo seed is stable per booking (no per-render randomness).
    const cust = booking.customerCoords || null;
    const seed = providerLiveLocations[bookingId] || booking.providerCoords
      || demoPartnerLocationForBooking(bookingId, cust) || null;
    setLivePos(seed);

    const sub = subscribeBookingLocation(bookingId, (coords) => {
      setLivePos(coords);
      updateProviderLiveLocation(bookingId, coords);
    });
    // also listen same-tab custom event
    const onLocal = (e) => {
      const d = e.detail;
      if (d?.bookingId === bookingId && d?.coords) setLivePos(d.coords);
    };
    window.addEventListener('zolve:live-location', onLocal);

    // Mock motion when no real provider sharing: interpolate 5% every 3s toward customer
    // (only when both ends are known — never fabricate a route from null).
    if (booking.bookingStatus === 'PROVIDER_ON_THE_WAY' && seed && cust) {
      mockIntervalRef.current = setInterval(() => {
        setLivePos((prev) => {
          const cur = prev || seed;
          // if realtime is active, don't mock aggressively — check freshness
          const stored = providerLiveLocations[bookingId];
          const isFresh = stored && Date.now() - new Date(stored.updatedAt || 0).getTime() < 15000;
          if (isFresh && isRealtimeEnabled()) return cur;
          const next = interpolatePosition(cur, cust, 0.06);
          // publish mock so provider view also sees movement if no real GPS
          if (!isRealtimeEnabled()) publishLocation(bookingId, next);
          return next;
        });
      }, 3000);
    }

    return () => {
      sub.unsubscribe();
      window.removeEventListener('zolve:live-location', onLocal);
      if (mockIntervalRef.current) clearInterval(mockIntervalRef.current);
    };
  }, [activeBookingForTracking?.id]);

  if (!activeBookingForTracking) return null;
  const b = activeBookingForTracking;
  // Separated sources, one resolver: destination vs partner position can
  // never be the same object, so distance is never a fake customer→customer 0.
  const tracking = resolveTrackerPositions({
    customerCoords: b.customerCoords,
    liveCoords: livePos,
    assignedCoords: b.providerCoords,
    bookingId: b.id,
  });
  const customerCoords = tracking.customerCoords;
  const providerCoords = tracking.providerCoords;
  const distanceKm = tracking.distanceKm;
  const eta = tracking.eta;

  // Compute current stage index
  const getStageIndex = (status) => {
    switch (status) {
      case 'PAYMENT_PENDING': return 0;
      case 'CONFIRMED': return 0;
      case 'PROVIDER_ASSIGNED': return 1;
      case 'PROVIDER_ACCEPTED': return 1;
      case 'PROVIDER_ON_THE_WAY': return 2;
      case 'SERVICE_STARTED': return 3;
      case 'SERVICE_COMPLETED': return 4;
      default: return 0;
    }
  };

  const currentStageIdx = getStageIndex(b.bookingStatus);

  // Assigned professional resolution — booking is the source of truth.
  // Full record (rating/jobs/experience/skills) resolved from the provider
  // registry; booking-embedded fields are the fallback. Nothing is fabricated.
  const assignedProvider = (providers || []).find((p) => p && b.providerId && p.id === b.providerId) || null;

  const focusChat = () => {
    const input = document.getElementById('tracker-chat-input');
    if (input) {
      input.focus({ preventScroll: false });
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendBookingChatMessage(b.id, chatInput.trim(), 'customer');
    setChatInput('');
  };

  // Demo Simulation Status Advancer. This is a REAL state transition, not a
  // visual stage flip: reaching PROVIDER_ACCEPTED without a partner is an
  // impossible state, so assignment happens here through the same pipeline
  // as dispatch (existing provider dataset, 50km rule, name snapshot).
  // Demo fallback: if strict dispatch finds nobody (e.g. unmapped service
  // name), the nearest dataset partner to the customer is assigned so the
  // demo always progresses with a REAL record — never a fake name, never
  // a stuck button. Timeline + top panel both read the same booking after.
  const handleAdvanceStatus = async () => {
    if (advancing) return;
    const next = b.bookingStatus === 'CONFIRMED' || b.bookingStatus === 'PROVIDER_ASSIGNED' ? 'PROVIDER_ACCEPTED'
      : b.bookingStatus === 'PROVIDER_ACCEPTED' ? 'PROVIDER_ON_THE_WAY'
      : b.bookingStatus === 'PROVIDER_ON_THE_WAY' ? 'SERVICE_STARTED'
      : b.bookingStatus === 'SERVICE_STARTED' ? 'SERVICE_COMPLETED' : null;
    if (!next) return;
    let identityPatch = {};
    if (next === 'PROVIDER_ACCEPTED' && !b.providerId && !b.providerName) {
      setAdvancing(true);
      try {
        const loc = (b.customerCoords && Number.isFinite(b.customerCoords.lat) && Number.isFinite(b.customerCoords.lng))
          ? { lat: b.customerCoords.lat, lng: b.customerCoords.lng }
          : await resolveCoordsFromText(b.address || '');
        let assigned = null;
        let assignmentSource = 'strict';
        if (loc) {
          try {
            ({ assigned } = allocatePartnerForBooking({
              providers, bookings,
              customerLocation: loc,
              requestedService: { name: b.serviceName },
              requestedDate: b.scheduledDate, requestedTime: b.scheduledTime,
            }));
          } catch { assigned = null; }
        }
        if (!assigned && loc) {
          // Demo fallback: nearest real partner to the customer (same city
          // first by construction). Full dataset record, full profile.
          const best = nearestProviderToLocation(providers, loc);
          if (best) { assigned = best.provider; assignmentSource = 'nearest-fallback'; }
        }
        if (!assigned) throw new Error('no_eligible_partner');
        const updated = await assignBookingProvider(b.id, assigned);
        identityPatch = {
          providerId: assigned.id,
          providerName: assigned.name,
          providerAvatar: assigned.avatar,
          providerPhone: assigned.phone,
          providerTitle: assigned.title,
          isCoopMember: !!assigned.isCoopMember,
          providerCoords: assigned.coords || null,
          providerRating: assigned.rating ?? null,
          providerRatingCount: assigned.ratingCount ?? null,
          providerJobsCompleted: assigned.completedJobs ?? assigned.jobsCompleted ?? null,
          providerExperienceYears: assigned.experienceYears ?? assigned.experience ?? null,
          providerSkills: Array.isArray(assigned.skills) ? assigned.skills.slice(0, 4) : null,
          ...(updated && updated.bookingStatus ? { bookingStatus: updated.bookingStatus } : {}),
        };
        console.log('[tracker] stage transition with assignment', {
          bookingStatus: next,
          providerId: assigned.id,
          providerName: assigned.name,
          assignmentSource,
        });
      } catch (e) {
        console.warn('ASSIGNMENT DATA MISSING', {
          bookingStatus: next,
          providerId: null,
          providerName: null,
          reason: e?.message || e,
        });
        addNotification({
          title: 'Assignment failed',
          message: 'No partner record available for this booking yet. Status unchanged.',
          type: 'system',
        });
        return;
      } finally {
        setAdvancing(false);
      }
    } else {
      console.log('[tracker] stage transition', {
        bookingStatus: next,
        providerId: b.providerId ?? null,
        providerName: b.providerName ?? null,
      });
    }
    updateBookingStatus(b.id, next);
    setActiveBookingForTracking({ ...b, ...identityPatch, bookingStatus: next });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-brand-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-coop-500/20 text-coop-400 border border-coop-500/30">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-display">Live Booking Tracker</h3>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-bold">
                  #{b.bookingCode}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {b.serviceName} • {b.scheduledDate} ({b.scheduledTime})
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveBookingForTracking(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Split Left (Timeline & Details) & Right (Chat & Controls) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
          {/* Left Column (7 cols): Visual Timeline & Provider Card */}
          <div className="lg:col-span-7 p-6 sm:p-8 space-y-6 border-b lg:border-b-0 lg:border-r border-slate-200">
            {/* Professional panel — privacy before assignment, full card after */}
            <ProfessionalStatusPanel
              booking={b}
              provider={assignedProvider}
              onMessage={focusChat}
              totalAmount={b.totalAmount}
            />

            {/* VISUAL 5-STAGE PROGRESSION TIMELINE */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Service Progress Timeline
                </h4>
                {b.bookingStatus === 'PROVIDER_ON_THE_WAY' && distanceKm != null && (
                  <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    ETA: {eta} • {distanceKm.toFixed(2)} km
                  </span>
                )}
                {b.bookingStatus === 'PROVIDER_ON_THE_WAY' && distanceKm == null && (
                  <span className="text-[11px] text-slate-500 font-bold bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                    Waiting for live location...
                  </span>
                )}
              </div>
              {/* Live Map — shows when provider is en route */}
              {b.bookingStatus === 'PROVIDER_ON_THE_WAY' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-coop-700 uppercase flex items-center gap-1"><MapPin className="w-3 h-3" /> Live Tracking {isRealtimeEnabled() ? '(Supabase)' : '(Local mock)'}</span>
                    {providerCoords && customerCoords && (
                      <span className="text-[10px] text-slate-500">{providerCoords.lat.toFixed(4)}, {providerCoords.lng.toFixed(4)} → {customerCoords.lat.toFixed(4)}, {customerCoords.lng.toFixed(4)}</span>
                    )}
                  </div>
                  <MapView providerPos={providerCoords} customerPos={customerCoords} height="260px" />
                  <p className="text-[10px] text-slate-400">Provider marker moves every 3s (mock) or live via GPS when provider shares. Route is straight-line; OSRM routing can replace polyline.</p>
                </div>
              )}

              <div className="space-y-4 relative pl-6 border-l-2 border-slate-200">
                {STATUS_STAGES.map((stage, idx) => {
                  const isPassed = idx <= currentStageIdx;
                  const isCurrent = idx === currentStageIdx;

                  return (
                    <div key={stage.key} className="relative">
                      {/* Node Bullet */}
                      <div
                        className={`absolute -left-[31px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all ${
                          isPassed
                            ? 'bg-coop-600 ring-4 ring-coop-100 shadow-sm'
                            : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                      </div>

                      <div>
                        <div
                          className={`text-xs font-bold ${
                            isCurrent
                              ? 'text-coop-700 font-extrabold'
                              : isPassed
                              ? 'text-slate-900'
                              : 'text-slate-400'
                          }`}
                        >
                          {stage.label}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{stage.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Booking Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Destination Address</div>
                <div className="text-slate-700 line-clamp-2">{b.address}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Instructions / Fault</div>
                <div className="text-slate-700 line-clamp-2">{b.description}</div>
              </div>
            </div>

            {/* Interactive Simulation Status Advancer */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-amber-900">Demo Simulation Controls</div>
                <div className="text-[10px] text-amber-700">Simulate real-time status transitions</div>
              </div>
              <button
                onClick={handleAdvanceStatus}
                disabled={b.bookingStatus === 'SERVICE_COMPLETED' || advancing}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold disabled:opacity-50 transition-colors shadow-sm"
              >
                {b.bookingStatus === 'SERVICE_COMPLETED' ? "Job Completed ✓" : advancing ? "Assigning…" : "Advance Next Stage →"}
              </button>
            </div>
          </div>

          {/* Right Column (5 cols): In-App Live Chat & Action Buttons */}
          <div className="lg:col-span-5 p-6 flex flex-col justify-between space-y-4 bg-slate-50/50">
            {/* Chat Header */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-brand-600" />
                  In-App Provider Chat
                </h4>
                <span className="text-[10px] text-coop-600 font-bold">Online</span>
              </div>

              {/* Chat Message Stream */}
              <div className="bg-white rounded-2xl border border-slate-200 p-3.5 h-64 overflow-y-auto space-y-2.5">
                {b.chatMessages?.length > 0 ? (
                  b.chatMessages.map((msg) => {
                    const isMe = msg.sender === 'customer';
                    const isSystem = msg.sender === 'system';

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="text-center my-2">
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                            {msg.text}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] p-2.5 rounded-2xl text-xs ${
                            isMe
                              ? 'bg-brand-900 text-white rounded-br-none'
                              : 'bg-slate-100 text-slate-900 rounded-bl-none'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[9px] text-slate-400 mt-0.5 px-1">{msg.time}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-slate-400 text-xs py-10">
                    No messages yet. Send a message to {(b.providerName || 'your professional').split(' ')[0]}.
                  </div>
                )}
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendMessage} className="mt-2 flex items-center gap-2">
                <input
                  id="tracker-chat-input"
                  type="text"
                  placeholder="Type message to provider..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
                />
                <button
                  type="submit"
                  className="p-2 rounded-xl bg-brand-900 text-white hover:bg-brand-800 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Quick Actions Panel */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              {b.bookingStatus === 'SERVICE_COMPLETED' ? (
                <button
                  onClick={() => {
                    setActiveBookingForTracking(null);
                    setActiveBookingForReview(b);
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-1.5"
                >
                  <Star className="w-4 h-4 fill-white" />
                  <span>Rate & Review Experience</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to cancel this booking? Full escrow refund will be triggered back to your payment source.")) {
                      updateBookingStatus(b.id, 'CANCELLED', 'Customer requested cancellation');
                      setActiveBookingForTracking(null);
                    }
                  }}
                  className="w-full py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
                >
                  Cancel / Reschedule Booking
                </button>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setActivePaymentForInvoice(b);
                  }}
                  className="flex-1 py-2 rounded-xl border border-slate-200 hover:bg-white text-slate-700 text-xs font-bold flex items-center justify-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>View Tax Invoice</span>
                </button>

                <button
                  onClick={handleDisputeClick}
                  className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center gap-1"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Dispute</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

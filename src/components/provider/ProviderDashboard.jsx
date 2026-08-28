import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Award,
  Star,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  CreditCard,
  Calendar,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  Navigation
} from 'lucide-react';

export const ProviderDashboard = () => {
  const {
    currentUser,
    bookings,
    updateBookingStatus,
    setActiveBookingForTracking,
    setActiveTab,
    addNotification
  } = useApp();

  // Find provider's jobs
  const providerName = currentUser?.name || "Rajesh Kumar";
  const isCoop = currentUser?.isCoopMember !== false;

  // New incoming request simulation state
  const [incomingRequests, setIncomingRequests] = useState([
    {
      id: "in-req-01",
      bookingCode: "ZOL-9014",
      customerName: "Sneha Patel",
      customerPhone: "+91 98450 99881",
      serviceName: "Kitchen Distribution Board Repair",
      location: "Indiranagar 12th Main (1.4 km away)",
      scheduledDate: "Today",
      scheduledTime: "04:30 PM - 05:30 PM",
      estimatedEarnings: 680,
      customerPaid: 780,
      description: "Burning smell from 32A isolator switch when microwave is powered."
    }
  ]);

  // Provider's active and completed jobs from main bookings store
  const activeJobs = bookings.filter(
    (b) =>
      b.bookingStatus !== 'SERVICE_COMPLETED' &&
      b.bookingStatus !== 'CANCELLED' &&
      b.bookingStatus !== 'REFUNDED'
  );

  const completedJobs = bookings.filter((b) => b.bookingStatus === 'SERVICE_COMPLETED');

  // Accept incoming request
  const handleAcceptRequest = (req) => {
    setIncomingRequests((prev) => prev.filter((r) => r.id !== req.id));
    addNotification({
      title: 'Job Request Accepted!',
      message: `You accepted booking #${req.bookingCode} for ${req.customerName}.`,
      type: 'booking'
    });
  };

  const handleDeclineRequest = (reqId) => {
    setIncomingRequests((prev) => prev.filter((r) => r.id !== reqId));
    addNotification({
      title: 'Job Declined',
      message: 'The request was reassigned to the next qualified cooperative provider.',
      type: 'system'
    });
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. WELCOME HEADER & COOPERATIVE STATUS BADGE */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={currentUser?.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"}
            alt={providerName}
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-coop-500/30"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
                Good day, {providerName.split(' ')[0]}!
              </h1>
              {isCoop ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-coop-50 text-coop-700 text-xs font-extrabold border border-coop-200">
                  <Award className="w-3.5 h-3.5 text-coop-600" /> Cooperative Member
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                  Standard Provider
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Location Hub: <strong className="text-slate-800">Indiranagar & Koramangala Hub</strong> • Service Status: <span className="text-coop-700 font-bold">Online & Receiving Jobs</span>
            </p>
          </div>
        </div>

        {/* Cooperative Quick Link */}
        {isCoop && (
          <button
            onClick={() => setActiveTab('cooperative')}
            className="px-4 py-2.5 rounded-xl bg-coop-50 hover:bg-coop-100 text-coop-800 border border-coop-200 text-xs font-bold flex items-center gap-1.5 transition-colors self-start md:self-auto"
          >
            <Users className="w-4 h-4 text-coop-600" />
            <span>Co-op Governance & Votes</span>
          </button>
        )}
      </div>

      {/* 2. KEY METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">This Month's Earnings</div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">₹42,850</div>
          <div className="text-[11px] text-coop-600 font-semibold flex items-center gap-1 pt-1">
            <TrendingUp className="w-3.5 h-3.5" /> +14% vs last month
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Jobs Completed</div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">48</div>
          <div className="text-[11px] text-slate-500 pt-1">326 lifetime completed</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Average Rating</div>
          <div className="text-2xl sm:text-3xl font-black text-amber-500 flex items-center gap-1">
            <Star className="w-6 h-6 fill-amber-500" /> 4.92
          </div>
          <div className="text-[11px] text-slate-500 pt-1">From 184 verified reviews</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Patronage Points</div>
          <div className="text-2xl sm:text-3xl font-black text-brand-900">4,850 pts</div>
          <div className="text-[11px] text-coop-700 font-semibold pt-1">Tier 1 Annual Dividend</div>
        </div>
      </div>

      {/* 3. NEW INCOMING JOB DISPATCH */}
      {incomingRequests.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></div>
            <h2 className="text-lg font-bold text-slate-900 font-display">
              New Incoming Job Requests ({incomingRequests.length})
            </h2>
          </div>

          <div className="space-y-3">
            {incomingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-3xl border-2 border-brand-500 p-5 sm:p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-800 text-xs font-bold">
                      #{req.bookingCode}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{req.serviceName}</h3>
                  </div>

                  <p className="text-xs text-slate-600 italic">"{req.description}"</p>

                  <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {req.scheduledDate} ({req.scheduledTime})
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-coop-600" /> {req.location}
                    </span>
                    <span className="font-semibold text-slate-800">
                      Customer: {req.customerName}
                    </span>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 gap-3 shrink-0">
                  <div className="text-left md:text-right">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Estimated Net Earnings</div>
                    <div className="text-xl font-black text-coop-700">₹{req.estimatedEarnings}</div>
                    <div className="text-[10px] text-slate-400">Customer Paid: ₹{req.customerPaid}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeclineRequest(req.id)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-600 transition-colors"
                    >
                      DECLINE
                    </button>
                    <button
                      onClick={() => handleAcceptRequest(req)}
                      className="px-6 py-2.5 rounded-xl bg-coop-700 hover:bg-coop-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ACCEPT JOB</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. ACTIVE ONGOING JOBS & STATUS CONTROLS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 font-display">
            Active Job Queue & Status Controls
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {activeJobs.length} active service bookings
          </span>
        </div>

        {activeJobs.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-subtle text-slate-500 text-xs">
            No active jobs in queue. You are ready to receive new customer bookings.
          </div>
        ) : (
          <div className="space-y-4">
            {activeJobs.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-subtle flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-bold">
                      #{b.bookingCode}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{b.serviceName}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                      {b.bookingStatus.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">{b.description}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500 pt-1">
                    <div>
                      <strong>Address:</strong> {b.address}
                    </div>
                    <div>
                      <strong>Customer:</strong> {b.customerName} ({b.customerPhone})
                    </div>
                  </div>
                </div>

                {/* Status Action Buttons for Provider */}
                <div className="flex flex-col items-end gap-2 shrink-0 w-full md:w-auto">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Your Earnings</div>
                    <div className="text-lg font-black text-slate-900">₹{b.providerEarnings || b.baseAmount}</div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    {b.bookingStatus === 'CONFIRMED' || b.bookingStatus === 'PROVIDER_ACCEPTED' ? (
                      <button
                        onClick={() => updateBookingStatus(b.id, 'PROVIDER_ON_THE_WAY')}
                        className="px-4 py-2 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>I'm On The Way</span>
                      </button>
                    ) : b.bookingStatus === 'PROVIDER_ON_THE_WAY' ? (
                      <button
                        onClick={() => updateBookingStatus(b.id, 'SERVICE_STARTED')}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Start Service</span>
                      </button>
                    ) : b.bookingStatus === 'SERVICE_STARTED' ? (
                      <button
                        onClick={() => updateBookingStatus(b.id, 'SERVICE_COMPLETED')}
                        className="px-4 py-2 rounded-xl bg-coop-700 hover:bg-coop-800 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete Service</span>
                      </button>
                    ) : null}

                    <button
                      onClick={() => setActiveBookingForTracking(b)}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Details & Chat
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

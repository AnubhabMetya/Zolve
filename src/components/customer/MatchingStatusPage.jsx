import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { allocatePartnerForBooking, customerStatusLabel } from '../../services/internalAllocationService.js';
import { ProfessionalStatusPanel } from './AssignedProfessionalCard.jsx';

// Post-payment screen. Never renders candidate lists, scores, or provider internals.
export const MatchingStatusPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { bookings, providers, assignBookingProvider, setActiveBookingForTracking } = useApp();
  const [allocating, setAllocating] = useState(true);

  const booking = useMemo(() => bookings.find((b) => b.id === id), [bookings, id]);

  useEffect(() => {
    if (!booking) { setAllocating(false); return; }
    if (booking.providerId) { setAllocating(false); return; }
    let cancelled = false;
    const run = async () => {
      // Simulated dispatch delay so the customer perceives matching; allocation itself is instant.
      await new Promise((r) => setTimeout(r, 2200));
      if (cancelled) return;
      try {
        const customerLocation = booking.customerCoords
          ? { lat: booking.customerCoords.lat, lng: booking.customerCoords.lng }
          : null;
        const { assigned } = allocatePartnerForBooking({
          providers, bookings, customerLocation,
          requestedService: { name: booking.serviceName },
          requestedDate: booking.scheduledDate, requestedTime: booking.scheduledTime,
        });
        if (assigned && !cancelled) {
          const updated = await assignBookingProvider(booking.id, assigned);
          if (updated) setActiveBookingForTracking(updated);
        }
      } catch (e) { console.warn('[matching] allocation failed', e); }
      if (!cancelled) setAllocating(false);
    };
    run();
    return () => { cancelled = true; };
  }, [booking?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!booking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Booking not found</h1>
        <button onClick={() => navigate('/bookings')} className="mt-4 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold">Go to My Bookings</button>
      </div>
    );
  }

  const label = customerStatusLabel(allocating ? 'MATCHING' : booking.bookingStatus);
  const confirmed = !allocating && booking.providerId;
  // Resolve the full provider record so the assigned card shows
  // name + title + rating + qualification (booking snapshot is the fallback).
  const assignedProvider = (providers || []).find((p) => p && booking.providerId && p.id === booking.providerId) || null;

  return (
    <div className="max-w-xl mx-auto px-4 py-14 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
        {allocating ? <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /> : <CheckCircle2 className="w-8 h-8 text-emerald-600" />}
      </div>
      <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5" /> Booking Created
      </div>
      <h1 className="mt-3 text-2xl font-extrabold text-slate-900">{allocating ? 'Finding a Professional...' : label}</h1>
      <p className="mt-2 text-sm text-slate-500 leading-relaxed">
        {allocating
          ? 'Zolve is assigning a qualified Service Partner based on skill, location, availability and workload.'
          : confirmed
            ? 'A qualified Service Partner has been assigned to your booking.'
            : 'Your booking is confirmed. A partner will be assigned shortly.'}
      </p>
      <div className="mt-5 bg-white rounded-2xl border border-slate-200 p-4 text-left text-xs space-y-1.5">
        <div className="flex justify-between"><span className="text-slate-500">Booking</span><span className="font-bold">#{booking.bookingCode}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Services</span><span className="font-bold text-right max-w-[60%]">{booking.serviceName}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Schedule</span><span className="font-bold">{booking.scheduledDate} • {booking.scheduledTime}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Total paid</span><span className="font-black">₹{Number(booking.totalAmount || 0).toLocaleString('en-IN')}</span></div>
      </div>
      {confirmed && (
        <div className="mt-5 text-left">
          <ProfessionalStatusPanel
            booking={booking}
            provider={assignedProvider}
            onMessage={() => { setActiveBookingForTracking(booking); navigate('/bookings'); }}
            totalAmount={booking.totalAmount}
          />
        </div>
      )}
      <button
        onClick={() => { setActiveBookingForTracking(booking); navigate('/bookings'); }}
        className="mt-6 px-6 py-3.5 rounded-xl bg-slate-900 text-white text-sm font-bold inline-flex items-center gap-1.5"
      >
        Track Service <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

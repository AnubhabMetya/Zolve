import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

const DISPUTE_CATEGORIES = [
  "Provider didn't arrive (No Show)",
  "Service not completed / Incomplete work",
  "Poor quality of service",
  "Property damage during repair",
  "Overcharging / Price mismatch",
  "Payment or billing issue",
  "Safety or conduct concern",
  "Society ticket",
  "Other query"
];

export const ReportProblemModal = () => {
  const { isReportProblemOpen, setIsReportProblemOpen, bookings, createSupportTicket, currentUser, activeRole, setIsAuthModalOpen, setAuthModalTab, addNotification } = useApp();

  const [selectedBookingCode, setSelectedBookingCode] = useState(bookings[0]?.bookingCode || 'ZOL-8291');
  const [category, setCategory] = useState(DISPUTE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isReportProblemOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser || activeRole !== 'customer') {
      addNotification({
        title: 'Sign in required',
        message: 'Please join as a User to report a problem or raise a dispute.',
        type: 'system'
      });
      setAuthModalTab('register');
      setIsAuthModalOpen(true);
      return;
    }
    setIsSubmitting(true);
    try {
      const booking = bookings.find(b => b.bookingCode === selectedBookingCode);
      const result = await createSupportTicket({
        bookingCode: selectedBookingCode,
        bookingId: booking?.id || null,
        category,
        description
      });
      if (result) setIsReportProblemOpen(false);
    } catch (err) {
      addNotification({ title: 'Failed to submit', message: err?.message || 'Could not raise dispute', type: 'system' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-red-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-100 text-red-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">Report a Problem / Dispute</h3>
              <p className="text-xs text-slate-500">Arbitrated by Zolve Trust & Safety Council</p>
            </div>
          </div>
          <button
            onClick={() => setIsReportProblemOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Related Booking Code</label>
            <select
              value={selectedBookingCode}
              onChange={(e) => setSelectedBookingCode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
            >
              {bookings.map((b) => (
                <option key={b.id} value={b.bookingCode}>
                  #{b.bookingCode} — {b.serviceName} ({b.providerName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Dispute Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
            >
              {DISPUTE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Detailed Description</label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain exactly what happened, any discrepancies in billing, or safety issues..."
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 focus:outline-none leading-relaxed"
            ></textarea>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-coop-600 shrink-0" />
            <span>
              If verified, immediate escrow refund and provider quality review will be initiated within 2 hours.
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <span>Submit Dispute for Council Arbitration</span>
          </button>
        </form>
      </div>
    </div>
  );
};

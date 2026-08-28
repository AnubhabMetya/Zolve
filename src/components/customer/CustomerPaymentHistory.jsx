import React from 'react';
import { useApp } from '../../context/AppContext';
import { CreditCard, FileText, CheckCircle2, ShieldCheck, Clock, ArrowRight } from 'lucide-react';

export const CustomerPaymentHistory = () => {
  const { currentUser, bookings, setActivePaymentForInvoice, setActiveBookingForTracking } = useApp();

  // Filter bookings that have payment records — only own orders unless admin/executive
  const paidBookings = bookings.filter((b) => (b.paymentStatus === 'CAPTURED' || b.paymentStatus === 'REFUNDED') && (!currentUser || currentUser.role==='admin' || b.customerId===currentUser.id));

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-brand-900 via-brand-950 to-coop-950 text-white p-6 sm:p-8 lg:p-10 overflow-hidden shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-blue-500/15 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-xs font-semibold text-coop-300">
            <CreditCard className="w-3.5 h-3.5 text-blue-400" />
            <span>Escrow & Payments Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            Payment & Invoice History
          </h1>
          <p className="text-xs text-slate-300">
            All payments are tokenized securely via Razorpay with encrypted cryptographic receipts
          </p>
        </div>

        <div className="relative z-10 p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white flex items-center gap-2.5 shrink-0">
          <ShieldCheck className="w-5 h-5 text-coop-400 shrink-0" />
          <span>100% Escrow Protected</span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-subtle overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            All Razorpay Transactions ({paidBookings.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-4 font-bold">Transaction ID & Order</th>
                <th className="p-4 font-bold">Booking Code</th>
                <th className="p-4 font-bold">Service & Provider</th>
                <th className="p-4 font-bold">Date & Method</th>
                <th className="p-4 font-bold">Amount</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paidBookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4">
                    <div className="font-mono font-bold text-slate-900">{b.paymentId || 'pay_live_test'}</div>
                    <div className="font-mono text-[10px] text-slate-400">{b.razorpayOrderId || 'order_ref'}</div>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => setActiveBookingForTracking(b)}
                      className="font-bold text-brand-700 hover:underline"
                    >
                      #{b.bookingCode}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-slate-900">{b.serviceName}</div>
                    <div className="text-[11px] text-slate-500">{b.providerName}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-slate-900">{b.scheduledDate}</div>
                    <div className="text-[10px] text-slate-400">{b.paymentMethod || 'UPI'}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-extrabold text-sm text-slate-900">₹{b.totalAmount}</div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-coop-50 text-coop-700 font-bold text-[10px] border border-coop-200">
                      <CheckCircle2 className="w-3 h-3" /> {b.paymentStatus}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setActivePaymentForInvoice(b)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-brand-50 hover:text-brand-900 hover:border-brand-300 text-slate-700 text-xs font-bold transition-all inline-flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Receipt</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

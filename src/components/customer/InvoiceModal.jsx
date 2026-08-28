import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, Printer, Download, ShieldCheck, Award, Building, CheckCircle2 } from 'lucide-react';

export const InvoiceModal = () => {
  const { activePaymentForInvoice, setActivePaymentForInvoice } = useApp();

  if (!activePaymentForInvoice) return null;
  const b = activePaymentForInvoice;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative max-h-[92vh] flex flex-col printable-receipt">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 uppercase">Official Tax Invoice & Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={() => setActivePaymentForInvoice(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        <div className="p-8 space-y-6 overflow-y-auto text-slate-900 dark:text-slate-100 font-sans bg-white dark:bg-slate-900">
          {/* Brand Header */}
          <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-700 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-950 text-white font-black flex items-center justify-center text-base">
                  Z
                </div>
                <span className="text-2xl font-extrabold text-black dark:text-white font-display">Zolve</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Zolve Cooperative Services Ecosystem Ltd.</p>
              <p className="text-[11px] text-slate-400">GSTIN: 29AAACZ1092M1Z4 • Bengaluru, India</p>
            </div>

            <div className="text-right space-y-0.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-coop-50 text-coop-700 text-xs font-extrabold border border-coop-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> PAID (CAPTURED)
              </span>
              <div className="text-xs font-bold text-slate-900 mt-1">Invoice #{b.bookingCode}-INV</div>
              <div className="text-[11px] text-slate-500">Date: {b.scheduledDate || '2026-08-26'}</div>
            </div>
          </div>

          {/* Customer & Provider Details */}
          <div className="grid grid-cols-2 gap-6 text-xs">
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Billed To</div>
              <div className="font-bold text-slate-900">{b.customerName || 'Anubhab Metya'}</div>
              <div className="text-slate-600 line-clamp-2">{b.address}</div>
              <div className="text-slate-500">{b.customerPhone}</div>
            </div>

            <div className="space-y-1 text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Fulfillment Partner</div>
              <div className="font-bold text-slate-900">{b.providerName}</div>
              <div className="text-slate-600">{b.providerTitle}</div>
              <div className="text-coop-700 font-semibold">{b.isCoopMember ? "Cooperative Delegate" : "Verified Pro"}</div>
            </div>
          </div>

          {/* Transaction Metadata */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Razorpay Order ID</div>
              <div className="font-mono text-slate-800 dark:text-slate-200 text-[11px]">{b.razorpayOrderId || 'order_Kz8271049281'}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Razorpay Payment ID</div>
              <div className="font-mono text-slate-800 dark:text-slate-200 text-[11px]">{b.paymentId || 'pay_Nz92A1bX_Live'}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Payment Mode</div>
              <div className="font-bold text-slate-800 dark:text-slate-200">{b.paymentMethod || 'UPI / Card'}</div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="p-3 font-bold">Service Description</th>
                  <th className="p-3 font-bold text-right">Qty</th>
                  <th className="p-3 font-bold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="p-3">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{b.serviceName}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Standard professional service delivery</div>
                  </td>
                  <td className="p-3 text-right dark:text-slate-300">1</td>
                  <td className="p-3 text-right font-semibold dark:text-slate-100">₹{b.baseAmount}</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-600 dark:text-slate-400">Platform Technology Fee (8%)</td>
                  <td className="p-3 text-right dark:text-slate-300">1</td>
                  <td className="p-3 text-right font-semibold dark:text-slate-100">₹{b.platformFee || 80}</td>
                </tr>
                <tr>
                  <td className="p-3 text-coop-800 dark:text-coop-400">Cooperative Member Reserve Allocation (4%)</td>
                  <td className="p-3 text-right dark:text-slate-300">1</td>
                  <td className="p-3 text-right font-semibold dark:text-slate-100">₹{b.coopReserveFee || 40}</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-500 dark:text-slate-400">GST on Platform & Cooperative Fees (18%)</td>
                  <td className="p-3 text-right dark:text-slate-300">1</td>
                  <td className="p-3 text-right font-semibold dark:text-slate-100">₹{b.taxes || 44}</td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t border-slate-200 dark:border-slate-700">
                <tr>
                  <td colSpan={2} className="p-3 text-right font-extrabold text-sm text-slate-900 dark:text-white">Total Paid:</td>
                  <td className="p-3 text-right font-black text-sm text-black dark:text-white bg-white dark:bg-slate-900">₹{b.totalAmount}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Cooperative Guarantee & Signature Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5 text-coop-700 font-semibold">
              <Award className="w-4 h-4" />
              <span>Cooperative Quality & Fair Trade Verified</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] block">Digitally authenticated by Zolve Ledger</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

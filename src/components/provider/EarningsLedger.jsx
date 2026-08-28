import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CreditCard,
  TrendingUp,
  Download,
  ShieldCheck,
  Award,
  ArrowUpRight,
  CheckCircle2,
  Building,
  DollarSign,
  Info,
  X
} from 'lucide-react';

export const EarningsLedger = () => {
  const { earningsLedger, addNotification } = useApp();

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('15000');
  const [bankAccount, setBankAccount] = useState('HDFC Bank •••• 4892');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Compute totals
  const totalNetEarnings = earningsLedger.reduce((sum, item) => sum + (item.netEarnings || 0), 0);
  const totalCoopAllocations = earningsLedger.reduce((sum, item) => sum + (item.coopAllocation || 0), 0);

  const handleWithdrawSubmit = (e) => {
    e.preventDefault();
    setIsWithdrawing(true);

    setTimeout(() => {
      setIsWithdrawing(false);
      setIsWithdrawModalOpen(false);

            addNotification({
        title: 'Payout Processed Successfully',
        message: `₹${withdrawAmount} transferred to ${bankAccount} via IMPS. Ref: IMPS98273645.`,
        type: 'payment'
      });
    }, 800);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-brand-900 via-brand-950 to-coop-950 text-white p-6 sm:p-8 lg:p-10 overflow-hidden shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-coop-500/15 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-xs font-semibold text-coop-300">
            <Award className="w-3.5 h-3.5 text-coop-400" />
            <span>Transparent Provider Economics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            Provider Earnings & Cooperative Ledger
          </h1>
          <p className="text-xs text-slate-300">
            Full itemized breakdown of customer payments, platform fee (8%), and cooperative member fund (4%)
          </p>
        </div>

        <button
          onClick={() => setIsWithdrawModalOpen(true)}
          className="relative z-10 px-5 py-3 rounded-xl bg-coop-600 hover:bg-coop-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Withdraw to Bank Account</span>
        </button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Available Payout Balance</div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">₹18,450</div>
          <div className="text-[10px] text-coop-700 font-medium pt-1">Instant IMPS Available</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Total Settled Earnings</div>
          <div className="text-2xl sm:text-3xl font-black text-brand-900">₹{totalNetEarnings.toLocaleString()}</div>
          <div className="text-[10px] text-slate-500 pt-1">Across all completed jobs</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Co-op Fund Accumulated</div>
          <div className="text-2xl sm:text-3xl font-black text-coop-700">₹{totalCoopAllocations.toLocaleString()}</div>
          <div className="text-[10px] text-coop-700 font-medium pt-1">4% reserve fund contribution</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Year-End Dividend Pool</div>
          <div className="text-2xl sm:text-3xl font-black text-amber-500">₹6,820</div>
          <div className="text-[10px] text-slate-500 pt-1">Based on 4.92★ rating & hours</div>
        </div>
      </div>

      {/* Transparent Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-subtle overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Itemized Earnings Ledger ({earningsLedger.length} Records)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Clear distinction between customer paid amount, platform deduction, and net earnings
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Booking</th>
                <th className="p-4">Service & Customer</th>
                <th className="p-4 text-right">Customer Paid (Gross)</th>
                <th className="p-4 text-right text-slate-500">Platform Fee (8%)</th>
                <th className="p-4 text-right text-coop-800">Co-op Reserve (4%)</th>
                <th className="p-4 text-right text-slate-900 font-black">Net Provider Earnings</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {earningsLedger.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 text-slate-600 font-medium">{item.date}</td>
                  <td className="p-4 font-mono font-bold text-brand-700">#{item.bookingCode}</td>
                  <td className="p-4">
                    <div className="font-semibold text-slate-900">{item.serviceName}</div>
                    <div className="text-[11px] text-slate-500">{item.customerName}</div>
                  </td>
                  <td className="p-4 text-right font-semibold text-slate-900">₹{item.grossAmount}</td>
                  <td className="p-4 text-right text-slate-500">-₹{item.platformFee}</td>
                  <td className="p-4 text-right text-coop-700 font-medium">+₹{item.coopAllocation}</td>
                  <td className="p-4 text-right font-black text-sm text-coop-900">₹{item.netEarnings}</td>
                  <td className="p-4 text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-coop-50 text-coop-700 font-bold text-[10px] border border-coop-200">
                      <CheckCircle2 className="w-3 h-3" /> {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* WITHDRAWAL MODAL */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-coop-100 text-coop-800">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">Bank Withdrawal</h3>
                  <p className="text-xs text-slate-500">Instant IMPS settlement to your registered account</p>
                </div>
              </div>
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Withdrawal Amount (INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    required
                    max="18450"
                    min="500"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-coop-500 focus:outline-none"
                  />
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Available balance: ₹18,450</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Destination Bank Account
                </label>
                <input
                  type="text"
                  disabled
                  value={bankAccount}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700"
                />
              </div>

              <div className="p-3 rounded-xl bg-coop-50 border border-coop-200 text-[11px] text-coop-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-coop-600 shrink-0" />
                <span>Zero withdrawal fee. Processed via banking partner instant gateway.</span>
              </div>

              <button
                type="submit"
                disabled={isWithdrawing}
                className="w-full py-3 rounded-xl bg-coop-700 hover:bg-coop-800 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{isWithdrawing ? "Processing IMPS Payout..." : `Transfer ₹${withdrawAmount} Now`}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

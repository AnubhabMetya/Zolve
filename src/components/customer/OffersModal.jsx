import React, { useState } from 'react';
import { X, TicketPercent, Check, ChevronDown } from 'lucide-react';
import { getAvailableCoupons, formatINR, describeCoupon, calculateCouponDiscount } from '../../services/couponService.js';
import { useCart } from '../../context/CartContext.jsx';

// ZOLVE OFFERS — one coupon per booking, validated against service subtotal.
export const OffersModal = ({ open, onClose }) => {
  const { subtotal, appliedCouponCode, applyCoupon } = useCart();
  const [expanded, setExpanded] = useState(null);
  const [justApplied, setJustApplied] = useState('');

  if (!open) return null;

  const offers = getAvailableCoupons(subtotal);

  const handleApply = (code) => {
    const res = applyCoupon(code);
    if (res.ok) {
      setJustApplied(code);
      setTimeout(() => { onClose(); setJustApplied(''); }, 650);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">ZOLVE OFFERS</h3>
            <p className="text-xs text-slate-500">Save more on your next service</p>
          </div>
          <button onClick={onClose} aria-label="Close offers" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3.5 overflow-y-auto flex-1">
          <p className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            One coupon can be used per booking. Applying a new coupon replaces the current one.
          </p>
          {offers.map((o) => {
            const isApplied = appliedCouponCode === o.code;
            const isOpen = expanded === o.code;
            return (
              <div key={o.code} className={`rounded-2xl border-2 overflow-hidden ${isApplied ? 'border-emerald-300 bg-emerald-50/50' : o.eligible ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50/60'}`}>
                <div className="p-4 flex items-start gap-3.5">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${isApplied ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>
                    <TicketPercent className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black tracking-wider text-slate-900">{o.code}</span>
                      {isApplied && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                          <Check className="w-3 h-3" /> Applied
                        </span>
                      )}
                      {!o.eligible && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">Locked</span>
                      )}
                    </div>
                    <div className="text-xl font-black text-slate-900 mt-0.5">{o.title}</div>
                    <p className="text-xs text-slate-600 mt-0.5">Minimum order {formatINR(o.minimumSubtotal)}</p>
                    <p className="text-xs font-black text-slate-900 mt-0.5">{o.capLine}</p>
                    {!o.eligible ? (
                      <p className="text-[11px] font-bold text-amber-700 mt-1.5">
                        Add {formatINR(o.shortfall)} more to unlock {o.code}.
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500 mt-1.5">
                        e.g. order {formatINR(o.exampleOrder)} → save {formatINR(o.exampleDiscount)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="px-4 pb-3.5 flex items-center gap-2">
                  <button
                    onClick={() => setExpanded(isOpen ? null : o.code)}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800"
                  >
                    Details <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <span className="flex-1" />
                  {justApplied === o.code ? (
                    <span className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Applied
                    </span>
                  ) : (
                    <button
                      onClick={() => handleApply(o.code)}
                      className={`px-5 py-2 rounded-xl text-xs font-bold ${o.eligible ? 'bg-slate-900 hover:bg-slate-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                      {isApplied ? 'Applied' : 'APPLY'}
                    </button>
                  )}
                </div>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                    <div><strong>Coupon code:</strong> {o.code}</div>
                    <div><strong>Discount:</strong> {o.percentage}% off the service subtotal, {o.capLine.toLowerCase()}</div>
                    <div><strong>Minimum transaction:</strong> {formatINR(o.minimumSubtotal)} (services only, before fees)</div>
                    <div><strong>How it is calculated:</strong> min({formatINR(subtotal)} × {o.percentage}%, {formatINR(o.maxDiscount)}) = {formatINR(calculateCouponDiscount(o, subtotal))} off your current subtotal</div>
                    <div><strong>Combining offers:</strong> {describeCoupon(o)}</div>
                    <div><strong>Restrictions:</strong> no category restrictions in this prototype; quote-only items are excluded from the subtotal.</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

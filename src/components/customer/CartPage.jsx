import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Minus, Plus, ArrowLeft, ArrowRight, Tag, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { useCart } from '../../context/CartContext.jsx';
import { getMicroServiceById } from '../../data/serviceCatalog.js';
import { formatINR } from '../../services/couponService.js';
import { OffersModal } from './OffersModal.jsx';

export const CartPage = () => {
  const {
    items, setQty, remove, clear,
    subtotal, discount, coupon, serviceFee, taxes, total, count, quoteOnly,
    appliedCouponCode, couponNotice, applyCoupon, removeCoupon,
  } = useCart();
  const navigate = useNavigate();
  const [offersOpen, setOffersOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-slate-900">Your Cart</h1>
        <p className="text-sm text-slate-500 mt-2">No services added yet.</p>
        <button onClick={() => navigate('/')} className="mt-6 px-6 py-3 rounded-xl bg-slate-900 text-white text-xs font-bold">
          Browse Services
        </button>
      </div>
    );
  }

  const handleCouponSubmit = (e) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    const res = applyCoupon(couponInput);
    if (res.ok) setCouponInput('');
  };

  return (
    <div className="pb-28 lg:pb-16">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">Your Cart</h1>
        <button onClick={clear} className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1">
          <Trash2 className="w-3.5 h-3.5" /> Clear cart
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        {/* Left: selected services */}
        <div className="lg:col-span-3 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Selected Services</h2>
          {items.map(({ id, qty }) => {
            const svc = getMicroServiceById(id);
            if (!svc) return null;
            return (
              <div key={id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-slate-900">{svc.name}</div>
                  <div className="text-[11px] text-slate-500">{svc.duration}</div>
                  <div className="text-sm font-black text-slate-900 mt-1">
                    {svc.price.kind === 'quote' ? 'Request Quote' : formatINR(svc.price.amount * qty)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {svc.price.kind !== 'quote' && (
                    <>
                      <button onClick={() => setQty(id, qty - 1)} aria-label="Decrease" className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-bold w-6 text-center">{qty}</span>
                      <button onClick={() => setQty(id, qty + 1)} aria-label="Increase" className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">
                        <Plus className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button onClick={() => remove(id)} aria-label={`Remove ${svc.name}`} className="ml-1 p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: offers + summary */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Offers & Coupons</h2>
            <button
              onClick={() => setOffersOpen(true)}
              className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Tag className="w-4 h-4" /> View Offers & Coupons →
            </button>

            {!appliedCouponCode ? (
              <form onSubmit={handleCouponSubmit} className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-600">Have a coupon?</label>
                <div className="flex gap-2">
                  <input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold tracking-widest uppercase placeholder:normal-case placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <button type="submit" className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold shrink-0">Apply</button>
                </div>
              </form>
            ) : (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800">
                  <CheckCircle2 className="w-4 h-4" /> {appliedCouponCode} applied
                </div>
                <p className="text-[11px] text-emerald-700">You saved {formatINR(discount)}</p>
                <button onClick={removeCoupon} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-red-600 mt-1">
                  <X className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            )}
            {couponNotice && (
              <p className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" /> {couponNotice}
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Price Summary</h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({count} item{count > 1 ? 's' : ''})</span>
                <span className="font-bold text-slate-900">{quoteOnly ? 'Request Quote' : formatINR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Discount{coupon ? ` (${coupon.code})` : ''}</span>
                <span className={`font-bold ${discount > 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                  {discount > 0 ? `−${formatINR(discount)}` : formatINR(0)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Service Fee</span>
                <span className="font-semibold text-slate-900">{formatINR(serviceFee)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>GST (18% on fee)</span>
                <span>{formatINR(taxes)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2.5 border-t border-slate-100">
                <span>Total</span>
                <span>{quoteOnly ? 'Request Quote' : formatINR(total)}</span>
              </div>
              {discount > 0 && (
                <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  You saved {formatINR(discount)}
                </p>
              )}
            </div>
            <button
              onClick={() => navigate('/checkout')}
              className="mt-4 hidden lg:flex w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold items-center justify-center gap-1.5"
            >
              Continue to Slot Booking <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sticky continue */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-4 pb-4 pointer-events-none">
        <button
          onClick={() => navigate('/checkout')}
          className="pointer-events-auto w-full py-4 rounded-2xl bg-slate-900 text-white text-sm font-bold shadow-2xl flex items-center justify-center gap-2"
        >
          Continue to Slot Booking • {quoteOnly ? 'Request Quote' : formatINR(total)} <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <OffersModal open={offersOpen} onClose={() => setOffersOpen(false)} />
    </div>
  );
};

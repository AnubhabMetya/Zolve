import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, ArrowLeft, ArrowRight, Phone, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { buildBookingPayload } from '../../services/pricingService.js';
import { formatINR } from '../../services/couponService.js';
import { getBookableSlots, SLOT_STATUS_LABEL } from '../../services/slotAvailabilityService.js';
import { createRazorpayOrder, verifyRazorpayPayment, openRazorpayCheckout } from '../../services/razorpayService.js';
import { getCurrentPosition, reverseGeocode, searchPlaces, searchByPincode, isValidIndianPincode, resolveCoordsFromText } from '../../services/locationService.js';
import { isValidIndianMobile, normalizePhone } from '../../services/otpService.js';
import MapView from '../common/MapView.jsx';

const DATE_OPTIONS = [0, 1, 2, 3].map((offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return {
    offset,
    label: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' }),
    sub: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    iso: d.toISOString().split('T')[0],
    day: d.toLocaleDateString('en-IN', { weekday: 'short' }).replace('.', ''),
  };
});

export const CheckoutFlow = () => {
  const {
    currentUser, createBooking, setActiveBookingForTracking,
    selectedLocation, savedAddresses, providers, bookings,
    setIsAuthModalOpen, setAuthModalTab,
  } = useApp();
  const { updatePhone } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1 address, 2 slot, 3 summary
  const [address, setAddress] = useState(currentUser?.savedAddresses?.[0]?.addressLine || selectedLocation?.name || '');
  const [customAddress, setCustomAddress] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [coords, setCoords] = useState(
    selectedLocation?.lat != null ? { lat: selectedLocation.lat, lng: selectedLocation.lng } : null
  );
  const [addrResults, setAddrResults] = useState([]);
  const [addrSearching, setAddrSearching] = useState(false);
  const [addrSearchFailed, setAddrSearchFailed] = useState(false);
  const [addrSearchAttempt, setAddrSearchAttempt] = useState(0); // bump to retry
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [gpsError, setGpsError] = useState('');
  const [gpsDenied, setGpsDenied] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [addrLocating, setAddrLocating] = useState(false);
  const [addrLocateError, setAddrLocateError] = useState('');
  const [locBlockError, setLocBlockError] = useState('');

  const [dateIdx, setDateIdx] = useState(1);
  const [slot, setSlot] = useState('09:00 – 11:00');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (currentUser?.phone) setPhone(normalizePhone(currentUser.phone));
  }, [currentUser?.phone]);

  useEffect(() => {
    if (cart.items.length === 0) navigate('/cart');
  }, [cart.items.length, navigate]);

  useEffect(() => {
    if (!isCustom) { setAddrResults([]); setAddrSearchFailed(false); setAddrSearching(false); return; }
    const q = customAddress.trim();
    if (q.length < 3) { setAddrResults([]); setAddrSearchFailed(false); setAddrSearching(false); return; }
    let cancelled = false;
    setAddrSearching(true);
    setAddrSearchFailed(false);
    const t = setTimeout(async () => {
      try {
        const list = await searchPlaces(q, 6);
        if (cancelled) return;
        // Never store undefined — runtime .map() crash guard
        setAddrResults(Array.isArray(list) ? list : []);
        setAddrSearchFailed(false);
      } catch {
        if (cancelled) return;
        setAddrResults([]);
        setAddrSearchFailed(true);
      } finally {
        if (!cancelled) setAddrSearching(false);
      }
    }, 450);
    return () => { cancelled = true; clearTimeout(t); };
  }, [customAddress, isCustom, addrSearchAttempt]);

  const effectiveAddress = isCustom ? (customAddress || address) : address;

  // Checkout-time address → coords resolution. Every paid booking must carry
  // a location for the 50km allocation rule, so a typed address with no GPS
  // resolves on demand in continueFromAddress (offline city/locality match
  // keeps it working without network). Deliberately NOT a background effect:
  // mounting the step-1 map with fresh coords and unmounting it in the same
  // tick (Continue → step 2) tears down Leaflet mid-init and crashes.
  useEffect(() => {
    if (coords) { setAddrLocateError(''); setLocBlockError(''); }
  }, [coords]);

  const payload = useMemo(() => buildBookingPayload(cart.items, cart.appliedCouponCode), [cart.items, cart.appliedCouponCode]);
  const selectedDate = DATE_OPTIONS[dateIdx];

  const slots = useMemo(() => getBookableSlots({
    date: selectedDate.iso,
    serviceIds: payload.serviceIds,
    customerCoords: coords,
    providers, bookings,
  }), [selectedDate.iso, payload.serviceIds, coords, providers, bookings]);

  useEffect(() => {
    const first = slots.find((s) => s.bookable);
    if (first && !slots.find((s) => s.slot === slot)?.bookable) setSlot(first.slot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate.iso]);

  const useGps = async () => {
    setGpsLoading(true); setGpsError(''); setGpsDenied(false);
    try {
      const pos = await getCurrentPosition();
      if (pos == null || pos.lat == null || pos.lng == null) throw new Error('Position unavailable');
      setCoords({ lat: pos.lat, lng: pos.lng });
      try {
        const rev = await reverseGeocode(pos.lat, pos.lng);
        const label = rev?.full || rev?.name || `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`;
        setAddress(label); setCustomAddress(label); setIsCustom(true);
      } catch { /* keep coords */ }
    } catch (e) {
      const msg = e?.message || 'GPS failed';
      setGpsError(msg);
      if (/denied|permission/i.test(msg)) setGpsDenied(true);
    }
    finally { setGpsLoading(false); }
  };

  const locateByPin = async () => {
    if (!isValidIndianPincode(pin)) { setPinError('Enter valid 6-digit pincode'); return; }
    setPinError('');
    try {
      const res = await searchByPincode(pin, 1);
      const best = Array.isArray(res) ? res[0] : null;
      if (!best || best.lat == null || best.lng == null) throw new Error('No location found for this pincode');
      setCoords({ lat: best.lat, lng: best.lng });
      const label = best.short || best.name || pin;
      setCustomAddress(label); setAddress(label); setIsCustom(true);
    } catch (e) { setPinError(e.message || 'Pincode lookup failed'); }
  };

  // Progression AND payment both require a resolvable location — a booking
  // without coords can never be allocated within the 50km rule.
  const canContinueFromAddress = effectiveAddress.trim().length >= 8 && !addrLocating;
  const selectedSlotObj = slots.find((s) => s.slot === slot);

  const continueFromAddress = async () => {
    if (effectiveAddress.trim().length < 8) return;
    if (coords) { setAddrLocateError(''); setStep(2); return; }
    setAddrLocating(true); setAddrLocateError('');
    try {
      const hit = await resolveCoordsFromText(effectiveAddress.trim());
      if (hit && Number.isFinite(hit.lat) && Number.isFinite(hit.lng)) {
        setCoords({ lat: hit.lat, lng: hit.lng });
        setAddrLocateError('');
        setStep(2);
      } else {
        setAddrLocateError("We couldn't locate this address. Enter a 6-digit PIN, use GPS, or drag the pin on the map.");
      }
    } catch {
      setAddrLocateError("We couldn't locate this address. Enter a 6-digit PIN, use GPS, or drag the pin on the map.");
    } finally { setAddrLocating(false); }
  };

  const handlePay = async () => {
    if (!currentUser) { setAuthModalTab('signin'); setIsAuthModalOpen(true); return; }
    if (payload.quoteOnly) return;
    if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
      setLocBlockError('A locatable service address is required before payment — no partner can be assigned without it.');
      return;
    }
    if (!isValidIndianMobile(phone.trim())) { setPhoneError('Enter valid 10-digit mobile'); return; }
    setPhoneError('');
    if (!currentUser?.phone || normalizePhone(currentUser.phone) !== normalizePhone(phone.trim())) {
      try { await updatePhone(phone.trim()); } catch (e) { setPhoneError(e.message || 'Failed to save phone'); return; }
    }
    setPaying(true);
    try {
      const tempBookingId = `bk-temp-${Date.now()}`;
      const orderRes = await createRazorpayOrder({
        bookingId: tempBookingId, amount: payload.totalAmount,
        customerId: currentUser.id, serviceName: payload.serviceName,
      });
      const isLive = !!import.meta.env.VITE_RAZORPAY_KEY_ID && !orderRes.isSandbox;
      const createFinalBooking = async (payment) => {
        const finalBooking = await createBooking({
          ...payload,
          providerId: null, providerName: null, providerAvatar: null, providerPhone: null, providerTitle: null,
          isCoopMember: false, providerCoords: null, customerCoords: coords,
          customerPhone: normalizePhone(phone.trim()),
          category: 'Service Catalog', address: effectiveAddress,
          scheduledDate: selectedDate.iso, scheduledTime: slot,
          description: `Service catalog order: ${payload.serviceName}. Address: ${effectiveAddress}`,
          paymentId: payment.paymentId, razorpayOrderId: payment.orderId,
          paymentMethod: payment.method || 'UPI',
        });
        cart.clear();
        setPaying(false);
        navigate(`/booking/${finalBooking.id}/matching`);
        setActiveBookingForTracking(finalBooking);
      };
      if (isLive && orderRes.orderId && orderRes.keyId) {
        try {
          const rzpResp = await openRazorpayCheckout({
            orderId: orderRes.orderId, amount: orderRes.amount, keyId: orderRes.keyId,
            customerName: currentUser?.name, customerEmail: currentUser?.email,
            customerPhone: normalizePhone(phone.trim()), serviceName: payload.serviceName,
          });
          const verification = await verifyRazorpayPayment({
            orderId: rzpResp.razorpay_order_id || orderRes.orderId,
            paymentId: rzpResp.razorpay_payment_id, signature: rzpResp.razorpay_signature, bookingId: tempBookingId,
          });
          if (verification.verified) {
            await createFinalBooking({ paymentId: rzpResp.razorpay_payment_id, orderId: rzpResp.razorpay_order_id || orderRes.orderId, method: 'UPI' });
            return;
          }
        } catch (e) { console.warn('Live checkout dismissed, sandbox fallback', e); }
      }
      // Sandbox demo payment (existing pattern)
      const mockPaymentId = `pay_${Math.random().toString(36).substring(2, 11).toUpperCase()}_Live`;
      const mockOrderId = `order_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const verification = await verifyRazorpayPayment({ orderId: mockOrderId, paymentId: mockPaymentId, signature: 'sig_demo', bookingId: 'new_booking' });
      if (verification.verified) {
        await createFinalBooking({ paymentId: mockPaymentId, orderId: mockOrderId, method: 'UPI' });
      } else { setPaying(false); }
    } catch (e) {
      console.error('Payment failed', e);
      setPaying(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-16">
      <button onClick={() => (step === 1 ? navigate('/cart') : setStep(step - 1))} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="flex items-center gap-2 mb-5">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? 'bg-slate-900' : 'bg-slate-200'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h1 className="text-xl font-extrabold text-slate-900">Service Location</h1>
          <div className="space-y-2.5">
            {(currentUser?.savedAddresses || []).map((a) => (
              <button key={a.id} onClick={() => { setAddress(a.addressLine); if (a.coords) setCoords(a.coords); setIsCustom(false); }}
                className={`w-full text-left p-3.5 rounded-2xl border flex items-start gap-3 ${!isCustom && address === a.addressLine ? 'border-slate-900 bg-slate-50' : 'border-slate-200'}`}>
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                <span><span className="block text-xs font-bold">{a.label}</span><span className="block text-xs text-slate-600">{a.addressLine}</span></span>
              </button>
            ))}
            <button onClick={() => setIsCustom(true)} className="w-full text-left p-3 rounded-2xl border border-dashed border-slate-300 text-xs font-bold">
              + Add Different Address for this Booking
            </button>
            {isCustom && (
              <div className="relative">
                <textarea rows={3} value={customAddress} onChange={(e) => setCustomAddress(e.target.value)}
                  placeholder="Type any location in India" className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none" />
                {addrSearching && <p className="text-[11px] text-slate-500 mt-1">Searching locations…</p>}
                {addrSearchFailed && (
                  <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-red-700 font-semibold">Unable to find locations</span>
                    <button onClick={() => setAddrSearchAttempt((n) => n + 1)} className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-700 text-[11px] font-bold">Try Again</button>
                  </div>
                )}
                {!addrSearching && !addrSearchFailed && customAddress.trim().length >= 3 && (addrResults || []).length === 0 && (
                  <p className="text-[11px] text-slate-500 mt-1">No matching locations found. Try a nearby landmark or pincode.</p>
                )}
                {(addrResults || []).length > 0 && (
                  <div className="mt-2 rounded-xl border bg-white shadow-lg max-h-48 overflow-y-auto">
                    {(addrResults || []).map((r) => (
                      <button key={`${r?.lat}-${r?.lng}-${r?.name}`} onClick={() => { const label = r?.name || ''; setCustomAddress(label); setAddress(label); if (r?.lat != null && r?.lng != null) setCoords({ lat: r.lat, lng: r.lng }); setAddrResults([]); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-slate-50 text-xs border-b last:border-0 border-slate-100">{r?.name || 'Unnamed location'}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex gap-2">
              <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit PIN"
                className="flex-1 px-3 py-2 rounded-xl border bg-white text-sm tracking-widest focus:outline-none" />
              <button onClick={locateByPin} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">Locate by PIN</button>
            </div>
            {pinError && <p className="text-xs text-red-600">{pinError}</p>}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Pin exact location (drag marker)</span>
              <button onClick={useGps} disabled={gpsLoading} className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-bold disabled:opacity-60">
                {gpsLoading ? 'Locating...' : 'Use Current GPS'}
              </button>
            </div>
            {gpsDenied && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-center justify-between gap-2">
                <span className="text-xs text-amber-800 font-semibold">Location permission is unavailable</span>
                <button onClick={useGps} disabled={gpsLoading} className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-800 text-[11px] font-bold disabled:opacity-60">Enable Location</button>
              </div>
            )}
            {gpsError && !gpsDenied && <p className="text-xs text-red-600">{gpsError}</p>}
            {!coords && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center space-y-2">
                <p className="text-xs font-bold text-slate-700">Select your service location</p>
                <button onClick={useGps} disabled={gpsLoading} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[11px] font-bold disabled:opacity-60">
                  {gpsLoading ? 'Locating…' : 'Use Current Location'}
                </button>
              </div>
            )}
            <MapView customerPos={coords} providerPos={null} draggable onCustomerMove={setCoords} height="180px" />
          </div>
          {addrLocating && <p className="text-[11px] text-slate-500">Locating address for partner assignment…</p>}
          {!coords && !addrLocating && !addrLocateError && effectiveAddress.trim().length >= 8 && (
            <p className="text-[11px] text-slate-500">We'll locate this address so a nearby partner can be assigned.</p>
          )}
          {addrLocateError && <p className="text-xs text-red-600">{addrLocateError}</p>}
          <button disabled={!canContinueFromAddress} onClick={continueFromAddress}
            className="w-full py-3.5 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-40">
            {addrLocating ? 'Locating…' : <>Continue <ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <h1 className="text-xl font-extrabold text-slate-900">Select Date & Time Slot</h1>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Date</label>
            <div className="grid grid-cols-4 gap-2">
              {DATE_OPTIONS.map((d, i) => (
                <button key={d.iso} onClick={() => setDateIdx(i)}
                  className={`p-3 rounded-2xl border text-center ${dateIdx === i ? 'border-slate-900 bg-slate-50 font-bold' : 'border-slate-200'}`}>
                  <div className="text-xs">{d.day} {d.offset > 1 ? d.sub.split(' ')[0] : d.label}</div>
                  <div className="text-[10px] text-slate-500">{d.sub}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Time</label>
            <div className="grid grid-cols-2 gap-2.5">
              {slots.map((s) => (
                <button key={s.slot} disabled={!s.bookable} onClick={() => setSlot(s.slot)}
                  className={`p-3 rounded-xl border text-xs text-left ${!s.bookable ? 'border-slate-200 bg-slate-50 text-slate-400 opacity-60' : slot === s.slot ? 'border-slate-900 bg-slate-50 font-bold' : 'border-slate-200'}`}>
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{s.slot}</span>
                  <span className={`block mt-1 text-[10px] font-bold ${s.status === 'available' ? 'text-emerald-700' : s.status === 'limited' ? 'text-amber-700' : 'text-slate-400'}`}>
                    {SLOT_STATUS_LABEL[s.status]}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <button disabled={!selectedSlotObj?.bookable} onClick={() => setStep(3)}
            className="w-full py-3.5 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-40">
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <h1 className="text-xl font-extrabold text-slate-900">Order Summary</h1>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2.5 text-xs">
            {(payload.lines || []).map((l) => (
              <div key={l.id} className="flex justify-between text-slate-700">
                <span>{l.name}{l.qty > 1 ? ` x${l.qty}` : ''}</span>
                <span className="font-semibold text-slate-900">{l.lineTotal != null ? formatINR(l.lineTotal) : 'Request Quote'}</span>
              </div>
            ))}
            <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-100">
              <span>Subtotal</span><span className="font-semibold text-slate-900">{formatINR(payload.subtotal)}</span>
            </div>
            {payload.discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Coupon {payload.couponCode}</span><span>−{formatINR(payload.discountAmount ?? payload.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600"><span>Service Fee</span><span>{formatINR(payload.serviceFee)}</span></div>
            <div className="flex justify-between text-slate-500"><span>GST (18% on fee)</span><span>{formatINR(payload.taxes)}</span></div>
            <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-100">
              <span>Total</span><span>{formatINR(payload.total)}</span>
            </div>
            {payload.discount > 0 && (
              <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                You saved {formatINR(payload.discountAmount ?? payload.discount)} with {payload.couponCode}
              </p>
            )}
            <div className="text-[11px] text-slate-500 pt-1">{effectiveAddress} • {selectedDate.sub} • {slot}</div>
          </div>

          <div className={`p-4 rounded-2xl border-2 ${!isValidIndianMobile(phone) ? 'border-amber-300 bg-amber-50/60' : 'border-emerald-200 bg-emerald-50/40'}`}>
            <label className="text-xs font-bold flex items-center gap-1.5"><Phone className="w-4 h-4" /> Contact Mobile <span className="text-red-500">*</span></label>
            <div className="mt-2 flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-white">
              <span className="text-xs font-bold text-slate-500">+91</span>
              <input value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setPhoneError(''); }}
                placeholder="98765 43210" inputMode="numeric" className="flex-1 outline-none text-sm" />
            </div>
            {phoneError && <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{phoneError}</p>}
            {isValidIndianMobile(phone) && !phoneError && <p className="text-[11px] text-emerald-700 mt-2 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Partner will contact you on +91 {phone}</p>}
          </div>

          {locBlockError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{locBlockError}</p>}
          <button onClick={handlePay} disabled={paying || payload.quoteOnly}
            className="w-full py-4 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-50">
            {paying ? 'Processing Payment…' : payload.quoteOnly ? 'Request Quote — payment not required' : `Proceed to Payment • ${formatINR(payload.total)}`}
          </button>
          <p className="text-[11px] text-slate-400 text-center">Secure payment via Razorpay. Zolve assigns a qualified partner after payment.</p>
        </div>
      )}
    </div>
  );
};

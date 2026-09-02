import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Clock,
  MapPin,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Award,
  Lock,
  ChevronRight,
  Info,
  Wallet,
  Phone
} from 'lucide-react';
import { createRazorpayOrder, verifyRazorpayPayment } from '../../services/razorpayService';
import { getCurrentPosition, reverseGeocode, searchPlaces, searchByPincode, isValidIndianPincode } from '../../services/locationService';
import { isValidIndianMobile, normalizePhone } from '../../services/otpService';
import { useAuth } from '../../context/AuthContext';
import MapView from '../common/MapView';

// ========== IST REAL-TIME DATE / SLOT HELPERS ==========
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // Asia/Kolkata UTC+5:30
const SLOT_DEFINITIONS = [
  '09:00 AM - 10:30 AM',
  '10:30 AM - 11:30 AM',
  '02:00 PM - 03:30 PM',
  '04:30 PM - 06:00 PM',
  '06:30 PM - 08:00 PM',
];

function getISTDateStr(d = new Date()) {
  // en-CA in Asia/Kolkata gives YYYY-MM-DD reliably
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
function addDaysIST(dateStr, days) {
  const [y, m, day] = dateStr.split('-').map(Number);
  // Build a UTC date that represents IST noon, add days, then re-format as IST
  // Safer: parse as IST date -> UTC millis then add
  const utcForISTNoon = Date.UTC(y, m - 1, day, 12, 0, 0) - IST_OFFSET_MS; // actually noon IST as UTC
  const targetUTC = utcForISTNoon + days * 24 * 60 * 60 * 1000;
  return getISTDateStr(new Date(targetUTC));
}
function getWeekdayIST(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcNoonUTC = Date.UTC(y, m - 1, d, 12, 0, 0) - IST_OFFSET_MS;
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' }).format(new Date(utcNoonUTC));
}
function parseSlotStart(slot) {
  // slot = "09:00 AM - 10:30 AM" -> "09:00 AM"
  const start = slot.split('-')[0].trim();
  const match = start.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  const ap = match[3].toUpperCase();
  if (ap === 'AM') { if (h === 12) h = 0; } else { if (h !== 12) h += 12; }
  return { h, min };
}
function getISTSlotStartUTC(dateStr, slot) {
  const p = parseSlotStart(slot);
  if (!p) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  // slot start in IST wall time -> UTC millis
  return Date.UTC(y, m - 1, d, p.h, p.min, 0) - IST_OFFSET_MS;
}
function isSlotEligible(dateStr, slot, nowMs) {
  if (!dateStr || !slot) return false;
  const todayIST = getISTDateStr(new Date(nowMs));
  // Future dates (Tomorrow, day after) are always >2h ahead
  if (dateStr !== todayIST) return true;
  const slotUTC = getISTSlotStartUTC(dateStr, slot);
  if (slotUTC == null) return false;
  return slotUTC >= nowMs + 2 * 60 * 60 * 1000;
}

export const BookingModal = () => {
  const {
    selectedProviderForBooking,
    setSelectedProviderForBooking,
    currentUser,
    createBooking,
    setActiveBookingForTracking,
    setIsAuthModalOpen,
    setAuthModalTab,
    zolveMoney,
    redeemZolveMoney,
    bookingPrefill,
    setBookingPrefill
  } = useApp();
  const { updatePhone } = useAuth();

  const [step, setStep] = useState(1); // 1: Details & AI -> 2: Date & Slot -> 3: Address -> 4: Contact Mobile -> 5: Price Summary & Pay

  const p = selectedProviderForBooking;

  // --- All state declared before effects (fixes oxlint immutability warnings) ---
  const [serviceDescription, setServiceDescription] = useState('Circuit breaker tripping and spark near kitchen switchboard.');
  // IST real-time tick — refresh every 60s so 2-hour rule stays live while modal open
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [selectedDate, setSelectedDate] = useState(() => getISTDateStr());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('10:30 AM - 11:30 AM');
  const [selectedAddress, setSelectedAddress] = useState(
    currentUser?.savedAddresses?.[0]?.addressLine || 'Flat 402, Sunshine Heights, 12th Main, Indiranagar, Bengaluru - 560038'
  );
  const [customAddress, setCustomAddress] = useState('');
  const [isCustomAddress, setIsCustomAddress] = useState(false);
  const [addressCoords, setAddressCoords] = useState(currentUser?.savedAddresses?.[0]?.coords || { lat: 12.9784, lng: 77.6408 });
  const [gpsLoadingAddress, setGpsLoadingAddress] = useState(false);
  const [gpsAddrError, setGpsAddrError] = useState('');
  const [addrSearchResults, setAddrSearchResults] = useState([]);
  const [addrSearching, setAddrSearching] = useState(false);
  const [pinCodeBooking, setPinCodeBooking] = useState('');
  const [pinBookingLoading, setPinBookingLoading] = useState(false);
  const [pinBookingError, setPinBookingError] = useState('');
  const hasAutoLocatedRef = React.useRef(false);
  const addrDebounceRef = React.useRef(null);

  // Prefill from image AI detector — allow anonymous upload → direct booking
  useEffect(() => {
    if (bookingPrefill?.serviceName) {
      const conf = bookingPrefill.confidence ? ` (AI ${Math.round(bookingPrefill.confidence * 100)}% confidence)` : '';
      const sol = bookingPrefill.solution ? bookingPrefill.solution.join(' • ') : '';
      const prob = bookingPrefill.problem || '';
      setServiceDescription(`AI Detected: ${bookingPrefill.serviceName}${conf} — ${prob}. Suggested: ${sol}`.trim());
    }
  }, [bookingPrefill]);

  // Also watch for direct provider change from image detector (sync description)
  useEffect(() => {
    if (bookingPrefill && p && p.title !== bookingPrefill.serviceName) {
      // provider title already set via detector; keep description in sync
    }
  }, [p, bookingPrefill]);

  // Step 3 auto-detect: always use live GPS instead of predefined saved location
  useEffect(() => {
    if (step !== 3 || !p) return;
    if (hasAutoLocatedRef.current) return;
    hasAutoLocatedRef.current = true;
    let cancelled = false;
    const run = async () => {
      setGpsLoadingAddress(true);
      setGpsAddrError('');
      try {
        const pos = await getCurrentPosition();
        if (cancelled) return;
        setAddressCoords({ lat: pos.lat, lng: pos.lng });
        try {
          const rev = await reverseGeocode(pos.lat, pos.lng);
          if (!cancelled) {
            setSelectedAddress(rev.full);
            setCustomAddress(rev.full);
            setIsCustomAddress(true);
          }
        } catch {
          // keep coords even if reverse geocode fails
          if (!cancelled) {
            const fallback = `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)} (Current GPS)`;
            setSelectedAddress(fallback);
            setCustomAddress(fallback);
            setIsCustomAddress(true);
          }
        }
      } catch (e) {
        if (!cancelled) setGpsAddrError(e.message || 'Failed to auto-detect GPS. Use manual address or tap Use Current GPS.');
      } finally {
        if (!cancelled) setGpsLoadingAddress(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [step, p]);

  // Reset auto-locate flag when modal closes / new provider selected
  useEffect(() => {
    if (!selectedProviderForBooking) hasAutoLocatedRef.current = false;
  }, [selectedProviderForBooking]);
  useEffect(() => {
    if (!selectedProviderForBooking) return;
    const id = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(id);
  }, [selectedProviderForBooking]);

  // India-wide autocomplete for custom address (Nominatim countrycodes=in)
  useEffect(() => {
    if (!isCustomAddress) { setAddrSearchResults([]); return; }
    const q = customAddress.trim();
    if (addrDebounceRef.current) clearTimeout(addrDebounceRef.current);
    if (q.length < 3) { setAddrSearchResults([]); setAddrSearching(false); return; }
    setAddrSearching(true);
    addrDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(q, 6);
        setAddrSearchResults(results);
      } catch { setAddrSearchResults([]); }
      finally { setAddrSearching(false); }
    }, 450);
    return () => clearTimeout(addrDebounceRef.current);
  }, [customAddress, isCustomAddress]);

  // Pricing calculations
  const baseServicePrice = p ? p.basePrice * 2 : 800;
  const platformFee = 80;
  const coopReserveFee = 40;
  const gstTax = Math.round((platformFee + coopReserveFee) * 0.18);
  const grossTotal = baseServicePrice + platformFee + coopReserveFee + gstTax;
  const providerEarnings = baseServicePrice;

  // Mobile contact — mandatory for executive contact during service
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingPhoneError, setBookingPhoneError] = useState('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  // sync from profile when available
  useEffect(() => {
    if (currentUser?.phone) setBookingPhone(normalizePhone(currentUser.phone));
    else setBookingPhone('');
  }, [currentUser?.phone, selectedProviderForBooking]);

  // Reset dates/times to real IST whenever booking modal opens (or provider changes)
  useEffect(() => {
    if (!selectedProviderForBooking) return;
    const today = getISTDateStr();
    setSelectedDate(today);
    // Pick first slot that satisfies 2-hour rule for today, otherwise leave tomorrow default
    const firstEligible = SLOT_DEFINITIONS.find(s => isSlotEligible(today, s, Date.now()));
    setSelectedTimeSlot(firstEligible || SLOT_DEFINITIONS[2] || SLOT_DEFINITIONS[0]);
    setNowMs(Date.now());
  }, [selectedProviderForBooking]);

  // Zolve Money redemption state
  const [useZolveMoney, setUseZolveMoney] = useState(false);
  const [zolveMoneyInput, setZolveMoneyInput] = useState('');
  const availableBalance = zolveMoney?.balance || 0;
  const parsedInput = parseInt(zolveMoneyInput, 10);
  const requestedRedeem = useZolveMoney ? (isNaN(parsedInput) ? Math.min(availableBalance, grossTotal) : Math.min(Math.max(0, parsedInput), availableBalance, grossTotal)) : 0;
  const totalAmount = grossTotal - requestedRedeem;

  // Derived IST date options for Step 2 (memoized to avoid IIFE in JSX)
  const istDateOptions = React.useMemo(() => {
    const today = getISTDateStr(new Date(nowMs));
    const tomorrow = addDaysIST(today, 1);
    const dayAfter = addDaysIST(today, 2);
    return [
      { label: 'Today', date: today },
      { label: 'Tomorrow', date: tomorrow },
      { label: getWeekdayIST(dayAfter), date: dayAfter },
    ];
  }, [nowMs]);
  const istTodayHasEligible = React.useMemo(() => {
    const today = getISTDateStr(new Date(nowMs));
    return SLOT_DEFINITIONS.some(s => isSlotEligible(today, s, nowMs));
  }, [nowMs]);

  // Payment Processing State
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);
  const [paymentMethodChoice, setPaymentMethodChoice] = useState('upi'); // 'upi' | 'card' | 'netbanking'
  const [upiId, setUpiId] = useState('anubhab@oksbi');

  if (!selectedProviderForBooking) return null;

  // Step 4 -> 5: validate and persist mobile before billing
  const handlePhoneStepContinue = async () => {
    const effectivePhone = bookingPhone.trim()
    if (!isValidIndianMobile(effectivePhone)) {
      setBookingPhoneError('Enter valid 10-digit mobile — executive will contact you on this')
      return
    }
    // Persist to profile if new or missing, so executive/provider has it for all bookings
    if (!currentUser?.phone || normalizePhone(currentUser.phone) !== normalizePhone(effectivePhone)) {
      try {
        setIsSavingPhone(true)
        setBookingPhoneError('')
        await updatePhone(effectivePhone)
        setBookingPhone(normalizePhone(effectivePhone))
      } catch (e) {
        setBookingPhoneError(e.message || 'Failed to save phone')
        setIsSavingPhone(false)
        return
      }
      setIsSavingPhone(false)
    } else {
      setBookingPhoneError('')
    }
    setStep(5)
  }

  // Next / Back handlers
  const handleProceedToPayment = async () => {
    if (!currentUser) {
      setAuthModalTab('signin');
      setIsAuthModalOpen(true);
      return;
    }
    // Final guard: phone must still be valid (covers direct pay without step 4)
    const effectivePhone = bookingPhone.trim() || currentUser?.phone || ''
    if (!isValidIndianMobile(effectivePhone)) {
      setBookingPhoneError('Enter valid 10-digit mobile — executive will contact you on this during service')
      setStep(4)
      return
    }

    setIsProcessingPayment(true);

    try {
      // Step 1: Secure Order Creation via server / n8n workflow
      const tempBookingId = `bk-temp-${Date.now()}`;
      await createRazorpayOrder({
        bookingId: tempBookingId,
        amount: totalAmount,
        customerId: currentUser.id,
        serviceName: p.title
      });

      setIsProcessingPayment(false);
      setIsRazorpayModalOpen(true);
    } catch (err) {
      console.error("Order creation failed", err);
      setIsProcessingPayment(false);
      setIsRazorpayModalOpen(true);
    }
  };

  const handleSimulateRazorpaySuccess = async () => {
    // Final guard: ensure phone still valid at pay time
    const effectivePhoneAtPay = bookingPhone.trim() || currentUser?.phone || ''
    if (!isValidIndianMobile(effectivePhoneAtPay)) {
      setBookingPhoneError('Mobile required to complete booking — executive needs it to reach you')
      setIsProcessingPayment(false)
      return
    }
    setIsProcessingPayment(true);

    const mockPaymentId = `pay_${Math.random().toString(36).substring(2, 11).toUpperCase()}_Live`;
    const mockOrderId = `order_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const mockSignature = `sig_${Math.random().toString(36).substring(2, 14)}`;

    // Step 2: Server-side cryptographic signature check
    const verification = await verifyRazorpayPayment({
      orderId: mockOrderId,
      paymentId: mockPaymentId,
      signature: mockSignature,
      bookingId: 'new_booking'
    });

    if (verification.verified) {
      // Deduct Zolve Money if applied
      if (requestedRedeem > 0) {
        redeemZolveMoney(requestedRedeem, 'pending');
      }
      // Step 3: Create confirmed booking in application state (Supabase is source of truth)
      const effectivePhoneForBooking = normalizePhone(bookingPhone || currentUser?.phone || '')
      const finalBooking = await createBooking({
        providerId: p.id,
        providerName: p.name,
        providerAvatar: p.avatar,
        providerPhone: p.phone,
        providerTitle: p.title,
        isCoopMember: p.isCoopMember,
        providerCoords: p.coords || { lat: 12.9716, lng: 77.5946 },
        customerCoords: addressCoords,
        customerPhone: effectivePhoneForBooking,
        serviceId: bookingPrefill?.serviceId || 'srv-user-selected',
        serviceName: bookingPrefill?.serviceName || p.title,
        bookingImages: bookingPrefill?.images || [],
        aiDetected: !!bookingPrefill,
        aiConfidence: bookingPrefill?.confidence,
        aiProblem: bookingPrefill?.problem,
        category: p.serviceCategories?.[0] || 'Household',
        address: isCustomAddress ? (customAddress || selectedAddress) : selectedAddress,
        scheduledDate: selectedDate,
        scheduledTime: selectedTimeSlot,
        description: serviceDescription,
        baseAmount: baseServicePrice,
        platformFee,
        coopReserveFee,
        taxes: gstTax,
        totalAmount,
        grossTotal,
        zolveMoneyRedeemed: requestedRedeem,
        providerEarnings,
        paymentId: mockPaymentId,
        razorpayOrderId: mockOrderId,
        paymentMethod: paymentMethodChoice.toUpperCase()
      });

      setIsProcessingPayment(false);
      setIsRazorpayModalOpen(false);
      setSelectedProviderForBooking(null);
      setBookingPrefill(null);
      setActiveBookingForTracking(finalBooking);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-in fade-in">
        <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative max-h-[92vh] flex flex-col">
          {/* Top Bar with Step Indicators */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 text-[10px] font-bold">
                  Step {step} of 5
                </span>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Book {p.name}
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {p.title} • {p.isCoopMember ? "Cooperative Member" : "Verified Pro"}
              </p>
            </div>

            <button
              onClick={() => { setSelectedProviderForBooking(null); setBookingPrefill(null); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="w-full bg-slate-100 h-1">
            <div
              className="bg-coop-600 h-1 transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            ></div>
          </div>

          {/* STEP CONTENT BODY */}
          <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
            {/* STEP 1: SERVICE DETAILS & AI ESTIMATE */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 font-display">
                    1. Describe the Service Requirement
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Provide context so {p.name} carries the required parts and diagnostic tools.
                  </p>
                </div>

                {/* AI Image Detection Prefill — anonymous upload allowed */}
                {bookingPrefill && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-brand-50 to-coop-50 border border-brand-200/60 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-brand-900">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>AI Detected: {bookingPrefill.serviceName}</span>
                      {bookingPrefill.confidence && (
                        <span className="ml-1 px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[11px] text-slate-700">
                          {(bookingPrefill.confidence * 100).toFixed(0)}% confidence
                        </span>
                      )}
                      <span className="ml-auto text-[10px] font-normal text-slate-500">from uploaded photo</span>
                    </div>
                    {bookingPrefill.problem && <p className="text-xs text-slate-700">Problem: {bookingPrefill.problem}</p>}
                    {bookingPrefill.solution && <p className="text-xs text-slate-600">Fix: {bookingPrefill.solution.join(' • ')}</p>}
                    {bookingPrefill.images && bookingPrefill.images.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap pt-1">
                        {bookingPrefill.images.map((img, i) => (
                          <img key={i} src={img.url} alt={img.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm" />
                        ))}
                        <span className="self-center text-[11px] text-slate-500">+{bookingPrefill.images.length} photo(s) will be attached to booking</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Problem Description</label>
                  <textarea
                    rows={4}
                    required
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    placeholder="e.g. My kitchen sink drain is leaking water onto the cabinet floor whenever the tap runs."
                    className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-coop-500 focus:outline-none leading-relaxed"
                  ></textarea>
                </div>

                {/* AI Service Estimation Box */}
                <div className="p-4 rounded-2xl bg-brand-50 border border-brand-200/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-brand-900">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>AI Transparent Estimation</span>
                  </div>
                  <p className="text-xs text-brand-800 leading-relaxed font-normal">
                    Estimated service duration: <strong>45 - 90 minutes</strong>. Base diagnostic and standard fixing labor included. Any specialized replacement materials are billed at official dealer wholesale rates without markup.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 2: DATE & TIME SLOT — REAL IST + 2-HOUR RULE */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 font-display">
                    2. Select Preferred Date & Arrival Slot
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Provider availability: {p.availability} • IST: {new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: 'numeric', hour12: true }).format(new Date(nowMs))} (2-hour advance required)
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">Select Date</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {istDateOptions.map((d) => (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => setSelectedDate(d.date)}
                        className={`p-3 rounded-2xl border text-center transition-all ${
                          selectedDate === d.date
                            ? 'border-brand-600 bg-brand-50 text-brand-900 font-bold ring-2 ring-brand-500/20'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="text-xs">{d.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{d.date}</div>
                      </button>
                    ))}
                  </div>
                  {selectedDate === getISTDateStr(new Date(nowMs)) && !istTodayHasEligible && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">No slots left today — all start times are within 2 hours from now. Please choose <strong>Tomorrow</strong> or {istDateOptions[2]?.label}.</p>
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-slate-700">Arrival Time Window</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {SLOT_DEFINITIONS.map((slot) => {
                      const eligible = isSlotEligible(selectedDate, slot, nowMs);
                      const isSelected = selectedTimeSlot === slot;
                      return (
                      <button
                        key={slot}
                        type="button"
                        disabled={!eligible}
                        aria-disabled={!eligible}
                        onClick={() => eligible && setSelectedTimeSlot(slot)}
                        title={!eligible ? 'Unavailable — starts less than 2 hours from now' : ''}
                        className={`p-3 rounded-xl border text-xs text-left transition-all ${
                          !eligible
                            ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'border-coop-600 bg-coop-50 text-coop-900 font-bold'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Clock className={`w-3.5 h-3.5 ${!eligible ? 'text-slate-400' : 'text-coop-600'}`} />
                          <span>{slot}</span>
                          {!eligible && <span className="ml-auto text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">Unavailable</span>}
                        </div>
                      </button>
                    )})}
                  </div>
                  <p className="text-[10px] text-slate-400">Slots start times are compared as IST timestamps: slot must start ≥ 2 hours after now. Refreshes every 60s.</p>
                </div>
              </div>
            )}

            {/* STEP 3: ADDRESS */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 font-display">
                    3. Confirm Service Address
                  </h4>
                  {gpsLoadingAddress && <p className="text-[11px] text-zinc-600 bg-zinc-100 border border-zinc-200 rounded-lg px-2 py-1 mt-2">Detecting current GPS...</p>}
                </div>

                <div className="space-y-2.5">
                  {currentUser?.savedAddresses?.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => {
                        setSelectedAddress(addr.addressLine);
                        if (addr.coords) setAddressCoords(addr.coords);
                        setIsCustomAddress(false);
                      }}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                        !isCustomAddress && selectedAddress === addr.addressLine
                          ? 'border-brand-600 bg-brand-50/70 ring-2 ring-brand-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <MapPin className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{addr.label}</div>
                        <div className="text-xs text-slate-600 mt-0.5">{addr.addressLine}</div>
                        <div className="text-[10px] text-slate-400 mt-1">Landmark: {addr.landmark}</div>
                      </div>
                    </button>
                  ))}

                  {/* Option for custom address */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCustomAddress(true)}
                      className={`w-full text-left p-3 rounded-2xl border text-xs font-bold transition-all ${
                        isCustomAddress ? 'border-brand-600 bg-brand-50' : 'border-dashed border-slate-300 text-slate-600'
                      }`}
                    >
                      + Add Different Address for this Booking
                    </button>

                    {isCustomAddress && (
                      <div className="relative mt-2">
                        <textarea
                          rows={3}
                          value={customAddress}
                          onChange={(e) => setCustomAddress(e.target.value)}
                          placeholder="Type any location in India — e.g. Dadar, Mumbai or MG Road, Delhi — suggestions appear below"
                          className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        ></textarea>
                        {addrSearching && <p className="text-[11px] text-slate-500 mt-1">Searching India...</p>}
                        {addrSearchResults.length > 0 && (
                          <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                            {addrSearchResults.map((r) => (
                              <button
                                key={`${r.lat}-${r.lng}-${r.name}`}
                                type="button"
                                onClick={() => {
                                  setCustomAddress(r.name);
                                  setSelectedAddress(r.name);
                                  setAddressCoords({ lat: r.lat, lng: r.lng });
                                  setAddrSearchResults([]);
                                }}
                                className="w-full text-left px-3 py-2.5 hover:bg-brand-50 dark:hover:bg-slate-800 flex items-start gap-2 border-b last:border-0 border-slate-100 dark:border-slate-800"
                              >
                                <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                                <span className="text-xs text-slate-700 dark:text-slate-200 line-clamp-2">{r.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {!addrSearching && isCustomAddress && customAddress.trim().length >= 3 && addrSearchResults.length === 0 && (
                          <p className="text-[11px] text-slate-400 mt-1">No suggestions — keep typing (e.g. &quot;Connaught Place Delhi&quot;) or use current GPS / drag map pin.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pincode */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brand-700" />
                      <span className="text-xs font-bold text-slate-800">Search by Pincode</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="6-digit PIN e.g. 110001"
                        value={pinCodeBooking}
                        onChange={(e)=>{ const v=e.target.value.replace(/\D/g,'').slice(0,6); setPinCodeBooking(v); if(pinBookingError) setPinBookingError(''); }}
                        onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); (async()=>{ if(!isValidIndianPincode(pinCodeBooking)) { setPinBookingError('Enter valid 6-digit pincode'); return; } setPinBookingLoading(true); setPinBookingError(''); try{ const r=await searchByPincode(pinCodeBooking,1); const b=r[0]; setAddressCoords({lat:b.lat,lng:b.lng}); const label=b.short||b.name; setCustomAddress(label); setSelectedAddress(label); setIsCustomAddress(true);}catch(err){ setPinBookingError(err.message);} finally{ setPinBookingLoading(false);} })(); } }}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm tracking-widest"
                      />
                      <button
                        type="button"
                        disabled={pinBookingLoading || !isValidIndianPincode(pinCodeBooking)}
                        onClick={async ()=>{
                          if(!isValidIndianPincode(pinCodeBooking)) { setPinBookingError('Enter valid 6-digit pincode'); return; }
                          setPinBookingLoading(true); setPinBookingError('');
                          try{
                            const res = await searchByPincode(pinCodeBooking, 1);
                            const best = res[0];
                            setAddressCoords({ lat: best.lat, lng: best.lng });
                            const label = best.short || best.name;
                            setCustomAddress(label);
                            setSelectedAddress(label);
                            setIsCustomAddress(true);
                          }catch(err){ setPinBookingError(err.message || 'Pincode lookup failed'); }
                          finally{ setPinBookingLoading(false); }
                        }}
                        className="px-4 py-2 rounded-xl bg-brand-900 hover:bg-brand-800 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1 shrink-0"
                      >
                        {pinBookingLoading ? 'Locating...' : 'Locate by PIN'}
                      </button>
                    </div>
                    {pinBookingError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">{pinBookingError}</p>}
                  </div>

                  {/* Live Map — Pin your exact location */}
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Pin exact location (drag marker)</span>
                      <button
                        type="button"
                        disabled={gpsLoadingAddress}
                        onClick={async () => {
                          setGpsLoadingAddress(true); setGpsAddrError('');
                          try {
                            const pos = await getCurrentPosition();
                            setAddressCoords({ lat: pos.lat, lng: pos.lng });
                            try {
                              const rev = await reverseGeocode(pos.lat, pos.lng);
                              setSelectedAddress(rev.full);
                              setCustomAddress(rev.full);
                              setIsCustomAddress(true);
                            } catch { /* keep coords */ }
                          } catch (e) { setGpsAddrError(e.message); } finally { setGpsLoadingAddress(false); }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-brand-900 text-white text-[11px] font-bold disabled:opacity-60 flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3" /> {gpsLoadingAddress ? 'Locating...' : 'Use Current GPS'}
                      </button>
                    </div>
                    {gpsAddrError && <p className="text-xs text-red-600">{gpsAddrError}</p>}
                    <MapView customerPos={addressCoords} providerPos={p.coords || null} draggable onCustomerMove={setAddressCoords} height="180px" />
                    <p className="text-[10px] text-slate-400">Drag the blue pin to adjust. Coordinates saved with booking: {addressCoords.lat.toFixed(4)}, {addressCoords.lng.toFixed(4)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: CONTACT MOBILE (after location, before billing) */}
            {step === 4 && (
              <div className="space-y-5 animate-in fade-in">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 font-display">
                    4. Contact Mobile Number
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Executive / provider will call you on this number during the service — required before billing.
                  </p>
                </div>

                <div className={`p-5 rounded-2xl border-2 ${!isValidIndianMobile(bookingPhone) ? 'border-amber-300 bg-amber-50/60' : 'border-coop-200 bg-coop-50/40'}`}>
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-brand-700" /> Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-1">10 digits, starts 6-9. This is how the executive reaches you for OTP & arrival.</p>
                  <div className="mt-3 flex gap-2">
                    <div className="flex items-center gap-2 flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500">
                      <span className="text-xs font-bold text-slate-500 shrink-0">+91</span>
                      <input type="tel" inputMode="numeric" maxLength={10} value={bookingPhone} onChange={e=>{ setBookingPhone(e.target.value.replace(/\D/g,'').slice(0,10)); if(bookingPhoneError) setBookingPhoneError(''); }} placeholder="98765 43210" className="flex-1 outline-none text-sm placeholder:text-slate-400" />
                    </div>
                    {currentUser?.phone && normalizePhone(currentUser.phone) === bookingPhone && isValidIndianMobile(bookingPhone) && <span className="self-center text-[11px] font-bold text-coop-700 px-2.5 py-1 rounded-full bg-white border border-coop-200 shrink-0">Saved to profile</span>}
                  </div>
                  {bookingPhoneError && <p className="text-xs text-red-600 mt-2 flex items-center gap-1.5"><AlertCircle className="w-4 h-4 shrink-0" />{bookingPhoneError}</p>}
                  {!bookingPhoneError && !isValidIndianMobile(bookingPhone) && <p className="text-[11px] text-amber-700 mt-2 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Required: 10 digits, starts 6-9. Booking cannot proceed without it.</p>}
                  {isValidIndianMobile(bookingPhone) && !bookingPhoneError && <p className="text-[11px] text-coop-700 mt-2 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Executive will contact you on <strong>+91 {bookingPhone}</strong>. {currentUser?.phone !== bookingPhone && <span className="font-normal text-slate-600">— will be saved to your profile.</span>}</p>}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-coop-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-slate-600"><strong>Privacy:</strong> Number is shared only with assigned executive/provider for this booking and is stored securely in your Zolve profile.</div>
                </div>
              </div>
            )}

            {/* STEP 5: PRICE SUMMARY & CHECKOUT PREVIEW */}
            {step === 5 && (
              <div className="space-y-5 animate-in fade-in">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 font-display">
                    5. Price Breakdown & Transparent Economics
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Full transparency: Provider receives fair pay without surge deductions.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-coop-50 border border-coop-200 flex items-center gap-2 text-xs">
                  <Phone className="w-4 h-4 text-coop-600" />
                  <span className="text-slate-700">Contact: <strong>+91 {bookingPhone}</strong></span>
                  <button type="button" onClick={()=>setStep(4)} className="ml-auto text-[11px] font-bold text-brand-700 underline">Change</button>
                </div>

                {/* Service Card Snapshot */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900">{p.title}</div>
                    <div className="text-slate-500">{selectedDate} • {selectedTimeSlot}</div>
                    <div className="text-[11px] text-slate-400 truncate max-w-xs">{isCustomAddress ? customAddress : selectedAddress}</div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full bg-coop-100 text-coop-800 text-[10px] font-extrabold">
                      {p.name}
                    </span>
                  </div>
                </div>

                {/* Transparent Ledger Table */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                  <div className="flex justify-between text-slate-700 dark:text-slate-300">
                    <span>Base Service / Labor Fee:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">₹{baseServicePrice}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      Platform Operation Fee (8%):
                      <Info className="w-3 h-3 text-slate-400" title="Covers server hosting, SMS & customer support" />
                    </span>
                    <span>₹{platformFee}</span>
                  </div>
                  <div className="flex justify-between text-coop-800 font-medium">
                    <span className="flex items-center gap-1">
                      Cooperative Member Reserve (4%):
                      <Award className="w-3 h-3 text-coop-600" />
                    </span>
                    <span>₹{coopReserveFee}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>GST (18% on platform & coop fees):</span>
                    <span>₹{gstTax}</span>
                  </div>

                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Subtotal:</span>
                    <span>₹{grossTotal}</span>
                  </div>

                  {/* Zolve Money redemption */}
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useZolveMoney}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setUseZolveMoney(checked);
                          if (checked && !zolveMoneyInput) {
                            setZolveMoneyInput(String(Math.min(availableBalance, grossTotal)));
                          }
                        }}
                        disabled={availableBalance === 0}
                        className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <Wallet className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Apply Zolve Money</span>
                      <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300">
                        Balance: ₹{availableBalance}
                      </span>
                    </label>
                    {availableBalance === 0 ? (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">No Zolve Money yet. Earn ₹10–₹200 on every completed order and apply it here next time.</p>
                    ) : useZolveMoney ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-600 dark:text-slate-400">Use amount:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-500">₹</span>
                          <input
                            type="number"
                            min={0}
                            max={Math.min(availableBalance, grossTotal)}
                            value={zolveMoneyInput}
                            onChange={(e) => setZolveMoneyInput(e.target.value)}
                            placeholder={String(Math.min(availableBalance, grossTotal))}
                            className="w-24 px-2 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setZolveMoneyInput(String(Math.min(availableBalance, grossTotal)))}
                            className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold"
                          >
                            Max
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400">Max ₹{Math.min(availableBalance, grossTotal)}</span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Check to subtract from your previous order rewards. You earned ₹10–₹200 per past booking.</p>
                    )}
                    {requestedRedeem > 0 && (
                      <div className="flex justify-between text-amber-700 dark:text-amber-300 font-bold">
                        <span>Zolve Money Applied:</span>
                        <span>-₹{requestedRedeem}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2.5 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    <span>Total Amount Payable:</span>
                    <span className="text-lg text-brand-900 dark:text-brand-300 font-black">₹{totalAmount}</span>
                  </div>
                  {requestedRedeem > 0 && <p className="text-[10px] text-coop-700 dark:text-coop-400">You save ₹{requestedRedeem} using Zolve Money from previous orders.</p>}
                </div>

                {/* Razorpay Trust Note */}
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
                  <Lock className="w-4 h-4 text-coop-600 shrink-0" />
                  <span>
                    Secured by Razorpay. Funds held in escrow until service completion is confirmed.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setSelectedProviderForBooking(null); setBookingPrefill(null); }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
            )}

            {step < 4 ? (() => {
              const needsSlotCheck = step === 2;
              const slotOk = !needsSlotCheck || isSlotEligible(selectedDate, selectedTimeSlot, nowMs);
              return (
              <button
                type="button"
                disabled={needsSlotCheck && !slotOk}
                onClick={() => {
                  if (step === 2 && !isSlotEligible(selectedDate, selectedTimeSlot, nowMs)) return;
                  setStep(step + 1);
                }}
                className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 ${needsSlotCheck && !slotOk ? 'bg-slate-400 cursor-not-allowed' : 'bg-brand-900 hover:bg-brand-800'}`}
                title={needsSlotCheck && !slotOk ? 'Selected slot starts less than 2 hours from now — choose a later slot or Tomorrow' : ''}
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )})() : step === 4 ? (
              <button
                type="button"
                disabled={isSavingPhone}
                onClick={handlePhoneStepContinue}
                className="px-6 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-60"
              >
                <span>{isSavingPhone ? 'Saving...' : 'Continue to Billing'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleProceedToPayment}
                className="px-6 py-2.5 rounded-xl bg-coop-700 hover:bg-coop-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                <span>{isProcessingPayment ? "Initiating Razorpay..." : `Pay ₹${totalAmount} via Razorpay`}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RAZORPAY PAYMENT GATEWAY SANDBOX / PRODUCTION OVERLAY */}
      {isRazorpayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Razorpay Brand Header */}
            <div className="bg-brand-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-black text-white text-sm">
                  R
                </div>
                <div>
                  <div className="text-xs font-bold text-white tracking-wide">Razorpay Trusted Checkout</div>
                  <div className="text-[10px] text-slate-400">Zolve Cooperative Escrow • INR {totalAmount}.00</div>
                </div>
              </div>
              <button
                onClick={() => setIsRazorpayModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Payment Method Selector */}
            <div className="p-6 space-y-4">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Select Payment Method
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setPaymentMethodChoice('upi')}
                  className={`w-full text-left p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    paymentMethodChoice === 'upi'
                      ? 'border-brand-600 bg-brand-50/70 font-bold text-brand-900'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <span>UPI (Google Pay, PhonePe, Paytm)</span>
                  <span className="text-[10px] text-coop-700 font-bold">Fastest</span>
                </button>

                <button
                  onClick={() => setPaymentMethodChoice('card')}
                  className={`w-full text-left p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    paymentMethodChoice === 'card'
                      ? 'border-brand-600 bg-brand-50/70 font-bold text-brand-900'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <span>Credit / Debit Card (Visa, MasterCard, RuPay)</span>
                </button>

                <button
                  onClick={() => setPaymentMethodChoice('netbanking')}
                  className={`w-full text-left p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    paymentMethodChoice === 'netbanking'
                      ? 'border-brand-600 bg-brand-50/70 font-bold text-brand-900'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <span>NetBanking (All Major Banks)</span>
                </button>
              </div>

              {paymentMethodChoice === 'upi' && (
                <div className="pt-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Enter UPI VPA ID</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    placeholder="user@upi"
                  />
                </div>
              )}

              {/* Security Badge */}
              <div className="p-3 rounded-xl bg-coop-50 border border-coop-200 text-[11px] text-coop-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-coop-600 shrink-0" />
                <span>256-bit SSL encrypted. Server-side HMAC-SHA256 signature verification active.</span>
              </div>

              {/* Pay Button */}
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleSimulateRazorpaySuccess}
                className="w-full py-3 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isProcessingPayment ? "Verifying Payment Signature..." : `Authorize & Pay ₹${totalAmount}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

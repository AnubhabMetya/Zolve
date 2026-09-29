// Centralized customer pricing — the ONLY source of customer-facing totals.
// Cart, Checkout, Order Summary, Payment and Tracker must all read from here.
// Coupon discount applies to SERVICE SUBTOTAL only, never to fees/taxes.
// Every output is finite-validated: NaN/undefined/Infinity can never leak into the UI.
import { getMicroServiceById } from '../data/serviceCatalog.js';
import { validateCoupon, calculateCouponDiscount as couponDiscount, normalizeCode, round2, formatINR } from './couponService.js';

export { formatINR, round2 };

export const PRICING_CONFIG = {
  serviceFee: 49,          // flat per-order service fee (spec §13)
  gstRate: 0.18,           // GST on the service fee only
  legacyPlatformFee: 80,   // pre-redesign fallback, kept for reference
  legacyCoopFee: 40,
  useLegacyFees: false,
};

// --- Finite guards: invalid data can never enter arithmetic ---
export const toFinite = (n, fallback = 0) => {
  const v = typeof n === 'string' && n.trim() !== '' ? Number(n) : n;
  return Number.isFinite(v) ? v : fallback;
};

const toQty = (q) => {
  const v = Math.floor(toFinite(q, 1));
  return v > 0 && v <= 99 ? v : 1;
};

// --- Named pipeline steps (single implementation each) ---
export const calculateSubtotal = (cartItems = []) => {
  let subtotal = 0;
  for (const entry of cartItems || []) {
    const { id, qty = 1 } = entry || {};
    const svc = id ? getMicroServiceById(id) : null;
    if (!svc || svc.price?.kind === 'quote') continue;
    subtotal += toFinite(svc.price?.amount) * toQty(qty);
  }
  return round2(subtotal);
};

export const calculateCouponDiscount = (subtotal, couponCode) =>
  couponDiscount(normalizeCode(couponCode), toFinite(subtotal));

export const calculateServiceFee = (subtotal) =>
  toFinite(subtotal) > 0 ? toFinite(PRICING_CONFIG.serviceFee) : 0;

export const calculateGST = (serviceFee) =>
  Math.round(toFinite(serviceFee) * toFinite(PRICING_CONFIG.gstRate));

export const calculateFinalTotal = ({ subtotal, discount, serviceFee, gst }) => {
  const s = toFinite(subtotal), d = toFinite(discount), f = toFinite(serviceFee), g = toFinite(gst);
  return round2(Math.max(0, s - d + f + g));
};

export const calcCartTotals = (cartItems = [], couponCode = null) => {
  const lines = [];
  let subtotal = 0;
  let hasQuoteOnly = false;
  for (const entry of cartItems || []) {
    const { id, qty = 1 } = entry || {};
    const svc = id ? getMicroServiceById(id) : null;
    if (!svc) continue;
    if (svc.price?.kind === 'quote') {
      hasQuoteOnly = true;
      lines.push({ id, name: svc.name, qty: toQty(qty), unitAmount: null, lineTotal: null, kind: 'quote' });
      continue;
    }
    const unitAmount = toFinite(svc.price?.amount);
    const q = toQty(qty);
    const lineTotal = round2(unitAmount * q);
    subtotal = round2(subtotal + lineTotal);
    lines.push({ id, name: svc.name, qty: q, unitAmount, lineTotal, kind: svc.price.kind });
  }
  const quoteOnly = lines.length > 0 && lines.every((l) => l.kind === 'quote');
  // Single coupon, validated against subtotal. Invalid/unknown codes yield zero discount.
  let coupon = null;
  let couponIssue = '';
  let discount = 0;
  const code = normalizeCode(couponCode);
  if (code && subtotal > 0) {
    const v = validateCoupon(code, subtotal);
    if (v.valid) {
      coupon = { code: v.coupon.code, percentage: v.coupon.percentage, maxDiscount: v.coupon.maxDiscount };
      discount = toFinite(couponDiscount(v.coupon, subtotal));
    } else {
      couponIssue = v.error;
    }
  }
  const serviceFee = calculateServiceFee(subtotal);
  const taxes = calculateGST(serviceFee);
  const total = calculateFinalTotal({ subtotal, discount, serviceFee, gst: taxes });
  return { lines, subtotal, discount, coupon, couponIssue, serviceFee, taxes, total, hasQuoteOnly, quoteOnly, payable: subtotal > 0 };
};

export const buildBookingPayload = (cartItems = [], couponCode = null) => {
  const totals = calcCartTotals(cartItems, couponCode);
  const names = totals.lines.map((l) => `${l.name}${l.qty > 1 ? ` x${l.qty}` : ''}`);
  return {
    // Canonical totals contract — every consumer (Cart, Checkout, Payment) reads these keys.
    lines: totals.lines,
    subtotal: totals.subtotal,
    discount: totals.discount,
    coupon: totals.coupon,
    couponIssue: totals.couponIssue,
    serviceFee: totals.serviceFee,
    taxes: totals.taxes,
    total: totals.total,
    hasQuoteOnly: totals.hasQuoteOnly,
    quoteOnly: totals.quoteOnly,
    payable: totals.payable,
    // Booking-record aliases (Supabase row + legacy readers).
    serviceIds: totals.lines.map((l) => l.id),
    serviceId: totals.lines.map((l) => l.id).join(','),
    serviceName: names.join(' + ') || 'Zolve Service',
    cartSnapshot: totals.lines,
    couponCode: totals.coupon?.code || null,
    discountAmount: totals.discount,
    baseAmount: totals.subtotal,
    platformFee: totals.serviceFee,
    coopReserveFee: 0,
    grossTotal: totals.total,
    totalAmount: totals.total,
    providerEarnings: totals.subtotal,
  };
};

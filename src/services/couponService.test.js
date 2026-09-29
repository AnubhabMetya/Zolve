// Coupons + location-safety QA — run: node src/services/couponService.test.js
import { COUPONS, validateCoupon, calculateCouponDiscount, getAvailableCoupons, formatINR, normalizeCode } from './couponService.js';
import { calcCartTotals } from './pricingService.js';
import { searchPlaces, searchByPincode } from './locationService.js';
import { getVisibleBookings } from './accessControl.js';
import { semanticMatch } from './semanticService.js';

let pass = 0, fail = 0;
const assert = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('FAIL:', msg); } };
const eq = (a, b, msg) => assert(Math.abs(a - b) < 0.001, `${msg} (got ${a}, want ${b})`);

// --- Coupon config ---
assert(COUPONS.length === 3, '3 coupons configured');
assert(normalizeCode('  zolve30 ') === 'ZOLVE30', 'code normalized');

// --- QA matrix (capped discounts) ---
let v = validateCoupon('ZOLVE10', 700);
assert(!v.valid && /Add .* more/.test(v.error), '700 → ZOLVE10 rejected with shortfall message');
eq(v.shortfall, 99, 'ZOLVE10 shortfall at 700');

v = validateCoupon('ZOLVE10', 799);
assert(v.valid, '799 → ZOLVE10 valid');
eq(calculateCouponDiscount('ZOLVE10', 799), 79.9, '799 → ZOLVE10 = 79.90');

eq(calculateCouponDiscount('ZOLVE10', 1000), 100, '1000 → ZOLVE10 = 100 (hits cap)');
eq(calculateCouponDiscount('ZOLVE10', 1200), 100, '1200 → ZOLVE10 capped at 100');
eq(calculateCouponDiscount('ZOLVE20', 1200), 150, '1200 → ZOLVE20 capped at 150');

v = validateCoupon('ZOLVE20', 1099);
assert(v.valid, '1099 → ZOLVE20 valid');

v = validateCoupon('ZOLVE30', 1599);
assert(v.valid, '1599 → ZOLVE30 valid');
eq(calculateCouponDiscount('ZOLVE30', 1599), 250, '1599 → ZOLVE30 capped at 250');

// 2198 → all eligible, single coupon only, ZOLVE30 capped at 250
for (const code of ['ZOLVE10', 'ZOLVE20', 'ZOLVE30']) {
  assert(validateCoupon(code, 2198).valid, `2198 → ${code} eligible`);
}
const t = calcCartTotals([{ id: 'clean-2room', qty: 1 }, { id: 'clean-bathroom', qty: 1 }], 'ZOLVE30');
eq(t.subtotal, 2198, 'subtotal 2198');
eq(t.discount, 250, '2198 → ZOLVE30 = 250 maximum');
eq(t.total, t.subtotal - t.discount + t.serviceFee + t.taxes, 'total = subtotal - discount + fee + gst');
assert(t.coupon?.code === 'ZOLVE30', 'coupon recorded');

// No stacking by construction — one code in, one discount out
const t2 = calcCartTotals([{ id: 'clean-2room', qty: 1 }], 'ZOLVE10');
eq(t2.discount, 100, '1399 → ZOLVE10 capped at 100');

// Wrong code / below minimum
assert(!validateCoupon('FAKE50', 5000).valid, 'wrong code invalid');
assert(validateCoupon('FAKE50', 5000).error === 'This coupon code is not valid.', 'wrong code message');
const t3 = calcCartTotals([{ id: 'clean-2room', qty: 1 }], 'ZOLVE30');
eq(t3.discount, 0, 'ineligible coupon → zero discount');
assert(t3.couponIssue.length > 0, 'ineligible coupon surfaces issue message');

// Removing coupon restores original total
const t4 = calcCartTotals([{ id: 'clean-2room', qty: 1 }, { id: 'clean-bathroom', qty: 1 }], null);
const t5 = calcCartTotals([{ id: 'clean-2room', qty: 1 }, { id: 'clean-bathroom', qty: 1 }], 'ZOLVE30');
assert(t4.discount === 0 && t4.total > t5.total, 'remove coupon restores original total');

// Availability flags + shortfall messaging
const avail = getAvailableCoupons(1200);
assert(avail.find((c) => c.code === 'ZOLVE10').eligible === true, '1200 → ZOLVE10 eligible');
const locked = avail.find((c) => c.code === 'ZOLVE30');
assert(locked.eligible === false, '1200 → ZOLVE30 locked');
eq(locked.shortfall, 399, 'shortfall 399 at 1200 for ZOLVE30');

// Money formatting
assert(formatINR(659.4) === '₹659.40', `format 659.4 → ${formatINR(659.4)}`);
assert(formatINR(2198) === '₹2,198', `format 2198 → ${formatINR(2198)}`);
assert(formatINR(1587.6) === '₹1,587.60', `format 1587.6 → ${formatINR(1587.6)}`);

// --- Location-safety contracts (no .map crashes) ---
const origFetch = globalThis.fetch;
globalThis.fetch = () => Promise.reject(new Error('network down'));
const empty = await searchPlaces('Connaught Place', 6);
assert(Array.isArray(empty) && empty.length === 0, 'searchPlaces network failure → [] (never undefined)');
globalThis.fetch = origFetch;

let threw = false;
try { await searchByPincode('123', 5); } catch (e) { threw = e instanceof Error; }
assert(threw, 'invalid pincode throws Error (callers show message, never crash)');

assert(Array.isArray(getVisibleBookings([], null)) && getVisibleBookings([], null).length === 0, 'null user → [] bookings');
const sm = semanticMatch('', null, null);
assert(Array.isArray(sm.topProviders) && sm.topProviders.length === 0, 'empty NL query → empty topProviders');
const ct = calcCartTotals([], null);
assert(Array.isArray(ct.lines) && ct.lines.length === 0, 'empty cart → empty lines');

console.log(`couponService.test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

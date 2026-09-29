// Pricing NaN regression + pipeline unit tests — run: node src/services/pricing.test.js
import {
  calcCartTotals, buildBookingPayload,
  calculateSubtotal, calculateCouponDiscount, calculateServiceFee, calculateGST, calculateFinalTotal,
  toFinite, PRICING_CONFIG,
} from './pricingService.js';
import { formatINR } from './couponService.js';

let pass = 0, fail = 0;
const assert = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('FAIL:', msg); } };
const finite = (v, msg) => assert(Number.isFinite(v), `${msg} (got ${v})`);

const assertAllFinite = (t, label) => {
  for (const k of ['subtotal', 'discount', 'serviceFee', 'taxes', 'total']) finite(t[k], `${label}.${k} finite`);
};

// --- Screenshot case: subtotal 18999 + ZOLVE30 ---
const shot = calcCartTotals([{ id: 'paint-fullhome', qty: 1 }], 'ZOLVE30');
assert(shot.subtotal === 18999, `subtotal 18999 (got ${shot.subtotal})`);
assert(shot.discount === 250, `ZOLVE30 capped at 250 (got ${shot.discount})`);
assert(shot.serviceFee === PRICING_CONFIG.serviceFee, `fee from policy (${shot.serviceFee})`);
assert(shot.taxes === Math.round(shot.serviceFee * 0.18), 'GST = 18% of actual fee');
assert(shot.total === 18999 - 250 + shot.serviceFee + shot.taxes, `total numeric (${shot.total})`);
assertAllFinite(shot, 'screenshot-case');

// --- Payload contract: keys the checkout/payment UI reads must exist and be finite ---
const payload = buildBookingPayload([{ id: 'paint-fullhome', qty: 1 }], 'ZOLVE30');
for (const k of ['serviceFee', 'total', 'subtotal', 'discount', 'taxes', 'quoteOnly', 'payable', 'lines', 'couponCode', 'totalAmount']) {
  assert(payload[k] !== undefined, `payload exposes ${k}`);
}
assertAllFinite(payload, 'payload');
assert(payload.serviceFee === 49 && payload.total === 18807, `payload totals correct (${payload.total})`);
assert(payload.quoteOnly === false, 'quoteOnly flag present');

// --- Named pipeline steps ---
assert(calculateSubtotal([{ id: 'clean-2room', qty: 2 }]) === 2798, 'calculateSubtotal');
assert(calculateCouponDiscount(18999, 'ZOLVE30') === 250, 'calculateCouponDiscount capped');
assert(calculateServiceFee(18999) === 49 && calculateServiceFee(0) === 0, 'calculateServiceFee');
assert(calculateGST(49) === 9, 'calculateGST 18% rounded');
assert(calculateFinalTotal({ subtotal: 18999, discount: 250, serviceFee: 49, gst: 9 }) === 18807, 'calculateFinalTotal');
assert(calculateFinalTotal({ subtotal: undefined, discount: NaN, serviceFee: null, gst: Infinity }) === 0, 'final total sanitizes junk to 0');

// --- Corrupt inputs can never poison totals ---
const corrupt = calcCartTotals([{ id: 'clean-1room', qty: 'abc' }, { id: 'nope', qty: 1 }, null, {}], 'BOGUS');
assertAllFinite(corrupt, 'corrupt-input');
assert(corrupt.coupon === null && corrupt.couponIssue.length > 0, 'bogus coupon → issue, zero discount');

// --- Matrix ---
const m = (items, code) => calcCartTotals(items, code);
assert(m([{ id: 'clean-bathroom', qty: 1 }], 'ZOLVE10').discount === 79.9, '799 + ZOLVE10');
assert(m([{ id: 'clean-bathroom', qty: 1 }, { id: 'elec-switch', qty: 4 }], 'ZOLVE20').discount === 150, '1195 band + ZOLVE20 capped at 150');
assert(m([{ id: 'clean-3room', qty: 1 }], null).discount === 0, 'no coupon → zero discount');
const replaced = m([{ id: 'clean-2room', qty: 1 }, { id: 'clean-bathroom', qty: 1 }], 'ZOLVE10');
assert(replaced.coupon.code === 'ZOLVE10' && replaced.discount === 100, 'single coupon replace (capped 100)');

// --- Display can never show NaN ---
for (const bad of [undefined, null, NaN, Infinity, '']) {
  const s = formatINR(bad);
  assert(!/NaN|undefined|Infinity/i.test(s), `formatINR(${String(bad)}) safe → ${s}`);
}
assert(toFinite('abc', 7) === 7 && toFinite('42') === 42 && toFinite(NaN) === 0, 'toFinite');

console.log(`pricing.test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

// Service-catalog redesign QA — run: node src/services/serviceCatalog.test.js
import { SERVICE_CATALOG, getMicroServiceById, findCategoryForServiceName, formatPrice } from '../data/serviceCatalog.js';
import { calcCartTotals, buildBookingPayload } from './pricingService.js';

let pass = 0, fail = 0;
const assert = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('FAIL:', msg); } };

// 1. All 15 categories present
assert(Object.keys(SERVICE_CATALOG).length === 15, `expected 15 categories, got ${Object.keys(SERVICE_CATALOG).length}`);

// 2. Full Home Cleaning micro-services with prototype prices
const cleaning = SERVICE_CATALOG.cleaning;
assert(cleaning.items.length === 6, 'cleaning should have 6 items');
const priceOf = (id) => getMicroServiceById(id)?.price?.amount;
assert(priceOf('clean-1room') === 999, '1 room = 999');
assert(priceOf('clean-2room') === 1399, '2 room = 1399');
assert(priceOf('clean-3room') === 1899, '3 room = 1899');
assert(priceOf('clean-kitchen') === 799, 'kitchen = 799');
assert(priceOf('clean-bathroom') === 799, 'bathroom = 799');
assert(priceOf('clean-fullhouse') === 2999, 'full house = 2999');

// 3. Price kinds
assert(formatPrice({ kind: 'fixed', amount: 999 }) === '₹999', 'fixed format');
assert(formatPrice({ kind: 'starting', amount: 1499 }) === 'Starting ₹1,499', 'starting format');
assert(formatPrice({ kind: 'quote', amount: null }) === 'Request Quote', 'quote format');
assert(getMicroServiceById('paint-single-wall').price.kind === 'starting', 'painting uses starting price');
assert(getMicroServiceById('comm-large').price.kind === 'quote', 'large society work uses quote');

// 4. Direct-click mapping never needs Semantic AI
assert(findCategoryForServiceName('Full Home Deep Cleaning')?.id === 'cleaning', 'direct: full home cleaning');
assert(findCategoryForServiceName('Plumbing Repair & Leakage Fix')?.id === 'plumbing', 'direct: plumbing');
assert(findCategoryForServiceName('My house needs complete cleaning after renovation') === null, 'NL sentence must NOT direct-match (semantic path)');
assert(findCategoryForServiceName('') === null, 'empty → null');

// 5. Cart totals: 2 Room (1399) + Bathroom (799) = 2198 subtotal
const totals = calcCartTotals([{ id: 'clean-2room', qty: 1 }, { id: 'clean-bathroom', qty: 1 }]);
assert(totals.subtotal === 2198, `subtotal 2198, got ${totals.subtotal}`);
assert(totals.serviceFee === 49, 'service fee 49');
assert(totals.taxes === Math.round(49 * 0.18), 'GST on fee only');
assert(totals.total === totals.subtotal + totals.serviceFee + totals.taxes, 'total = subtotal + fee + gst');
assert(totals.payable === true, 'payable');

// 6. Quote-only cart blocks payment
const quoteTotals = calcCartTotals([{ id: 'comm-large', qty: 1 }]);
assert(quoteTotals.quoteOnly === true && quoteTotals.payable === false, 'quote-only not payable');

// 7. Booking payload references service IDs (no UI duplication)
const payload = buildBookingPayload([{ id: 'clean-2room', qty: 1 }, { id: 'clean-bathroom', qty: 1 }]);
assert(payload.serviceIds.join(',') === 'clean-2room,clean-bathroom', 'payload service ids');
assert(payload.totalAmount === totals.total, 'payload total matches cart');

console.log(`serviceCatalog.test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

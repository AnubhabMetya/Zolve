// ZOLVE COUPONS — centralized offer configuration. Edit ONLY here.
// Eligibility is ALWAYS evaluated against the SERVICE SUBTOTAL (fees/taxes excluded).
// Only ONE coupon per order — coupons never stack.

export const COUPONS = [
  {
    code: 'ZOLVE10',
    percentage: 10,
    minimumSubtotal: 799,
    maxDiscount: 100,
    active: true,
    title: '10% OFF',
    description: 'Get 10% off on transactions of ₹799 or more.',
    capLine: 'Save up to ₹100',
    exampleOrder: 1000,
    exclusive: true,
  },
  {
    code: 'ZOLVE20',
    percentage: 20,
    minimumSubtotal: 1099,
    maxDiscount: 150,
    active: true,
    title: '20% OFF',
    description: 'Get 20% off on transactions of ₹1,099 or more.',
    capLine: 'Save up to ₹150',
    exampleOrder: 1500,
    exclusive: true,
  },
  {
    code: 'ZOLVE30',
    percentage: 30,
    minimumSubtotal: 1599,
    maxDiscount: 250,
    active: true,
    title: '30% OFF',
    description: 'Get 30% off on transactions of ₹1,599 or more.',
    capLine: 'Save up to ₹250',
    exampleOrder: 2000,
    exclusive: true,
  },
];

export const normalizeCode = (code) => String(code || '').trim().toUpperCase();

export const findCoupon = (code) => {
  const c = normalizeCode(code);
  return COUPONS.find((k) => k.code === c && k.active) || null;
};

// Money helpers — paise-exact, display trims trailing zeros (2198 → ₹2,198, 659.4 → ₹659.40)
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const formatINR = (n) => {
  const num = typeof n === 'string' && n.trim() !== '' ? Number(n) : n;
  // Last-line display guard: non-finite values can never render as ₹NaN/₹undefined.
  if (!Number.isFinite(num)) return '—';
  const v = round2(num);
  const hasPaise = !Number.isInteger(v);
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: hasPaise ? 2 : 0, maximumFractionDigits: 2 })}`;
};

export const getAvailableCoupons = (subtotal = 0) =>
  COUPONS.filter((c) => c.active).map((c) => {
    const eligible = subtotal >= c.minimumSubtotal;
    return {
      ...c,
      eligible,
      shortfall: eligible ? 0 : round2(c.minimumSubtotal - subtotal),
      exampleDiscount: calculateCouponDiscount(c, c.exampleOrder),
    };
  });

export const validateCoupon = (code, subtotal = 0) => {
  const coupon = findCoupon(code);
  if (!coupon) return { valid: false, coupon: null, error: 'This coupon code is not valid.', shortfall: 0 };
  if (subtotal < coupon.minimumSubtotal) {
    const shortfall = round2(coupon.minimumSubtotal - subtotal);
    return {
      valid: false,
      coupon,
      shortfall,
      error: `Add ${formatINR(shortfall)} more to unlock ${coupon.code}.`,
    };
  }
  return { valid: true, coupon, error: '', shortfall: 0 };
};

export const calculateCouponDiscount = (couponOrCode, subtotal = 0) => {
  const coupon = typeof couponOrCode === 'string' ? findCoupon(couponOrCode) : couponOrCode;
  if (!coupon || coupon.active === false) return 0;
  if (subtotal < coupon.minimumSubtotal) return 0;
  const pct = coupon.percentage ?? coupon.value ?? 0;
  const raw = (subtotal * pct) / 100;
  const cap = coupon.maxDiscount ?? Infinity;
  return round2(Math.min(raw, cap));
};

export const describeCoupon = (coupon) => {
  const pct = coupon.percentage ?? coupon.value ?? 0;
  return `${pct}% off on service subtotal above ${formatINR(coupon.minimumSubtotal)}, capped at ${formatINR(coupon.maxDiscount)}. One coupon per booking — cannot be combined.`;
};

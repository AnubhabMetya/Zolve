import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getMicroServiceById } from '../data/serviceCatalog.js';
import { calcCartTotals } from '../services/pricingService.js';
import { validateCoupon, normalizeCode } from '../services/couponService.js';

const CartContext = createContext(null);
const STORAGE_KEY = 'zolve:cart:v1';

const loadInitial = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], coupon: null };
    const parsed = JSON.parse(raw);
    // Legacy shape (plain items array) → migrate
    const itemsRaw = Array.isArray(parsed) ? parsed : parsed?.items;
    const items = (Array.isArray(itemsRaw) ? itemsRaw : []).filter((i) => i && typeof i.id === 'string' && getMicroServiceById(i.id));
    const coupon = !Array.isArray(parsed) && typeof parsed?.coupon === 'string' ? normalizeCode(parsed.coupon) : null;
    return { items, coupon };
  } catch { return { items: [], coupon: null }; }
};

export const CartProvider = ({ children }) => {
  const initial = React.useMemo(loadInitial, []);
  const [items, setItems] = useState(initial.items);
  const [appliedCouponCode, setAppliedCouponCode] = useState(initial.coupon);
  const [couponNotice, setCouponNotice] = useState('');

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, coupon: appliedCouponCode })); } catch {}
  }, [items, appliedCouponCode]);

  // Re-validate the applied coupon whenever the subtotal changes.
  // Dropping below the minimum removes the coupon with a clear notice — never silent, never stacked.
  const rawSubtotal = useMemo(() => calcCartTotals(items).subtotal, [items]);
  useEffect(() => {
    if (!appliedCouponCode) return;
    const v = validateCoupon(appliedCouponCode, rawSubtotal);
    if (!v.valid) {
      setAppliedCouponCode(null);
      setCouponNotice(v.error || `${appliedCouponCode} is no longer applicable.`);
    }
  }, [rawSubtotal, appliedCouponCode]);

  const add = (id, qty = 1) => {
    if (!getMicroServiceById(id)) return;
    setCouponNotice('');
    setItems((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing) return prev.map((i) => (i.id === id ? { ...i, qty: Math.min(9, i.qty + qty) } : i));
      return [...prev, { id, qty }];
    });
  };
  const remove = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
  const setQty = (id, qty) => {
    if (qty <= 0) return remove(id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.min(9, qty) } : i)));
  };
  const clear = () => { setItems([]); setAppliedCouponCode(null); setCouponNotice(''); };

  const applyCoupon = (code) => {
    const normalized = normalizeCode(code);
    const v = validateCoupon(normalized, rawSubtotal);
    if (!v.valid) {
      setCouponNotice(v.error);
      return { ok: false, error: v.error };
    }
    // One coupon per order — applying another replaces the existing one.
    setAppliedCouponCode(normalized);
    setCouponNotice('');
    return { ok: true, code: normalized };
  };
  const removeCoupon = () => { setAppliedCouponCode(null); setCouponNotice(''); };

  const value = useMemo(() => {
    const totals = calcCartTotals(items, appliedCouponCode);
    return {
      items, add, remove, setQty, clear,
      count: items.reduce((n, i) => n + i.qty, 0),
      distinctCount: items.length,
      ...totals,
      appliedCouponCode,
      couponNotice,
      applyCoupon,
      removeCoupon,
      has: (id) => items.some((i) => i.id === id),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, appliedCouponCode, couponNotice]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

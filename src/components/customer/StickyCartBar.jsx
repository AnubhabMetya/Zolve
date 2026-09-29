import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext.jsx';

export const StickyCartBar = () => {
  const { count, subtotal, quoteOnly } = useCart();
  const navigate = useNavigate();
  if (count === 0) return null;
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-4 sm:pb-6 pointer-events-none">
      <div className="max-w-7xl mx-auto pointer-events-auto bg-slate-900 text-white rounded-2xl shadow-2xl px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-300">{count} service{count > 1 ? 's' : ''} added</div>
          <div className="text-lg font-black">{quoteOnly ? 'Request Quote' : `₹${subtotal.toLocaleString('en-IN')}`}</div>
        </div>
        <button
          onClick={() => navigate('/cart')}
          className="px-6 py-3 rounded-xl bg-white text-slate-900 text-sm font-bold flex items-center gap-1.5 hover:bg-slate-100"
        >
          View Cart <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

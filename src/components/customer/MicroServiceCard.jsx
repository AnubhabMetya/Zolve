import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Plus, Minus } from 'lucide-react';
import { formatPrice } from '../../data/serviceCatalog.js';
import { useCart } from '../../context/CartContext.jsx';

const MicroVisual = ({ item, categoryIllustration }) => {
  const [err, setErr] = React.useState(false);
  const src = !err ? item.image : `/illustrations/partner-3d/${categoryIllustration}.png`;
  return (
    <div className="relative mx-auto flex items-center justify-center rounded-[20px] bg-gradient-to-br from-slate-50 to-blue-50/60 overflow-hidden ring-1 ring-slate-200/60 w-full h-36 sm:h-40">
      <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-white/10 pointer-events-none" />
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[70%] h-3 bg-slate-900/[0.06] blur-[6px] rounded-full pointer-events-none" />
      <img
        src={src}
        alt={item.name}
        loading="lazy"
        decoding="async"
        onError={() => setErr(true)}
        className="relative z-10 w-[88%] h-[88%] object-contain drop-shadow-[0_10px_18px_rgba(15,23,42,0.08)]"
      />
    </div>
  );
};

export const MicroServiceCard = ({ item, categoryIllustration }) => {
  const { add, setQty, items } = useCart();
  const navigate = useNavigate();
  const qty = items.find((i) => i.id === item.id)?.qty || 0;
  const quotable = item.price.kind === 'quote';

  const handleAdd = (e) => {
    e.stopPropagation();
    if (quotable) {
      navigate('/cart');
      return;
    }
    add(item.id, 1);
  };
  const inc = (e) => { e.stopPropagation(); add(item.id, 1); };
  const dec = (e) => { e.stopPropagation(); setQty(item.id, qty - 1); };

  return (
    <div
      onClick={handleAdd}
      className="group bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:shadow-xl transition-all p-4 sm:p-5 flex flex-col gap-3 cursor-pointer"
    >
      <MicroVisual item={item} categoryIllustration={categoryIllustration} />
      <div>
        <h3 className="text-sm sm:text-base font-bold text-slate-900">{item.name}</h3>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.description}</p>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-slate-400" />~{item.duration}
        </span>
        <span className="text-sm font-black text-slate-900">{formatPrice(item.price)}</span>
      </div>
      {quotable ? (
        <button
          onClick={handleAdd}
          aria-label={`Request ${item.name}`}
          className="w-full py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white"
        >
          <Plus className="w-4 h-4" /> Request
        </button>
      ) : qty === 0 ? (
        <button
          onClick={handleAdd}
          aria-label={`Add ${item.name}`}
          className="w-full py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white"
        >
          <Plus className="w-4 h-4" /> ADD
        </button>
      ) : (
        <div className="w-full py-1.5 rounded-xl bg-emerald-600 text-white flex items-center justify-between px-2">
          <button
            onClick={dec}
            aria-label={`Remove one ${item.name}`}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-sm font-black" aria-live="polite">{qty} Added</span>
          <button
            onClick={inc}
            aria-label={`Add one more ${item.name}`}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { ServiceIllustration } from './ServiceIllustration';

export const ServiceCard = ({ service, selected = false, disabled = false, onToggle, eager = false }) => {
  const isDisabled = disabled && !selected;

  const badge = service.badge;

  return (
    <motion.button
      type="button"
      onClick={() => !isDisabled && onToggle?.(service.id)}
      disabled={isDisabled}
      aria-pressed={selected}
      aria-label={`${service.name}: ${service.description}`}
      whileHover={!isDisabled ? { y: -2 } : undefined}
      whileTap={!isDisabled ? { scale: 0.98 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`group relative text-left w-full rounded-[20px] sm:rounded-3xl border bg-white p-4 sm:p-5 flex flex-col min-h-[300px] sm:min-h-[320px] transition-all duration-200 select-none overflow-hidden
        ${selected
          ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/15 shadow-[0_8px_24px_rgba(37,99,235,0.10),0_2px_8px_rgba(37,99,235,0.06)]'
          : isDisabled
            ? 'border-slate-200/60 bg-slate-50/60 opacity-45 cursor-not-allowed'
            : 'border-slate-200/80 bg-white shadow-subtle hover:shadow-premium hover:border-slate-300'
        }`}
    >
      {/* Selected check top-right */}
      <div className="absolute top-3.5 right-3.5 z-20">
        {selected ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.30)] ring-2 ring-white"
          >
            <Check className="w-4 h-4 stroke-[3]" />
          </motion.div>
        ) : (
          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center bg-white ${isDisabled ? 'border-slate-200' : 'border-slate-300 group-hover:border-slate-400'}`} />
        )}
      </div>

      {/* 3D Visual */}
      <div className="pt-1 pb-3 flex items-center justify-center">
        <div className={`transition-transform duration-300 ${selected ? 'scale-[1.02]' : 'group-hover:scale-[1.02]'}`}>
          <ServiceIllustration service={service} selected={selected} eager={eager} />
        </div>
      </div>

      {/* Middle content */}
      <div className="flex-1 flex flex-col">
        <h3 className="text-[15px] font-bold text-slate-900 leading-tight pr-6">{service.name}</h3>
        <p className="text-xs text-slate-500 leading-relaxed mt-1 line-clamp-2 min-h-[32px]">{service.description}</p>
      </div>

      {/* Bottom row: badge + arrow */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {badge ? (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border tracking-wide ${service.badgeTone || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
              {badge.label}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium">Tap to select</span>
          )}
        </div>

        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
            selected
              ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
              : isDisabled
                ? 'bg-slate-100 border-slate-200 text-slate-400'
                : 'bg-white border-slate-200 text-slate-700 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900'
          }`}
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </motion.button>
  );
};

export default ServiceCard;

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Info, ArrowRight } from 'lucide-react';
import { PARTNER_SERVICES, CATEGORY_FILTERS } from '../../data/partnerServices';
import { ServiceCard } from './ServiceCard';
import { OnboardingStepper } from './OnboardingStepper';

export const PartnerServiceSelectionPage = ({
  selectedIds = [],
  onToggle,
  onContinue,
  onBackToHome,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const maxSkills = 3;
  const isMaxReached = selectedIds.length >= maxSkills;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PARTNER_SERVICES.filter((s) => {
      if (filter !== 'All' && s.categoryGroup !== filter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.categoryGroup.toLowerCase().includes(q) ||
        (s.badge?.label || '').toLowerCase().includes(q)
      );
    });
  }, [search, filter]);

  const handleContinue = () => {
    if (selectedIds.length === 0) return;
    onContinue?.(selectedIds);
  };

  return (
    <div className="pb-24 sm:pb-16 space-y-6 sm:space-y-8 max-w-[1280px] mx-auto">
      {/* Top Branding Bar */}
      <div className="flex items-center justify-between">
        <button onClick={onBackToHome} className="flex items-center gap-3 group text-left">
          <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shadow-sm group-hover:scale-[1.02] transition-transform">
            <span className="text-lg font-black text-white tracking-tight">Z</span>
            <span className="w-1.5 h-1.5 rounded-full bg-white -ml-0.5 mt-2 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-extrabold tracking-tight text-slate-900 font-display">ZOLVE</span>
              <span className="hidden sm:inline text-slate-300">—</span>
              <span className="text-xs font-semibold text-slate-500 tracking-wide">Partner Onboarding</span>
            </div>
          </div>
        </button>
        <button
          onClick={onBackToHome}
          className="hidden sm:inline-flex text-xs font-semibold text-slate-500 hover:text-slate-800 underline underline-offset-4"
        >
          Back to Home
        </button>
      </div>

      <OnboardingStepper currentStep={1} />

      {/* Headline + Banner */}
      <div className="text-center space-y-4 max-w-3xl mx-auto px-2">
        <h1 className="text-[26px] sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 font-display leading-tight">
          What services do you want to work on?
        </h1>
        <p className="text-sm sm:text-[15px] text-slate-500 leading-relaxed max-w-2xl mx-auto">
          Choose the services you want to offer through Zolve. You can add or update your skills later.
        </p>

        <div className="inline-flex items-start sm:items-center gap-2.5 text-left px-4 py-3 rounded-2xl bg-blue-50 border border-blue-200/70 text-blue-900 text-xs sm:text-sm shadow-sm max-w-2xl mx-auto">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <Info className="w-3.5 h-3.5" />
          </div>
          <span className="font-medium leading-relaxed">Select your skills to receive relevant service opportunities in your area.</span>
        </div>
      </div>

      {/* Counter + max notice */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-[1280px] mx-auto">
        <div className="flex items-center gap-3">
          <span className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold border transition-colors ${selectedIds.length === maxSkills ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : selectedIds.length > 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
            {selectedIds.length} / {maxSkills} selected
          </span>
          <span className="text-xs text-slate-500 hidden sm:inline">You can select multiple services</span>
        </div>
        {isMaxReached && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
            Maximum 3 services — deselect one to choose another
          </motion.div>
        )}
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-thin">
            {CATEGORY_FILTERS.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap transition-colors ${
                  filter === c ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        {search && (
          <div className="text-xs text-slate-500">
            Showing {filtered.length} result{filtered.length !== 1 ? 's' : ''} for “{search}”{filter !== 'All' ? ` in ${filter}` : ''}
          </div>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-800">No services found</p>
          <p className="text-xs text-slate-500">Try a different search or filter.</p>
          <button onClick={() => { setSearch(''); setFilter('All'); }} className="text-xs font-bold text-blue-600 hover:underline">Clear filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filtered.map((service, idx) => {
            const selected = selectedIds.includes(service.id);
            const disabled = !selected && isMaxReached;
            return (
              <ServiceCard
                key={service.id}
                service={service}
                selected={selected}
                disabled={disabled}
                onToggle={onToggle}
                eager={idx < 4}
              />
            );
          })}
        </div>
      )}

      {/* Bottom Continue */}
      <div className="hidden sm:flex flex-col items-center gap-3 pt-4">
        <button
          onClick={handleContinue}
          disabled={selectedIds.length === 0}
          className={`inline-flex items-center gap-2 px-10 py-3.5 rounded-xl text-sm font-bold shadow-[0_8px_20px_rgba(37,99,235,0.20)] transition-all ${
            selectedIds.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-[0_10px_24px_rgba(37,99,235,0.28)] hover:-translate-y-0.5'
          }`}
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        <span className="text-xs text-slate-400 font-medium">You can select multiple services • {selectedIds.length} selected</span>
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center max-w-xl">
            {selectedIds.map((id) => {
              const s = PARTNER_SERVICES.find((p) => p.id === id);
              return <span key={id} className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">{s?.name}</span>;
            })}
          </div>
        )}
      </div>

      {/* Mobile sticky Continue */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-xs font-semibold text-slate-600">{selectedIds.length} / 3 selected</span>
          <span className="text-[11px] text-slate-400">Multiple selection allowed</span>
        </div>
        <button
          onClick={handleContinue}
          disabled={selectedIds.length === 0}
          className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${selectedIds.length === 0 ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white shadow-md'}`}
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PartnerServiceSelectionPage;

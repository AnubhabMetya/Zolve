import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Wrench,
  Zap,
  Hammer,
  Wind,
  Paintbrush,
  Sprout,
  ShieldAlert,
  Utensils,
  HeartHandshake,
  Truck,
  Building2,
  Droplets,
  Radio
} from 'lucide-react';

const serviceIcons = {
  // Household
  'Full Home Deep Cleaning': Sparkles,
  'Plumbing Repair & Leakage Fix': Wrench,
  'Electrical Repair & Wiring': Zap,
  'Carpentry & Furniture Assembly': Hammer,
  'AC Deep Foam Jet Servicing': Wind,
  'Wall Painting & Waterproofing': Paintbrush,
  'Gardening & Balcony Greenery': Sprout,
  'Organic Pest Control': ShieldAlert,
  // Personal & Family
  'Home Chef & Meal Preparation': Utensils,
  'Elder Assistance & Companionship': HeartHandshake,
  'Moving & Heavy Lifting Assistance': Truck,
  // Community & Society
  'Society Common Area Sanitization': Building2,
  'Water Sump & Overhead Tank Cleaning': Droplets,
  'Community Event Sound & Electrical Setup': Radio,
};

export const ExecutiveSkillSelector = ({
  vertical,
  availableServices = [],
  selectedSkills = [],
  onToggleSkill,
  maxSkills = 3,
}) => {
  const isMaxReached = selectedSkills.length >= maxSkills;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Choose up to 3 services you're qualified to perform.
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            You will only be matched with jobs in your selected skill areas.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start sm:self-auto">
          <span
            className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-wide border transition-all ${
              selectedSkills.length === maxSkills
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : selectedSkills.length > 0
                ? 'bg-brand-50 text-brand-800 border-brand-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {selectedSkills.length} / {maxSkills} selected
          </span>
        </div>
      </div>

      {isMaxReached && (
        <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-800 flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            Maximum of 3 skills selected. Unselect a service to choose a different one.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {availableServices.map((serviceName) => {
          const isSelected = selectedSkills.includes(serviceName);
          const isDisabled = !isSelected && isMaxReached;
          const Icon = serviceIcons[serviceName] || Sparkles;

          return (
            <button
              key={serviceName}
              type="button"
              disabled={isDisabled}
              onClick={() => onToggleSkill(serviceName)}
              className={`p-3.5 rounded-2xl border text-left transition-all relative flex items-start gap-3 select-none ${
                isSelected
                  ? 'bg-brand-900/5 border-brand-700 ring-2 ring-brand-700/20 shadow-sm'
                  : isDisabled
                  ? 'bg-slate-50/60 border-slate-200/60 opacity-45 cursor-not-allowed'
                  : 'bg-white border-slate-200 hover:border-brand-300 hover:shadow-subtle'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-brand-900 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0 pr-6">
                <div className="text-xs font-bold text-slate-900 leading-snug">
                  {serviceName}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                  {isSelected ? 'Selected for dispatch' : 'Click to add skill'}
                </div>
              </div>

              <div className="absolute top-3.5 right-3.5">
                {isSelected ? (
                  <CheckCircle2 className="w-4 h-4 text-brand-900 fill-brand-100" />
                ) : (
                  <div
                    className={`w-4 h-4 rounded-full border ${
                      isDisabled ? 'border-slate-200' : 'border-slate-300'
                    }`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ExecutiveSkillSelector;

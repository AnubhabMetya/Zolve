import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const STEPS = [
  { n: 1, label: 'Select Services', desc: 'Choose your skills' },
  { n: 2, label: 'Verify Details', desc: 'Personal info' },
  { n: 3, label: 'Identity & Documents', desc: 'Verification' },
  { n: 4, label: 'Complete Profile', desc: 'Finish onboarding' },
];

export const OnboardingStepper = ({ currentStep = 1 }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle px-4 sm:px-6 py-4 sm:py-5">
      {/* Desktop */}
      <div className="hidden sm:flex items-center justify-between gap-2">
        {STEPS.map((s, idx) => {
          const done = s.n < currentStep;
          const active = s.n === currentStep;
          return (
            <React.Fragment key={s.n}>
              <div className={`flex items-center gap-3 ${active ? 'opacity-100' : done ? 'opacity-100' : 'opacity-40'}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 shrink-0 ${
                    done
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : active
                        ? 'bg-blue-600 border-blue-600 text-white shadow-[0_4px_10px_rgba(37,99,235,0.25)]'
                        : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  {done ? <CheckCircle2 className="w-4 h-4" /> : s.n}
                </div>
                <div className="text-left">
                  <div className={`text-xs font-bold leading-none ${active ? 'text-slate-900' : done ? 'text-emerald-700' : 'text-slate-600'}`}>{s.label}</div>
                  <div className="text-[11px] text-slate-400">{s.desc}</div>
                </div>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-2 ${done || active ? 'bg-emerald-200' : s.n < currentStep ? 'bg-emerald-200' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile */}
      <div className="sm:hidden space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-900">Step {currentStep} of 4</span>
          <span className="text-slate-500 font-semibold">{STEPS[currentStep - 1]?.label}</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${(currentStep / 4) * 100}%` }} />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {STEPS.map((s) => {
            const done = s.n < currentStep;
            const active = s.n === currentStep;
            return (
              <div key={s.n} className={`flex items-center gap-1.5 shrink-0 ${active ? 'opacity-100' : done ? 'opacity-90' : 'opacity-40'}`}>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    done ? 'bg-emerald-600 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {done ? <CheckCircle2 className="w-3 h-3" /> : s.n}
                </div>
                <span className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">{s.label}</span>
                {s.n < 4 && <span className="text-slate-300 mx-1">—</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OnboardingStepper;

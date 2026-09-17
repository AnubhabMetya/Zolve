import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Check } from 'lucide-react';

const LANGS = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
];

export const LanguageSwitcher = ({ compact = false }) => {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = i18n.language?.split('-')[0] || 'en';
  const currentLang = LANGS.find(l => l.code === current) || LANGS[0];

  const change = (code) => {
    i18n.changeLanguage(code);
    try { localStorage.setItem('zolve_lang', code); } catch {}
    try { document.documentElement.lang = code; } catch {}
    setOpen(false);
  };

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
          title={t('lang.select')}
        >
          <Languages className="w-3.5 h-3.5 text-brand-600" />
          <span className="hidden sm:inline">{currentLang.native}</span>
          <span className="sm:hidden uppercase">{current}</span>
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-slate-800 shadow-premium border border-slate-200 dark:border-slate-700 py-1.5 z-50">
            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('lang.select')}</div>
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => change(l.code)}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 ${current === l.code ? 'bg-brand-50 dark:bg-slate-700 font-bold text-brand-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}
              >
                <span>{l.native} <span className="text-slate-400 font-normal">({l.label})</span></span>
                {current === l.code && <Check className="w-3.5 h-3.5 text-brand-600" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {LANGS.map(l => (
        <button
          key={l.code}
          onClick={() => change(l.code)}
          className={`px-2.5 py-1 rounded-full text-xs font-bold border ${current === l.code ? 'bg-brand-900 text-white border-brand-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
        >
          {l.native}
        </button>
      ))}
    </div>
  );
};

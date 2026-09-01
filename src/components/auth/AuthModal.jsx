import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { X } from 'lucide-react';

// Deprecated EmailJS OTP modal — now redirects to Supabase Auth pages
// Kept for backward compat: any call to setIsAuthModalOpen(true) will navigate to /login
export const AuthModal = () => {
  const { isAuthModalOpen, setIsAuthModalOpen } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthModalOpen) {
      setIsAuthModalOpen(false);
      navigate('/login');
    }
  }, [isAuthModalOpen, navigate, setIsAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 p-6 text-center max-w-sm w-full">
        <p className="text-sm text-slate-600 dark:text-slate-300">Authentication moved to Supabase — redirecting to login...</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => { setIsAuthModalOpen(false); navigate('/login'); }}
            className="px-4 py-2 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold"
          >
            Go to Login
          </button>
          <button onClick={() => setIsAuthModalOpen(false)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

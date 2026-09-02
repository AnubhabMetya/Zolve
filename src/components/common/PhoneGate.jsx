import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isValidIndianMobile, normalizePhone } from '../../services/otpService';
import { Phone, AlertCircle, CheckCircle2, X } from 'lucide-react';

export const PhoneGate = () => {
  const { isAuthenticated, profile, updatePhone, user } = useAuth();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Show only when authenticated and phone missing and not dismissed this session
  const shouldShow = isAuthenticated && profile && !profile.phone && !dismissed;

  useEffect(() => {
    if (shouldShow) setPhone('');
  }, [shouldShow]);

  if (!shouldShow) return null;

  const handleSave = async () => {
    if (!isValidIndianMobile(phone)) { setError('Enter valid 10-digit Indian mobile (6-9 start)'); return; }
    setSaving(true); setError('');
    try {
      await updatePhone(normalizePhone(phone));
      setDismissed(true);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="sticky top-20 z-40 bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-start gap-2.5 flex-1">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0"><Phone className="w-4 h-4" /></div>
          <div className="flex-1">
            <div className="text-sm font-bold text-amber-900">Add your mobile number — required for service</div>
            <div className="text-xs text-amber-800">Executive/provider will call you on this number during your booking. Without it, your service cannot be fulfilled.</div>
            <div className="mt-2 flex gap-2 max-w-sm">
              <input value={phone} onChange={e=>{ setPhone(e.target.value.replace(/\D/g,'').slice(0,10)); setError(''); }} placeholder="98765 43210" inputMode="numeric" maxLength={10} className="flex-1 px-3 py-2 rounded-xl border border-amber-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold disabled:opacity-60">{saving? 'Saving...':'Save Mobile'}</button>
            </div>
            {error && <div className="text-xs text-red-600 mt-1 flex gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</div>}
          </div>
        </div>
        <button onClick={()=>setDismissed(true)} className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-700 shrink-0"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
};

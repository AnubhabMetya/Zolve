import React, { useState } from 'react';
import { ShieldCheck, Upload, CheckCircle2, Clock, AlertTriangle, XCircle, Info, EyeOff } from 'lucide-react';
import { maskAadhaar, maskPan, maskBank } from '../../utils/mask';

const statusConfig = {
  'Not Started': { label: 'Not Started', bg: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock },
  Submitted: { label: 'Submitted', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: Upload },
  'Under Review': { label: 'Under Review', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  Verified: { label: 'Verified', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  Rejected: { label: 'Rejected', bg: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  'Needs Update': { label: 'Needs Update', bg: 'bg-orange-50 text-orange-700 border-orange-200', icon: AlertTriangle },
};

export const DocumentCard = ({ doc, onVerify, onUpload }) => {
  const cfg = statusConfig[doc.status] || statusConfig['Not Started'];
  const Icon = cfg.icon;
  const isVerified = doc.status === 'Verified';
  const [showInfo, setShowInfo] = useState(false);

  const getMasked = () => {
    if (!doc.value) return doc.maskedPlaceholder || '••••';
    if (doc.id === 'aadhaar') return maskAadhaar(doc.value);
    if (doc.id === 'pan') return maskPan(doc.value);
    if (doc.id === 'bank') return maskBank(doc.value);
    return doc.value ? `•••• ${String(doc.value).slice(-4)}` : doc.maskedPlaceholder;
  };

  return (
    <div className={`relative p-5 rounded-2xl border bg-white shadow-subtle transition-all hover:shadow-premium flex flex-col min-h-[180px] ${isVerified ? 'border-emerald-200/70 bg-emerald-50/20' : 'border-slate-200/80'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
          <ShieldCheck className="w-5 h-5" />
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.bg}`}>
          <Icon className="w-3 h-3" />
          {cfg.label}
        </span>
      </div>

      <div className="mt-3 flex-1">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          {doc.title}
          {doc.required ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">Required</span> : <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">Optional</span>}
          {doc.tooltip && (
            <button onClick={() => setShowInfo(!showInfo)} className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200">
              <Info className="w-3 h-3" />
            </button>
          )}
        </h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{doc.purpose}</p>
        {showInfo && doc.tooltip && <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-2 mt-2">{doc.tooltip}</p>}

        <div className="mt-3 flex items-center gap-2 text-xs">
          <EyeOff className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono font-semibold text-slate-700 tracking-wide">{isVerified || doc.status !== 'Not Started' ? getMasked() : doc.maskedPlaceholder}</span>
        </div>
        {doc.status !== 'Not Started' && doc.status !== 'Verified' && (
          <p className="text-[11px] text-slate-400 mt-1">{doc.id === 'background' ? 'Background check takes 24–48h' : 'Verification in progress'}</p>
        )}
      </div>

      <div className="mt-4">
        {isVerified ? (
          <div className="w-full py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Verified
          </div>
        ) : doc.status === 'Rejected' || doc.status === 'Needs Update' ? (
          <button onClick={() => onUpload?.(doc.id)} className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors">
            Update Document
          </button>
        ) : (
          <button onClick={() => (onVerify ? onVerify(doc.id) : onUpload?.(doc.id))} className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
            <Upload className="w-3.5 h-3.5" />
            {doc.status === 'Not Started' ? 'Upload & Verify' : 'Verify'}
          </button>
        )}
      </div>
    </div>
  );
};

export default DocumentCard;

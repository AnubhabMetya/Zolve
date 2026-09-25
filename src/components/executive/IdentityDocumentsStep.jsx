import React, { useMemo } from 'react';
import { ShieldCheck, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { DocumentCard } from './DocumentCard';
import { OnboardingStepper } from './OnboardingStepper';

const DEFAULT_DOCS = [
  { id: 'aadhaar', title: 'Aadhaar Verification', purpose: 'Identity proof required for partner activation', required: true, status: 'Not Started', maskedPlaceholder: 'XXXX XXXX 1234', value: '', tooltip: 'Aadhaar is used only for identity verification. Full number is never displayed.' },
  { id: 'pan', title: 'PAN Verification', purpose: 'Financial identity for payouts & tax compliance', required: true, status: 'Not Started', maskedPlaceholder: 'XXXXX1234X', value: '', tooltip: 'PAN is encrypted and masked after submission.' },
  { id: 'bank', title: 'Bank Account Verification', purpose: 'Payout account for earnings settlement', required: true, status: 'Not Started', maskedPlaceholder: 'XXXXXX1234', value: '', tooltip: 'Bank details are masked. Only last 4 digits visible.' },
  { id: 'address', title: 'Address Verification', purpose: 'Service area and residence verification', required: true, status: 'Not Started', maskedPlaceholder: '•••• Address on file', value: '', tooltip: null },
  { id: 'background', title: 'Police / Background Verification', purpose: 'Safety & trust verification for community services', required: true, status: 'Not Started', maskedPlaceholder: 'Background check', value: '', tooltip: 'Takes 24–48 hours. You can continue after submission.' },
  { id: 'certificates', title: 'Skill / Professional Certificates', purpose: 'Trade certificates where applicable', required: false, status: 'Not Started', maskedPlaceholder: 'Optional', value: '', tooltip: 'Required for licensed trades (Electrical, Plumbing, etc.).' },
];

export const IdentityDocumentsStep = ({
  docs: controlledDocs,
  onChangeDocs,
  onContinue,
  onBack,
  onBackToHome,
}) => {
  const docs = controlledDocs || DEFAULT_DOCS;

  const requiredDocs = docs.filter((d) => d.required);
  const verifiedRequired = requiredDocs.filter((d) => d.status === 'Verified').length;
  const progress = requiredDocs.length ? Math.round((verifiedRequired / requiredDocs.length) * 100) : 0;
  const allRequiredVerified = verifiedRequired === requiredDocs.length;

  const handleVerify = (id) => {
    const updated = docs.map((d) => {
      if (d.id !== id) return d;
      // Mock verify flow: Not Started -> Submitted -> Verified
      if (d.status === 'Not Started') {
        // simulate value entry with masked storage
        const mockValues = {
          aadhaar: '123456781234',
          pan: 'ABCDE1234F',
          bank: '1000001234561234',
          address: 'Verified Address',
          background: 'Background Submitted',
          certificates: 'Certificate Uploaded',
        };
        return { ...d, status: 'Verified', value: mockValues[id] || 'verified' };
      }
      return { ...d, status: 'Verified' };
    });
    onChangeDocs?.(updated);
  };

  const handleUpload = (id) => handleVerify(id);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Stepper */}
      <OnboardingStepper currentStep={3} />

      {/* Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
          <Lock className="w-3.5 h-3.5" /> Secure Verification • Privacy Protected
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-display">Verify Your Identity & Documents</h1>
        <p className="text-sm text-slate-500 max-w-2xl mx-auto">Complete the required verification steps before activating your Zolve Partner profile.</p>
      </div>

      {/* Privacy banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start max-w-3xl mx-auto">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 leading-relaxed">
          <strong>Privacy protected.</strong> Full Aadhaar, PAN, and bank numbers are never displayed. Values are masked as <span className="font-mono font-bold">XXXX XXXX 1234</span> after submission. Customer-facing screens never expose these documents.
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900">Identity Verification</span>
          <span className="text-xs font-black text-blue-700">{progress}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {requiredDocs.map((d) => (
            <span key={d.id} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-semibold ${d.status === 'Verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
              {d.status === 'Verified' ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
              {d.title.replace(' Verification','')}
            </span>
          ))}
        </div>
        {allRequiredVerified && (
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
            <CheckCircle2 className="w-4 h-4" /> Identity & document verification complete
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {docs.map((doc) => (
          <DocumentCard key={doc.id} doc={doc} onVerify={handleVerify} onUpload={handleUpload} />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button onClick={onBack} className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline">← Back to Verify Details</button>
        <div className="flex items-center gap-3">
          <button onClick={onBackToHome} className="hidden sm:inline-flex text-xs font-semibold text-slate-400 hover:text-slate-600">Back to Home</button>
          <button
            onClick={() => allRequiredVerified && onContinue?.()}
            disabled={!allRequiredVerified}
            className={`px-8 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${allRequiredVerified ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            {allRequiredVerified ? 'Continue to Complete Profile →' : 'Complete required verifications'}
            {!allRequiredVerified && <AlertTriangle className="w-4 h-4 opacity-50" />}
          </button>
        </div>
      </div>
      {!allRequiredVerified && <p className="text-center text-xs text-slate-400">All required documents must be Verified to continue.</p>}
    </div>
  );
};

export default IdentityDocumentsStep;

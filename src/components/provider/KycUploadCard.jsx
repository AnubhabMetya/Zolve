import React, { useState } from 'react';
import { ShieldCheck, Upload, FileText, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';
import { uploadKycDocument, getKycDoc } from '../../services/kycService';
import { useApp } from '../../context/AppContext';

export const KycUploadCard = () => {
  const { currentUser, addNotification } = useApp();
  const providerId = currentUser?.id || 'demo-provider-01';
  const existing = getKycDoc(providerId);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [doc, setDoc] = useState(existing);

  const handleUpload = async () => {
    if (!file) return;
    if (file.size > 5*1024*1024) { alert('Max 5MB'); return; }
    setUploading(true);
    try {
      const res = await uploadKycDocument({ providerId, file, docType: 'govt_id' });
      setDoc({ url: res.url, status: 'pending', originalName: file.name, isMock: res.isMock });
      addNotification({ title: 'KYC Document Uploaded', message: `${file.name} submitted for admin verification.`, type: 'system' });
    } catch (e) { alert(e.message); }
    finally { setUploading(false); }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-subtle p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-brand-900 text-white flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div>
        <div>
          <h3 className="text-sm font-black text-slate-900">KYC Verification — Govt ID & Trade License</h3>
          <p className="text-xs text-slate-500">Upload Aadhaar / trade certificate for admin verification (4-tier: ID, skill, background, ethics).</p>
        </div>
        {doc?.status === 'verified' && <span className="ml-auto px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</span>}
        {doc?.status === 'pending' && <span className="ml-auto px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200">Pending Review</span>}
      </div>

      {doc?.url && (
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3 text-xs">
          <FileText className="w-4 h-4 text-brand-600" />
          <span className="truncate flex-1">{doc.originalName || doc.fileName || 'Uploaded document'}</span>
          <a href={doc.url} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold flex items-center gap-1 hover:bg-slate-50"><Eye className="w-3.5 h-3.5" /> View</a>
          <span className="text-[11px] text-slate-500">{doc.isMock ? 'Local demo' : 'Stored'}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <label className="flex-1 w-full px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-white cursor-pointer text-xs flex items-center gap-2">
          <Upload className="w-4 h-4 text-slate-500" />
          <span className="truncate">{file ? file.name : 'Choose file — JPG/PDF/PNG up to 5MB'}</span>
          <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={e=>setFile(e.target.files?.[0]||null)} />
        </label>
        <button disabled={!file || uploading} onClick={handleUpload} className="px-5 py-3 rounded-xl bg-brand-900 hover:bg-brand-800 disabled:opacity-50 text-white text-xs font-bold whitespace-nowrap">
          {uploading ? 'Uploading…' : doc ? 'Re-upload for Re-verify' : 'Upload & Submit for Verification'}
        </button>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        <span>Admin verifies in <strong>Admin → KYC Queue</strong>. On approve, your profile gets Accredited Pro badge.</span>
      </div>
    </div>
  );
};

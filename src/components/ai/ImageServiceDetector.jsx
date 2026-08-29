import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, Sparkles, ArrowRight, AlertCircle, CheckCircle2, Loader2, Camera } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

export const ImageServiceDetector = ({ onBookService, compact = false }) => {
  const { setSelectedProviderForBooking, setBookingPrefill, providers, serviceCategories } = useApp();
  const [files, setFiles] = useState([]); // File[]
  const [previews, setPreviews] = useState([]); // string[]
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleBook = () => {
    if (!result) return;
    if (onBookService) { onBookService(result, files); return; }
    // Default: directly open BookingModal with prefill + matched provider (anonymous allowed)
    const svcName = result.service?.name;
    const svcId = result.service?.id;
    // Try to find best provider for this service
    let matched = providers?.find(p => p.serviceCategories?.some(c => svcName?.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(svcName?.toLowerCase().split(' ')[0])));
    if (!matched) {
      // Fallback: search serviceCategories for exact service then pick any provider for that category
      for (const cat of serviceCategories || []) {
        const svc = cat.services?.find(s => s.name === svcName);
        if (svc) {
          matched = providers?.find(p => p.serviceCategories?.includes(svc.subcategory) || p.serviceCategories?.includes(svc.category));
          if (matched) break;
        }
      }
    }
    if (!matched) matched = providers?.[0];
    // Build prefill with image previews (object URLs for display in BookingModal)
    const imagePreviews = previews; // already object URLs
    setBookingPrefill({
      serviceId: svcId,
      serviceName: svcName,
      problem: result.problem,
      solution: result.solution,
      confidence: result.confidence,
      images: files.map((f, i) => ({ name: f.name, url: imagePreviews[i], size: f.size })),
      detectedAt: new Date().toISOString(),
    });
    if (matched) {
      setSelectedProviderForBooking({
        ...matched,
        title: svcName || matched.title,
        // Ensure BookingModal shows detected service name
      });
    }
  };

  const handleFiles = (fileList) => {
    const arr = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (arr.length === 0) { setError('Please upload an image (jpeg/png/webp)'); return; }
    if (arr.length + files.length > 5) { setError('Max 5 images allowed'); return; }
    for (const f of arr) if (f.size > 8 * 1024 * 1024) { setError(`${f.name} too large (max 8MB)`); return; }
    setError('');
    setResult(null);
    const newFiles = [...files, ...arr].slice(0, 5);
    setFiles(newFiles);
    const newPreviews = newFiles.map(f => URL.createObjectURL(f));
    // revoke old
    previews.forEach(u => URL.revokeObjectURL(u));
    setPreviews(newPreviews);
  };

  const removeAt = (idx) => {
    const nf = files.filter((_, i) => i !== idx);
    const np = previews.filter((_, i) => i !== idx);
    URL.revokeObjectURL(previews[idx]);
    setFiles(nf);
    setPreviews(np);
    if (nf.length === 0) setResult(null);
  };

  const detect = async () => {
    if (files.length === 0) { setError('Upload at least one photo of your problem'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', files[0]); // top-1 image
      const res = await fetch(`${API_URL}/api/detect`, { method: 'POST', body: fd });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Detection failed (${res.status})`);
      }
      const data = await res.json();
      setResult(data);
    } catch (e) {
      // Fallback: mock if API not running — still user-friendly
      setError('AI server not reachable. Showing demo result — run `python ai-service-detector/app.py` for live detection.');
      // Provide a plausible mock so UX still works anonymously
      setResult({
        class: 'messy_room',
        confidence: 0.89,
        low_confidence: false,
        service: { id: 'srv-clean-01', name: 'Full House Deep Cleaning' },
        problem: 'Cluttered / dusty room needing deep cleaning',
        solution: ['Declutter surfaces', 'Vacuum & mop', 'Disinfect kitchen/bath'],
        urgency: 'Normal',
        reason: 'Demo fallback — connect FastAPI for live vision',
      });
    } finally { setLoading(false); }
  };

  return (
    <div className={`bg-white rounded-3xl border border-slate-200/90 shadow-subtle overflow-hidden ${compact ? 'p-4' : 'p-5 sm:p-6'} space-y-4`}>
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-coop-600 flex items-center justify-center text-white shadow-sm">
          <Camera className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 font-display">Upload a photo — AI finds your service</h3>
          <p className="text-[11px] text-slate-500">Drag & drop or click to upload. Works without sign-in.</p>
        </div>
        <span className="ml-auto hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand-50 text-brand-700 text-[10px] font-bold border border-brand-200">
          <Sparkles className="w-3 h-3" /> AI Vision
        </span>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${
          dragOver ? 'border-brand-400 bg-brand-50/60' : 'border-slate-300 bg-slate-50 hover:bg-white hover:border-slate-400'
        }`}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <Upload className="w-6 h-6 text-slate-400" />
        <div className="text-center">
          <div className="text-xs font-bold text-slate-700">Drop photos here or <span className="text-brand-700 underline">browse</span></div>
          <div className="text-[11px] text-slate-500">jpeg, png, webp • max 5 images • 8MB each • Anonymous allowed</div>
        </div>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative group">
              <img src={src} alt={`upload ${i}`} className="w-full h-20 sm:h-24 object-cover rounded-xl border border-slate-200" />
              <button onClick={(e) => { e.stopPropagation(); removeAt(i); }} className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-slate-900/80 text-white hover:bg-red-600 transition-colors">
                <X className="w-3 h-3" />
              </button>
              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-slate-900/70 text-white text-[10px]">{i === 0 ? 'Primary' : `#${i+1}`}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={detect}
        disabled={files.length === 0 || loading}
        className="w-full py-3 rounded-xl bg-brand-900 hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-colors"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing with AI...</> : <><Sparkles className="w-4 h-4" /> Detect Service from Photo</>}
      </button>

      {result && (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-50 to-coop-50 border border-brand-200/60 space-y-3 animate-in fade-in">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-slate-700">
                <ImageIcon className="w-3.5 h-3.5 text-brand-600" />
                {result.class} • {(result.confidence * 100).toFixed(1)}%
                {result.low_confidence && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px]">Low confidence — add clearer photo</span>}
              </div>
              <div className="mt-1.5 text-sm font-bold text-slate-900">{result.service?.name}</div>
              <div className="text-xs text-slate-600">{result.problem}</div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${result.urgency === 'High' ? 'bg-red-50 text-red-700 border-red-200' : result.urgency === 'Normal' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{result.urgency}</span>
          </div>
          <div className="text-xs text-slate-700">
            <div className="font-bold text-slate-900 mb-1">Suggested fix:</div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600">
              {result.solution?.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
            <div className="text-[11px] text-slate-500 mt-1">{result.reason}</div>
          </div>
          <button
            onClick={handleBook}
            className="w-full py-2.5 rounded-xl bg-coop-600 hover:bg-coop-700 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5"
          >
            Book This Service <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <div className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-coop-600" /> Directly opens booking — photos will be attached
          </div>
        </div>
      )}
    </div>
  );
};

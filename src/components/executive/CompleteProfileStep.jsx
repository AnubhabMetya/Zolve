import React, { useState, useMemo } from 'react';
import { CheckCircle2, Award, MapPin, Clock, ShieldCheck, Wrench, GraduationCap, FileCheck, Calendar, Package } from 'lucide-react';
import { OnboardingStepper } from './OnboardingStepper';

export const CompleteProfileStep = ({
  selectedSkills = [],
  selectedLocation,
  profileData,
  onChangeProfile,
  onComplete,
  onBack,
}) => {
  const [data, setData] = useState(() =>
    profileData || {
      primarySkill: selectedSkills[0] || '',
      secondarySkills: selectedSkills.slice(1) || [],
      yearsExp: '',
      skillLevel: '',
      prevExp: '',
      assessments: { technical: false, safety: false, sop: false },
      training: { technical: false, customerHandling: false, safety: false, hygiene: false, appUsage: false },
      availability: { days: [], hours: '', slots: '' },
      kit: { tools: false, safetyEquipment: false },
      agreements: { terms: false, sop: false, cancellation: false, safety: false, privacy: false },
    }
  );

  const update = (patch) => {
    const next = { ...data, ...patch };
    setData(next);
    onChangeProfile?.(next);
  };

  const toggleAssessment = (k) => update({ assessments: { ...data.assessments, [k]: !data.assessments[k] } });
  const toggleTraining = (k) => update({ training: { ...data.training, [k]: !data.training[k] } });
  const toggleAgreement = (k) => update({ agreements: { ...data.agreements, [k]: !data.agreements[k] } });
  const toggleDay = (day) => {
    const days = data.availability.days.includes(day) ? data.availability.days.filter((d) => d !== day) : [...data.availability.days, day];
    update({ availability: { ...data.availability, days } });
  };

  const canComplete = useMemo(() => {
    if (!data.primarySkill) return false;
    if (!data.yearsExp || !data.skillLevel) return false;
    if (!Object.values(data.agreements).every(Boolean)) return false;
    return true;
  }, [data]);

  const handleComplete = () => {
    if (!canComplete) return;
    onComplete?.(data);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <OnboardingStepper currentStep={4} />

      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-display">Complete Your Profile</h1>
        <p className="text-sm text-slate-500">Finish your partner profile to activate service opportunities.</p>
      </div>

      {/* Skills & Experience */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-subtle">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Award className="w-4 h-4 text-blue-600" /> Skills & Experience</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700">Primary Skill</label>
            <select value={data.primarySkill} onChange={(e) => update({ primarySkill: e.target.value })} className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 text-xs bg-white">
              {selectedSkills.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Years of Experience</label>
            <select value={data.yearsExp} onChange={(e) => update({ yearsExp: e.target.value })} className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 text-xs bg-white">
              <option value="">Select</option>
              <option value="0-1">0–1 years</option>
              <option value="1-3">1–3 years</option>
              <option value="3-5">3–5 years</option>
              <option value="5+">5+ years</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Skill Level</label>
            <select value={data.skillLevel} onChange={(e) => update({ skillLevel: e.target.value })} className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 text-xs bg-white">
              <option value="">Select</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Expert">Expert</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Previous Experience</label>
            <input value={data.prevExp} onChange={(e) => update({ prevExp: e.target.value })} placeholder="Brief prior work" className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 text-xs" />
          </div>
        </div>
      </div>

      {/* Skills Assessment */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-subtle">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><FileCheck className="w-4 h-4 text-emerald-600" /> Skills Assessment</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { k: 'technical', label: 'Technical assessment' },
            { k: 'safety', label: 'Safety assessment' },
            { k: 'sop', label: 'Service SOP' },
          ].map((it) => (
            <label key={it.k} className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold cursor-pointer ${data.assessments[it.k] ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
              <input type="checkbox" checked={data.assessments[it.k]} onChange={() => toggleAssessment(it.k)} className="rounded" />
              {it.label}
            </label>
          ))}
        </div>
      </div>

      {/* Training */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-subtle">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-violet-600" /> Training</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { k: 'technical', label: 'Technical training' },
            { k: 'customerHandling', label: 'Customer handling' },
            { k: 'safety', label: 'Safety' },
            { k: 'hygiene', label: 'Hygiene' },
            { k: 'appUsage', label: 'App usage' },
          ].map((it) => (
            <label key={it.k} className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold cursor-pointer ${data.training[it.k] ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
              <input type="checkbox" checked={data.training[it.k]} onChange={() => toggleTraining(it.k)} />
              {it.label}
            </label>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-subtle">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-600" /> Location</h3>
        <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
          <span>Service area: {selectedLocation?.city || selectedLocation?.name || 'Detected area'} — 50 km radius</span>
          <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Auto-detected</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input placeholder="Locality" className="p-2.5 rounded-xl border border-slate-200 text-xs" defaultValue={selectedLocation?.city || ''} readOnly />
          <select className="p-2.5 rounded-xl border border-slate-200 text-xs bg-white" defaultValue="10">
            <option value="5">5 km radius</option>
            <option value="10">10 km preferred</option>
            <option value="25">25 km</option>
            <option value="50">50 km (max)</option>
          </select>
        </div>
      </div>

      {/* Availability */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-subtle">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Calendar className="w-4 h-4 text-amber-600" /> Availability</h3>
        <div className="flex flex-wrap gap-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${data.availability.days.includes(d) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input placeholder="Working hours e.g. 9am - 6pm" value={data.availability.hours} onChange={(e) => update({ availability: { ...data.availability, hours: e.target.value } })} className="p-2.5 rounded-xl border border-slate-200 text-xs" />
          <input placeholder="Available slots e.g. Morning, Evening" value={data.availability.slots} onChange={(e) => update({ availability: { ...data.availability, slots: e.target.value } })} className="p-2.5 rounded-xl border border-slate-200 text-xs" />
        </div>
      </div>

      {/* Kit */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-subtle">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Package className="w-4 h-4 text-slate-700" /> Kit / Equipment</h3>
        <label className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold cursor-pointer ${data.kit.tools ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200'}`}>
          <input type="checkbox" checked={data.kit.tools} onChange={() => update({ kit: { ...data.kit, tools: !data.kit.tools } })} /> Required tools available
        </label>
        <label className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold cursor-pointer ${data.kit.safetyEquipment ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200'}`}>
          <input type="checkbox" checked={data.kit.safetyEquipment} onChange={() => update({ kit: { ...data.kit, safetyEquipment: !data.kit.safetyEquipment } })} /> Safety equipment available
        </label>
      </div>

      {/* Agreements */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-subtle">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-slate-800" /> Partner Agreement</h3>
        {[
          { k: 'terms', label: 'Partner terms' },
          { k: 'sop', label: 'SOP agreement' },
          { k: 'cancellation', label: 'Cancellation policy' },
          { k: 'safety', label: 'Safety policy' },
          { k: 'privacy', label: 'Privacy/data policy' },
        ].map((it) => (
          <label key={it.k} className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold cursor-pointer ${data.agreements[it.k] ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}>
            <input type="checkbox" checked={data.agreements[it.k]} onChange={() => toggleAgreement(it.k)} />
            I agree to {it.label}
          </label>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline">← Back to Identity & Documents</button>
        <button onClick={handleComplete} disabled={!canComplete} className={`px-8 py-3.5 rounded-xl text-sm font-bold shadow-md transition-all ${canComplete ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
          Complete Onboarding
        </button>
      </div>
      {!canComplete && <p className="text-center text-xs text-slate-400">Complete primary skill, experience and accept all agreements to finish.</p>}
    </div>
  );
};

export default CompleteProfileStep;

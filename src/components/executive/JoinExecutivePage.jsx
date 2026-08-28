import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { sendMobileOtp, verifyMobileOtp, generateOtp, isValidIndianMobile } from '../../services/otpService';
import { Home, HeartHandshake, Building2, Send, CheckCircle2, AlertCircle, Phone, Mail, User, ArrowRight, Clock, ShieldCheck } from 'lucide-react';

const iconMap = { Home, HeartHandshake, Building2 };

export const JoinExecutivePage = () => {
  const { executiveVerticals, registerExecutive, setActiveTab } = useApp();
  const [selectedVertical, setSelectedVertical] = useState(null);
  const [step, setStep] = useState(1); // 1 pick vertical, 2 form, 3 otp
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [gmailAddress, setGmailAddress] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpDigits, setOtpDigits] = useState(['','','','','','']);
  const [otpError, setOtpError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [sendInfo, setSendInfo] = useState(null);
  const refs = useRef([]);

  useEffect(() => {
    if (resendCountdown > 0) {
      const t = setTimeout(() => setResendCountdown(c=>c-1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCountdown]);

  const handleSelectVertical = (v) => {
    setSelectedVertical(v);
    setStep(2);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !mobileNumber.trim() || !gmailAddress.trim()) { alert('Fill all fields'); return; }
    if (!isValidIndianMobile(mobileNumber)) { alert('Enter valid 10-digit Indian mobile'); return; }
    setIsSending(true);
    setOtpError('');
    const otp = generateOtp();
    setGeneratedOtp(otp);
    setOtpDigits(['','','','','','']);
    setOtpExpiresAt(Date.now() + 5*60*1000);
    setResendCountdown(30);
    try {
      const res = await sendMobileOtp(mobileNumber, otp, fullName);
      setSendInfo(res);
      setStep(3);
    } catch (err) {
      setSendInfo({ fallback:true, error: err.message });
      setStep(3);
    } finally { setIsSending(false); }
  };

  const handleOtpChange = (i, val) => {
    if (isNaN(val)) return;
    const nd = [...otpDigits]; nd[i]=val.slice(-1); setOtpDigits(nd); setOtpError('');
    if (val && i<5 && refs.current[i+1]) refs.current[i+1].focus();
  };
  const handleKeyDown = (i,e) => { if(e.key==='Backspace' && !otpDigits[i] && i>0) refs.current[i-1].focus(); };

  const handleVerify = (e) => {
    e.preventDefault();
    const entered = otpDigits.join('');
    const result = verifyMobileOtp(entered, generatedOtp, otpExpiresAt);
    if (!result.valid) { setOtpError(result.error); return; }
    setIsVerifying(true);
    setTimeout(() => {
      const { requiresApproval } = registerExecutive({ fullName, mobileNumber, gmailAddress, executiveVertical: selectedVertical.id });
            setIsVerifying(false);
      if (requiresApproval) {
        // stay on page show pending message
        setStep(4);
      } else {
        setActiveTab('home');
      }
    }, 500);
  };

  const handleResend = async () => {
    if (resendCountdown>0) return;
    const otp = generateOtp();
    setGeneratedOtp(otp);
    setOtpExpiresAt(Date.now()+5*60*1000);
    setResendCountdown(30);
    const res = await sendMobileOtp(mobileNumber, otp, fullName);
    setSendInfo(res);
  };

  if (step === 4) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto"><Clock className="w-10 h-10 text-amber-600" /></div>
        <h1 className="text-2xl font-extrabold font-display">Application Submitted — Awaiting Approval</h1>
        <p className="text-sm text-slate-600">Your Community & Society Executive application is pending Society Admin approval. You will be activated once approved.</p>
        <div className="p-4 rounded-2xl bg-slate-50 border text-xs text-left">
          <div><strong>Vertical:</strong> {selectedVertical?.title}</div>
          <div><strong>Name:</strong> {fullName} — <strong>Phone:</strong> {mobileNumber}</div>
        </div>
        <button onClick={()=>setActiveTab('home')} className="px-6 py-3 rounded-xl bg-brand-900 text-white text-xs font-bold">Back to Home</button>
      </div>
    );
  }

  return (
    <div className="pb-16 space-y-8">
      <div className="rounded-3xl bg-gradient-to-br from-brand-900 via-brand-950 to-coop-950 text-white p-8">
        <h1 className="text-3xl font-extrabold font-display">Join as Executive</h1>
        <p className="text-sm text-slate-300 mt-2 max-w-2xl">Choose your vertical. Household (8 services), Personal & Family (3), or Community & Society (3 — requires Society Admin approval). Mobile OTP verification required. Demo OTP: <strong className="text-amber-300">123456</strong></p>
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {executiveVerticals.map(v => {
            const Icon = iconMap[v.icon] || Home;
            return (
              <button key={v.id} onClick={()=>handleSelectVertical(v)} className="text-left p-6 rounded-3xl bg-white border border-slate-200 shadow-subtle hover:shadow-premium hover:border-brand-300 transition-all">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${v.color} flex items-center justify-center text-white mb-4`}><Icon className="w-6 h-6" /></div>
                <h3 className="text-base font-bold text-slate-900">{v.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{v.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">{v.services.map(s=> <span key={s} className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-700">{s}</span>)}</div>
                <div className="mt-4 text-xs font-bold text-brand-700 flex items-center gap-1">Select & Continue <ArrowRight className="w-3.5 h-3.5" /></div>
              </button>
            );
          })}
        </div>
      )}

      {step === 2 && selectedVertical && (
        <form onSubmit={handleSendOtp} className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Executive Registration — {selectedVertical.label}</h2>
            <button type="button" onClick={()=>setStep(1)} className="text-xs text-slate-500 underline">Change vertical</button>
          </div>
          {selectedVertical.id==='community' && <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex gap-2"><ShieldCheck className="w-4 h-4 shrink-0" /> Community executives require Society Admin approval before accessing society orders.</div>}
          <div><label className="text-xs font-bold">Full Name</label><div className="relative mt-1"><User className="w-4 h-4 absolute left-3 top-3 text-slate-400" /><input required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="e.g. Arjun Patel" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs" /></div></div>
          <div><label className="text-xs font-bold">Mobile Number (10-digit)</label><div className="relative mt-1"><Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" /><input required value={mobileNumber} onChange={e=>setMobileNumber(e.target.value)} placeholder="98765 43210" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs" /></div></div>
          <div><label className="text-xs font-bold">Email</label><div className="relative mt-1"><Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" /><input required type="email" value={gmailAddress} onChange={e=>setGmailAddress(e.target.value)} placeholder="you@gmail.com" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs" /></div></div>
          <button type="submit" disabled={isSending} className="w-full py-3 rounded-xl bg-brand-900 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"><Send className="w-4 h-4" />{isSending? 'Sending OTP via SMS...':'Send Mobile OTP'}</button>
          <p className="text-[10px] text-slate-400 text-center">True SMS via MSG91/n8n. Demo fallback OTP <strong>123456</strong> always works when gateway unconfigured.</p>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleVerify} className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-5">
          <h2 className="text-lg font-bold">Enter 6-Digit Mobile OTP</h2>
          <p className="text-xs text-slate-500">Sent to <strong>{mobileNumber}</strong> {sendInfo?.via && <span className="text-[10px] text-slate-400">({sendInfo.via})</span>}</p>
          {sendInfo?.fallback && <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">{sendInfo.error} — try 123456</div>}
          <div className="flex gap-2 justify-between">
            {otpDigits.map((d,i)=> <input key={i} ref={el=>refs.current[i]=el} value={d} onChange={e=>handleOtpChange(i,e.target.value)} onKeyDown={e=>handleKeyDown(i,e)} maxLength={1} className="w-12 h-14 text-center text-xl font-mono font-bold rounded-xl border-2 border-slate-200 focus:border-brand-600 focus:outline-none bg-slate-50" />)}
          </div>
          {otpError && <div className="p-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex gap-2"><AlertCircle className="w-4 h-4" />{otpError}</div>}
          <div className="flex justify-between text-xs"><button type="button" onClick={()=>setStep(2)} className="underline text-slate-500">Edit details</button><button type="button" onClick={handleResend} disabled={resendCountdown>0} className={resendCountdown>0?'text-slate-400':'text-brand-700 font-semibold'}>{resendCountdown>0?`Resend in ${resendCountdown}s`:'Resend OTP'}</button></div>
          <button type="submit" disabled={isVerifying} className="w-full py-3 rounded-xl bg-coop-700 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"><CheckCircle2 className="w-4 h-4" />{isVerifying?'Verifying...':'Verify OTP & Join as Executive'}</button>
        </form>
      )}
    </div>
  );
};

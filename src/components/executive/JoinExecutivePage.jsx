import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { ExecutiveApplicationService } from '../../services/executiveApplicationService';
import { sendMobileOtp, verifyMobileOtp, sendEmailOtp, verifyEmailOtp, generateOtp, isValidIndianMobile, isValidEmail } from '../../services/otpService';
import { Home, HeartHandshake, Building2, Send, CheckCircle2, AlertCircle, Phone, Mail, User, ArrowRight, Clock, ShieldCheck, XCircle } from 'lucide-react';

const iconMap = { Home, HeartHandshake, Building2 };

export const JoinExecutivePage = () => {
  const { executiveVerticals, registerExecutive, setActiveTab } = useApp();
  const { user: supaUser } = useAuth();
  const [selectedVertical, setSelectedVertical] = useState(null);
  const [step, setStep] = useState(1); // 1 pick vertical, 2 form, 3 otp, 4 status
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
  const [persistedApp, setPersistedApp] = useState(null);
  const [myAppLoading, setMyAppLoading] = useState(false);
  const refs = useRef([]);

  useEffect(() => {
    if (resendCountdown > 0) {
      const t = setTimeout(() => setResendCountdown(c=>c-1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCountdown]);

  // Fetch real DB status for applicant — source of truth is Supabase, not localStorage
  useEffect(() => {
    if (!isSupabaseConfigured() || !supaUser?.id) return;
    let cancelled = false;
    const fetchLatest = async () => {
      setMyAppLoading(true);
      try {
        const latest = await ExecutiveApplicationService.fetchMyLatestApplication(supaUser);
        if (!cancelled && latest) {
          setPersistedApp(latest);
          // If user already has an application, show its status card
          // Prefer community applications for status display; but show any latest
          const canonical = latest.status;
          if (canonical === 'pending' || canonical === 'approved' || canonical === 'rejected') {
            // set vertical for display
            const v = executiveVerticals.find(x => x.id === latest.vertical) || null;
            if (v) setSelectedVertical(v);
            // also fill form fields from DB for display consistency
            if (!fullName) setFullName(latest.fullName || latest.applicantName || '');
            if (!mobileNumber) setMobileNumber(latest.phone || latest.applicantPhone || '');
            if (!gmailAddress) setGmailAddress(latest.email || latest.applicantEmail || '');
            // Only auto-show status if user hasn't actively started a new flow (step===1)
            // If they are mid-flow (step 2/3) don't overwrite
            if (step === 1) setStep(4);
          }
        }
      } catch (e) {
        console.warn('[JoinExecutive] fetchMyLatest failed', e?.message || e);
      } finally {
        if (!cancelled) setMyAppLoading(false);
      }
    };
    fetchLatest();
    return () => { cancelled = true; };
  }, [supaUser?.id]);

  const handleSelectVertical = (v) => {
    setSelectedVertical(v);
    setStep(2);
  };

  const isCommunity = selectedVertical?.id === 'community';
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !mobileNumber.trim() || !gmailAddress.trim()) { alert('Fill all fields'); return; }
    if (isCommunity) {
      if (!isValidEmail(gmailAddress)) { alert('Enter valid email address'); return; }
    } else {
      if (!isValidIndianMobile(mobileNumber)) { alert('Enter valid 10-digit Indian mobile'); return; }
    }
    setIsSending(true);
    setOtpError('');
    setOtpDigits(['','','','','','']);
    if (isCommunity) {
      setResendCountdown(30);
      try {
        const res = await sendEmailOtp(gmailAddress, fullName);
        setSendInfo(res);
        if (res.success) {
          setStep(3);
        } else {
          setOtpError(res.error || 'Unable to send verification email. Please try again.');
          setResendCountdown(0);
        }
      } catch (err) {
        setSendInfo({ fallback:true, error: 'Unable to send verification email. Please try again.' });
        setOtpError('Unable to send verification email. Please try again.');
        setResendCountdown(0);
      } finally { setIsSending(false); }
      return;
    }
    const otp = generateOtp();
    setGeneratedOtp(otp);
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

  const handleVerify = async (e) => {
    e.preventDefault();
    const entered = otpDigits.join('');
    const result = isCommunity
      ? verifyEmailOtp(gmailAddress, entered)
      : verifyMobileOtp(entered, generatedOtp, otpExpiresAt);
    if (!result.valid) { setOtpError(result.error); return; }
    setIsVerifying(true);
    try {
      const res = await registerExecutive({ fullName, mobileNumber, gmailAddress, executiveVertical: selectedVertical.id });
      // res.app may contain canonicalStatus from DB; also set persistedApp to DB row if available
      if (res.app) {
        // Try to fetch latest from DB to get canonical status (in case register used fallback)
        if (isSupabaseConfigured() && supaUser?.id) {
          try {
            const latest = await ExecutiveApplicationService.fetchMyLatestApplication(supaUser);
            if (latest) setPersistedApp(latest);
            else setPersistedApp({ ...res.app, status: res.app.canonicalStatus || (res.requiresApproval ? 'pending' : 'approved'), vertical: selectedVertical.id, fullName, phone: mobileNumber, email: gmailAddress });
          } catch { setPersistedApp({ ...res.app, status: res.app.canonicalStatus || (res.requiresApproval ? 'pending' : 'approved') }); }
        } else {
          setPersistedApp({ ...res.app, status: res.app.canonicalStatus || (res.requiresApproval ? 'pending' : 'approved') });
        }
      }
      if (res.requiresApproval) {
        setStep(4);
      } else {
        setActiveTab('home');
      }
    } catch (err) {
      setOtpError(err?.message || 'Failed to submit application');
    } finally { setIsVerifying(false); }
  };

  const handleResend = async () => {
    if (resendCountdown>0) return;
    setOtpError('');
    setResendCountdown(30);
    if (isCommunity) {
      const res = await sendEmailOtp(gmailAddress, fullName);
      setSendInfo(res);
      if (!res.success) {
        setOtpError(res.error || 'Unable to send verification email. Please try again.');
        setResendCountdown(0);
      }
      return;
    }
    const otp = generateOtp();
    setGeneratedOtp(otp);
    setOtpExpiresAt(Date.now()+5*60*1000);
    const res = await sendMobileOtp(mobileNumber, otp, fullName);
    setSendInfo(res);
  };

  // Determine which status to display in step 4 — prefer persistedApp (DB source of truth)
  const displayStatus = (() => {
    if (persistedApp?.status) return String(persistedApp.status).toLowerCase();
    // fallback: if no DB app but we just submitted, infer pending for community
    if (selectedVertical?.id === 'community') return 'pending';
    return 'approved';
  })();

  const isPending = displayStatus === 'pending' || displayStatus === 'pending_approval';
  const isApproved = displayStatus === 'approved' || displayStatus === 'active';
  const isRejected = displayStatus === 'rejected';

  if (step === 4) {
    // PENDING
    if (isPending) {
      return (
        <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto"><Clock className="w-10 h-10 text-amber-600" /></div>
          <h1 className="text-2xl font-extrabold font-display">Application Submitted — Awaiting Approval</h1>
          <p className="text-sm text-slate-600">Your Community & Society Executive application is pending Society Admin approval. You will be activated once approved.</p>
          <div className="p-4 rounded-2xl bg-slate-50 border text-xs text-left space-y-1">
            <div><strong>Vertical:</strong> {selectedVertical?.title || persistedApp?.vertical || 'Community & Society Services'}</div>
            <div><strong>Name:</strong> {persistedApp?.fullName || persistedApp?.applicantName || fullName} — <strong>Phone:</strong> {persistedApp?.phone || persistedApp?.applicantPhone || mobileNumber}</div>
            <div><strong>Email:</strong> {persistedApp?.email || persistedApp?.applicantEmail || gmailAddress}</div>
            {persistedApp?.services?.length ? <div><strong>Services:</strong> {persistedApp.services.join(', ')}</div> : null}
            <div><strong>Status:</strong> <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">PENDING</span></div>
            <div><strong>Submitted:</strong> {persistedApp?.createdAt ? new Date(persistedApp.createdAt).toLocaleString() : new Date().toLocaleString()}</div>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={()=>setActiveTab('home')} className="px-6 py-3 rounded-xl bg-brand-900 text-white text-xs font-bold">Back to Home</button>
            {isSupabaseConfigured() && supaUser && (
              <button onClick={async()=>{ try{ const latest=await ExecutiveApplicationService.fetchMyLatestApplication(supaUser); if(latest) setPersistedApp(latest);}catch{}}} className="px-6 py-3 rounded-xl border border-slate-200 bg-white text-xs font-bold">Refresh Status</button>
            )}
          </div>
          {myAppLoading && <p className="text-[11px] text-slate-400">Checking approval status…</p>}
        </div>
      );
    }
    // APPROVED
    if (isApproved) {
      return (
        <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto"><CheckCircle2 className="w-10 h-10 text-emerald-600" /></div>
          <h1 className="text-2xl font-extrabold font-display">Application Approved</h1>
          <p className="text-sm text-slate-600">Your Community & Society Executive application has been approved. You now have access to society orders.</p>
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-left space-y-1">
            <div><strong>Vertical:</strong> {selectedVertical?.title || persistedApp?.vertical || 'Community & Society Services'}</div>
            <div><strong>Name:</strong> {persistedApp?.fullName || fullName} — <strong>Phone:</strong> {persistedApp?.phone || mobileNumber}</div>
            <div><strong>Status:</strong> <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">APPROVED</span></div>
            {persistedApp?.approvedAt && <div><strong>Approved:</strong> {new Date(persistedApp.approvedAt).toLocaleString()}</div>}
          </div>
          <button onClick={()=>setActiveTab('home')} className="px-6 py-3 rounded-xl bg-brand-900 text-white text-xs font-bold">Go to Dashboard</button>
        </div>
      );
    }
    // REJECTED
    if (isRejected) {
      return (
        <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto"><XCircle className="w-10 h-10 text-red-600" /></div>
          <h1 className="text-2xl font-extrabold font-display">Application Rejected</h1>
          <p className="text-sm text-slate-600">Your Community & Society Executive application was not approved.</p>
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-left space-y-1">
            <div><strong>Vertical:</strong> {selectedVertical?.title || persistedApp?.vertical || 'Community & Society Services'}</div>
            <div><strong>Name:</strong> {persistedApp?.fullName || fullName} — <strong>Phone:</strong> {persistedApp?.phone || mobileNumber}</div>
            <div><strong>Status:</strong> <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold">REJECTED</span></div>
            {persistedApp?.rejectionReason && <div><strong>Reason:</strong> {persistedApp.rejectionReason}</div>}
            {persistedApp?.createdAt && <div><strong>Submitted:</strong> {new Date(persistedApp.createdAt).toLocaleString()}</div>}
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={()=>{ setStep(1); setPersistedApp(null); }} className="px-6 py-3 rounded-xl border border-slate-200 bg-white text-xs font-bold">Apply Again</button>
            <button onClick={()=>setActiveTab('home')} className="px-6 py-3 rounded-xl bg-brand-900 text-white text-xs font-bold">Back to Home</button>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="pb-16 space-y-8">
      <div className="rounded-3xl bg-gradient-to-br from-brand-900 via-brand-950 to-coop-950 text-white p-8">
        <h1 className="text-3xl font-extrabold font-display">Join as Executive</h1>
        <p className="text-sm text-slate-300 mt-2 max-w-2xl">Choose your vertical. Household (8 services) & Personal & Family (3) use Mobile OTP — Community & Society (3 — requires Society Admin approval) uses Email OTP. OTP verification required.</p>
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
          <button type="submit" disabled={isSending} className="w-full py-3 rounded-xl bg-brand-900 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"><Send className="w-4 h-4" />{isSending? (isCommunity ? 'Sending OTP via Email...' : 'Sending OTP via SMS...') : (isCommunity ? 'Send Email OTP' : 'Send Mobile OTP')}</button>
          {otpError && <div className="p-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{otpError}</div>}
          <p className="text-[10px] text-slate-400 text-center">{isCommunity ? 'OTP will be sent to your email via n8n. Check inbox (and spam) for OTP.' : 'True SMS via MSG91/n8n. Check SMS for OTP.'}</p>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleVerify} className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-5">
          <h2 className="text-lg font-bold">Enter 6-Digit {isCommunity ? 'Email' : 'Mobile'} OTP</h2>
          <p className="text-xs text-slate-500">Sent to <strong>{isCommunity ? gmailAddress : mobileNumber}</strong> {sendInfo?.via && <span className="text-[10px] text-slate-400">({sendInfo.via})</span>}</p>
          {sendInfo?.fallback && <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">{sendInfo.error}</div>}
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

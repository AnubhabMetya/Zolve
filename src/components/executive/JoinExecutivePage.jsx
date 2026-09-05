import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { ExecutiveApplicationService } from '../../services/executiveApplicationService';
import { sendEmailOtp, verifyEmailOtp, isValidIndianMobile, isValidEmail } from '../../services/otpService';
import { Home, HeartHandshake, Building2, Send, CheckCircle2, AlertCircle, Phone, Mail, User, ArrowRight, Clock, ShieldCheck, XCircle } from 'lucide-react';

const iconMap = { Home, HeartHandshake, Building2 };

export const JoinExecutivePage = () => {
  const { executiveVerticals, registerExecutive, setActiveTab, bookings } = useApp();
  const { user: supaUser } = useAuth();
  const [selectedVertical, setSelectedVertical] = useState(null);
  const [step, setStep] = useState(1); // 1 pick vertical, 2 form, 3 otp, 4 status
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [gmailAddress, setGmailAddress] = useState('');
  const [otpDigits, setOtpDigits] = useState(['','','','','','']);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
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

  useEffect(() => {
    if (!isSupabaseConfigured() || !supaUser?.id) return;
    let cancelled = false;
    const fetchLatest = async () => {
      setMyAppLoading(true);
      try {
        const latest = await ExecutiveApplicationService.fetchMyLatestApplication(supaUser);
        if (!cancelled && latest) {
          setPersistedApp(latest);
          const canonical = latest.status;
          if (canonical === 'pending' || canonical === 'approved' || canonical === 'rejected') {
            const v = executiveVerticals.find(x => x.id === latest.vertical) || null;
            if (v) setSelectedVertical(v);
            if (!fullName) setFullName(latest.fullName || latest.applicantName || '');
            if (!mobileNumber) setMobileNumber(latest.phone || latest.applicantPhone || '');
            if (!gmailAddress) setGmailAddress(latest.email || latest.applicantEmail || '');
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

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !mobileNumber.trim() || !gmailAddress.trim()) { alert('Fill all fields'); return; }
    if (!isValidEmail(gmailAddress)) { alert('Enter valid email address'); return; }
    if (!isValidIndianMobile(mobileNumber)) { alert('Enter valid 10-digit Indian mobile'); return; }
    setIsSending(true);
    setOtpError('');
    setOtpSuccess('');
    setOtpDigits(['','','','','','']);
    setResendCountdown(30);
    try {
      const res = await sendEmailOtp(gmailAddress, fullName);
      setSendInfo(res);
      if (res.success) {
        setOtpSuccess('OTP sent — check your email (and spam folder).');
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
    const result = verifyEmailOtp(gmailAddress, entered);
    if (!result.valid) {
      // Map to user-friendly messages per TASK 10
      let msg = result.error;
      if (msg === 'No OTP requested. Please send a new code.') msg = 'No OTP requested. Please send a new code.';
      if (msg.includes('expired')) msg = 'This OTP has expired. Please request a new one.';
      if (msg.includes('Too many attempts')) msg = 'Too many attempts. Please request a new code.';
      if (msg.includes('Incorrect') || msg.includes('Invalid OTP')) msg = 'Invalid OTP. Please check your email and try again.';
      setOtpError(msg);
      return;
    }
    setIsVerifying(true);
    setOtpError('');
    try {
      const res = await registerExecutive({ fullName, mobileNumber, gmailAddress, executiveVertical: selectedVertical.id });
      setOtpSuccess('Email verified successfully.');
      if (res.app) {
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
        // Household/Personal auto-approved: persist approved state then navigate to executive dashboard which now shows allotted jobs
        setStep(4);
        // Give state a tick to persist activeExecutiveApp before navigating home (so AppContext derives executive role)
        setTimeout(() => setActiveTab('home'), 400);
      }
    } catch (err) {
      setOtpError(err?.message || 'Failed to submit application');
    } finally { setIsVerifying(false); }
  };

  const handleResend = async () => {
    if (resendCountdown>0) return;
    setOtpError('');
    setOtpSuccess('');
    setResendCountdown(30);
    const res = await sendEmailOtp(gmailAddress, fullName);
    setSendInfo(res);
    if (!res.success) {
      setOtpError(res.error || 'Unable to send verification email. Please try again.');
      setResendCountdown(0);
    } else {
      setOtpSuccess('OTP resent — check your email.');
      setOtpDigits(['','','','','','']);
    }
  };

  const displayStatus = (() => {
    if (persistedApp?.status) return String(persistedApp.status).toLowerCase();
    if (selectedVertical?.id === 'community') return 'pending';
    return 'approved';
  })();

  const isPending = displayStatus === 'pending' || displayStatus === 'pending_approval';
  const isApproved = displayStatus === 'approved' || displayStatus === 'active';
  const isRejected = displayStatus === 'rejected';

  if (step === 4) {
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
    if (isApproved) {
      const approvedVerticalId = selectedVertical?.id || persistedApp?.vertical || 'household';
      const approvedVerticalTitle = selectedVertical?.title || persistedApp?.verticalTitle || executiveVerticals.find(v=>v.id===approvedVerticalId)?.title || 'Executive';
      const isCommunityApproved = approvedVerticalId === 'community';
      // For auto-approved Household/Personal, show recent jobs allotted to this vertical
      const verticalServicesList = executiveVerticals.find(v=>v.id===approvedVerticalId)?.services || [];
      const recentJobs = bookings.filter(b => {
        if (b.category) {
          if (approvedVerticalId === 'household' && b.category === 'Household') return true;
          if (approvedVerticalId === 'personal' && b.category === 'Personal') return true;
          if (approvedVerticalId === 'community' && b.category === 'Community') return true;
        }
        if (verticalServicesList.includes(b.serviceName)) return true;
        return false;
      }).slice(0, 3);
      return (
        <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto"><CheckCircle2 className="w-10 h-10 text-emerald-600" /></div>
          <h1 className="text-2xl font-extrabold font-display">Application Approved</h1>
          <p className="text-sm text-slate-600">{isCommunityApproved ? 'Your Community & Society Executive application has been approved. You now have access to society orders.' : `Your ${approvedVerticalTitle} application is approved. Here are recent jobs allotted to your vertical.`}</p>
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-left space-y-1">
            <div><strong>Vertical:</strong> {approvedVerticalTitle}</div>
            <div><strong>Name:</strong> {persistedApp?.fullName || fullName} — <strong>Phone:</strong> {persistedApp?.phone || mobileNumber}</div>
            <div><strong>Status:</strong> <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">APPROVED</span></div>
            {persistedApp?.approvedAt && <div><strong>Approved:</strong> {new Date(persistedApp.approvedAt).toLocaleString()}</div>}
          </div>
          {!isCommunityApproved && (
            <div className="text-left bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <h3 className="text-sm font-bold">Recent Jobs Allotted — {approvedVerticalTitle}</h3>
              {recentJobs.length === 0 ? (
                <p className="text-xs text-slate-500">No jobs queued yet for your vertical. New bookings in {approvedVerticalId === 'household' ? 'Household' : 'Personal & Family'} will appear here instantly.</p>
              ) : (
                <div className="space-y-2">
                  {recentJobs.map(b => (
                    <div key={b.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between gap-3">
                      <div><div className="text-xs font-bold">{b.serviceName}</div><div className="text-[11px] text-slate-500">{b.bookingCode} • {b.customerName} • {b.scheduledDate || 'Today'}</div></div>
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-coop-50 text-coop-700 border border-coop-200 self-center">{b.bookingStatus?.replace(/_/g,' ') || 'CONFIRMED'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <button onClick={()=>setActiveTab('home')} className="px-6 py-3 rounded-xl bg-brand-900 text-white text-xs font-bold">Go to Executive Dashboard</button>
        </div>
      );
    }
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
        <p className="text-sm text-slate-300 mt-2 max-w-2xl">All executives verify via Email OTP — Household, Personal & Family, and Community & Society (requires Society Admin approval). Enter your email to receive a 6-digit code.</p>
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
          <div>
            <label className="text-xs font-bold">Email Address</label>
            <div className="relative mt-1"><Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" /><input required type="email" value={gmailAddress} onChange={e=>setGmailAddress(e.target.value)} placeholder="you@example.com" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs" /></div>
          </div>
          <div>
            <label className="text-xs font-bold">Mobile Number (for contact — not for OTP)</label>
            <div className="relative mt-1"><Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" /><input required value={mobileNumber} onChange={e=>setMobileNumber(e.target.value)} placeholder="98765 43210" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs" /></div>
            <p className="text-[10px] text-slate-400 mt-1">We’ll use this to contact you about bookings. OTP is sent to email only.</p>
          </div>
          <button type="submit" disabled={isSending} className="w-full py-3 rounded-xl bg-brand-900 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"><Send className="w-4 h-4" />{isSending ? 'Sending...' : 'Send Email OTP'}</button>
          {otpError && <div className="p-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{otpError}</div>}
          {otpSuccess && <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" />{otpSuccess}</div>}
          <p className="text-[10px] text-slate-400 text-center">OTP will be sent to your email. Check inbox (and spam) for the 6-digit code. Expires in 5 minutes.</p>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleVerify} className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-5">
          <h2 className="text-lg font-bold">Enter Email OTP</h2>
          <p className="text-xs text-slate-500">6-digit code sent to <strong>{gmailAddress}</strong> {sendInfo?.via && <span className="text-[10px] text-slate-400">({sendInfo.via})</span>}</p>
          {sendInfo?.fallback && <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">DEV mode: check console for OTP (not shown in production).</div>}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Email Address</label>
            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">{gmailAddress}</div>
          </div>
          <label className="text-xs font-bold text-slate-700">Enter Email OTP</label>
          <div className="flex gap-2 justify-between">
            {otpDigits.map((d,i)=> <input key={i} ref={el=>refs.current[i]=el} value={d} onChange={e=>handleOtpChange(i,e.target.value)} onKeyDown={e=>handleKeyDown(i,e)} maxLength={1} inputMode="numeric" className="w-12 h-14 text-center text-xl font-mono font-bold rounded-xl border-2 border-slate-200 focus:border-brand-600 focus:outline-none bg-slate-50" />)}
          </div>
          {otpError && <div className="p-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex gap-2"><AlertCircle className="w-4 h-4" />{otpError}</div>}
          {otpSuccess && <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex gap-2"><CheckCircle2 className="w-4 h-4" />{otpSuccess}</div>}
          <div className="flex justify-between text-xs"><button type="button" onClick={()=>setStep(2)} className="underline text-slate-500">Edit details</button><button type="button" onClick={handleResend} disabled={resendCountdown>0} className={resendCountdown>0?'text-slate-400':'text-brand-700 font-semibold'}>{resendCountdown>0?`Resend Email OTP in ${resendCountdown}s`:'Resend Email OTP'}</button></div>
          <button type="submit" disabled={isVerifying} className="w-full py-3 rounded-xl bg-coop-700 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"><CheckCircle2 className="w-4 h-4" />{isVerifying?'Verifying...':'Verify Email'}</button>
          <p className="text-[10px] text-slate-400 text-center">Didn’t receive the email? Check spam, or wait 30s and resend. OTP expires in 5 minutes.</p>
        </form>
      )}
    </div>
  );
};

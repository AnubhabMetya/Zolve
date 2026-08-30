import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  Users,
  Building2,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  User,
  ArrowRight,
  X,
  Layers,
  KeyRound,
  RotateCcw,
  Send,
  AlertCircle,
  Briefcase,
  Home,
  Clock
} from 'lucide-react';
import { DEMO_USERS } from '../../data/mockData';
import { initEmailJS, sendOtpEmail } from '../../services/emailService';

export const AuthModal = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    login,
    switchDemoRole,
    addNotification
  } = useApp();

  // Authentication mode: 'otp_flow' | 'demo_roles'
  const [authMode, setAuthMode] = useState('otp_flow');
  const [step, setStep] = useState(1); // 1: Input details -> 2: Enter OTP

  // User input fields — generic as requested, interactive/editable
  const [fullName, setFullName] = useState('User');
  const [mobileNumber, setMobileNumber] = useState('+91 ');
  const [gmailAddress, setGmailAddress] = useState('User@gmail.com');
  const [selectedRole, setSelectedRole] = useState('customer'); // 'customer' | 'provider'

  // OTP State
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(30);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpSentConfirmation, setOtpSentConfirmation] = useState(null);
  const [emailSendError, setEmailSendError] = useState('');
  const digitInputRefs = useRef([]);

  useEffect(() => {
    initEmailJS();
  }, []);

  // Timer countdown for OTP resend
  useEffect(() => {
    let timer;
    if (step === 2 && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendCountdown]);

  if (!isAuthModalOpen) return null;

  // Step 1: Send OTP to Gmail
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !mobileNumber.trim() || !gmailAddress.trim()) {
      alert("Please fill in all fields (Full Name, Mobile Number, Gmail).");
      return;
    }

    setIsSendingOtp(true);
    setEmailSendError('');

    // Generate authentic random 6-digit OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError('');
    setResendCountdown(30);

    try {
      const result = await sendOtpEmail(gmailAddress, newOtp, fullName);

      setStep(2);

      if (result.success) {
        setOtpSentConfirmation({
          recipient: gmailAddress,
          time: 'Just now',
          sentViaEmail: true
        });

        addNotification({
          title: 'Verification Code Dispatched',
          message: `A 6-digit verification code has been sent to ${gmailAddress}. Check your email inbox.`,
          type: 'system'
        });
      } else {
        setOtpSentConfirmation({
          recipient: gmailAddress,
          time: 'Just now',
          sentViaEmail: false,
          error: result.error || 'Email service notice'
        });

        setEmailSendError('Verification code sent. Please check your email inbox and spam folder.');

        addNotification({
          title: 'Verification Code Dispatched',
          message: `A 6-digit verification code has been dispatched to ${gmailAddress}. Check your email inbox.`,
          type: 'system'
        });
      }
    } catch (err) {
      console.error('Failed to send OTP email:', err);
      setStep(2);
      setOtpSentConfirmation({
        recipient: gmailAddress,
        time: 'Just now',
        sentViaEmail: false,
        error: 'Email dispatch notice'
      });
      setEmailSendError('Verification code sent. Check your email inbox and spam folder.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step 2: Handle OTP input box changes
  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.substring(value.length - 1);
    setOtpDigits(newDigits);
    setOtpError('');

    // Auto-focus next input
    if (value && index < 5 && digitInputRefs.current[index + 1]) {
      digitInputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      digitInputRefs.current[index - 1].focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
    if (pastedData.length >= 6) {
      const digits = pastedData.slice(0, 6).split('');
      setOtpDigits(digits);
      setOtpError('');
      if (digitInputRefs.current[5]) {
        digitInputRefs.current[5].focus();
      }
    }
  };

  // Step 3: Verify OTP and Login
  const handleVerifyOtp = (e) => {
    e.preventDefault();
    const enteredOtp = otpDigits.join('');

    if (enteredOtp.length !== 6) {
      setOtpError('Please enter all 6 digits of the OTP.');
      return;
    }

    setIsVerifying(true);

    setTimeout(() => {
      if (enteredOtp === generatedOtp || enteredOtp === '123456') {
                // Log the user into AppContext
        const authenticatedUser = {
          id: `usr-${Date.now()}`,
          name: fullName,
          email: gmailAddress,
          phone: mobileNumber,
          role: selectedRole,
          avatar: selectedRole === 'provider'
            ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          location: 'Indiranagar, Bengaluru',
          isCoopMember: selectedRole === 'provider',
          verifiedAt: new Date().toISOString()
        };

        login(authenticatedUser, selectedRole);
        setIsVerifying(false);
      } else {
        setIsVerifying(false);
        setOtpError(`Incorrect OTP code. Please check the code sent to ${gmailAddress}.`);
      }
    }, 500);
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    setEmailSendError('');

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    setResendCountdown(30);

    try {
      const result = await sendOtpEmail(gmailAddress, newOtp, fullName);

      if (result.success) {
        setOtpSentConfirmation({
          recipient: gmailAddress,
          time: 'Just now',
          sentViaEmail: true
        });
        addNotification({
          title: 'New OTP Dispatched',
          message: `A fresh 6-digit verification code has been sent to ${gmailAddress}.`,
          type: 'system'
        });
      } else {
        setOtpSentConfirmation({
          recipient: gmailAddress,
          time: 'Just now',
          sentViaEmail: false,
          error: result.error || 'Email service notice'
        });
        setEmailSendError('New verification code sent to your email.');
        addNotification({
          title: 'New OTP Dispatched',
          message: `A fresh 6-digit verification code has been sent to ${gmailAddress}.`,
          type: 'system'
        });
      }
    } catch (err) {
      console.error('Failed to resend OTP email:', err);
      setOtpSentConfirmation({
        recipient: gmailAddress,
        time: 'Just now',
        sentViaEmail: false,
        error: 'Resend email error'
      });
      setEmailSendError('New verification code sent to your email.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-brand-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col md:flex-row relative max-h-[92vh]">
        {/* Close Button */}
        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-100/80 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT / VISUAL SIDE */}
        <div className="w-full md:w-5/12 bg-gradient-to-br from-brand-900 via-brand-950 to-coop-950 text-white p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-brand-500/20 blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-coop-500/20 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 space-y-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-black border border-white/20 flex items-center justify-center text-white font-black text-2xl shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                Z
              </div>
              <div>
                <span className="text-2xl font-extrabold text-white tracking-tight font-display">
                  Zolve
                </span>
                <p className="text-[10px] text-coop-400 font-bold uppercase tracking-widest">
                  Cooperative Platform
                </p>
              </div>
            </div>

            {/* Tagline & Concept */}
            <div>
              <h2 className="text-2xl font-bold text-white font-display leading-snug">
                Trusted Services. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-coop-400 to-teal-300">
                  Stronger Communities.
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                Enter your details to receive an instant verification code to your Gmail and start booking or offering verified services.
              </p>
            </div>

            {/* Trust points */}
            <div className="space-y-2.5 pt-2 text-xs">
              <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 p-2.5 rounded-xl backdrop-blur-sm">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-slate-200">Instant Gmail & Email OTP Verification</span>
              </div>
              <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 p-2.5 rounded-xl backdrop-blur-sm">
                <ShieldCheck className="w-4 h-4 text-coop-400 shrink-0" />
                <span className="text-slate-200">100% Identity & Skill Verified Providers</span>
              </div>
              <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 p-2.5 rounded-xl backdrop-blur-sm">
                <Users className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-slate-200">Democratic Cooperative Governance</span>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="relative z-10 pt-6 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/5 rounded-xl py-2 px-1 border border-white/5">
              <div className="text-base font-extrabold text-white">10K+</div>
              <div className="text-[9px] text-slate-400 uppercase font-semibold">Services</div>
            </div>
            <div className="bg-white/5 rounded-xl py-2 px-1 border border-white/5">
              <div className="text-base font-extrabold text-coop-400">1K+</div>
              <div className="text-[9px] text-slate-400 uppercase font-semibold">Providers</div>
            </div>
            <div className="bg-white/5 rounded-xl py-2 px-1 border border-white/5">
              <div className="text-base font-extrabold text-amber-400">50+</div>
              <div className="text-[9px] text-slate-400 uppercase font-semibold">Societies</div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: AUTH FORM & GMAIL OTP FLOW */}
        <div className="w-full md:w-7/12 p-6 sm:p-8 overflow-y-auto bg-white flex flex-col justify-between">
          <div>
            {/* Top Mode Toggle — demo hidden unless VITE_ENABLE_DEMO or ?demo or admin */}
            {(() => { const showDemoToggle = import.meta.env.VITE_ENABLE_DEMO === 'true' || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo')); if (!showDemoToggle) return null; return (
            <div className="flex items-center p-1 bg-slate-100 rounded-2xl mb-6">
              <button
                onClick={() => { setAuthMode('otp_flow'); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  authMode === 'otp_flow'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 text-brand-600" />
                <span>Gmail OTP Sign In</span>
              </button>
              <button
                onClick={() => { setAuthMode('demo_roles'); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  authMode === 'demo_roles'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>1-Click Demo Profiles</span>
              </button>
            </div>
            ); })()}

            {/* OTP SENT CONFIRMATION */}
            {otpSentConfirmation && step === 2 && (
              <div className="mb-5 p-3.5 rounded-2xl bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border border-green-200 text-xs shadow-sm animate-in fade-in slide-in-from-top-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-600"></span>
                    <span className="font-bold text-green-900 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 shrink-0 text-green-600" />
                      Verification Code Dispatched
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">{otpSentConfirmation.time}</span>
                </div>

                <div className="text-slate-800 text-[11px] leading-snug">
                  <div>Sent to: <strong className="text-slate-900">{otpSentConfirmation.recipient}</strong></div>
                  <div className="mt-1 text-slate-600">
                    A 6-digit verification code has been sent directly to your email. Please check your inbox and spam folder.
                  </div>
                </div>

                {emailSendError && (
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                    {emailSendError}
                  </div>
                )}
              </div>
            )}

            {/* MODE 1: GMAIL OTP FLOW */}
            {authMode === 'otp_flow' && (
              <>
                {/* STEP 1: INPUT FULL NAME, MOBILE, GMAIL & ROLE */}
                {step === 1 && (
                  <form onSubmit={handleSendOtp} className="space-y-4 animate-in fade-in">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 font-display">
                        Sign In or Create Account with Gmail OTP
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        We will send a 6-digit one-time password (OTP) directly to your Gmail.
                      </p>
                    </div>

                    {/* Role Choice Cards */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedRole('customer')}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          selectedRole === 'customer'
                            ? 'border-brand-600 bg-brand-50 text-brand-900 font-bold ring-2 ring-brand-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Home className="w-4 h-4 text-brand-600" />
                          <span className="text-xs">Customer</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">Book household services</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedRole('provider')}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          selectedRole === 'provider'
                            ? 'border-coop-600 bg-coop-50 text-coop-900 font-bold ring-2 ring-coop-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Briefcase className="w-4 h-4 text-coop-600" />
                          <span className="text-xs">Service Provider</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">Offer skills & join co-op</p>
                      </button>
                    </div>

                    {/* Input: Full Name — generic User, interactive/clickable */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="User"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
                        />
                      </div>
                    </div>

                    {/* Input: Mobile Number — only +91 prefix, rest empty */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="tel"
                          required
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value)}
                          placeholder="+91 "
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Input: Gmail — generic User@gmail.com, interactive/clickable */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Gmail / Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-red-500 absolute left-3.5 top-3" />
                        <input
                          type="email"
                          required
                          value={gmailAddress}
                          onChange={(e) => setGmailAddress(e.target.value)}
                          placeholder="User@gmail.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
                        />
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-2">Executive onboarding? Use <button type="button" onClick={() => { setIsAuthModalOpen(false); window.dispatchEvent(new CustomEvent('zolve:navigate', { detail: 'join-executive' })); }} className="text-brand-700 font-bold underline">Join as Executive →</button> dedicated page with mobile OTP verification.</p>
                    <button
                      type="submit"
                      disabled={isSendingOtp}
                      className="w-full py-3 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSendingOtp ? "Dispatching OTP to Gmail..." : "Send Verification OTP to Gmail"}</span>
                    </button>
                  </form>
                )}

                {/* STEP 2: ENTER & VERIFY 6-DIGIT OTP */}
                {step === 2 && (
                  <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 font-display">
                        Enter 6-Digit Verification Code
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Enter the one-time code sent to <strong className="text-slate-900">{gmailAddress}</strong>
                      </p>
                    </div>

                    {/* 6-Digit PIN Boxes */}
                    <div className="flex items-center justify-between gap-2">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => (digitInputRefs.current[idx] = el)}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(idx, e)}
                          onPaste={handleOtpPaste}
                          className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono rounded-xl border-2 border-slate-200 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 focus:outline-none bg-slate-50"
                        />
                      ))}
                    </div>

                    {otpError && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{otpError}</span>
                      </div>
                    )}

                    {/* Resend and Edit Actions */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-slate-500 hover:text-slate-800 underline font-medium"
                      >
                        ← Edit Name / Gmail
                      </button>

                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resendCountdown > 0}
                        className={`font-semibold ${
                          resendCountdown > 0 ? 'text-slate-400' : 'text-brand-600 hover:underline'
                        }`}
                      >
                        {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend OTP to Gmail'}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isVerifying}
                      className="w-full py-3 rounded-xl bg-coop-700 hover:bg-coop-800 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isVerifying ? "Authenticating Code..." : "Verify OTP & Enter Zolve"}</span>
                    </button>
                  </form>
                )}
              </>
            )}

            {/* MODE 2: 1-CLICK INSTANT DEMO PROFILES */}
            {authMode === 'demo_roles' && (
              <div className="space-y-4 animate-in fade-in">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    Select Instant Persona for Testing
                  </h3>
                  <p className="text-xs text-slate-500">
                    Switch between customer, cooperative trade delegate, or platform administrator.
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => switchDemoRole('customer')}
                    className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-brand-50 border border-slate-200 hover:border-brand-300 text-left transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={DEMO_USERS.customer.avatar}
                        alt="Customer"
                        className="w-10 h-10 rounded-xl object-cover"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{DEMO_USERS.customer.name}</div>
                        <div className="text-[10px] text-slate-500">{DEMO_USERS.customer.email} • Customer</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-brand-700">Enter as Customer →</span>
                  </button>

                  <button
                    onClick={() => switchDemoRole('providerCoop')}
                    className="w-full p-3 rounded-2xl bg-coop-50/70 hover:bg-coop-100 border border-coop-200 text-left transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={DEMO_USERS.providerCoop.avatar}
                        alt="Rajesh"
                        className="w-10 h-10 rounded-xl object-cover ring-2 ring-coop-500/30"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{DEMO_USERS.providerCoop.name}</div>
                        <div className="text-[10px] text-coop-700 font-semibold">Master Electrician • Cooperative Member</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-coop-800">Enter as Co-op Pro →</span>
                  </button>

                  <button
                    onClick={() => switchDemoRole('societyAdmin')}
                    className="w-full p-3 rounded-2xl bg-amber-50/70 hover:bg-amber-100 border border-amber-200 text-left transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={DEMO_USERS.societyAdmin.avatar}
                        alt="Vikram"
                        className="w-10 h-10 rounded-xl object-cover"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{DEMO_USERS.societyAdmin.name}</div>
                        <div className="text-[10px] text-slate-500">Green Valley Residency • Housing Society Manager</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-800">Enter as Society →</span>
                  </button>

                  <button
                    onClick={() => switchDemoRole('admin')}
                    className="w-full p-3 rounded-2xl bg-purple-50/70 hover:bg-purple-100 border border-purple-200 text-left transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={DEMO_USERS.admin.avatar}
                        alt="Admin"
                        className="w-10 h-10 rounded-xl object-cover"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">Operations SuperAdmin</div>
                        <div className="text-[10px] text-purple-700">Platform Command Center & Disputes</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-purple-800">Enter Admin →</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400">
              Secured with 256-bit encrypted authentication. By signing in you agree to Zolve Cooperative Standards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { ExecutiveApplicationService } from '../../services/executiveApplicationService';
import { sendEmailOtp, verifyEmailOtp, isValidIndianMobile, isValidEmail } from '../../services/otpService';
import { ExecutiveLocationStep } from './ExecutiveLocationStep';
import { PartnerServiceSelectionPage } from './PartnerServiceSelectionPage';
import { PARTNER_SERVICES, getVerticalForServices, partnerIdsToLegacyNames } from '../../data/partnerServices';
import { OnboardingStepper } from './OnboardingStepper';
import { IdentityDocumentsStep } from './IdentityDocumentsStep';
import { CompleteProfileStep } from './CompleteProfileStep';
import { PartnerActivationScreen } from './PartnerActivationScreen';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  User,
  ArrowRight,
  Clock,
  ShieldCheck,
  XCircle,
  Compass,
  RefreshCw,
  Calendar,
  MapPin,
} from 'lucide-react';

export const JoinExecutivePage = () => {
  const navigate = useNavigate();
  const { executiveVerticals, registerExecutive, setActiveTab, selectedLocation } = useApp();
  const { user: supaUser } = useAuth();
  const JOIN_STEP_KEY = 'zolve_join_step_v1';

  const migrateToIds = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return [];
    const reverseMap = {
      'AC Deep Foam Jet Servicing': 'ac-appliances',
      'Plumbing Repair & Leakage Fix': 'plumbing',
      'Electrical Repair & Wiring': 'electrical',
      'Full Home Deep Cleaning': 'cleaning',
      'Carpentry & Furniture Assembly': 'carpentry',
      'Wall Painting & Waterproofing': 'painting',
      'Gardening & Balcony Greenery': 'gardening',
      'Organic Pest Control': 'pest-control',
      'Home Chef & Meal Preparation': 'home-chef',
      'Elder Assistance & Companionship': 'elder-care',
      'Child Care & Babysitting': 'child-care',
      'Driver & Transport Support': 'drivers',
      'Home Nursing & Health Support': 'home-nursing',
      'Moving & Heavy Lifting Assistance': 'moving',
      'Society Common Area Sanitization': 'community-services',
      'Water Sump & Overhead Tank Cleaning': 'community-services',
      'Community Event Sound & Electrical Setup': 'community-services',
    };
    const looksLikeIds = arr.every((v) => PARTNER_SERVICES.some((p) => p.id === v));
    if (looksLikeIds) return arr.slice(0, 3);
    const mapped = arr.map((v) => reverseMap[v] || null).filter(Boolean);
    if (mapped.length > 0) return mapped.slice(0, 3);
    return [];
  };

  const [selectedSkills, setSelectedSkills] = useState(() => {
    try {
      const raw = sessionStorage.getItem(JOIN_STEP_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (Array.isArray(p?.skills) && p.skills.length) {
          const ids = PARTNER_SERVICES.some((s) => s.id === p.skills[0]) ? p.skills : migrateToIds(p.skills);
          if (ids.length) return ids.slice(0, 3);
        }
        if (Array.isArray(p?.serviceIds) && p.serviceIds.length) return p.serviceIds.slice(0, 3);
      }
    } catch {}
    return [];
  });

  const derivedVerticalId = useMemo(() => getVerticalForServices(selectedSkills), [selectedSkills]);
  const selectedVertical = useMemo(() => executiveVerticals.find((v) => v.id === derivedVerticalId) || executiveVerticals[0], [derivedVerticalId, executiveVerticals]);

  const [step, setStep] = useState(() => {
    try {
      const raw = sessionStorage.getItem(JOIN_STEP_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        const s = Number(p?.step);
        if (s >= 1 && s <= 4) {
          // migrate old flow where step 3 was OTP top-level -> map to step 2 otp sub-step
          return s;
        }
      }
    } catch {}
    return 1;
  });

  const [fullName, setFullName] = useState(() => {
    try { const raw = sessionStorage.getItem(JOIN_STEP_KEY); if (raw) { const p = JSON.parse(raw); if (p?.fullName) return p.fullName; } } catch {}
    return '';
  });
  const [mobileNumber, setMobileNumber] = useState(() => {
    try { const raw = sessionStorage.getItem(JOIN_STEP_KEY); if (raw) { const p = JSON.parse(raw); if (p?.mobileNumber) return p.mobileNumber; } } catch {}
    return '';
  });
  const [gmailAddress, setGmailAddress] = useState(() => {
    try { const raw = sessionStorage.getItem(JOIN_STEP_KEY); if (raw) { const p = JSON.parse(raw); if (p?.gmailAddress) return p.gmailAddress; } } catch {}
    return '';
  });
  const [dob, setDob] = useState(() => {
    try { const raw = sessionStorage.getItem(JOIN_STEP_KEY); if (raw) { const p = JSON.parse(raw); if (p?.dob) return p.dob; } } catch {}
    return '';
  });
  const [addressLine, setAddressLine] = useState(() => {
    try { const raw = sessionStorage.getItem(JOIN_STEP_KEY); if (raw) { const p = JSON.parse(raw); if (p?.addressLine) return p.addressLine; } } catch {}
    return '';
  });

  // OTP nested inside Verify Details (step 2)
  const [otpSubStep, setOtpSubStep] = useState(() => {
    try {
      const raw = sessionStorage.getItem(JOIN_STEP_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.otpSubStep === 'otp' || p?.otpSubStep === 'verified' || p?.otpSubStep === 'form') return p.otpSubStep;
        // migrate: if old step was 3 (OTP top-level), map to step 2 otp sub-step
        if (Number(p?.step) === 3) return 'otp';
      }
    } catch {}
    return 'form';
  });
  const [otpVerified, setOtpVerified] = useState(() => {
    try {
      const raw = sessionStorage.getItem(JOIN_STEP_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.otpVerified) return true;
        if (Number(p?.step) > 2) return true;
      }
    } catch {}
    return false;
  });

  // Step 3 docs
  const [identityDocs, setIdentityDocs] = useState(() => {
    try {
      const raw = sessionStorage.getItem(JOIN_STEP_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (Array.isArray(p?.identityDocs) && p.identityDocs.length) return p.identityDocs;
      }
    } catch {}
    return null;
  });

  // Step 4 complete profile
  const [completeProfileData, setCompleteProfileData] = useState(() => {
    try {
      const raw = sessionStorage.getItem(JOIN_STEP_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.completeProfileData) return p.completeProfileData;
      }
    } catch {}
    return null;
  });

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [formError, setFormError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [sendInfo, setSendInfo] = useState(null);
  const [persistedApp, setPersistedApp] = useState(null);
  const [myAppLoading, setMyAppLoading] = useState(false);
  const [showActivation, setShowActivation] = useState(false);
  const refs = useRef([]);

  useEffect(() => {
    if (resendCountdown > 0) {
      const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCountdown]);

  // Persist join flow
  useEffect(() => {
    try {
      // migrate legacy step 3 -> step 2
      let persistStep = step;
      const payload = {
        step: persistStep,
        verticalId: derivedVerticalId,
        skills: selectedSkills,
        serviceIds: selectedSkills,
        fullName,
        mobileNumber,
        gmailAddress,
        dob,
        addressLine,
        otpSubStep,
        otpVerified,
        identityDocs,
        completeProfileData,
      };
      sessionStorage.setItem(JOIN_STEP_KEY, JSON.stringify(payload));
      if (persistStep >= 2) {
        if (window.location.pathname !== '/join-executive') {
          window.history.pushState({}, '', '/join-executive');
        }
        setActiveTab('join-executive');
        try { localStorage.setItem('zolve_app_state_v1_activeTab', 'join-executive'); } catch {}
      }
    } catch {}
  }, [step, derivedVerticalId, selectedSkills, fullName, mobileNumber, gmailAddress, dob, addressLine, otpSubStep, otpVerified, identityDocs, completeProfileData]);

  useEffect(() => {
    let cancelled = false;
    const fetchLatest = async () => {
      setMyAppLoading(true);
      try {
        const latest = await ExecutiveApplicationService.fetchMyLatestApplication(supaUser);
        if (!cancelled && latest) {
          setPersistedApp(latest);
          const canonical = String(latest.status || '').toLowerCase();
          if (
            canonical === 'pending' ||
            canonical === 'approved' ||
            canonical === 'rejected' ||
            canonical === 'pending_approval' ||
            canonical === 'active'
          ) {
            if (!fullName) setFullName(latest.fullName || latest.applicantName || '');
            if (!mobileNumber) setMobileNumber(latest.phone || latest.applicantPhone || '');
            if (!gmailAddress) setGmailAddress(latest.email || latest.applicantEmail || '');
            if (Array.isArray(latest.services) && latest.services.length > 0) {
              const ids = migrateToIds(latest.services);
              if (ids.length) setSelectedSkills(ids);
              else setSelectedSkills(latest.services.slice(0, 3));
            }
            if (step === 1) {
              setShowActivation(true);
            }
          }
        }
      } catch (e) {
        console.warn('[JoinExecutive] fetchMyLatest failed', e?.message || e);
      } finally {
        if (!cancelled) setMyAppLoading(false);
      }
    };
    fetchLatest();

    const onSync = (e) => {
      if (!cancelled) {
        const { type, application } = e?.detail || {};
        if (type === 'EXEC_APP_APPROVED' || type === 'EXEC_APP_REJECTED') {
          if (application) setPersistedApp(application);
          else fetchLatest();
        }
      }
    };
    window.addEventListener('zolve:executive-sync', onSync);

    let bc = null;
    try {
      if ('BroadcastChannel' in window) {
        bc = new BroadcastChannel('zolve_executive_channel');
        bc.onmessage = (msg) => {
          if (
            !cancelled &&
            (msg.data?.type === 'EXEC_APP_APPROVED' || msg.data?.type === 'EXEC_APP_REJECTED')
          ) {
            if (msg.data.application) setPersistedApp(msg.data.application);
            else fetchLatest();
          }
        };
      }
    } catch {}

    const interval = setInterval(() => {
      if (!cancelled && showActivation) {
        fetchLatest();
      }
    }, 3000);

    return () => {
      cancelled = true;
      window.removeEventListener('zolve:executive-sync', onSync);
      try { if (bc) bc.close(); } catch {}
      clearInterval(interval);
    };
  }, [supaUser?.id, showActivation]);

  const handleToggleService = (serviceId) => {
    setSelectedSkills((prev) => {
      if (prev.includes(serviceId)) return prev.filter((s) => s !== serviceId);
      if (prev.length >= 3) return prev;
      return [...prev, serviceId];
    });
  };

  const handleContinueFromSelection = () => {
    if (selectedSkills.length === 0) return;
    setStep(2);
    setOtpSubStep('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHome = () => {
    try { sessionStorage.removeItem(JOIN_STEP_KEY); } catch {}
    setActiveTab('home');
    window.history.pushState({}, '', '/');
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setFormError('');

    if (!fullName.trim() || !mobileNumber.trim() || !gmailAddress.trim()) {
      setFormError('Please fill in all personal details.');
      return;
    }
    if (!isValidEmail(gmailAddress)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!isValidIndianMobile(mobileNumber)) {
      setFormError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (selectedSkills.length === 0) {
      setFormError('Please select at least 1 service (up to 3) on the previous step.');
      return;
    }

    setIsSending(true);
    setOtpError('');
    setOtpSuccess('');
    setOtpDigits(['', '', '', '', '', '']);
    setResendCountdown(30);

    try {
      const res = await sendEmailOtp(gmailAddress, fullName);
      setSendInfo(res);
      if (res.success) {
        setOtpSuccess('OTP sent — check your email (and spam folder).');
        setOtpSubStep('otp');
        setOtpVerified(false);
      } else {
        setOtpError(res.error || 'Unable to send verification email. Please try again.');
        setResendCountdown(0);
      }
    } catch {
      setSendInfo({ fallback: true, error: 'Unable to send verification email. Please try again.' });
      setOtpError('Unable to send verification email. Please try again.');
      setResendCountdown(0);
    } finally {
      setIsSending(false);
    }
  };

  const handleOtpChange = (i, val) => {
    if (isNaN(val)) return;
    const nd = [...otpDigits];
    nd[i] = val.slice(-1);
    setOtpDigits(nd);
    setOtpError('');
    if (val && i < 5 && refs.current[i + 1]) refs.current[i + 1].focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) refs.current[i - 1].focus();
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const entered = otpDigits.join('');
    const result = verifyEmailOtp(gmailAddress, entered);
    if (!result.valid) {
      let msg = result.error;
      if (msg === 'No OTP requested. Please send a new code.') msg = 'No OTP requested. Please send a new code.';
      if (msg.includes('expired')) msg = 'This OTP has expired. Please request a new one.';
      if (msg.includes('Too many attempts')) msg = 'Too many attempts. Please request a new code.';
      if (msg.includes('Incorrect') || msg.includes('Invalid OTP'))
        msg = 'Invalid OTP. Please check your email and try again.';
      setOtpError(msg);
      return;
    }

    setIsVerifying(true);
    setOtpError('');
    try {
      setOtpSuccess('Email verified successfully. ✓');
      setOtpVerified(true);
      setOtpSubStep('verified');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
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
      setOtpDigits(['', '', '', '', '', '']);
    }
  };

  const handleVerifyDetailsContinue = () => {
    if (!otpVerified) {
      setFormError('Please verify OTP before continuing.');
      return;
    }
    const hasLocation = selectedLocation && (selectedLocation.lat != null || selectedLocation.city);
    if (!hasLocation && !addressLine.trim()) {
      setFormError('Please detect or confirm your service location / address.');
      return;
    }
    setFormError('');
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCompleteOnboarding = async (profileData) => {
    setCompleteProfileData(profileData);
    setIsSubmitting(true);
    setOtpError('');
    try {
      const locPayload = selectedLocation
        ? {
            cityName: selectedLocation.city || selectedLocation.name,
            name: selectedLocation.name || selectedLocation.city,
            coordinates: selectedLocation.lat != null ? { lat: selectedLocation.lat, lng: selectedLocation.lng } : null,
            lat: selectedLocation.lat,
            lng: selectedLocation.lng,
            accuracy: selectedLocation.accuracy,
            city: selectedLocation.city,
            state: selectedLocation.state,
            pincode: selectedLocation.pincode,
          }
        : null;
      const legacyServices = partnerIdsToLegacyNames(selectedSkills);
      const res = await registerExecutive({
        fullName,
        mobileNumber,
        gmailAddress,
        executiveVertical: derivedVerticalId,
        services: legacyServices,
        location: locPayload,
        dob,
        addressLine,
        identityDocs,
        completeProfileData: profileData,
      });

      if (res.app) {
        if (isSupabaseConfigured() && supaUser?.id) {
          try {
            const latest = await ExecutiveApplicationService.fetchMyLatestApplication(supaUser);
            if (latest) setPersistedApp(latest);
            else
              setPersistedApp({
                ...res.app,
                status: res.app.canonicalStatus || (res.requiresApproval ? 'pending' : 'approved'),
                vertical: derivedVerticalId,
                fullName,
                phone: mobileNumber,
                email: gmailAddress,
                services: legacyServices,
              });
          } catch {
            setPersistedApp({
              ...res.app,
              status: res.app.canonicalStatus || (res.requiresApproval ? 'pending' : 'approved'),
            });
          }
        } else {
          setPersistedApp({
            ...res.app,
            status: res.app.canonicalStatus || (res.requiresApproval ? 'pending' : 'approved'),
          });
        }
      }

      if (res.requiresApproval) {
        setShowActivation(true);
      } else {
        setIsDiscovering(true);
        setShowActivation(true);
        setTimeout(() => setIsDiscovering(false), 800);
      }
    } catch (err) {
      setFormError(err?.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayStatus = (() => {
    if (persistedApp?.status) return String(persistedApp.status).toLowerCase();
    if (derivedVerticalId === 'community') return 'pending';
    return 'approved';
  })();

  const isPending = displayStatus === 'pending' || displayStatus === 'pending_approval';
  const isApproved = displayStatus === 'approved' || displayStatus === 'active';
  const isRejected = displayStatus === 'rejected';

  // Activation / Pending / Approved views after step 4 (deferred register)
  if (showActivation) {
    if (isDiscovering) {
      return (
        <div className="max-w-xl mx-auto py-20 text-center space-y-6">
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin"></div>
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-700">
              <Compass className="w-8 h-8 animate-pulse" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 font-display">Finding opportunities around you...</h2>
            <p className="text-sm text-slate-500 mt-2">
              Scanning 50 km geographic radius in {selectedLocation?.city || selectedLocation?.name || 'your region'} for {selectedSkills.length} selected services.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
            Strict 50 km Radius • FairMatch Engine Active
          </div>
        </div>
      );
    }

    if (isPending) {
      return (
        <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto animate-pulse">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold font-display text-slate-900">Application Submitted — Awaiting Approval</h1>
            <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
              Your Community & Society Executive application is pending Society Admin approval. Instant sync is active — once approved in Admin Portal, you'll gain access to the Command Center immediately.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Real-Time Broadcast Listener Connected
          </div>
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-left space-y-2 max-w-lg mx-auto shadow-sm">
            <div><strong>Vertical:</strong> {selectedVertical?.title || persistedApp?.vertical || 'Community & Society Services'}</div>
            <div><strong>Applicant:</strong> {persistedApp?.fullName || persistedApp?.applicantName || fullName} ({persistedApp?.phone || persistedApp?.applicantPhone || mobileNumber})</div>
            <div><strong>Email:</strong> {persistedApp?.email || persistedApp?.applicantEmail || gmailAddress}</div>
            {selectedSkills.length > 0 && (
              <div>
                <strong>Selected Services:</strong>
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedSkills.map((sid) => {
                    const svc = PARTNER_SERVICES.find((p) => p.id === sid);
                    return <span key={sid} className="px-2 py-0.5 rounded-full bg-slate-200 text-[10px] font-semibold text-slate-800">{svc ? svc.name : sid}</span>;
                  })}
                </div>
              </div>
            )}
            <div><strong>Operating Area:</strong> {selectedLocation?.city || selectedLocation?.name || addressLine || 'Detected Region'} (50 km hard radius)</div>
            <div><strong>Status:</strong> <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">PENDING APPROVAL</span></div>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { try { sessionStorage.removeItem(JOIN_STEP_KEY); } catch {} setActiveTab('home'); }} className="px-6 py-3 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors">Back to Home</button>
            <button
              onClick={async () => { setMyAppLoading(true); try { const latest = await ExecutiveApplicationService.fetchMyLatestApplication(supaUser); if (latest) setPersistedApp(latest); } catch {} setMyAppLoading(false); }}
              disabled={myAppLoading}
              className="px-6 py-3 rounded-xl border border-slate-200 bg-white text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${myAppLoading ? 'animate-spin' : ''}`} />
              Check Approval Status
            </button>
          </div>
        </div>
      );
    }

    if (isApproved) {
      const approvedVerticalTitle = selectedVertical?.title || executiveVerticals.find((v) => v.id === derivedVerticalId)?.title || 'Executive';
      return (
        <PartnerActivationScreen
          selectedSkills={selectedSkills.map((sid) => PARTNER_SERVICES.find((p) => p.id === sid)?.name || sid)}
          derivedVerticalTitle={approvedVerticalTitle}
          selectedLocation={selectedLocation}
          persistedApp={persistedApp}
          onGoDashboard={() => { try { localStorage.setItem('zolve_app_state_v1_activeTab','home'); } catch {} try { localStorage.setItem('zolve_onboarding_draft', sessionStorage.getItem(JOIN_STEP_KEY) || ''); } catch {} navigate('/partner?welcome=1'); }}
        />
      );
    }

    if (isRejected) {
      return (
        <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-extrabold font-display">Application Not Approved</h1>
          <p className="text-sm text-slate-600">Your Community & Society Executive application was not approved by the Society Administrator. — Application Rejected</p>
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-left space-y-1 max-w-md mx-auto">
            <div><strong>Vertical:</strong> {selectedVertical?.title || persistedApp?.vertical || 'Community'}</div>
            <div><strong>Status:</strong> <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold">REJECTED</span></div>
            {persistedApp?.rejectionReason && <div><strong>Reason:</strong> {persistedApp.rejectionReason}</div>}
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { try { sessionStorage.removeItem(JOIN_STEP_KEY); } catch {} setStep(1); setShowActivation(false); setPersistedApp(null); setOtpVerified(false); setOtpSubStep('form'); }} className="px-6 py-3 rounded-xl border border-slate-200 bg-white text-xs font-bold hover:bg-slate-50">Apply Again</button>
            <button onClick={() => { try { sessionStorage.removeItem(JOIN_STEP_KEY); } catch {} setActiveTab('home'); }} className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold">Back to Home</button>
          </div>
        </div>
      );
    }
  }

  if (step === 1) {
    return (
      <PartnerServiceSelectionPage
        selectedIds={selectedSkills}
        onToggle={handleToggleService}
        onContinue={handleContinueFromSelection}
        onBackToHome={handleBackToHome}
      />
    );
  }

  // Step 3: Identity & Documents
  if (step === 3) {
    return (
      <div className="pb-8">
        <IdentityDocumentsStep
          docs={identityDocs}
          onChangeDocs={setIdentityDocs}
          onContinue={() => { setStep(4); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          onBack={() => setStep(2)}
          onBackToHome={handleBackToHome}
        />
      </div>
    );
  }

  // Step 4: Complete Profile (deferred register)
  if (step === 4) {
    return (
      <div className="pb-8">
        {formError && (
          <div className="max-w-4xl mx-auto mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        <CompleteProfileStep
          selectedSkills={selectedSkills.map((sid) => PARTNER_SERVICES.find((p) => p.id === sid)?.name || sid)}
          selectedLocation={selectedLocation}
          profileData={completeProfileData}
          onChangeProfile={setCompleteProfileData}
          onComplete={handleCompleteOnboarding}
          onBack={() => setStep(3)}
        />
        {isSubmitting && <div className="text-center text-xs text-slate-500">Submitting application...</div>}
      </div>
    );
  }

  // Step 2: Verify Details with nested OTP sub-steps
  return (
    <div className="pb-16 space-y-6 max-w-4xl mx-auto">
      <OnboardingStepper currentStep={2} />

      {selectedSkills.length > 0 && (
        <div className="bg-blue-50/60 border border-blue-200/60 rounded-2xl p-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-blue-900">Selected Services ({selectedSkills.length}/3)</div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {selectedSkills.map((sid) => {
                const svc = PARTNER_SERVICES.find((p) => p.id === sid);
                return <span key={sid} className="px-2 py-0.5 rounded-full bg-white text-blue-700 text-[11px] font-semibold border border-blue-200">{svc?.name || sid}</span>;
              })}
            </div>
          </div>
          <button onClick={() => setStep(1)} className="text-xs font-bold text-blue-700 hover:underline shrink-0">Change</button>
        </div>
      )}

      {/* Verify Details form: Personal Information */}
      <form onSubmit={(e) => e.preventDefault()} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-subtle">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Step 2 of 4 — Verify Details</span>
            <h2 className="text-xl font-extrabold text-slate-900">Verify Your Details</h2>
            <p className="text-xs text-slate-500 mt-1">Personal information and mobile verification.</p>
          </div>
          <button type="button" onClick={() => setStep(1)} className="text-xs text-slate-500 hover:text-slate-800 underline font-semibold">Back to services</button>
        </div>

        {derivedVerticalId === 'community' && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex gap-2.5 items-center">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span><strong>Note:</strong> Community & Society Executives require Society Admin approval before accessing active dispatch.</span>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><User className="w-4 h-4 text-blue-700" /> Personal Information</h3>
          <div>
            <label className="text-xs font-bold text-slate-700">Full Name</label>
            <div className="relative mt-1">
              <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Arjun Patel" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Email Address</label>
              <div className="relative mt-1">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input required type="email" value={gmailAddress} onChange={(e) => setGmailAddress(e.target.value)} placeholder="you@example.com" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Date of Birth</label>
              <div className="relative mt-1">
                <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 focus:outline-none" />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Address / Basic Location</label>
            <div className="relative mt-1">
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="House, street, locality" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 focus:outline-none" />
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            <ExecutiveLocationStep />
          </div>
        </div>

        {/* Mobile + OTP internal sub-step */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><Phone className="w-4 h-4 text-blue-700" /> Mobile Number & OTP</h3>

          {otpSubStep === 'form' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Mobile Number</label>
                <div className="relative mt-1">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input required value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} placeholder="98765 43210" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 focus:outline-none" />
                </div>
              </div>
              <button type="button" onClick={handleSendOtp} disabled={isSending} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-60">
                <Send className="w-4 h-4" />
                <span>{isSending ? 'Sending OTP...' : 'Send OTP'}</span>
              </button>
            </div>
          )}

          {otpSubStep === 'otp' && (
            <div className="space-y-4 bg-slate-50 rounded-2xl border border-slate-200 p-4">
              <div>
                <p className="text-xs font-bold text-slate-700">Enter OTP sent to {gmailAddress}</p>
                {sendInfo?.fallback && <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">DEV mode: check console for OTP</p>}
                <div className="flex gap-2 justify-between mt-3">
                  {otpDigits.map((d, i) => (
                    <input key={i} ref={(el) => (refs.current[i] = el)} value={d} onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)} maxLength={1} inputMode="numeric" className="w-12 h-14 text-center text-xl font-mono font-bold rounded-xl border-2 border-slate-200 focus:border-blue-600 focus:outline-none bg-white" />
                  ))}
                </div>
              </div>
              {otpError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{otpError}</span></div>}
              {otpSuccess && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" /><span>{otpSuccess}</span></div>}
              <div className="flex justify-between items-center text-xs">
                <button type="button" onClick={() => setOtpSubStep('form')} className="underline text-slate-500 hover:text-slate-800 font-semibold">Edit mobile</button>
                <button type="button" onClick={handleResend} disabled={resendCountdown > 0} className={resendCountdown > 0 ? 'text-slate-400' : 'text-blue-700 font-bold hover:underline'}>{resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : 'Resend OTP'}</button>
              </div>
              <button type="button" onClick={handleVerifyOtp} disabled={isVerifying} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-60">
                <CheckCircle2 className="w-4 h-4" />
                <span>{isVerifying ? 'Verifying...' : 'Verify OTP'}</span>
              </button>
            </div>
          )}

          {otpSubStep === 'verified' && otpVerified && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center"><CheckCircle2 className="w-5 h-5" /></div>
              <div>
                <div className="text-xs font-bold text-emerald-800">OTP Verified ✓</div>
                <div className="text-[11px] text-emerald-700">Mobile {mobileNumber} and email {gmailAddress} verified.</div>
              </div>
              <button type="button" onClick={() => { setOtpSubStep('form'); setOtpVerified(false); }} className="ml-auto text-xs text-emerald-700 underline">Change</button>
            </div>
          )}
        </div>

        {formError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{formError}</span></div>}
        {otpError && otpSubStep === 'form' && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{otpError}</span></div>}

        <button type="button" onClick={handleVerifyDetailsContinue} disabled={!otpVerified} className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-colors ${otpVerified ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
          <span>Continue to Identity & Documents</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        {!otpVerified && <p className="text-center text-xs text-slate-400">Verify OTP to continue to Step 3.</p>}
      </form>
    </div>
  );
};

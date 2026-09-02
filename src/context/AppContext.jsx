// ====================================================================
// ZOLVE UNIFIED REACTIVE APPLICATION CONTEXT
// Central State Store for Auth, Bookings, Payments, Cooperative, & Admin Actions
// ====================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  DEMO_USERS,
  SERVICE_CATEGORIES,
  EXECUTIVE_VERTICALS,
  INITIAL_PROVIDERS,
  INITIAL_BOOKINGS,
  COOPERATIVE_PROPOSALS,
  COOPERATIVE_TRAINING_MODULES,
  COMMUNITY_PROJECTS,
  SOCIETY_DATA,
  PROVIDER_EARNINGS_LEDGER,
  INITIAL_SUPPORT_TICKETS
} from '../data/mockData';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const AppContext = createContext(null);

const STORAGE_KEY_PREFIX = 'zolve_app_state_v1';

export const AppProvider = ({ children }) => {
  // 1. Auth State — Delegated to Supabase AuthContext (single source of truth)
  // currentUser/activeRole now derived from Supabase session/profile, not localStorage
  let auth = null
  try { auth = useAuth() } catch { auth = null }
  const supaSession = auth?.session || null
  const supaProfile = auth?.profile || null
  const supaUser = auth?.user || null
  const currentUser = supaProfile ? {
    id: supaProfile.id,
    name: supaProfile.full_name,
    email: supaProfile.email,
    phone: supaProfile.phone || supaUser?.user_metadata?.phone || null,
    phone_verified: supaProfile.phone_verified || false,
    role: supaProfile.role,
    avatar: supaProfile.avatar_url || supaUser?.user_metadata?.avatar_url || (supaProfile.role === 'provider' ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
    location: 'Bengaluru',
    isCoopMember: supaProfile.role === 'provider',
    // keep savedAddresses from demo if needed, otherwise null — real addresses come from bookings
    savedAddresses: null,
  } : null
  const activeRole = supaProfile?.role || 'customer'
  // Keep setter stubs for backward compat (no-op, auth is Supabase)
  const setCurrentUser = () => { console.warn('[AppContext] setCurrentUser is deprecated — use Supabase Auth') }
  const setActiveRole = () => { console.warn('[AppContext] setActiveRole is deprecated — role from profiles') }

  // 2. Core Entities State — Supabase is source of truth (localStorage no longer for bookings/providers)
  const [providers, setProviders] = useState(INITIAL_PROVIDERS);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const [proposals, setProposals] = useState(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}_proposals`);
    return saved ? JSON.parse(saved) : COOPERATIVE_PROPOSALS;
  });

  const [trainingModules, setTrainingModules] = useState(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}_trainings`);
    return saved ? JSON.parse(saved) : COOPERATIVE_TRAINING_MODULES;
  });

  const [societyData, setSocietyData] = useState(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}_society`);
    return saved ? JSON.parse(saved) : SOCIETY_DATA;
  });

  // Earnings derived from bookings (Supabase view), not separate localStorage
  const [earningsLedger, setEarningsLedger] = useState([]);

  const [supportTickets, setSupportTickets] = useState(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}_tickets`);
    return saved ? JSON.parse(saved) : INITIAL_SUPPORT_TICKETS;
  });

  const [executiveApplications, setExecutiveApplications] = useState(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}_exec_apps`);
    return saved ? JSON.parse(saved) : [];
  });

  // Community — persisted per-browser joins + real participant counts
  const [joinedProjects, setJoinedProjects] = useState(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}_community_joins`);
    try { return saved ? JSON.parse(saved) : {}; } catch { return {}; }
  });

  const [communityProjects, setCommunityProjects] = useState(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}_community_projects`);
    try { return saved ? JSON.parse(saved) : COMMUNITY_PROJECTS; } catch { return COMMUNITY_PROJECTS; }
  });

  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      title: 'Welcome to Zolve!',
      message: 'Explore trusted local services and learn about our cooperative community model.',
      type: 'system',
      read: false,
      time: 'Just now'
    },
    {
      id: 'notif-2',
      title: 'Cooperative Proposal Active',
      message: 'Vote on Proposal ZCP-2026-09: Emergency Health & Tool Insurance Pool.',
      type: 'coop',
      read: false,
      time: '2 hours ago'
    }
  ]);

  const [selectedLocation, setSelectedLocation] = useState(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}_location`);
    try { return saved ? JSON.parse(saved) : { name: 'Indiranagar, Bengaluru', lat: 12.9784, lng: 77.6408 }; } catch { return { name: 'Indiranagar, Bengaluru', lat: 12.9784, lng: 77.6408 }; }
  });
  // provider live locations keyed by bookingId: { lat,lng, updatedAt, bookingId }
  const [providerLiveLocations, setProviderLiveLocations] = useState(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}_live_locs`);
    try { return saved ? JSON.parse(saved) : {}; } catch { return {}; }
  });
  const [activeTab, setActiveTab] = useState('home'); // active navigation view
  const [theme, setTheme] = useState(() => localStorage.getItem(`${STORAGE_KEY_PREFIX}_theme`) || 'light');
  // Zolve Money — per-account exclusive: each authenticated user gets isolated balance/history
  // Keyed as zolve_app_state_v1_zolve_money_<userId>, not global
  const getZolveMoneyKey = (uid) => `${STORAGE_KEY_PREFIX}_zolve_money_${uid || 'guest'}`
  const [zolveMoney, setZolveMoney] = useState({ balance: 0, history: [] });

  // Modals & Drawers Global Visibility
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('signin'); // 'signin' | 'register'
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [selectedProviderForBooking, setSelectedProviderForBooking] = useState(null);
  const [selectedProviderForProfile, setSelectedProviderForProfile] = useState(null);
  const [activeBookingForTracking, setActiveBookingForTracking] = useState(null);
  const [activeBookingForReview, setActiveBookingForReview] = useState(null);
  const [activePaymentForInvoice, setActivePaymentForInvoice] = useState(null);
  const [isReportProblemOpen, setIsReportProblemOpen] = useState(false);
  // Direct booking prefill from image detector (service + images)
  const [bookingPrefill, setBookingPrefill] = useState(null); // { serviceId, serviceName, images: File[], detectedAt }

  // Auth is now Supabase-only — do NOT persist user/role to localStorage (removed localStorage auth source of truth)
  // Supabase Auth persists session via sb-* keys (HttpOnly handled by Supabase)

  // Supabase: Fetch providers (public) and bookings (RLS) — replaces localStorage source of truth
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const fetchProviders = async () => {
      const { data, error } = await supabase.from('providers').select('*')
      if (!error && data && data.length) {
        const mapped = data.map(row => ({
          id: row.id,
          name: row.name,
          title: row.title,
          rating: Number(row.rating),
          ratingCount: row.rating_count,
          completedJobs: row.completed_jobs,
          experienceYears: row.experience_years,
          avatar: row.avatar,
          phone: row.phone,
          email: row.email,
          location: row.location,
          coords: row.coords,
          basePrice: row.base_price,
          startingPrice: row.starting_price,
          availability: row.availability,
          isCoopMember: row.is_coop_member,
          coopBadge: row.coop_badge,
          coopDividendScore: row.coop_dividend_score,
          verifications: row.verifications,
          serviceCategories: row.service_categories,
          skills: row.skills,
          bio: row.bio,
          recentReviews: row.recent_reviews || []
        }))
        setProviders(mapped)
      }
    }
    fetchProviders()
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Fallback to mock bookings when Supabase not configured
      setBookings(INITIAL_BOOKINGS)
      setEarningsLedger(PROVIDER_EARNINGS_LEDGER)
      setBookingsLoading(false)
      return
    }
    if (!supaSession) {
      setBookings([])
      setEarningsLedger([])
      setBookingsLoading(false)
      return
    }
    const fetchBookings = async () => {
      setBookingsLoading(true)
      const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false })
      if (!error && data) {
        const mapped = data.map(row => ({
          id: row.id,
          bookingCode: row.booking_code,
          customerId: row.customer_id,
          customerAuthId: row.customer_auth_id,
          customerName: row.customer_name,
          customerPhone: row.customer_phone,
          customerCoords: row.customer_coords,
          providerId: row.provider_id,
          providerAuthId: row.provider_auth_id,
          providerName: row.provider_name,
          providerAvatar: row.provider_avatar,
          providerPhone: row.provider_phone,
          providerTitle: row.provider_title,
          providerCoords: row.provider_coords,
          isCoopMember: row.is_coop_member,
          serviceId: row.service_id,
          serviceName: row.service_name,
          category: row.category,
          address: row.address,
          scheduledDate: row.scheduled_date,
          scheduledTime: row.scheduled_time,
          description: row.description,
          baseAmount: row.base_amount,
          platformFee: row.platform_fee,
          coopReserveFee: row.coop_reserve_fee,
          taxes: row.taxes,
          totalAmount: row.total_amount,
          providerEarnings: row.provider_earnings,
          bookingStatus: row.booking_status,
          paymentStatus: row.payment_status,
          paymentId: row.payment_id,
          razorpayOrderId: row.razorpay_order_id,
          paymentMethod: row.payment_method,
          chatMessages: row.chat_messages || [],
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          startedAt: row.started_at,
          completedAt: row.completed_at,
          cancelledReason: row.cancelled_reason
        }))
        setBookings(mapped)
        const ledger = mapped.map(b => ({
          id: `ledg-${b.id}`,
          bookingCode: b.bookingCode,
          serviceName: b.serviceName,
          customerName: b.customerName,
          grossAmount: b.totalAmount,
          customerPaid: b.totalAmount,
          platformFee: b.platformFee,
          coopAllocation: b.coopReserveFee,
          taxes: b.taxes,
          netEarnings: b.providerEarnings,
          status: b.bookingStatus === 'SERVICE_COMPLETED' ? 'SETTLED' : 'PENDING',
          date: b.createdAt ? b.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]
        }))
        setEarningsLedger(ledger)
      } else if (error) {
        console.warn('[bookings] fetch error', error.message || error)
      }
      setBookingsLoading(false)
    }
    fetchBookings()
  }, [supaSession?.user?.id])

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}_proposals`, JSON.stringify(proposals));
  }, [proposals]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}_exec_apps`, JSON.stringify(executiveApplications));
  }, [executiveApplications]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}_community_joins`, JSON.stringify(joinedProjects));
  }, [joinedProjects]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}_community_projects`, JSON.stringify(communityProjects));
  }, [communityProjects]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}_theme`, theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  // Cleanup old localStorage auth/bookings/providers keys when Supabase is source of truth
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}_bookings`)
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}_providers`)
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}_ledger`)
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}_user`)
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}_role`)
    } catch {}
  }, []);

  // Per-account zolveMoney: load on user switch, persist per-user
  useEffect(() => {
    const uid = supaUser?.id || supaProfile?.id || null
    if (!uid) {
      // No authenticated user — reset to empty (no leak of previous user's wallet)
      setZolveMoney({ balance: 0, history: [] })
      return
    }
    try {
      const key = getZolveMoneyKey(uid)
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Validate shape
        if (parsed && typeof parsed.balance === 'number' && Array.isArray(parsed.history)) {
          setZolveMoney(parsed)
        } else {
          setZolveMoney({ balance: 0, history: [] })
        }
      } else {
        // Check legacy global key for migration (one-time): if global has balance and per-user empty, migrate it
        try {
          const legacy = localStorage.getItem(`${STORAGE_KEY_PREFIX}_zolve_money`)
          if (legacy) {
            const legParsed = JSON.parse(legacy)
            if (legParsed && typeof legParsed.balance === 'number' && legParsed.balance > 0) {
              // Only migrate if this user has ever created a booking (heuristic: don't auto-copy other user's money)
              // For fresh users we start at 0; for the current user on same browser who earned before, migrate once
              const alreadyMigrated = localStorage.getItem(`${STORAGE_KEY_PREFIX}_zolve_money_migrated_${uid}`)
              if (!alreadyMigrated) {
                setZolveMoney(legParsed)
                localStorage.setItem(`${STORAGE_KEY_PREFIX}_zolve_money_migrated_${uid}`, '1')
              } else {
                setZolveMoney({ balance: 0, history: [] })
              }
            } else {
              setZolveMoney({ balance: 0, history: [] })
            }
          } else {
            setZolveMoney({ balance: 0, history: [] })
          }
        } catch { setZolveMoney({ balance: 0, history: [] }) }
      }
    } catch { setZolveMoney({ balance: 0, history: [] }) }
  }, [supaUser?.id])

  useEffect(() => {
    const uid = supaUser?.id || supaProfile?.id || null
    if (!uid) return
    try {
      localStorage.setItem(getZolveMoneyKey(uid), JSON.stringify(zolveMoney))
    } catch {}
    // Remove legacy global key to prevent cross-account leakage
    try { localStorage.removeItem(`${STORAGE_KEY_PREFIX}_zolve_money`) } catch {}
  }, [zolveMoney, supaUser?.id])

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}_location`, JSON.stringify(selectedLocation));
  }, [selectedLocation]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}_live_locs`, JSON.stringify(providerLiveLocations));
  }, [providerLiveLocations]);

  // Listen for local realtime fallback (same-tab + cross-tab via custom event / storage)
  useEffect(() => {
    const onLive = (e) => {
      const { bookingId, coords } = e.detail || {};
      if (bookingId && coords) setProviderLiveLocations((prev) => ({ ...prev, [bookingId]: coords }));
    };
    window.addEventListener('zolve:live-location', onLive);
    const onStorage = (e) => {
      if (e.key?.startsWith(`${STORAGE_KEY_PREFIX}_live_locs`) || e.key?.startsWith('zolve_live_')) {
        if (e.key.startsWith('zolve_live_') && e.newValue) {
          try { const c = JSON.parse(e.newValue); if (c.bookingId) setProviderLiveLocations((p) => ({ ...p, [c.bookingId]: c })); } catch { /* ignore */ }
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener('zolve:live-location', onLive); window.removeEventListener('storage', onStorage); };
  }, []);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  // Auth Operations — Supabase is the ONLY source of truth (no localStorage, no EmailJS, no hardcoded OTP)
  const login = () => {
    console.warn('[AppContext] login() is deprecated — use AuthContext signIn via /login page')
    addNotification({ title: 'Please use Login page', message: 'Sign in via /login with Supabase Auth.', type: 'system' })
  };

  const logout = async () => {
    try { if (auth?.signOut) await auth.signOut() } catch (e) { console.warn('[logout]', e) }
    // Clear any legacy localStorage keys if present
    try { localStorage.removeItem(`${STORAGE_KEY_PREFIX}_user`); localStorage.removeItem(`${STORAGE_KEY_PREFIX}_role`) } catch {}
    setActiveTab('home')
    addNotification({ title: 'Signed Out', message: 'You have been safely signed out of Zolve.', type: 'system' })
  };

  const switchDemoRole = (roleKey) => {
    // Demo switch is dev-only and does NOT bypass Supabase RLS in production
    const isDemo = import.meta.env.VITE_ENABLE_DEMO === 'true' || new URLSearchParams(window.location.search).has('demo')
    if (!isDemo) {
      console.warn('[switchDemoRole] disabled in production — use real Supabase login')
      addNotification({ title: 'Demo disabled', message: 'Demo role switch is only available with ?demo or VITE_ENABLE_DEMO=true', type: 'system' })
      return
    }
    const targetUser = DEMO_USERS[roleKey];
    if (targetUser) {
      console.warn('[switchDemoRole] demo mode — not authenticated via Supabase, RLS still enforces')
      // Do NOT set currentUser via localStorage; just notify
      addNotification({ title: `Demo: ${targetUser.name}`, message: `Demo role ${targetUser.role} (mock, no Supabase session)`, type: 'system' })
    }
  };

  const registerExecutive = (formData) => {
    const vertical = formData.executiveVertical;
    const requiresApproval = vertical === 'community';
    const app = {
      id: `exec-app-${Date.now()}`,
      vertical,
      status: requiresApproval ? 'pending_approval' : 'active',
      applicantName: formData.fullName,
      applicantPhone: formData.mobileNumber,
      applicantEmail: formData.gmailAddress,
      createdAt: new Date().toISOString()
    };
    setExecutiveApplications((prev) => [app, ...prev]);

    const executiveUser = {
      id: `usr-exec-${Date.now()}`,
      name: formData.fullName,
      email: formData.gmailAddress,
      phone: formData.mobileNumber,
      role: 'executive',
      executiveVertical: vertical,
      executiveStatus: requiresApproval ? 'pending_approval' : 'active',
      mobileVerified: true,
      mobileVerifiedAt: new Date().toISOString(),
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      location: 'Bengaluru',
      assignedServices: EXECUTIVE_VERTICALS.find(v => v.id === vertical)?.services || []
    };

    if (!requiresApproval) {
      setCurrentUser(executiveUser);
      setActiveRole('executive');
      setActiveTab('home');
      addNotification({ title: 'Executive Registration Complete', message: `Welcome, ${executiveUser.name}! Vertical: ${vertical}`, type: 'system' });
    } else {
      addNotification({ title: 'Executive Application Submitted', message: 'Community executive requires Society Admin approval. You will be activated shortly.', type: 'system' });
    }
    return { app, executiveUser, requiresApproval };
  };

  const approveExecutiveApplication = (appId) => {
    setExecutiveApplications((prev) => prev.map(a => a.id === appId ? { ...a, status: 'active', approvedAt: new Date().toISOString() } : a));
    // If currently pending executive user exists, activate them
    if (currentUser && currentUser.role === 'executive' && currentUser.executiveStatus === 'pending_approval') {
      const updated = { ...currentUser, executiveStatus: 'active' };
      setCurrentUser(updated);
    }
    addNotification({ title: 'Executive Approved', message: `Application ${appId} approved by Society Admin.`, type: 'system' });
  };

  const rejectExecutiveApplication = (appId) => {
    setExecutiveApplications((prev) => prev.map(a => a.id === appId ? { ...a, status: 'rejected' } : a));
    addNotification({ title: 'Executive Rejected', message: `Application ${appId} rejected.`, type: 'system' });
  };

  // Notification helper
  const addNotification = (notif) => {
    const newNotif = {
      id: `notif_${Date.now()}`,
      time: 'Just now',
      read: false,
      ...notif
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markNotificationRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  // Zolve Money helpers
  const awardZolveMoney = (bookingCode, serviceName) => {
    const amount = Math.floor(10 + Math.random() * 191); // 10-200 inclusive
    const entry = {
      id: `zm-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      amount,
      bookingCode,
      serviceName,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'credit'
    };
    setZolveMoney((prev) => ({ balance: prev.balance + amount, history: [entry, ...prev.history] }));
    addNotification({ title: `Zolve Money Credited: ₹${amount}`, message: `You earned ₹${amount} Zolve Money for ${serviceName} (#${bookingCode}).`, type: 'system' });
    return entry;
  };

  const redeemZolveMoney = (amount, bookingCode) => {
    if (!amount || amount <= 0) return null;
    let deducted = 0;
    setZolveMoney((prev) => {
      const use = Math.min(amount, prev.balance);
      deducted = use;
      const entry = {
        id: `zm-red-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
        amount: -use,
        bookingCode,
        serviceName: 'Redeemed at checkout',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'redeem'
      };
      // we will return updated; notification outside to avoid stale closure
      return { balance: prev.balance - use, history: [entry, ...prev.history] };
    });
    // Note: balance update is async, but we return intended amount
    addNotification({ title: `Zolve Money Applied: -₹${Math.min(amount, zolveMoney.balance)}`, message: `₹${Math.min(amount, zolveMoney.balance)} deducted from wallet for #${bookingCode}.`, type: 'system' });
    return deducted;
  };

  const updateProviderLiveLocation = (bookingId, coords) => {
    setProviderLiveLocations((prev) => ({ ...prev, [bookingId]: { ...coords, bookingId, updatedAt: new Date().toISOString() } }));
    // also publish via realtime fallback localStorage/BroadcastChannel
    try { window.dispatchEvent(new CustomEvent('zolve:live-location', { detail: { bookingId, coords: { ...coords, bookingId, updatedAt: new Date().toISOString() } } })); } catch { /* ignore */ }
  };

  // Booking Flow Operations — Supabase is source of truth (localStorage fallback when not configured)
  const createBooking = async (bookingData) => {
    const newBookingId = `bk-zol-${Math.floor(1000 + Math.random() * 9000)}`;
    const bookingCode = `ZOL-${Math.floor(1000 + Math.random() * 9000)}`;

    const baseBooking = {
      id: newBookingId,
      bookingCode,
      customerId: currentUser ? currentUser.id : 'usr-cust-001',
      customerName: currentUser ? currentUser.name : 'Anubhab Metya',
      customerPhone: currentUser ? currentUser.phone : '+91 98765 43210',
      createdAt: new Date().toISOString(),
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'CAPTURED',
      chatMessages: [
        {
          id: `msg-sys-${Date.now()}`,
          sender: 'system',
          text: `Booking confirmed with Razorpay payment ID: ${bookingData.paymentId || 'pay_live_test'}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ],
      ...bookingData
    };

    // If Supabase configured and user is authenticated, insert via Supabase (RLS enforces customer_id = auth.uid())
    if (isSupabaseConfigured() && supaSession && supaUser) {
      const row = {
        id: baseBooking.id,
        booking_code: baseBooking.bookingCode,
        customer_id: supaUser.id.toString(),
        customer_auth_id: supaUser.id,
        customer_name: baseBooking.customerName,
        customer_phone: baseBooking.customerPhone,
        customer_coords: baseBooking.customerCoords || null,
        provider_id: baseBooking.providerId ? String(baseBooking.providerId) : null,
        provider_auth_id: null,
        provider_name: baseBooking.providerName,
        provider_avatar: baseBooking.providerAvatar,
        provider_phone: baseBooking.providerPhone,
        provider_title: baseBooking.providerTitle,
        provider_coords: baseBooking.providerCoords || baseBooking.customerCoords || null,
        is_coop_member: !!baseBooking.isCoopMember,
        service_id: baseBooking.serviceId,
        service_name: baseBooking.serviceName,
        category: baseBooking.category,
        address: baseBooking.address,
        scheduled_date: baseBooking.scheduledDate || null,
        scheduled_time: baseBooking.scheduledTime,
        description: baseBooking.description,
        base_amount: baseBooking.baseAmount,
        platform_fee: baseBooking.platformFee || 80,
        coop_reserve_fee: baseBooking.coopReserveFee || 40,
        taxes: baseBooking.taxes || 0,
        total_amount: baseBooking.totalAmount,
        provider_earnings: baseBooking.providerEarnings || baseBooking.baseAmount,
        booking_status: baseBooking.bookingStatus,
        payment_status: baseBooking.paymentStatus,
        payment_id: baseBooking.paymentId,
        razorpay_order_id: baseBooking.razorpayOrderId,
        payment_method: baseBooking.paymentMethod,
        chat_messages: baseBooking.chatMessages || []
      };
      try {
        const { data, error } = await supabase.from('bookings').insert(row).select().single();
        if (error) throw error;
        // Map back to app shape and optimistically update local state
        const mapped = {
          id: data.id,
          bookingCode: data.booking_code,
          customerId: data.customer_id,
          customerAuthId: data.customer_auth_id,
          customerName: data.customer_name,
          customerPhone: data.customer_phone,
          customerCoords: data.customer_coords,
          providerId: data.provider_id,
          providerAuthId: data.provider_auth_id,
          providerName: data.provider_name,
          providerAvatar: data.provider_avatar,
          providerPhone: data.provider_phone,
          providerTitle: data.provider_title,
          providerCoords: data.provider_coords,
          isCoopMember: data.is_coop_member,
          serviceId: data.service_id,
          serviceName: data.service_name,
          category: data.category,
          address: data.address,
          scheduledDate: data.scheduled_date,
          scheduledTime: data.scheduled_time,
          description: data.description,
          baseAmount: data.base_amount,
          platformFee: data.platform_fee,
          coopReserveFee: data.coop_reserve_fee,
          taxes: data.taxes,
          totalAmount: data.total_amount,
          providerEarnings: data.provider_earnings,
          bookingStatus: data.booking_status,
          paymentStatus: data.payment_status,
          paymentId: data.payment_id,
          razorpayOrderId: data.razorpay_order_id,
          paymentMethod: data.payment_method,
          chatMessages: data.chat_messages || [],
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
        setBookings((prev) => [mapped, ...prev]);
        awardZolveMoney(mapped.bookingCode, mapped.serviceName);
        addNotification({ title: 'Booking Confirmed!', message: `Your booking #${mapped.bookingCode} for ${mapped.serviceName} is confirmed.`, type: 'booking' });
        return mapped;
      } catch (e) {
        console.warn('[bookings] Supabase insert failed, falling back to local', e?.message || e);
        // Fall through to local fallback
      }
    }

    // Fallback: local state (when Supabase not configured or insert failed)
    setBookings((prev) => [baseBooking, ...prev]);
    // Earnings will be derived via bookings effect; keep manual ledger for fallback
    const newLedgerItem = {
      id: `ledg_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      bookingCode: baseBooking.bookingCode,
      serviceName: baseBooking.serviceName,
      customerName: baseBooking.customerName,
      grossAmount: baseBooking.totalAmount,
      customerPaid: baseBooking.totalAmount,
      platformFee: baseBooking.platformFee || 80,
      coopAllocation: baseBooking.coopReserveFee || 40,
      taxes: baseBooking.taxes || 40,
      netEarnings: baseBooking.providerEarnings || (baseBooking.baseAmount),
      status: 'SETTLED'
    };
    setEarningsLedger((prev) => [newLedgerItem, ...prev]);
    awardZolveMoney(baseBooking.bookingCode, baseBooking.serviceName);
    addNotification({
      title: 'Booking Confirmed!',
      message: `Your booking #${baseBooking.bookingCode} for ${baseBooking.serviceName} is confirmed.`,
      type: 'booking'
    });
    return baseBooking;
  };

  const updateBookingStatus = async (bookingId, newStatus, reason = null) => {
    const patch = {
      booking_status: newStatus,
      cancelled_reason: reason,
      updated_at: new Date().toISOString(),
      ...(newStatus === 'SERVICE_STARTED' ? { started_at: new Date().toISOString() } : {}),
      ...(newStatus === 'SERVICE_COMPLETED' ? { completed_at: new Date().toISOString() } : {}),
    };
    if (isSupabaseConfigured() && supaSession) {
      try {
        const { error } = await supabase.from('bookings').update(patch).eq('id', bookingId);
        if (error) throw error;
        // Optimistically update local
        setBookings((prev) => prev.map(b => b.id === bookingId ? { ...b, bookingStatus: newStatus, cancelledReason: reason || b.cancelledReason, updatedAt: patch.updated_at, startedAt: patch.started_at || b.startedAt, completedAt: patch.completed_at || b.completedAt } : b));
      } catch (e) {
        console.warn('[bookings] update status failed', e?.message || e);
        // Fallback to local
        setBookings((prev) => prev.map(b => b.id === bookingId ? { ...b, bookingStatus: newStatus, cancelledReason: reason || b.cancelledReason, updatedAt: patch.updated_at, startedAt: patch.started_at || b.startedAt, completedAt: patch.completed_at || b.completedAt } : b));
      }
    } else {
      setBookings((prev) =>
        prev.map((b) => {
          if (b.id === bookingId) {
            const updated = {
              ...b,
              bookingStatus: newStatus,
              cancelledReason: reason || b.cancelledReason,
              updatedAt: new Date().toISOString()
            };
            if (newStatus === 'SERVICE_STARTED') updated.startedAt = new Date().toISOString();
            if (newStatus === 'SERVICE_COMPLETED') updated.completedAt = new Date().toISOString();
            return updated;
          }
          return b;
        })
      );
    }
    addNotification({
      title: `Booking #${bookingId.substring(0, 11)} Updated`,
      message: `Status transitioned to ${newStatus.replace(/_/g, ' ')}`,
      type: 'booking'
    });
  };

  const sendBookingChatMessage = async (bookingId, text, sender = 'customer') => {
    const newMsg = {
      id: `msg-${Date.now()}`,
      sender,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    // Optimistic local update
    setBookings((prev) => prev.map(b => b.id === bookingId ? { ...b, chatMessages: [...(b.chatMessages || []), newMsg] } : b));
    if (isSupabaseConfigured() && supaSession) {
      try {
        // Fetch current chat_messages to append (avoid race, just append)
        const { data: existing } = await supabase.from('bookings').select('chat_messages').eq('id', bookingId).single();
        const current = existing?.chat_messages || [];
        const updated = [...current, newMsg];
        const { error } = await supabase.from('bookings').update({ chat_messages: updated }).eq('id', bookingId);
        if (error) throw error;
      } catch (e) {
        console.warn('[bookings] chat update failed', e?.message || e);
      }
    }
  };

  // Submit Review
  const submitReview = (bookingId, reviewData) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, reviewed: true } : b))
    );

    // Update provider's reviews and rating
    setProviders((prev) =>
      prev.map((p) => {
        if (p.id === reviewData.providerId) {
          const newRatingCount = (p.ratingCount || 10) + 1;
          const newRating = Number((((p.rating * (p.ratingCount || 10)) + reviewData.rating) / newRatingCount).toFixed(2));
          const newReviewObj = {
            id: `rev-${Date.now()}`,
            customerName: currentUser?.name || 'Customer',
            rating: reviewData.rating,
            date: 'Today',
            serviceName: reviewData.serviceName,
            comment: reviewData.comment
          };
          return {
            ...p,
            rating: newRating,
            ratingCount: newRatingCount,
            recentReviews: [newReviewObj, ...(p.recentReviews || [])]
          };
        }
        return p;
      })
    );

    addNotification({
      title: 'Review Submitted',
      message: 'Thank you for rating your service experience!',
      type: 'system'
    });
  };

  // Cooperative Governance Voting
  const voteOnProposal = (proposalId, choice) => {
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id === proposalId) {
          const existingVote = p.userVoted;
          const newVotes = { ...p.votes };

          if (existingVote) {
            newVotes[existingVote.toLowerCase()] = Math.max(0, newVotes[existingVote.toLowerCase()] - 1);
            newVotes.total = Math.max(0, newVotes.total - 1);
          }

          newVotes[choice.toLowerCase()] = (newVotes[choice.toLowerCase()] || 0) + 1;
          newVotes.total = (newVotes.total || 0) + 1;

          return {
            ...p,
            votes: newVotes,
            userVoted: choice
          };
        }
        return p;
      })
    );

    addNotification({
      title: 'Cooperative Vote Cast',
      message: `Your vote (${choice}) was recorded on the governance ledger.`,
      type: 'coop'
    });
  };

  // Enroll in Training
  const enrollTraining = (moduleId) => {
    setTrainingModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, status: 'Enrolled', enrolledCount: m.enrolledCount + 1, progress: 10 }
          : m
      )
    );
    addNotification({
      title: 'Enrolled in Cooperative Training',
      message: 'Course materials and schedule unlocked in your member portal.',
      type: 'coop'
    });
  };

  // Community — per-browser persisted join + numeric count
  const joinCommunityProject = (projId) => {
    if (!currentUser || activeRole !== 'customer') {
      addNotification({
        title: 'Sign in required',
        message: 'Please sign in as a User (Join as User) to volunteer for Community drives.',
        type: 'system'
      });
      setAuthModalTab('register');
      setIsAuthModalOpen(true);
      return false;
    }
    if (joinedProjects[projId]) return true;
    setJoinedProjects((prev) => ({ ...prev, [projId]: true }));
    setCommunityProjects((prev) =>
      prev.map((p) =>
        p.id === projId
          ? {
              ...p,
              participantsCount: (p.participantsCount || 0) + 1,
              participants: `${(p.participantsCount || 0) + 1} Volunteers`
            }
          : p
      )
    );
    const proj = communityProjects.find((p) => p.id === projId);
    addNotification({
      title: 'Registered for Community Civic Drive!',
      message: `You registered for "${proj?.title || projId}". Details & coordinates sent to your registered Gmail.`,
      type: 'coop'
    });
    return true;
  };

  // Support / Dispute Ticket Creation — only for signed-in users (Join as User)
  const createSupportTicket = (ticketData) => {
    if (!currentUser || activeRole !== 'customer') {
      addNotification({
        title: 'Sign in required',
        message: 'Please join as a User (Join as User) to report a problem or raise a dispute. Other roles cannot raise tickets.',
        type: 'system'
      });
      setAuthModalTab('register');
      setIsAuthModalOpen(true);
      return null;
    }
    const newTicket = {
      id: `tkt-${Date.now()}`,
      ticketCode: `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
      userName: currentUser.name,
      userRole: activeRole,
      createdAt: new Date().toISOString(),
      status: 'open',
      ...ticketData
    };
    setSupportTickets((prev) => [newTicket, ...prev]);
    addNotification({
      title: `Ticket #${newTicket.ticketCode} Raised`,
      message: 'Our Trust & Safety Arbitration Council is reviewing your case.',
      type: 'system'
    });
    return newTicket;
  };

  // Admin Actions
  const approveProviderKYC = (providerId) => {
    setProviders((prev) =>
      prev.map((p) =>
        p.id === providerId
          ? {
              ...p,
              verifications: { ...p.verifications, identity: true, skill: true, background: true }
            }
          : p
      )
    );
    addNotification({
      title: 'Provider Verified',
      message: `KYC verified for provider ID: ${providerId}`,
      type: 'system'
    });
  };

  const createProposal = (newProp) => {
    const proposalObj = {
      id: `prop-${Date.now()}`,
      code: `ZCP-2026-${Math.floor(10 + Math.random() * 90)}`,
      status: 'active',
      quorumRequired: 150,
      votes: { yes: 1, no: 0, abstain: 0, total: 1 },
      userVoted: 'YES',
      ...newProp
    };
    setProposals((prev) => [proposalObj, ...prev]);
    addNotification({
      title: 'New Cooperative Proposal Published',
      message: `Proposal ${proposalObj.code} is now open for voting.`,
      type: 'coop'
    });
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        activeRole,
        login,
        logout,
        switchDemoRole,
        registerExecutive,
        approveExecutiveApplication,
        rejectExecutiveApplication,
        executiveApplications,
        executiveVerticals: EXECUTIVE_VERTICALS,
        theme,
        toggleTheme,
        setTheme,
        zolveMoney,
        awardZolveMoney,
        redeemZolveMoney,
        providers,
        setProviders,
        serviceCategories: SERVICE_CATEGORIES,
        bookings,
        createBooking,
        updateBookingStatus,
        sendBookingChatMessage,
        submitReview,
        proposals,
        voteOnProposal,
        createProposal,
        trainingModules,
        enrollTraining,
        communityProjects,
        setCommunityProjects,
        joinedProjects,
        joinCommunityProject,
        societyData,
        setSocietyData,
        earningsLedger,
        supportTickets,
        createSupportTicket,
        approveProviderKYC,
        notifications,
        addNotification,
        markNotificationRead,
        selectedLocation,
        setSelectedLocation,
        providerLiveLocations,
        setProviderLiveLocations,
        updateProviderLiveLocation,
        activeTab,
        setActiveTab,
        // Modal toggles
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalTab,
        setAuthModalTab,
        isCopilotOpen,
        setIsCopilotOpen,
        isLocationModalOpen,
        setIsLocationModalOpen,
        selectedProviderForBooking,
        setSelectedProviderForBooking,
        selectedProviderForProfile,
        setSelectedProviderForProfile,
        activeBookingForTracking,
        setActiveBookingForTracking,
        activeBookingForReview,
        setActiveBookingForReview,
        activePaymentForInvoice,
        setActivePaymentForInvoice,
        isReportProblemOpen,
        setIsReportProblemOpen,
        bookingPrefill,
        setBookingPrefill
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

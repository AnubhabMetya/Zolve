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
import { ExecutiveApplicationService } from '../services/executiveApplicationService';
import { SupportTicketService } from '../services/supportTicketService';
import { SocietyService } from '../services/societyService';
import { resolveCity } from '../services/cityResolver';
import { isGeolocationSupported, getCurrentPosition, reverseGeocode } from '../services/locationService';

const AppContext = createContext(null);

const STORAGE_KEY_PREFIX = 'zolve_app_state_v1';

export const AppProvider = ({ children }) => {
  // 1. Auth State — Delegated to Supabase AuthContext (single source of truth)
  // currentUser/activeRole now derived from Supabase session/profile, not localStorage
  // useAuth is unconditional here — AppProvider is always inside AuthProvider (see main.jsx)
  const auth = useAuth()
  const supaSession = auth?.session || null
  const supaProfile = auth?.profile || null
  const supaUser = auth?.user || null
  // --- Saved Addresses — per-user, Swiggy/Zomato style ---
  const getAddressesKey = (uid) => `${STORAGE_KEY_PREFIX}_addresses_${uid || 'guest'}`
  const buildFullAddress = (a) => {
    const parts = [a.houseFlat, a.apartment, a.streetArea, a.landmark, a.city, a.state, a.pincode ? `${a.state ? '' : ''}- ${a.pincode}`.replace('- ','') : ''].filter(Boolean)
    // fallback: if only raw fullAddress exists
    if (!parts.length && a.fullAddress) return a.fullAddress
    if (!parts.length && a.addressLine) return a.addressLine
    // construct clean: "Flat, Apartment, Street, Landmark, City, State - Pincode"
    const line = [a.houseFlat, a.apartment, a.streetArea].filter(Boolean).join(', ')
    const cityLine = [a.city, a.state].filter(Boolean).join(', ')
    const pin = a.pincode ? ` - ${a.pincode}` : ''
    const landmarkSeg = a.landmark ? `, ${a.landmark}` : ''
    if (line && cityLine) return `${line}${landmarkSeg}, ${cityLine}${pin}`
    if (line) return `${line}${landmarkSeg}${cityLine ? `, ${cityLine}` : ''}${pin}`
    return a.fullAddress || a.addressLine || ''
  }
  const normalizeAddress = (raw) => {
    const fa = buildFullAddress(raw)
    return {
      id: raw.id || `addr-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      label: raw.label || (raw.type === 'home' ? 'Home' : raw.type === 'work' ? 'Work' : raw.label || 'Other'),
      type: raw.type || (String(raw.label||'').toLowerCase()==='home'?'home': String(raw.label||'').toLowerCase()==='work'?'work':'other'),
      houseFlat: raw.houseFlat || '',
      apartment: raw.apartment || '',
      streetArea: raw.streetArea || '',
      landmark: raw.landmark || '',
      city: raw.city || '',
      state: raw.state || '',
      pincode: raw.pincode ? String(raw.pincode) : '',
      fullAddress: fa,
      addressLine: fa,
      coords: raw.coords || null,
      isDefault: !!raw.isDefault,
      createdAt: raw.createdAt || new Date().toISOString(),
    }
  }
  const [savedAddresses, setSavedAddresses] = useState(() => {
    try {
      const keys = Object.keys(localStorage).filter(k=>k.startsWith(`${STORAGE_KEY_PREFIX}_addresses_`))
      const guest = localStorage.getItem(getAddressesKey('guest'))
      if (guest) { const p=JSON.parse(guest); if(Array.isArray(p) && p.length>0) return p.map(normalizeAddress) }
      for (const k of keys) { try{ const v=JSON.parse(localStorage.getItem(k)); if(Array.isArray(v)&&v.length>0) return v.map(normalizeAddress)}catch{} }
      // No saved addresses — return empty (never Bengaluru fallback). User must set address or select location.
      return []
    } catch { return [] }
  })

  // Load per-user addresses when auth changes
  useEffect(() => {
    const uid = supaUser?.id || supaProfile?.id || null
    if (!uid) return
    try {
      const raw = localStorage.getItem(getAddressesKey(uid))
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length>0) { setSavedAddresses(parsed.map(normalizeAddress)); return }
        if (Array.isArray(parsed) && parsed.length===0) { /* ignore empty — reseed below */ }
      }
      const guestRaw = localStorage.getItem(getAddressesKey('guest'))
      if (guestRaw) {
        try { const g=JSON.parse(guestRaw); if(Array.isArray(g)&&g.length>0) { const norm=g.map(normalizeAddress); setSavedAddresses(norm); localStorage.setItem(getAddressesKey(uid), JSON.stringify(norm)); return } } catch {}
      }
      // if Supabase profile has saved_addresses column, try fetch (silent fallback)
      if (isSupabaseConfigured() && supaProfile) {
        // best-effort: if column exists, it will be in supaProfile; supabase fetchProfile already selected *
        const remote = supaProfile.saved_addresses || supaProfile.savedAddresses
        if (Array.isArray(remote) && remote.length) { setSavedAddresses(remote.map(normalizeAddress)); return }
      }
      // keep existing state (demo seed) if nothing found — persist it for this user
      setSavedAddresses(prev => {
        if (prev.length) { try{ localStorage.setItem(getAddressesKey(uid), JSON.stringify(prev)) }catch{} }
        return prev
      })
    } catch {}
  }, [supaUser?.id])

  // Persist per-user on change
  useEffect(() => {
    const uid = supaUser?.id || supaProfile?.id || 'guest'
    try { localStorage.setItem(getAddressesKey(uid), JSON.stringify(savedAddresses)) } catch {}
    // best-effort Supabase sync (if column exists, ignore error if not)
    if (uid !== 'guest' && isSupabaseConfigured() && supaProfile && savedAddresses.length>=0) {
      try { supabase.from('profiles').update({ saved_addresses: savedAddresses }).eq('id', uid).then(()=>{}).catch(()=>{}) } catch {}
    }
  }, [savedAddresses, supaUser?.id])

  const addAddress = (addr) => {
    const normalized = normalizeAddress({ ...addr, isDefault: savedAddresses.length===0 ? true : !!addr.isDefault })
    setSavedAddresses(prev => {
      // if new isDefault, unset others
      const updated = normalized.isDefault ? prev.map(a=>({ ...a, isDefault:false })) : prev
      return [...updated, normalized]
    })
    return normalized
  }
  const updateAddress = (id, patch) => {
    setSavedAddresses(prev => prev.map(a => {
      if (a.id !== id) return patch.isDefault ? { ...a, isDefault:false } : a
      const merged = normalizeAddress({ ...a, ...patch, id })
      // ensure fullAddress recomputed from parts
      merged.fullAddress = buildFullAddress(merged)
      merged.addressLine = merged.fullAddress
      return merged
    }))
  }
  const deleteAddress = (id) => {
    setSavedAddresses(prev => {
      const filtered = prev.filter(a=>a.id!==id)
      // if deleted was default, make first remaining default
      if (prev.find(a=>a.id===id)?.isDefault && filtered.length) filtered[0].isDefault = true
      return filtered
    })
  }
  const setDefaultAddress = (id) => {
    setSavedAddresses(prev => prev.map(a=> ({ ...a, isDefault: a.id===id })))
  }

  const currentUser = supaProfile ? {
    id: supaProfile.id,
    name: supaProfile.full_name,
    email: supaProfile.email,
    phone: supaProfile.phone || supaUser?.user_metadata?.phone || null,
    phone_verified: supaProfile.phone_verified || false,
    role: supaProfile.role,
    avatar: supaProfile.avatar_url || supaUser?.user_metadata?.avatar_url || (supaProfile.role === 'provider' ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
    location: savedAddresses.find(a=>a.isDefault)?.fullAddress || savedAddresses[0]?.fullAddress || null,
    isCoopMember: supaProfile.role === 'provider',
    savedAddresses,
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
  const [societies, setSocieties] = useState([]);
  const [societiesLoading, setSocietiesLoading] = useState(false);
  const [societyRequests, setSocietyRequests] = useState([]);
  const [societyRequestsLoading, setSocietyRequestsLoading] = useState(false);

  // Earnings derived from bookings (Supabase view), not separate localStorage
  const [earningsLedger, setEarningsLedger] = useState([]);

  const [supportTickets, setSupportTickets] = useState(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}_tickets`);
    return saved ? JSON.parse(saved) : INITIAL_SUPPORT_TICKETS;
  });
  const [supportTicketsLoading, setSupportTicketsLoading] = useState(false);

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
    try {
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed) return null;
        // Legacy string fallback — treat as unknown (do not restore Bengaluru)
        if (typeof parsed === 'string') {
          const lower = parsed.toLowerCase();
          if (lower.includes('bengaluru') || lower.includes('indiranagar')) return null;
          return { name: parsed, source: 'manual' };
        }
        if (parsed && typeof parsed === 'object' && parsed.lat != null && parsed.lng != null) {
          // Detect legacy hard-coded Bengaluru default (12.9784,77.6408) without source — treat as unknown if it matches exactly and was auto-persisted
          const isLegacyDefault = parsed.lat === 12.9784 && parsed.lng === 77.6408 && parsed.name?.toLowerCase().includes('bengaluru') && !parsed.source;
          if (isLegacyDefault) return null;
          return { ...parsed, source: parsed.source || 'manual' };
        }
        if (parsed && parsed.city && parsed.lat == null) return parsed;
      }
    } catch {}
    return null; // unknown — never Bengaluru
  });
  const [locationStatus, setLocationStatus] = useState(() => {
    // if we restored a valid location, status is available, else detecting
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}_location`);
      if (saved) {
        const p = JSON.parse(saved);
        if (p && typeof p === 'object' && p.lat != null) return 'available';
      }
    } catch {}
    return 'detecting';
  });
  const [locationError, setLocationError] = useState(null);

  // GPS auto-detection — one controlled initial flow, never Bengaluru fallback
  React.useEffect(() => {
    let cancelled = false;
    // If we already restored a valid location, don't auto-request
    if (selectedLocation && selectedLocation.lat != null && selectedLocation.lng != null) {
      setLocationStatus('available');
      return;
    }
    // Only run when status is detecting and no location
    if (locationStatus !== 'detecting') return;
    if (!isGeolocationSupported()) {
      if (!cancelled) {
        setLocationStatus('unavailable');
        setLocationError('Geolocation not supported');
      }
      return;
    }
    getCurrentPosition({ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 })
      .then(async (pos) => {
        if (cancelled) return;
        const { lat, lng, accuracy } = pos;
        let cityInfo = null;
        let displayName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        let state = null;
        let pincode = null;
        try {
          const rev = await reverseGeocode(lat, lng);
          displayName = rev.name || displayName;
          const addr = rev.raw?.address || {};
          state = addr.state || null;
          pincode = addr.postcode || null;
          // Try to derive city from reverse geocode as well, but primary is coords via resolveCity
          const viaCoords = resolveCity({ lat, lng, pincode, name: rev.name, text: rev.full });
          cityInfo = viaCoords;
          if (viaCoords?.city) {
            // within supported 50km
            displayName = viaCoords.city; // canonical city for display, but keep full name as alternative
            // Use hub's city name as canonical, but preserve readable name
            // We'll set name to rev.name for readability, city field separate
            displayName = rev.name;
          } else if (viaCoords && viaCoords.supported === false && viaCoords.city == null) {
            // outside coverage — keep coords, city null, mark unsupported
            setLocationStatus('unsupported');
            setLocationError('Zolve is currently not available in this area.');
            const loc = { lat, lng, city: null, name: displayName, source: 'gps', pincode, state, accuracy, supported: false, timestamp: Date.now() };
            setSelectedLocation(loc);
            return;
          }
        } catch {
          // reverse geocode failed but GPS coords available — keep coords, allow manual city
          cityInfo = resolveCity({ lat, lng });
        }
        const finalCity = cityInfo?.city || null;
        const supported = cityInfo?.supported !== false;
        if (finalCity == null && cityInfo && cityInfo.supported === false) {
          setLocationStatus('unsupported');
          setLocationError('Zolve is currently not available in this area.');
        } else {
          setLocationStatus('available');
          setLocationError(null);
        }
        const loc = {
          lat,
          lng,
          city: finalCity,
          name: displayName,
          source: 'gps',
          pincode,
          state,
          accuracy,
          supported,
          timestamp: Date.now(),
          hub_id: cityInfo?.hub_id || null,
        };
        setSelectedLocation(loc);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err?.message || '';
        const code = err?.code;
        // Map GeolocationPositionError codes
        if (code === 1 || /denied|permission/i.test(msg)) {
          setLocationStatus('denied');
          setLocationError('Location access was denied.');
        } else if (code === 2 || /unavailable|position/i.test(msg)) {
          setLocationStatus('unavailable');
          setLocationError('Unable to detect your location.');
        } else if (code === 3 || /timeout/i.test(msg)) {
          setLocationStatus('timeout');
          setLocationError('Location request timed out.');
        } else {
          setLocationStatus('unavailable');
          setLocationError('Unable to detect your location.');
        }
        // Keep selectedLocation as null — never Bengaluru
        setSelectedLocation(null);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // Wrap setSelectedLocation to always stamp source and handle unsupported
  const setSelectedLocationWithSource = React.useCallback((loc) => {
    if (!loc) {
      setSelectedLocation(null);
      setLocationStatus('unknown');
      setLocationError(null);
      return;
    }
    // If loc is string legacy, convert
    if (typeof loc === 'string') {
      setSelectedLocation({ name: loc, source: 'manual', city: null, lat: null, lng: null, supported: false });
      setLocationStatus('manual');
      return;
    }
    // Manual map pick should override
    const hasCoords = loc.lat != null && loc.lng != null;
    let resolved = null;
    if (hasCoords) {
      resolved = resolveCity({ lat: loc.lat, lng: loc.lng, pincode: loc.pincode, name: loc.name, text: loc.name });
      if (resolved && resolved.city == null && resolved.supported === false) {
        // unsupported area — keep coords but city null, show not available
        const newLoc = { ...loc, city: null, source: loc.source || 'manual', supported: false, hub_id: null, timestamp: Date.now() };
        setSelectedLocation(newLoc);
        setLocationStatus('unsupported');
        setLocationError('Zolve is currently not available in this area.');
        return;
      }
    }
    const final = {
      ...loc,
      city: loc.city ?? resolved?.city ?? null,
      hub_id: loc.hub_id ?? resolved?.hub_id ?? null,
      source: loc.source || 'manual',
      supported: resolved ? resolved.supported !== false : loc.supported ?? true,
      timestamp: Date.now(),
    };
    setSelectedLocation(final);
    setLocationStatus(final.source === 'pincode' ? 'available' : 'manual');
    setLocationError(null);
  }, []);

  // Canonical location helper — single source of truth for all geo-dependent modules
  const getCanonicalUserLocation = React.useCallback(() => {
    // Priority: 1) GPS/manual coords 2) manually selected city 3) pincode 4) unknown
    if (selectedLocation && selectedLocation.lat != null && selectedLocation.lng != null) {
      const resolved = resolveCity({ lat: selectedLocation.lat, lng: selectedLocation.lng, pincode: selectedLocation.pincode, name: selectedLocation.name, text: selectedLocation.name });
      return {
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        city: resolved?.city || selectedLocation.city || null,
        source: selectedLocation.source || 'unknown',
        supported: resolved?.supported !== false && selectedLocation.supported !== false,
        hub_id: resolved?.hub_id || selectedLocation.hub_id || null,
        pincode: selectedLocation.pincode || resolved?.pincode || null,
        name: selectedLocation.name || null,
        timestamp: selectedLocation.timestamp || null,
      };
    }
    if (selectedLocation?.city) {
      const viaText = resolveCity({ text: selectedLocation.city, name: selectedLocation.name, pincode: selectedLocation.pincode });
      return {
        latitude: selectedLocation.lat ?? null,
        longitude: selectedLocation.lng ?? null,
        city: viaText?.city || selectedLocation.city,
        source: selectedLocation.source || 'manual',
        supported: viaText?.supported !== false,
        hub_id: viaText?.hub_id || selectedLocation.hub_id || null,
        pincode: selectedLocation.pincode || null,
        name: selectedLocation.name || null,
        timestamp: selectedLocation.timestamp || null,
      };
    }
    if (selectedLocation?.pincode) {
      const viaPin = resolveCity({ pincode: selectedLocation.pincode });
      if (viaPin?.city) {
        return { latitude: viaPin.coords?.lat ?? null, longitude: viaPin.coords?.lng ?? null, city: viaPin.city, source: 'pincode', supported: true, hub_id: viaPin.hub_id, pincode: viaPin.pincode, name: selectedLocation.name || null, timestamp: selectedLocation.timestamp || null };
      }
    }
    return { latitude: null, longitude: null, city: null, source: 'unknown', supported: false, hub_id: null, pincode: null, name: null, timestamp: null };
  }, [selectedLocation]);

  // Dev-only diagnostic helper
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      try { window.getCanonicalUserLocation = getCanonicalUserLocation; } catch {}
    }
  }, [getCanonicalUserLocation]);

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

  // Fetch societies (public, per city) — Supabase source of truth, 21 cities embedded
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const fetchSocieties = async () => {
      setSocietiesLoading(true);
      try {
        const all = await SocietyService.fetchAllSocieties();
        setSocieties(all);
        // Also update legacy societyData for current city (Kolkata→Kolkata society, Mumbai→Mumbai, etc.) — never Bengaluru fallback
        const resolved = resolveCity({ lat: selectedLocation?.lat, lng: selectedLocation?.lng, name: selectedLocation?.name });
        const currentCity = resolved?.city || null;
        if (!currentCity || resolved?.supported === false) {
          // location unknown or unsupported — do not auto-assign Bengaluru, keep societies list but don't select
          return;
        }
        const match = all.find(s => s.city === currentCity) || null;
        if (match) {
          setSocietyData({
            name: match.name,
            location: match.location,
            manager: match.manager_name || match.manager || 'Society Manager',
            units: match.units,
            blocks: match.blocks,
            stats: typeof match.stats === 'string' ? JSON.parse(match.stats) : match.stats,
            // keep activeRequests from society_requests fetched separately
            activeRequests: societyData.activeRequests || SOCIETY_DATA.activeRequests,
            city: match.city,
            hub_id: match.hub_id,
            coords: match.coords,
            pincode: match.pincode,
            id: match.id,
          });
        }
      } catch (e) {
        console.warn('[societies] fetch error', e?.message || e);
      } finally { setSocietiesLoading(false); }
    };
    fetchSocieties();
  }, [selectedLocation?.lat, selectedLocation?.lng, selectedLocation?.name]);

  // Fetch society requests for current city (global admin sees all, customer sees own city)
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const fetchReqs = async () => {
      setSocietyRequestsLoading(true);
      try {
        const currentCity = resolveCity({ lat: selectedLocation?.lat, lng: selectedLocation?.lng, name: selectedLocation?.name })?.city;
        // Fetch all requests then filter by city if needed; SocietyService handles city param
        // For global view we fetch all; dashboard will filter
        const reqs = await SocietyService.fetchSocietyRequests(currentCity ? { city: currentCity } : {});
        setSocietyRequests(reqs);
      } catch (e) {
        console.warn('[society_requests] fetch error', e?.message || e);
      } finally { setSocietyRequestsLoading(false); }
    };
    fetchReqs();
  }, [selectedLocation?.lat, selectedLocation?.lng, selectedLocation?.name, supaUser?.id]);

  // Fetch support tickets (Supabase unified) — real persistence, not localStorage
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    if (!supaUser?.id) {
      // Guest sees fallback mock tickets only
      return;
    }
    const fetchTickets = async () => {
      setSupportTicketsLoading(true);
      try {
        const isAdmin = supaProfile?.role === 'admin' || supaProfile?.role === 'society_admin';
        const data = isAdmin
          ? await SupportTicketService.fetchAllTicketsAdmin({})
          : await SupportTicketService.fetchMyTickets(supaUser);
        setSupportTickets(data);
      } catch (e) {
        console.warn('[support_tickets] fetch error', e?.message || e);
      } finally { setSupportTicketsLoading(false); }
    };
    fetchTickets();
  }, [supaUser?.id, supaProfile?.role]);

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

  const registerExecutive = async (formData) => {
    const vertical = formData.executiveVertical;
    const requiresApproval = vertical === 'community';
    const localApp = {
      id: `exec-app-${Date.now()}`,
      vertical,
      status: requiresApproval ? 'pending_approval' : 'active',
      applicantName: formData.fullName,
      applicantPhone: formData.mobileNumber,
      applicantEmail: formData.gmailAddress,
      createdAt: new Date().toISOString()
    };

    // Try Supabase persistence first when configured and user is authenticated
    let persistedApp = null
    let supaError = null
    if (isSupabaseConfigured() && supaUser?.id) {
      try {
        const res = await ExecutiveApplicationService.submitApplication(formData, supaUser)
        // res.status is 'pending' or 'approved' (canonical). Map to legacy for local state compatibility
        persistedApp = res
        // Create a unified app object that preserves both canonical and legacy status for UI
        const unified = {
          ...localApp,
          id: res.id || localApp.id,
          status: res.status === 'pending' ? 'pending_approval' : res.status === 'approved' ? 'active' : res.status,
          // also keep canonical for accurate display
          canonicalStatus: res.status,
          applicantId: res.applicantId || supaUser.id,
          createdAt: res.createdAt || localApp.createdAt,
          services: res.services || verticalServices(vertical),
        }
        setExecutiveApplications((prev) => [unified, ...prev]);
        localApp.canonicalStatus = res.status
        localApp.id = res.id
      } catch (e) {
        supaError = e
        console.warn('[registerExecutive] Supabase insert failed, falling back to local', e?.message || e)
        setExecutiveApplications((prev) => [localApp, ...prev]);
      }
    } else {
      // No Supabase session — fallback to local only (dev mode). Still show pending UI, but remind to sign in for real persistence.
      if (isSupabaseConfigured() && !supaUser?.id) {
        console.warn('[registerExecutive] No authenticated user — application stored locally only. Sign in for persisted approval queue.')
      }
      setExecutiveApplications((prev) => [localApp, ...prev]);
    }

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
      location: selectedLocation?.name || selectedLocation?.city || null,
      assignedServices: EXECUTIVE_VERTICALS.find(v => v.id === vertical)?.services || []
    };

    if (!requiresApproval) {
      // keep existing deprecated behavior for non-community (no approval needed)
      addNotification({ title: 'Executive Registration Complete', message: `Welcome, ${executiveUser.name}! Vertical: ${vertical}`, type: 'system' });
    } else {
      addNotification({ title: 'Executive Application Submitted', message: 'Community executive requires Society Admin approval. You will be activated shortly.', type: 'system' });
    }
    const app = persistedApp ? { ...localApp, ...persistedApp, canonicalStatus: persistedApp.status } : localApp
    return { app, executiveUser, requiresApproval, supaError };
  };

  const verticalServices = (vid) => EXECUTIVE_VERTICALS.find(v => v.id === vid)?.services || []

  const approveExecutiveApplication = async (appId) => {
    // Try Supabase first
    if (isSupabaseConfigured() && supaUser?.id) {
      try {
        // Check if admin
        const isAdmin = supaProfile?.role === 'admin'
        if (isAdmin) {
          await ExecutiveApplicationService.approveApplication(appId, supaUser)
        } else {
          // For local fallback or non-supabase, try supabase anyway — RLS will enforce; fallback to local
          try { await ExecutiveApplicationService.approveApplication(appId, supaUser) } catch {}
        }
      } catch (e) {
        console.warn('[approveExecutiveApplication] Supabase approve failed', e?.message || e)
      }
    }
    setExecutiveApplications((prev) => prev.map(a => a.id === appId ? { ...a, status: 'active', canonicalStatus: 'approved', approvedAt: new Date().toISOString() } : a));
    if (currentUser && currentUser.role === 'executive' && currentUser.executiveStatus === 'pending_approval') {
      const updated = { ...currentUser, executiveStatus: 'active' };
      setCurrentUser(updated);
    }
    addNotification({ title: 'Executive Approved', message: `Application ${appId} approved by Society Admin.`, type: 'system' });
  };

  const rejectExecutiveApplication = async (appId, reason) => {
    if (isSupabaseConfigured() && supaUser?.id) {
      try {
        if (supaProfile?.role === 'admin' && reason) {
          await ExecutiveApplicationService.rejectApplication(appId, supaUser, reason)
        } else if (reason) {
          try { await ExecutiveApplicationService.rejectApplication(appId, supaUser, reason) } catch {}
        }
      } catch (e) {
        console.warn('[rejectExecutiveApplication] Supabase reject failed', e?.message || e)
      }
    }
    setExecutiveApplications((prev) => prev.map(a => a.id === appId ? { ...a, status: 'rejected', canonicalStatus: 'rejected', rejectionReason: reason || a.rejectionReason } : a));
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

  // Support / Dispute Ticket Creation — Supabase persisted (unified disputes)
  const createSupportTicket = async (ticketData) => {
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
    // Try Supabase first
    if (isSupabaseConfigured() && supaUser?.id) {
      try {
        const ticket = await SupportTicketService.createTicket(
          { ...ticketData, selectedLocation },
          supaUser,
          supaProfile
        );
        // Map to legacy shape for existing UI (keep both)
        const mapped = {
          id: ticket.id,
          ticketCode: ticket.ticketCode,
          ticket_code: ticket.ticketCode,
          userName: ticket.userName,
          user_name: ticket.userName,
          userRole: ticket.userRole || activeRole,
          bookingCode: ticket.bookingCode || ticketData.bookingCode,
          booking_code: ticket.bookingCode || ticketData.bookingCode,
          category: ticket.category,
          description: ticket.description,
          status: ticket.status,
          resolutionNotes: ticket.resolutionNotes,
          resolution_notes: ticket.resolutionNotes,
          createdAt: ticket.createdAt,
          created_at: ticket.createdAt,
          city: ticket.city,
          hub_id: ticket.hub_id,
          _supabase: true,
        };
        setSupportTickets((prev) => [mapped, ...prev]);
        addNotification({
          title: `Ticket #${ticket.ticketCode} Raised`,
          message: `Our Trust & Safety Arbitration Council is reviewing your case (${ticket.city || 'your city'}).`,
          type: 'system'
        });
        return mapped;
      } catch (e) {
        console.warn('[createSupportTicket] Supabase failed, falling back to local', e?.message || e);
      }
    }
    // Fallback local (dev without Supabase or unauthenticated edge) — never Bengaluru
    const resolvedFallback = resolveCity({ lat: selectedLocation?.lat, lng: selectedLocation?.lng, name: selectedLocation?.name });
    const newTicket = {
      id: `tkt-${Date.now()}`,
      ticketCode: `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
      userName: currentUser.name,
      userRole: activeRole,
      createdAt: new Date().toISOString(),
      status: 'open',
      city: resolvedFallback?.city || null,
      hub_id: resolvedFallback?.hub_id || null,
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

  const updateSupportTicketStatus = async (ticketId, patch) => {
    if (!isSupabaseConfigured() || !supaUser?.id) {
      // local fallback
      setSupportTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...patch, status: patch.status || t.status, resolutionNotes: patch.resolution_notes || patch.resolutionNotes || t.resolutionNotes, updatedAt: new Date().toISOString() } : t));
      return;
    }
    try {
      const updated = await SupportTicketService.updateTicketStatus(ticketId, { status: patch.status, resolution_notes: patch.resolution_notes || patch.resolutionNotes }, supaUser);
      setSupportTickets(prev => prev.map(t => t.id === ticketId ? {
        ...t,
        status: updated.status,
        resolutionNotes: updated.resolutionNotes,
        resolution_notes: updated.resolution_notes,
        assignedAdminId: updated.assignedAdminId,
        updatedAt: updated.updatedAt,
      } : t));
      // Refresh from server for admin global view
      if (supaProfile?.role === 'admin' || supaProfile?.role === 'society_admin') {
        try {
          const all = await SupportTicketService.fetchAllTicketsAdmin({});
          setSupportTickets(all.map(r => ({
            id: r.id, ticketCode: r.ticketCode, userName: r.userName, userRole: r.userRole,
            bookingCode: r.bookingCode, category: r.category, description: r.description,
            status: r.status, resolutionNotes: r.resolutionNotes, createdAt: r.createdAt, city: r.city, hub_id: r.hub_id
          })));
        } catch {}
      }
      addNotification({ title: `Ticket ${patch.status}`, message: `Ticket #${ticketId} marked ${patch.status}`, type: 'system' });
      return updated;
    } catch (e) {
      console.warn('[updateSupportTicketStatus] failed', e?.message || e);
      throw e;
    }
  };

  const createSocietyRequest = async (requestData) => {
    if (!currentUser || activeRole !== 'customer') {
      addNotification({ title: 'Sign in required', message: 'Please sign in as a User to raise a Society ticket.', type: 'system' });
      setAuthModalTab('register'); setIsAuthModalOpen(true); return null;
    }
    if (isSupabaseConfigured() && supaUser?.id) {
      try {
        const created = await SocietyService.createSocietyRequest(
          { ...requestData, selectedLocation },
          supaUser,
          supaProfile
        );
        const mapped = {
          id: created.id,
          society_id: created.society_id,
          society_name: created.society_name,
          city: created.city,
          hub_id: created.hub_id,
          unit: created.unit_or_block,
          unit_or_block: created.unit_or_block,
          service: created.service_type,
          service_type: created.service_type,
          priority: created.priority,
          status: created.status,
          provider: created.assigned_provider_name || 'Cooperative Team',
          assigned_provider_name: created.assigned_provider_name,
          date: new Date(created.created_at).toLocaleString(),
          created_at: created.created_at,
          description: created.description,
        };
        setSocietyRequests(prev => [mapped, ...prev]);
        // Update legacy societyData.activeRequests for backward compat
        setSocietyData(prev => ({ ...prev, activeRequests: [mapped, ...(prev.activeRequests || [])].slice(0, 20) }));
        addNotification({ title: 'Society Ticket Raised', message: `Society request for ${mapped.society_name} (${mapped.city}) dispatched.`, type: 'system' });
        return mapped;
      } catch (e) {
        console.warn('[createSocietyRequest] Supabase failed', e?.message || e);
        throw e;
      }
    }
    // fallback local — never Bengaluru
    const resolvedSocFallback = resolveCity({ lat: selectedLocation?.lat, lng: selectedLocation?.lng, name: selectedLocation?.name });
    const newReq = {
      id: `soc-req-${Date.now()}`,
      unit: requestData.unit_or_block || requestData.unit,
      service: `${requestData.service_type || 'General'} - ${String(requestData.description || '').substring(0, 30)}...`,
      priority: requestData.priority || 'Normal',
      status: 'PENDING',
      provider: 'Cooperative Team',
      date: 'Today, Scheduled',
      city: resolvedSocFallback?.city || null,
      hub_id: resolvedSocFallback?.hub_id || null,
      ...requestData,
    };
    setSocietyRequests(prev => [newReq, ...prev]);
    setSocietyData(prev => ({ ...prev, activeRequests: [newReq, ...(prev.activeRequests || [])] }));
    addNotification({ title: 'Society Maintenance Request Dispatched', message: `${newReq.priority} priority ticket dispatched.`, type: 'system' });
    return newReq;
  };

  const updateSocietyRequestStatus = async (requestId, patch) => {
    if (!isSupabaseConfigured() || !supaUser?.id) {
      setSocietyRequests(prev => prev.map(r => r.id === requestId ? { ...r, ...patch, status: patch.status || r.status } : r));
      return;
    }
    try {
      const updated = await SocietyService.updateRequestStatus(requestId, patch, supaUser);
      setSocietyRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: updated.status, provider: updated.assigned_provider_name || r.provider } : r));
      return updated;
    } catch (e) {
      console.warn('[updateSocietyRequestStatus] failed', e?.message || e);
      throw e;
    }
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
        ExecutiveApplicationService,
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
        societies,
        societiesLoading,
        societyRequests,
        societyRequestsLoading,
        earningsLedger,
        supportTickets,
        supportTicketsLoading,
        createSupportTicket,
        updateSupportTicketStatus,
        createSocietyRequest,
        updateSocietyRequestStatus,
        SupportTicketService,
        SocietyService,
        approveProviderKYC,
        notifications,
        addNotification,
        markNotificationRead,
        selectedLocation,
        setSelectedLocation: setSelectedLocationWithSource,
        getCanonicalUserLocation,
        locationStatus,
        locationError,
        setLocationStatus: setLocationStatus,
        providerLiveLocations,
        setProviderLiveLocations,
        updateProviderLiveLocation,
        // --- Saved Addresses (Swiggy/Zomato style) ---
        savedAddresses,
        setSavedAddresses,
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
        buildFullAddress,
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

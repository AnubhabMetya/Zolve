import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Sparkles,
  MapPin,
  ShieldCheck,
  Star,
  Clock,
  ArrowRight,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Award,
  Zap,
  Building,
  HeartHandshake,
  Wrench,
  ChevronRight,
  TrendingUp,
  Sun,
  Moon
} from 'lucide-react';
import { classifyServiceQuery } from '../../services/aiEngine';
import { ImageServiceDetector } from '../ai/ImageServiceDetector';
import { SemanticServiceMatcher } from '../ai/SemanticServiceMatcher';
import { haversineKm, SERVICE_RADIUS_KM } from '../../services/locationService';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
};

const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.02, y: -4, transition: { duration: 0.25, ease: 'easeOut' } }
};

export const CustomerDashboard = ({ onOpenSearchWithCategory }) => {
  const {
    currentUser,
    selectedLocation,
    locationStatus,
    locationError,
    setIsLocationModalOpen,
    serviceCategories,
    providers,
    bookings,
    setSelectedProviderForBooking,
    setSelectedProviderForProfile,
    setActiveBookingForTracking,
    setActiveTab,
    setIsCopilotOpen,
    setIsAuthModalOpen,
    setAuthModalTab,
    theme,
    toggleTheme,
    savedAddresses
  } = useApp();

  const requireAuthOrRedirect = () => {
    if (!currentUser) {
      setAuthModalTab('register');
      setIsAuthModalOpen(true);
      return false;
    }
    return true;
  };

  const userCoords = React.useMemo(() => {
    if (!selectedLocation) return null;
    if (typeof selectedLocation === 'string') return null;
    if (selectedLocation.lat != null && selectedLocation.lng != null) return { lat: selectedLocation.lat, lng: selectedLocation.lng };
    return null;
  }, [selectedLocation]);

  const defaultSavedCoords = React.useMemo(() => {
    const def = savedAddresses?.find(a => a.isDefault) || savedAddresses?.[0];
    return def?.coords || null;
  }, [savedAddresses]);

  const nearbyProviders = React.useMemo(() => {
    if (!userCoords && !defaultSavedCoords) return [];
    return providers.filter(p => {
      if (!p.coords) return false;
      const dLive = userCoords ? haversineKm(userCoords.lat, userCoords.lng, p.coords.lat, p.coords.lng) : 999;
      const dSaved = defaultSavedCoords ? haversineKm(defaultSavedCoords.lat, defaultSavedCoords.lng, p.coords.lat, p.coords.lng) : 999;
      // Hide booking details beyond 50km from BOTH saved and live — visible if within 50km of either
      return Math.min(dLive, dSaved) <= SERVICE_RADIUS_KM;
    });
  }, [providers, userCoords, defaultSavedCoords]);

  const nearbyCoopCount = nearbyProviders.filter(p => p.isCoopMember).length;
  const hasCoverage = nearbyProviders.length > 0;

  const MOST_BOOKED_SERVICES = [
    { id: 'srv-clean-01', name: 'Full Home Deep Cleaning', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80', rating: '4.80', count: '6.9M', price: 918, original: 998 },
    { id: 'srv-elec-01', name: 'Electrical Repair & Wiring', image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80', rating: '4.75', count: '2.9M', price: 599, original: null },
    { id: 'srv-ac-01', name: 'AC Deep Foam Jet Servicing', image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&auto=format&fit=crop&q=80', rating: '4.73', count: '859K', price: 299, original: null },
    { id: 'srv-soc-tank-01', name: 'Water Sump & Overhead Tank Cleaning', image: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&auto=format&fit=crop&q=80', rating: '4.86', count: '483K', price: 259, original: null },
  ];

  const LATEST_SERVICES = [
    { id: 'srv-car-wash', name: 'Car Washing', image: 'https://images.unsplash.com/photo-1552933529-e3b0c0ea9a90?w=600&auto=format&fit=crop&q=80', rating: '4.82', count: '3.1K', price: 499, original: null, badge: 'New' },
    { id: 'srv-closet', name: 'Closet Organiser', image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600&auto=format&fit=crop&q=80', rating: '4.78', count: '2.4K', price: 799, original: 999, badge: 'New' },
  ];

  const UPCOMING_SERVICES = [
    { id: 'srv-laundry', name: 'House Pickup Laundry Services', image: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=600&auto=format&fit=crop&q=80', rating: null, count: null, price: null, badge: 'Coming Soon' },
  ];

  const handleMostBookedBooking = (service) => {
    if (!requireAuthOrRedirect()) return;
    if (!hasCoverage) return;
    // 2-3 executives per cooperative job per location — pick randomly among nearby 50km matching that service (strict radius)
    const svcNameLower = service.name.toLowerCase();
    let eligible = nearbyProviders.filter(p =>
      p.isCoopMember &&
      (p.serviceCategories?.some(c => c.toLowerCase().includes(svcNameLower.split(' ')[0])) ||
       p.serviceCategories?.some(c => svcNameLower.includes(c.toLowerCase())) ||
       p.serviceCategories?.some(c => c.toLowerCase() === 'cleaning' && svcNameLower.includes('cleaning')) ||
       p.serviceCategories?.some(c => c.toLowerCase() === 'electrical' && svcNameLower.includes('electrical')) ||
       p.serviceCategories?.some(c => c.toLowerCase().includes('appliance') && svcNameLower.includes('ac')) ||
       p.serviceCategories?.some(c => c.toLowerCase().includes('apartment maintenance') && svcNameLower.includes('sump')) ||
       p.skills?.some(s => svcNameLower.includes(s.toLowerCase().split(' ')[0])))
    );
    // Fallback: any nearby 50km coop member that lists any of the 4 most-booked services generically
    if (eligible.length < 2) {
      const fallback = nearbyProviders.filter(p => p.isCoopMember);
      eligible = fallback.length ? fallback : nearbyProviders;
    }
    if (!eligible.length) return;
    // Ensure 2-3 executives per job — shuffle and pick random
    const shuffled = [...eligible].sort(() => 0.5 - Math.random());
    const chosen = shuffled[Math.floor(Math.random() * shuffled.length)];
    // Pass service context to booking modal via title override
    setSelectedProviderForBooking({ ...chosen, title: service.name, displayServiceName: service.name, isMostBookedBooking: true, originalPrice: service.original });
  };

  const handleLatestBooking = (service) => {
    if (!requireAuthOrRedirect()) return;
    if (!hasCoverage) return;
    const svcNameLower = service.name.toLowerCase();
    let eligible = nearbyProviders.filter(p => p.isCoopMember && p.serviceCategories?.some(c => svcNameLower.includes(c.toLowerCase().split(' ')[0]) || c.toLowerCase().includes(svcNameLower.split(' ')[0])));
    if (eligible.length < 2) {
      const fallback = nearbyProviders.filter(p => p.isCoopMember);
      eligible = fallback.length ? fallback : nearbyProviders;
    }
    if (!eligible.length) return;
    const chosen = [...eligible].sort(() => 0.5 - Math.random())[Math.floor(Math.random() * eligible.length)];
    setSelectedProviderForBooking({ ...chosen, title: service.name, displayServiceName: service.name, isMostBookedBooking: true, originalPrice: service.original });
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [aiClassification, setAiClassification] = useState(null);

  // Active / Upcoming bookings — filtered to own customerId only (zero history until booking)
  const visibleBookings = currentUser ? bookings.filter(b => {
    if (currentUser.role === 'customer') return b.customerId === currentUser.id;
    if (currentUser.role === 'admin') return true;
    return false;
  }) : [];
  const activeBookings = visibleBookings.filter(
    (b) =>
      b.bookingStatus !== 'SERVICE_COMPLETED' &&
      b.bookingStatus !== 'CANCELLED' &&
      b.bookingStatus !== 'REFUNDED'
  );
  const completedBookings = visibleBookings.filter((b) => b.bookingStatus === 'SERVICE_COMPLETED');

  // Handle live AI typing classification
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length > 3) {
      const match = classifyServiceQuery(val);
      setAiClassification(match);
    } else {
      setAiClassification(null);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (!requireAuthOrRedirect()) return;
    onOpenSearchWithCategory(searchQuery);
  };

  return (
    <div className="space-y-12 pb-16">
      {/* 1. HERO SECTION WITH AI SEARCH */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative rounded-3xl bg-gradient-to-br from-brand-900 via-brand-950 to-coop-950 text-white p-6 sm:p-10 lg:p-12 overflow-hidden shadow-2xl"
      >
        {/* Animated decorative blobs */}
        <motion.div
          animate={{ x: [0, 15, -10, 0], y: [0, -10, 15, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-brand-500/15 blur-3xl pointer-events-none"
        />
        <motion.div
          animate={{ x: [0, -15, 10, 0], y: [0, 10, -15, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 rounded-full bg-coop-500/15 blur-3xl pointer-events-none"
        />

        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-xs font-bold text-white transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-slate-200" />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
        <div className="relative z-10 max-w-3xl space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-xs font-semibold text-coop-300"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>Cooperative Gig-Services Ecosystem</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-black font-display tracking-tight text-white leading-tight"
          >
            How can we help today?
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-2xl font-medium"
          >
            Book certified electricians, plumbers, cleaning teams, appliance experts, and personal care professionals backed by democratic cooperative standards.
          </motion.p>

          {/* LARGE SMART AI SEARCH BAR */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="pt-2"
          >
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="relative flex items-center bg-white rounded-2xl shadow-premium p-1.5 focus-within:ring-4 focus-within:ring-coop-500/30 transition-all border border-slate-200">
                <Search className="w-5 h-5 text-slate-400 ml-3.5 shrink-0" />
                <input
                  type="text"
                  placeholder="Describe your issue... e.g. 'my kitchen sink is leaking' or 'MCB tripping'"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-3 pr-4 py-3 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none bg-transparent"
                />
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span>Search</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {/* AI INTENT CLASSIFICATION CHIP */}
            {aiClassification && (
              <div className="mt-3 p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-coop-500/20 text-coop-300">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">
                      AI Intent Matched: <strong className="text-coop-300">{aiClassification.serviceName}</strong>
                    </span>
                    <span className="text-slate-300 text-[11px] block sm:inline sm:ml-2">
                      (Est. ₹{aiClassification.estimatedPriceRange.min} - ₹{aiClassification.estimatedPriceRange.max} • {aiClassification.urgency} Urgency)
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!requireAuthOrRedirect()) return;
                    onOpenSearchWithCategory(aiClassification.serviceName);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-coop-500 hover:bg-coop-600 text-white font-bold text-[11px] shrink-0 transition-colors"
                >
                  View Matched Providers →
                </button>
              </div>
            )}
          </motion.div>

          {/* Quick Search Chips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            className="flex flex-wrap items-center gap-2 text-xs text-slate-300 pt-1"
          >
            <span className="text-slate-400 font-medium">Quick find:</span>
            {['Kitchen Leak Fix', 'Deep Home Cleaning', 'AC Foam Jet', 'Electrician', 'Home Chef', 'Elder Care'].map((tag, i) => (
              <motion.button
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + i * 0.05 }}
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.2)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSearchQuery(tag);
                  setAiClassification(classifyServiceQuery(tag));
                }}
                className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-xs text-slate-200"
              >
                {tag}
              </motion.button>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* 1b. IMAGE-TO-SERVICE AI DETECTOR — anonymous upload -> direct BookingModal */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.4 }}
      >
        <ImageServiceDetector />
      </motion.div>

      {/* 1c. SEMANTIC SERVICE MATCHING — Feature 1 (embeddings precomputed, no API key) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.56, duration: 0.4 }}
      >
        <SemanticServiceMatcher onSelectServiceName={(name) => onOpenSearchWithCategory(name)} />
      </motion.div>

      {/* 2. UPCOMING / ACTIVE BOOKINGS WIDGET */}
      {activeBookings.length > 0 && (
        <motion.section
          initial="visible"
          animate="visible"
          variants={staggerContainer}
          className="space-y-4"
        >
          <motion.div variants={fadeInUp} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-coop-500 animate-ping"></div>
              <h2 className="text-2xl font-black text-slate-900 font-display tracking-tight">Active & Upcoming Bookings</h2>
            </div>
            <button
              onClick={() => setActiveTab('bookings')}
              className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1"
            >
              View All ({visibleBookings.length}) <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeBookings.map((b, i) => (
              <motion.div
                key={b.id}
                variants={fadeInUp}
                whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
                className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-subtle flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={b.providerAvatar}
                      alt={b.providerName}
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-coop-500/20"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{b.serviceName}</h4>
                        <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-bold">
                          #{b.bookingCode}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Provider: <strong className="text-slate-800">{b.providerName}</strong>
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${
                    b.bookingStatus === 'PROVIDER_ON_THE_WAY'
                      ? 'bg-zinc-900 text-white border border-zinc-800 animate-pulse'
                      : 'bg-zinc-100 text-zinc-900 border border-zinc-300'
                  }`}>
                    {b.bookingStatus.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{b.scheduledDate} • {b.scheduledTime}</span>
                  </div>
                  <div className="font-bold text-slate-900">₹{b.totalAmount} (Paid)</div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-coop-700 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Razorpay Verified Escrow
                  </span>
                  <button
                    onClick={() => setActiveBookingForTracking(b)}
                    className="px-4 py-2 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <span>Track Live Status</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* 2b. LOCATION NOT SERVICEABLE — strict 50km from saved/live location */}
      {locationStatus === 'detecting' && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-center gap-3 text-xs text-blue-800">
          <Clock className="w-5 h-5 animate-spin" /> Detecting your location…
        </div>
      )}
      {!userCoords && locationStatus !== 'detecting' && (
        <div className="rounded-2xl border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-600 text-white"><MapPin className="w-5 h-5" /></div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                {locationStatus === 'denied' ? 'Location access was denied.' : locationStatus === 'unavailable' ? 'Unable to detect your location.' : locationStatus === 'unsupported' ? 'Zolve is currently not available in this area.' : 'Location not set'}
              </div>
              <div className="text-xs text-slate-600">
                {locationError || (locationStatus === 'unsupported' ? 'Your GPS is outside our 20-city 50km coverage. Choose a supported city.' : 'Choose location manually to see services within 50km.')}
                {selectedLocation?.lat != null && <span className="font-mono ml-1">({selectedLocation.lat.toFixed(3)}, {selectedLocation.lng.toFixed(3)})</span>}
              </div>
            </div>
          </div>
          <button onClick={() => setIsLocationModalOpen(true)} className="px-4 py-2 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold shrink-0">
            Choose location manually
          </button>
        </div>
      )}
      {userCoords && !hasCoverage && (
        <div className="rounded-2xl border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-600 text-white">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-red-900">
                Services not available in this area
              </div>
              <div className="text-xs text-red-700">
                {`No executive corporate member within ${SERVICE_RADIUS_KM} km of ${selectedLocation?.name || 'this location'}. Booking details are hidden outside 50km from your saved/live location.`}
              </div>
            </div>
          </div>
          <button onClick={() => setIsLocationModalOpen(true)} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shrink-0">
            Change Location
          </button>
        </div>
      )}

      {/* 3. SERVICE CATEGORIES GRID */}
      <section
        className="space-y-6"
      >
        <motion.div variants={fadeInUp}>
          <h2 className="text-3xl font-black text-slate-900 font-display tracking-tight">Explore Service Categories</h2>
          <p className="text-sm font-bold text-slate-600 mt-1">
            Standardized transparent pricing with zero surge exploitation
          </p>
        </motion.div>

        <div className="space-y-8">
          {serviceCategories.map((category, ci) => (
            <React.Fragment key={category.id}>
              {category.id === 'cat-personal' && (
                <motion.div
                  variants={fadeInUp}
                  className="rounded-2xl overflow-hidden border border-[#B8E6C8] bg-[#E6F4EA] flex flex-col md:flex-row items-stretch"
                >
                  <div className="flex-1 p-6 sm:p-8 md:p-10 flex flex-col justify-center space-y-4">
                    <div className="inline-flex items-center gap-1 text-[#14532D] text-xs font-black tracking-widest uppercase">
                      <span>✦</span> GARDENING &amp; BALCONY GREENERY <span>✦</span>
                    </div>
                    <h3 className="text-3xl sm:text-4xl md:text-[38px] font-black text-[#123524] leading-tight font-display">
                      Get lush, thriving<br />gardens
                    </h3>
                    <p className="text-sm sm:text-[14px] font-semibold text-[#234E37] leading-relaxed max-w-md">
                      A green balcony purifies air, cuts stress and brings daily joy — let our gardeners nurture soil, pruning &amp; seasonal blooms for you.
                    </p>
                    <button
                      onClick={() => {
                        if (!requireAuthOrRedirect()) return;
                        onOpenSearchWithCategory('Gardening & Balcony Greenery');
                      }}
                      className="mt-1 w-fit px-5 py-2.5 rounded-lg bg-black hover:bg-zinc-900 text-white text-xs font-bold shadow-sm transition-colors"
                    >
                      Explore now
                    </button>
                  </div>
                  <div className="flex-1 min-h-[220px] md:min-h-[280px] relative bg-white">
                    <img
                      src="https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&auto=format&fit=crop&q=80"
                      alt="Gardening — lush green balcony"
                      className="w-full h-full object-cover min-h-[220px] md:min-h-[280px]"
                    />
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute bottom-6 left-6 w-32 h-1.5 bg-white/70 blur-[1px] rounded-full" />
                    </div>
                  </div>
                </motion.div>
              )}
              <motion.div
                variants={fadeInUp}
                className="space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div>
                  <h3 className="text-xl font-black text-slate-900 font-display flex items-center gap-2">
                    {category.name}
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {category.badge}
                    </span>
                  </h3>
                  <p className="text-sm font-semibold text-slate-600">{category.tagline}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {category.services.map((srv) => (
                  <motion.div
                    key={srv.id}
                    variants={fadeInUp}
                    whileHover={{ y: -5, boxShadow: '0 12px 40px rgba(0,0,0,0.1)' }}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden flex flex-col justify-between group"
                  >
                    <div className="relative h-36 overflow-hidden bg-slate-100">
                      <img
                        src={srv.image}
                        alt={srv.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {srv.popular && (
                        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black text-white text-[10px] font-bold shadow-sm border border-white/20">
                          Popular
                        </span>
                      )}
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span>{srv.rating}</span>
                      </div>
                    </div>

                    <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-base font-black text-slate-900 group-hover:text-brand-900 transition-colors leading-tight">
                          {srv.name}
                        </h4>
                        <p className="text-sm font-medium text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                          {srv.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Starts from</div>
                          <div className="text-sm font-extrabold text-slate-900">
                            ₹{srv.basePrice}{' '}
                            <span className="text-[10px] font-normal text-slate-500">/{srv.unit}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (!requireAuthOrRedirect()) return;
                            onOpenSearchWithCategory(srv.name);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-coop-50 hover:text-coop-800 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <span>Explore</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* 4. MOST BOOKED SERVICES — layout like reference Image 1, identity protected */}
      <motion.section
        initial="visible"
        animate="visible"
        variants={staggerContainer}
        className="space-y-4"
      >
        <motion.div variants={fadeInUp} className="flex items-center justify-between">
          <h2 className="text-3xl font-black text-slate-900 font-display tracking-tight">Most booked services</h2>
          <button
            onClick={() => setActiveTab('search')}
            className="text-sm font-black text-brand-700 hover:text-brand-800 flex items-center gap-1"
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>

        {!hasCoverage && userCoords ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-white border border-amber-200 mx-auto flex items-center justify-center">
              <MapPin className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-amber-900">Services not available in this area</h3>
            <p className="text-xs text-amber-800 max-w-md mx-auto">No executive within 50 km of {typeof selectedLocation === 'string' ? selectedLocation : selectedLocation?.name}. Booking details are hidden outside 50km from your saved/live location. Change location or pincode to see services.</p>
            <button onClick={() => setIsLocationModalOpen(true)} className="mt-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold">Change Location / Pincode</button>
          </div>
        ) : (
          <div className="relative">
            <div id="most-booked-scroll" className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide scroll-smooth pr-12">
              {MOST_BOOKED_SERVICES.map((svc) => (
                <motion.div
                  key={svc.id}
                  variants={fadeInUp}
                  whileHover={{ y: -4 }}
                  onClick={() => handleMostBookedBooking(svc)}
                  className="min-w-[200px] sm:min-w-[220px] md:min-w-[240px] flex-shrink-0 snap-start bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-subtle hover:shadow-xl transition-all cursor-pointer group"
                >
                  <div className="h-44 sm:h-48 overflow-hidden bg-slate-100 relative">
                    <img src={svc.image} alt={svc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="p-3 space-y-1.5">
                    <h3 className="text-[13px] font-bold text-slate-900 leading-tight line-clamp-2 min-h-[36px]">{svc.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-slate-600">
                      <Star className="w-3.5 h-3.5 fill-zinc-800 text-zinc-800" />
                      <span className="font-medium">{svc.rating} ({svc.count})</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[13px] font-extrabold text-slate-900">₹{svc.price}</span>
                      {svc.original && <span className="text-xs text-slate-400 line-through">₹{svc.original}</span>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <button
              onClick={() => {
                const el = document.getElementById('most-booked-scroll');
                if (el) el.scrollBy({ left: 260, behavior: 'smooth' });
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-md items-center justify-center hover:bg-slate-50 hidden sm:flex"
              aria-label="Scroll"
            >
              <ArrowRight className="w-4 h-4 text-slate-700" />
            </button>
          </div>
        )}
      </motion.section>

      {/* 4b. KITCHEN CLEANING BANNER — like reference: good thing about cleaned kitchen */}
      <motion.section
        variants={fadeInUp}
        className="rounded-2xl overflow-hidden border border-[#C8D6FF] bg-[#E6ECFF] flex flex-col md:flex-row items-stretch"
      >
        <div className="flex-1 p-6 sm:p-8 md:p-10 flex flex-col justify-center space-y-4">
          <div className="inline-flex items-center gap-1 text-[#1E2A5A] text-xs font-black tracking-widest uppercase">
            <span>✦</span> KITCHEN CLEANING <span>✦</span>
          </div>
          <h3 className="text-3xl sm:text-4xl md:text-[38px] font-black text-[#1A244D] leading-tight font-display">
            Get squeaky clean<br />kitchens
          </h3>
          <p className="text-sm sm:text-[14px] font-bold text-[#33406B] leading-relaxed max-w-md">
            A hygienic kitchen keeps your family healthier — less grease, fewer germs, fresher air and a shine that lasts. Book a pro deep clean today.
          </p>
          <button
            onClick={() => {
              if (!requireAuthOrRedirect()) return;
              const kitchenService = { id: 'srv-clean-01', name: 'Full Home Deep Cleaning' };
              handleMostBookedBooking(kitchenService);
            }}
            className="mt-1 w-fit px-5 py-2.5 rounded-lg bg-black hover:bg-zinc-900 text-white text-xs font-bold shadow-sm transition-colors"
          >
            Explore now
          </button>
        </div>
        <div className="flex-1 min-h-[220px] md:min-h-[280px] relative bg-white">
          <img
            src="https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&auto=format&fit=crop&q=80"
            alt="Kitchen cleaning — sparkling kitchen"
            className="w-full h-full object-cover min-h-[220px] md:min-h-[280px]"
          />
          {/* subtle sparkle overlay like reference */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute bottom-6 left-6 w-32 h-1.5 bg-white/80 blur-[1px] rounded-full" />
          </div>
        </div>
      </motion.section>

      {/* 4c. LATEST SERVICES — Car Washing, Closet Organiser */}
      <motion.section
        initial="visible"
        animate="visible"
        variants={staggerContainer}
        className="space-y-4"
      >
        <motion.div variants={fadeInUp} className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-extrabold border border-amber-200">NEW</span>
          <h2 className="text-3xl font-black text-slate-900 font-display tracking-tight">Latest services</h2>
        </motion.div>
        <p className="text-sm font-semibold text-slate-600 -mt-2">Freshly launched — now available across all hub cities</p>
        <div className="relative">
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide scroll-smooth pr-12">
            {LATEST_SERVICES.map((svc) => (
              <motion.div
                key={svc.id}
                variants={fadeInUp}
                whileHover={{ y: -4 }}
                onClick={() => handleLatestBooking(svc)}
                className="min-w-[200px] sm:min-w-[220px] md:min-w-[260px] flex-shrink-0 snap-start bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-subtle hover:shadow-xl transition-all cursor-pointer group"
              >
                <div className="h-44 sm:h-48 overflow-hidden bg-slate-100 relative">
                  <img src={svc.image} alt={svc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black text-white text-[10px] font-black shadow-sm border border-white/20">
                    {svc.badge}
                  </span>
                </div>
                <div className="p-3 space-y-1.5">
                  <h3 className="text-[15px] font-black text-slate-900 leading-tight line-clamp-2 min-h-[36px]">{svc.name}</h3>
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                    <Star className="w-3.5 h-3.5 fill-zinc-800 text-zinc-800" />
                    <span>{svc.rating} ({svc.count})</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[14px] font-black text-slate-900">₹{svc.price}</span>
                    {svc.original && <span className="text-xs text-slate-400 line-through">₹{svc.original}</span>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* 4d. UPCOMING SERVICES — House Pickup Laundry Services */}
      <motion.section
        initial="visible"
        animate="visible"
        variants={staggerContainer}
        className="space-y-4"
      >
        <motion.div variants={fadeInUp} className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-extrabold border border-slate-800">COMING SOON</span>
          <h2 className="text-3xl font-black text-slate-900 font-display tracking-tight">Upcoming Services</h2>
        </motion.div>
        <p className="text-sm font-semibold text-slate-600 -mt-2">Get ready — launching soon in your city</p>
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
          {UPCOMING_SERVICES.map((svc) => (
            <motion.div
              key={svc.id}
              variants={fadeInUp}
              className="min-w-[260px] sm:min-w-[300px] flex-shrink-0 snap-start bg-white rounded-2xl overflow-hidden border border-dashed border-slate-300 shadow-subtle opacity-90 relative"
            >
              <div className="h-44 sm:h-48 overflow-hidden bg-slate-100 relative">
                <img src={svc.image} alt={svc.name} className="w-full h-full object-cover grayscale-[15%]" />
                <div className="absolute inset-0 bg-white/25 backdrop-blur-[0.5px]" />
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full bg-black text-white text-xs font-black shadow-lg">
                  Coming Soon
                </span>
              </div>
              <div className="p-4 space-y-1.5">
                <h3 className="text-[15px] font-black text-slate-900 leading-tight">{svc.name}</h3>
                <p className="text-xs font-semibold text-slate-500">House pickup &amp; delivery — wash, iron &amp; fold. Stay tuned!</p>
                <button disabled className="mt-1 w-full py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-black cursor-not-allowed border border-slate-200">
                  Notify Me
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* 5. COOPERATIVE IMPACT BANNER */}
      <motion.section
        initial="visible"
        animate="visible"
        variants={fadeInUp}
        whileHover={{ scale: 1.005 }}
        className="rounded-3xl bg-gradient-to-r from-coop-900 via-coop-800 to-teal-900 text-white p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg"
      >
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-coop-200 text-xs font-bold">
            <HeartHandshake className="w-3.5 h-3.5 text-coop-300" />
            <span>Cooperative Community Impact</span>
          </div>
          <h3 className="text-3xl font-black font-display text-white leading-tight">
            Where your service fee stays in your neighborhood.
          </h3>
          <p className="text-sm font-semibold text-slate-100 leading-relaxed">
            Every booking contributes 4% to the Zolve Member Welfare Fund, sponsoring tool grants, accident insurance, and free civic electrical safety drives for senior citizens.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('cooperative')}
            className="px-5 py-3 rounded-xl bg-white text-coop-900 hover:bg-coop-50 text-xs font-extrabold shadow-md transition-colors"
          >
            Learn How Cooperative Works
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className="px-4 py-3 rounded-xl bg-coop-950/40 hover:bg-coop-950/60 border border-white/20 text-white text-xs font-bold transition-colors"
          >
            View Neighborhood Projects
          </button>
        </div>
      </motion.section>
    </div>
  );
};

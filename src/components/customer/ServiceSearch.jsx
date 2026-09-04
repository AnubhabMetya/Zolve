import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Filter,
  Star,
  ShieldCheck,
  Award,
  CheckCircle2,
  MapPin,
  Clock,
  ArrowRight,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  Zap,
  Briefcase
} from 'lucide-react';
import { SERVICE_RADIUS_KM } from '../../services/locationService';
import { SemanticServiceMatcher } from '../ai/SemanticServiceMatcher';

export const ServiceSearch = ({ initialSearch = '' }) => {
  const {
    providers,
    serviceCategories,
    setSelectedProviderForBooking,
    setSelectedProviderForProfile,
    selectedLocation,
    currentUser,
    setIsAuthModalOpen,
    setAuthModalTab,
    setIsLocationModalOpen,
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
  const userCoords = typeof selectedLocation === 'string' ? { lat: 12.9784, lng: 77.6408 } : (selectedLocation?.lat ? selectedLocation : { lat: 12.9784, lng: 77.6408 });
  const selectedLocationName = typeof selectedLocation === 'string' ? selectedLocation : (selectedLocation?.name || 'your location');
  const hasExplicitLocation = selectedLocation && typeof selectedLocation !== 'string' && selectedLocation.lat != null;
  // Saved default address coords — strict 50km is enforced against BOTH saved and live location (OR logic: visible if within 50km of either)
  const defaultSavedCoords = React.useMemo(() => {
    const def = savedAddresses?.find(a => a.isDefault) || savedAddresses?.[0];
    return def?.coords || null;
  }, [savedAddresses]);

  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(2500);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [coopMembersOnly, setCoopMembersOnly] = useState(false);
  const [sortBy, setSortBy] = useState('recommended'); // 'recommended' | 'rating' | 'price_low' | 'experience' | 'jobs'

  // Extract all distinct categories
  const categoryList = ['All', 'Electrical', 'Plumbing', 'Cleaning', 'Appliance Repair', 'Carpentry', 'Cooking', 'Elder Assistance', 'Apartment Maintenance'];

  // Haversine helper inline to avoid extra import (free)
  const haversineSortKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };

  // Filtered & Sorted Providers List — hide booking details beyond 50km from saved OR live location
  const filteredProviders = useMemo(() => {
    if (!providers || !Array.isArray(providers)) return [];
    if (!userCoords || userCoords.lat == null) return [];
    return providers
      .map((p) => {
        if (!p.coords) return { ...p, _distanceKm: 999, _distanceToSavedKm: 999 };
        const dLive = haversineSortKm(userCoords.lat, userCoords.lng, p.coords.lat, p.coords.lng);
        const dSaved = defaultSavedCoords ? haversineSortKm(defaultSavedCoords.lat, defaultSavedCoords.lng, p.coords.lat, p.coords.lng) : 999;
        // Effective distance is the nearest of saved vs live — provider must be within 50km of at least one
        const eff = Math.min(dLive, dSaved);
        return { ...p, _distanceKm: eff, _distanceToLiveKm: dLive, _distanceToSavedKm: dSaved };
      })
      .filter((p) => {
        // Search text matching name, title, skills, categories
        if (searchQuery && searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = p.name.toLowerCase().includes(q);
          const matchesTitle = p.title.toLowerCase().includes(q);
          const matchesSkill = p.skills?.some(s => s.toLowerCase().includes(q));
          const matchesCategory = p.serviceCategories?.some(c => c.toLowerCase().includes(q));
          if (!matchesName && !matchesTitle && !matchesSkill && !matchesCategory) return false;
        }

        // Category filter
        if (selectedCategory !== 'All') {
          const hasCat = p.serviceCategories?.some(c => c.toLowerCase().includes(selectedCategory.toLowerCase()));
          if (!hasCat) return false;
        }

        // Rating filter
        if (p.rating < minRating) return false;

        // Price filter
        if (p.basePrice > maxPrice) return false;

        // Verified only
        if (verifiedOnly && !p.verifications?.identity) return false;

        // Cooperative members only
        if (coopMembersOnly && !p.isCoopMember) return false;

        // Strict 50km coverage — hide providers beyond 50km from saved/live location. Booking details must not show outside serviceable radius.
        if (p._distanceKm > SERVICE_RADIUS_KM) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'distance') return a._distanceKm - b._distanceKm;
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'price_low') return a.basePrice - b.basePrice;
        if (sortBy === 'experience') return b.experienceYears - a.experienceYears;
        if (sortBy === 'jobs') return b.completedJobs - a.completedJobs;
        // Recommended: cooperative members + rating + jobs, boost nearby
        const scoreA = (a.isCoopMember ? 2 : 0) + a.rating - Math.min(a._distanceKm / 10, 1);
        const scoreB = (b.isCoopMember ? 2 : 0) + b.rating - Math.min(b._distanceKm / 10, 1);
        return scoreB - scoreA;
      });
  }, [providers, searchQuery, selectedCategory, minRating, maxPrice, verifiedOnly, coopMembersOnly, sortBy]);

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-brand-900 via-brand-950 to-coop-950 text-white p-6 sm:p-8 lg:p-10 overflow-hidden shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-brand-500/15 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-xs font-semibold text-coop-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Cooperative Service Discovery</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            Find Trusted Local Service Providers
          </h1>
          <p className="text-xs text-slate-300">
            Showing verified professionals active near <strong className="text-coop-300">{selectedLocationName}</strong> {userCoords && <span className="text-[11px] text-slate-400">({userCoords.lat.toFixed(3)}, {userCoords.lng.toFixed(3)})</span>} — {SERVICE_RADIUS_KM}km executive coverage
          </p>
          {hasExplicitLocation && filteredProviders.length === 0 && (
            <p className="text-[11px] text-amber-200 mt-1">Services not available in this area.</p>
          )}
        </div>

        {/* Search & Sort Bar */}
        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search skill, service, or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 bg-white/10 backdrop-blur-md text-white placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-coop-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300 font-medium whitespace-nowrap">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-700 bg-brand-900 text-xs font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-coop-400"
            >
              <option value="recommended">Recommended (Co-op First)</option>
              <option value="distance">Nearest First</option>
              <option value="rating">Highest Rated ★</option>
              <option value="price_low">Price: Low to High</option>
              <option value="experience">Most Experienced</option>
              <option value="jobs">Most Jobs Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* FEATURE 1 — SEMANTIC SERVICE MATCHING (client-side TF-IDF, no API key, embeddings precomputed) */}
      <SemanticServiceMatcher onSelectServiceName={(name) => setSearchQuery(name)} />

      {/* Local availability summary — 5-10 executive requirement, never pad with distant providers */}
      {hasExplicitLocation && filteredProviders.length > 0 && filteredProviders.length < 5 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 flex items-center gap-2 text-xs text-amber-800">
          <MapPin className="w-4 h-4 text-amber-600" />
          <span>Only {filteredProviders.length} qualified executives are currently available nearby<span className="hidden sm:inline"> in {selectedLocationName}</span> — within {SERVICE_RADIUS_KM}km. Correctness over quantity.</span>
        </div>
      )}
      {hasExplicitLocation && filteredProviders.length >= 5 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{filteredProviders.length} qualified executives available near {selectedLocationName} — showing local candidates within {SERVICE_RADIUS_KM}km. {filteredProviders.length > 10 ? 'Top local matches ranked; distant cities excluded.' : ''}</span>
        </div>
      )}

      {filteredProviders.length === 0 && hasExplicitLocation && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-600 text-white"><MapPin className="w-5 h-5" /></div>
            <div>
              <div className="text-sm font-bold text-red-900">Services not available in this area</div>
              <div className="text-xs text-red-700">No executive corporate member within {SERVICE_RADIUS_KM} km of <strong>{selectedLocationName}</strong>. We serve Delhi, Gurgaon, Mumbai, Ahmedabad, Pune, Chennai, Visakhapatnam, Indore, Patna, Lucknow, Kolkata, Siliguri, Bengaluru, Hyderabad, Jaipur (±50km each).</div>
            </div>
          </div>
          <button onClick={() => setIsLocationModalOpen(true)} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shrink-0">Change Location / Pincode</button>
        </div>
      )}

      {/* Main Grid: Filters Sidebar + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Sidebar Filters */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-subtle space-y-6 lg:sticky lg:top-24">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-coop-600" />
              Filter Providers
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setMinRating(0);
                setMaxPrice(2500);
                setVerifiedOnly(false);
                setCoopMembersOnly(false);
              }}
              className="text-[11px] text-coop-700 hover:underline font-semibold"
            >
              Reset All
            </button>
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">Service Category</label>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {categoryList.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-brand-50 text-brand-900 font-bold border border-brand-200'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range Slider */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-800">Max Base Inspection Price</label>
              <span className="font-extrabold text-brand-900">₹{maxPrice}</span>
            </div>
            <input
              type="range"
              min="300"
              max="2500"
              step="50"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-coop-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>₹300</span>
              <span>₹2,500</span>
            </div>
          </div>

          {/* Minimum Rating */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800">Minimum Rating</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 4.0, 4.5, 4.8].map((r) => (
                <button
                  key={r}
                  onClick={() => setMinRating(r)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    minRating === r
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {r === 0 ? 'All' : `${r}★+`}
                </button>
              ))}
            </div>
          </div>

          {/* Verification Checkboxes */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800">Badges & Trust</label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={coopMembersOnly}
                onChange={(e) => setCoopMembersOnly(e.target.checked)}
                className="rounded text-coop-600 focus:ring-coop-500 w-4 h-4"
              />
              <span className="text-xs text-slate-700 font-semibold flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-coop-600" /> Cooperative Members Only
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
              />
              <span className="text-xs text-slate-700 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Identity & Skill Verified
              </span>
            </label>
          </div>
        </div>

        {/* Results Main Section */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              Found <strong className="text-slate-900">{filteredProviders.length}</strong> matching professionals
            </span>
          </div>

          {filteredProviders.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-subtle space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-display">{hasExplicitLocation ? 'Services not available in this area' : 'No providers found in this filter'}</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {hasExplicitLocation ? `No provider within ${SERVICE_RADIUS_KM} km of ${selectedLocationName}. Change location/pincode to a nearby hub city or reset filters.` : 'Try loosening your price slider, clearing search tags, or checking adjacent neighborhoods.'}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setMinRating(0);
                  setMaxPrice(2500);
                  setCoopMembersOnly(false);
                }}
                className="px-4 py-2 rounded-xl bg-brand-900 text-white text-xs font-bold hover:bg-brand-800"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-subtle hover:shadow-xl transition-all p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group"
                >
                  <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-8 h-8 text-coop-600" />
                    </div>

                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                          Verified Executive <span className="text-slate-400 font-normal">• ID {provider.id.slice(-4).toUpperCase()}</span>
                        </h3>
                        {provider.isCoopMember ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-coop-50 text-coop-700 text-[10px] font-extrabold border border-coop-200">
                            <Award className="w-3 h-3 text-coop-600" /> Cooperative Member
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                            Verified Provider
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 font-medium">{provider.title} <span className="text-[11px] text-slate-400">— name revealed at billing</span></p>

                      {/* Ratings & Metrics */}
                      <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                        <span className="flex items-center gap-1 font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          {provider.rating} ({provider.ratingCount} reviews)
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700">{provider.completedJobs} jobs completed</span>
                        <span>•</span>
                        <span>{provider.experienceYears}+ years exp</span>
                      </div>

                      {/* Skills Tags */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {provider.skills?.slice(0, 3).map((sk) => (
                          <span key={sk} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {sk}
                          </span>
                        ))}
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{provider.location}</span>
                        {provider._distanceKm < 998 && <span className="ml-1 px-1.5 py-0.5 rounded bg-coop-50 text-coop-700 font-bold border border-coop-200">{provider._distanceKm < 1 ? `${Math.round(provider._distanceKm*1000)}m` : `${provider._distanceKm.toFixed(1)}km`} away</span>}
                        <span className="mx-1">•</span>
                        <Clock className="w-3.5 h-3.5 text-coop-600" />
                        <span className="text-coop-700 font-medium">{provider.availability}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing and Action CTAs */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 gap-3 shrink-0">
                    <div className="text-left md:text-right">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Starting from</div>
                      <div className="text-xl font-black text-slate-900">
                        ₹{provider.basePrice}
                      </div>
                      <div className="text-[10px] text-coop-700 font-medium">Transparent inspection base</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (!requireAuthOrRedirect()) return;
                          // Randomize among eligible nearby for identity protection — pick random if provider list is filtered
                          const pool = filteredProviders.filter(p => p.isCoopMember);
                          const chosen = pool.length ? pool[Math.floor(Math.random() * pool.length)] : provider;
                          setSelectedProviderForBooking(chosen);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                      >
                        <span>Book Service</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

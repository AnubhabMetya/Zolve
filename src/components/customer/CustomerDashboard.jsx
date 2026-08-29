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
    setIsLocationModalOpen,
    serviceCategories,
    providers,
    bookings,
    setSelectedProviderForBooking,
    setSelectedProviderForProfile,
    setActiveBookingForTracking,
    setActiveTab,
    setIsCopilotOpen,
    theme,
    toggleTheme
  } = useApp();

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
    if (searchQuery.trim()) {
      onOpenSearchWithCategory(searchQuery);
    }
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
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display tracking-tight text-white leading-tight"
          >
            How can we help today?
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl font-light"
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
                  onClick={() => onOpenSearchWithCategory(aiClassification.serviceName)}
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

      {/* 2. UPCOMING / ACTIVE BOOKINGS WIDGET */}
      {activeBookings.length > 0 && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="space-y-4"
        >
          <motion.div variants={fadeInUp} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-coop-500 animate-ping"></div>
              <h2 className="text-xl font-bold text-slate-900 font-display">Active & Upcoming Bookings</h2>
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
                      ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                      : 'bg-coop-50 text-coop-800 border border-coop-200'
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

      {/* 3. SERVICE CATEGORIES GRID */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        variants={staggerContainer}
        className="space-y-6"
      >
        <motion.div variants={fadeInUp}>
          <h2 className="text-2xl font-bold text-slate-900 font-display">Explore Service Categories</h2>
          <p className="text-xs text-slate-500 mt-1">
            Standardized transparent pricing with zero surge exploitation
          </p>
        </motion.div>

        <div className="space-y-8">
          {serviceCategories.map((category, ci) => (
            <motion.div
              key={category.id}
              variants={fadeInUp}
              className="space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                    {category.name}
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {category.badge}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">{category.tagline}</p>
                </div>
              </div>

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
              >
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
                        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold shadow-sm">
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
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-brand-900 transition-colors">
                          {srv.name}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
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
                          onClick={() => onOpenSearchWithCategory(srv.name)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-coop-50 hover:text-coop-800 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <span>Explore</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* 4. RECOMMENDED TOP-RATED & COOPERATIVE PROVIDERS */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        variants={staggerContainer}
        className="space-y-6"
      >
        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-coop-100 text-coop-700">
                <Award className="w-4 h-4" />
              </span>
              <h2 className="text-2xl font-bold text-slate-900 font-display">
                Top Rated Local Service Providers
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified background checks, skill certifications & cooperative members
            </p>
          </div>
          <button
            onClick={() => setActiveTab('search')}
            className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1 self-start"
          >
            View All Providers ({providers.length}) <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.slice(0, 3).map((provider) => (
            <motion.div
              key={provider.id}
              variants={fadeInUp}
              whileHover={{ y: -5, boxShadow: '0 20px 50px rgba(0,0,0,0.12)' }}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-subtle p-5 flex flex-col justify-between space-y-4 relative group"
            >
              <div>
                {/* Header with Photo & Verification Badges */}
                <div className="flex items-start gap-3.5">
                  <img
                    src={provider.avatar}
                    alt={provider.name}
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-coop-500/20 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-base font-bold text-slate-900 truncate">
                        {provider.name}
                      </h4>
                      {provider.isCoopMember && (
                        <span className="px-2 py-0.5 rounded-md bg-coop-50 text-coop-700 text-[10px] font-extrabold border border-coop-200">
                          Co-op Member
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">{provider.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        {provider.rating}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">{provider.completedJobs} jobs done</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">{provider.experienceYears}+ yrs</span>
                    </div>
                  </div>
                </div>

                {/* Verification Badges Row */}
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100 text-[10px]">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                    <ShieldCheck className="w-3 h-3 text-coop-600" /> Identity Verified
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                    <CheckCircle2 className="w-3 h-3 text-brand-600" /> Skill Certified
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                    <MapPin className="w-3 h-3 text-slate-500" /> {provider.location.split('(')[0]}
                  </span>
                </div>

                {/* Short Bio */}
                <p className="text-xs text-slate-500 mt-2.5 line-clamp-2 leading-relaxed">
                  {provider.bio}
                </p>
              </div>

              {/* Pricing and CTAs */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Inspection Base</div>
                  <div className="text-sm font-extrabold text-slate-900">
                    ₹{provider.basePrice}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedProviderForProfile(provider)}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
                  >
                    View Profile
                  </button>
                  <button
                    onClick={() => setSelectedProviderForBooking(provider)}
                    className="px-4 py-2 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1"
                  >
                    <span>Book Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* 5. COOPERATIVE IMPACT BANNER */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        variants={fadeInUp}
        whileHover={{ scale: 1.005 }}
        className="rounded-3xl bg-gradient-to-r from-coop-900 via-coop-800 to-teal-900 text-white p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg"
      >
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-coop-200 text-xs font-bold">
            <HeartHandshake className="w-3.5 h-3.5 text-coop-300" />
            <span>Cooperative Community Impact</span>
          </div>
          <h3 className="text-2xl font-bold font-display text-white">
            Where your service fee stays in your neighborhood.
          </h3>
          <p className="text-xs text-slate-200 leading-relaxed font-light">
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

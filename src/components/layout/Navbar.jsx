import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  MapPin,
  Bell,
  User,
  LogOut,
  ShieldCheck,
  Briefcase,
  Users,
  Building2,
  Menu,
  X,
  Bot,
  ChevronDown,
  Calendar,
  CreditCard,
  Layers,
  Award,
  Sun,
  Moon
} from 'lucide-react';

export const Navbar = () => {
  const {
    selectedLocation,
    setIsLocationModalOpen,
    setIsCopilotOpen,
    notifications,
    activeTab,
    setActiveTab,
    theme,
    toggleTheme,
    switchDemoRole
  } = useApp();
  const { session, profile, signOut, isAuthenticated } = useAuth();
  const currentUser = profile ? { id: profile.id, name: profile.full_name, email: profile.email, role: profile.role, avatar: profile.avatar_url } : null;
  const activeRole = profile?.role || 'customer';
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await signOut(); } catch {}
    navigate('/');
  };

  const showDemo = import.meta.env.VITE_ENABLE_DEMO === 'true' || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo')) || activeRole === 'admin';

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isDemoMenuOpen, setIsDemoMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Route map for tabs that have dedicated routes
  const routeMap = {
    bookings: '/bookings',
    payments: '/payments',
    profile: '/profile',
    provider: '/provider',
    admin: '/admin',
    dashboard: '/dashboard',
  };

  const handleNavClick = (tabKey) => {
    setActiveTab(tabKey);
    setIsMobileMenuOpen(false);
    // Navigate to dedicated route if one exists, else go to home (wildcard) for tab-based views
    const target = routeMap[tabKey];
    if (target) {
      navigate(target);
    } else {
      // For cooperative, community, trust, society, search, home, etc. — render via /* wildcard
      navigate('/');
    }
  };

  return (
    <>
      {/* Spacer to prevent content hidden behind fixed header */}
      <div className="min-h-[5rem] h-20" aria-hidden="true" />
      <header
        className="fixed top-0 left-0 right-0 z-50 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-sm"
      >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[5rem] py-2">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => handleNavClick('home')}
              className="flex items-center gap-3 group text-left focus:outline-none"
            >
              <div className="w-11 h-11 rounded-xl bg-black border border-white/10 flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.35)] group-hover:scale-105 transition-transform">
                <span className="text-2xl font-black text-white tracking-tight">Z</span>
                <span className="w-2 h-2 rounded-full bg-white -ml-1 mt-3 animate-pulse border border-black"></span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-extrabold text-black dark:text-white tracking-tight font-display">
                    Zolve
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-coop-50 text-coop-700 border border-coop-200">
                    Cooperative
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                  Trusted Services. Stronger Communities.
                </p>
              </div>
            </button>

            {/* Location Selector (Customer & Public View) */}
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold transition-colors border border-slate-200/60 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 mr-2"
            >
              <MapPin className="w-3.5 h-3.5 text-coop-600" />
              <span className="max-w-[140px] truncate">{typeof selectedLocation === 'string' ? selectedLocation : selectedLocation?.name || 'Select location'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          {/* Desktop Navigation Links (Role Dependent) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 ml-4 lg:ml-8 xl:ml-10">
            {!currentUser ? (
              // Public Navigation
              <>
                <button
                  onClick={() => handleNavClick('home')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'home' ? 'text-brand-900 font-semibold bg-brand-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Services
                </button>
                <button
                  onClick={() => handleNavClick('cooperative')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'cooperative' ? 'text-brand-900 font-semibold bg-brand-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  The Cooperative
                </button>
                <button
                  onClick={() => handleNavClick('community')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'community' ? 'text-brand-900 font-semibold bg-brand-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Community
                </button>
                <button
                  onClick={() => handleNavClick('trust')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'trust' ? 'text-brand-900 font-semibold bg-brand-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Trust & Safety
                </button>
                <button
                  onClick={() => handleNavClick('society')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'society' ? 'text-brand-900 font-semibold bg-brand-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Society Portal
                </button>
              </>
            ) : activeRole === 'customer' ? (
              // Customer Navigation
              <>
                <button
                  onClick={() => handleNavClick('home')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'home' ? 'text-brand-900 font-semibold bg-brand-50' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Explore Services
                </button>
                <button
                  onClick={() => handleNavClick('bookings')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === 'bookings' ? 'text-brand-900 font-semibold bg-brand-50' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-coop-600" />
                  My Bookings
                </button>
                <button
                  onClick={() => handleNavClick('payments')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === 'payments' ? 'text-brand-900 font-semibold bg-brand-50' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  Payments
                </button>
                <button
                  onClick={() => handleNavClick('cooperative')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'cooperative' ? 'text-brand-900 font-semibold bg-brand-50' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cooperative
                </button>
                <button
                  onClick={() => handleNavClick('community')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'community' ? 'text-brand-900 font-semibold bg-brand-50' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Community
                </button>
              </>
            ) : activeRole === 'provider' ? (
              // Provider Navigation
              <>
                <button
                  onClick={() => handleNavClick('home')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'home' ? 'text-brand-900 font-semibold bg-brand-50' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Jobs & Schedule
                </button>
                <button
                  onClick={() => handleNavClick('earnings')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === 'earnings' ? 'text-brand-900 font-semibold bg-brand-50' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-coop-600" />
                  Earnings Ledger
                </button>
                <button
                  onClick={() => handleNavClick('cooperative')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === 'cooperative' ? 'text-brand-900 font-semibold bg-brand-50' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Award className="w-4 h-4 text-amber-500" />
                  Member Portal & Voting
                </button>
                <button
                  onClick={() => handleNavClick('training')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'training' ? 'text-brand-900 font-semibold bg-brand-50' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Training
                </button>
              </>
            ) : activeRole === 'society_admin' ? (
              // Society Admin Navigation
              <>
                <button
                  onClick={() => handleNavClick('society')}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-brand-900 bg-brand-50"
                >
                  Society Requests & Sump/Cleaning Logs
                </button>
                <button
                  onClick={() => handleNavClick('cooperative')}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Cooperative Partnerships
                </button>
              </>
            ) : (
              // Platform Admin Navigation
              <>
                <button
                  onClick={() => handleNavClick('admin')}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    activeTab === 'admin' ? 'text-brand-900 bg-brand-50' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Admin Operations Center
                </button>
                <button
                  onClick={() => handleNavClick('cooperative')}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Governance
                </button>
                <button
                  onClick={() => handleNavClick('trust')}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Trust & Disputes
                </button>
              </>
            )}
          </nav>

          {/* Right Action Icons & Auth Controls */}
          <div className="flex items-center shrink-0 gap-1.5 sm:gap-2 flex-nowrap min-w-0">
            {/* Dark Mode Toggle — visible on all pages including landing */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
            {/* AI Assistant Copilot Trigger */}
            <button
              onClick={() => setIsCopilotOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-[11px] sm:text-xs font-semibold shadow-sm hover:shadow-md hover:scale-105 transition-all shrink-0"
              title="Open Zolve AI Assistant"
            >
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300 animate-pulse" />
              <span className="hidden sm:inline">AI Copilot</span>
            </button>

            {/* Demo Role Switcher Dropdown — hidden from public unless VITE_ENABLE_DEMO or ?demo or admin */}
            {showDemo && (
            <div className="relative">
              <button
                onClick={() => setIsDemoMenuOpen(!isDemoMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300/80 transition-colors"
                title="Switch Demo Persona"
              >
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden lg:inline">Demo Role</span>
                <ChevronDown className="w-3 h-3 text-amber-600" />
              </button>

              {isDemoMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-xl bg-white shadow-premium border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onMouseLeave={() => setIsDemoMenuOpen(false)}
                >
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Switch Role Simulation
                    </p>
                  </div>
                  <button
                    onClick={() => { switchDemoRole('customer'); setIsDemoMenuOpen(false); }}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center justify-between text-slate-800 font-medium"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">Anubhab Metya</div>
                      <div className="text-[10px] text-slate-500">Customer Persona</div>
                    </div>
                    {activeRole === 'customer' && <span className="w-2 h-2 rounded-full bg-coop-500"></span>}
                  </button>
                  <button
                    onClick={() => { switchDemoRole('providerCoop'); setIsDemoMenuOpen(false); }}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center justify-between text-slate-800 font-medium"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">Rajesh Kumar</div>
                      <div className="text-[10px] text-coop-600 font-medium">Cooperative Member (Electrician)</div>
                    </div>
                    {activeRole === 'provider' && currentUser?.isCoopMember && <span className="w-2 h-2 rounded-full bg-coop-500"></span>}
                  </button>
                  <button
                    onClick={() => { switchDemoRole('providerStandard'); setIsDemoMenuOpen(false); }}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center justify-between text-slate-800 font-medium"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">Rahul Verma</div>
                      <div className="text-[10px] text-slate-500">Standard Provider (Carpenter)</div>
                    </div>
                    {activeRole === 'provider' && !currentUser?.isCoopMember && <span className="w-2 h-2 rounded-full bg-coop-500"></span>}
                  </button>
                  <button onClick={() => { switchDemoRole('executiveHousehold'); setIsDemoMenuOpen(false); }} className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center justify-between text-slate-800 font-medium">
                    <div><div className="font-semibold text-slate-900">Arjun Patel</div><div className="text-[10px] text-blue-600 font-medium">Executive — Household (8)</div></div>
                    {activeRole === 'executive' && currentUser?.executiveVertical === 'household' && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                  </button>
                  <button onClick={() => { switchDemoRole('executivePersonal'); setIsDemoMenuOpen(false); }} className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center justify-between text-slate-800 font-medium">
                    <div><div className="font-semibold text-slate-900">Kavya Nair</div><div className="text-[10px] text-emerald-600 font-medium">Executive — Personal & Family</div></div>
                    {activeRole === 'executive' && currentUser?.executiveVertical === 'personal' && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                  </button>
                  <button onClick={() => { switchDemoRole('executiveCommunity'); setIsDemoMenuOpen(false); }} className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center justify-between text-slate-800 font-medium">
                    <div><div className="font-semibold text-slate-900">Suresh Reddy</div><div className="text-[10px] text-amber-700 font-medium">Executive — Community</div></div>
                    {activeRole === 'executive' && currentUser?.executiveVertical === 'community' && currentUser?.executiveStatus === 'active' && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                  </button>
                  <button
                    onClick={() => { switchDemoRole('societyAdmin'); setIsDemoMenuOpen(false); }}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center justify-between text-slate-800 font-medium"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">Vikram Malhotra</div>
                      <div className="text-[10px] text-slate-500">Housing Society Manager</div>
                    </div>
                    {activeRole === 'society_admin' && <span className="w-2 h-2 rounded-full bg-coop-500"></span>}
                  </button>
                  <button
                    onClick={() => { switchDemoRole('admin'); setIsDemoMenuOpen(false); }}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center justify-between text-slate-800 font-medium border-t border-slate-100"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">Operations SuperAdmin</div>
                      <div className="text-[10px] text-purple-600">Platform Admin Center</div>
                    </div>
                    {activeRole === 'admin' && <span className="w-2 h-2 rounded-full bg-coop-500"></span>}
                  </button>
                </div>
              )}
            </div>
            )}

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors relative"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white"></span>
                )}
              </button>

              {isNotifOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 rounded-2xl bg-white shadow-premium border border-slate-200 py-3 z-50"
                  onMouseLeave={() => setIsNotifOpen(false)}
                >
                  <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 uppercase">Notifications</span>
                    <span className="text-[11px] text-coop-600 font-semibold">{unreadCount} unread</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {notifications.map((n) => (
                      <div key={n.id} className="p-3 hover:bg-slate-50 transition-colors">
                        <div className="text-xs font-bold text-slate-900">{n.title}</div>
                        <div className="text-[11px] text-slate-600 mt-0.5">{n.message}</div>
                        <div className="text-[9px] text-slate-400 mt-1">{n.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Auth Profile / Sign In Buttons */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <img
                    src={currentUser.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-coop-500/30"
                  />
                  <span className="text-xs font-bold text-slate-800 hidden sm:inline max-w-[100px] truncate">
                    {currentUser.name}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isProfileMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-premium border border-slate-200 py-2 z-50 animate-in fade-in"
                    onMouseLeave={() => setIsProfileMenuOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                      <p className="text-[11px] text-slate-500">{currentUser.email}</p>
                      <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-[10px] font-bold uppercase">
                        {activeRole.replace('_', ' ')}
                      </div>
                    </div>
                    <button
                      onClick={() => { handleNavClick('profile'); setIsProfileMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      My Profile
                    </button>
                    <button
                      onClick={async () => { await handleLogout(); setIsProfileMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium border-t border-slate-100"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-500" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => navigate('/login')}
                    className="flex-1 sm:flex-none px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] sm:text-xs font-bold transition-colors whitespace-nowrap text-center"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => navigate('/signup')}
                    className="flex-1 sm:flex-none px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-black hover:bg-zinc-800 text-white text-[11px] sm:text-xs font-bold shadow-sm transition-colors whitespace-nowrap text-center"
                  >
                    Sign Up
                  </button>
                </div>
                <button
                  onClick={() => { setIsLocationModalOpen(false); navigate('/'); setTimeout(()=> setActiveTab('join-executive'), 0) }}
                  className="w-full inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-white border-2 border-black text-black hover:bg-zinc-50 text-[11px] sm:text-xs font-bold whitespace-nowrap"
                >
                  Join as Executive
                </button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2 animate-in slide-in-from-top-2">
          <button
            onClick={() => handleNavClick('home')}
            className="w-full text-left px-3 py-2 text-sm font-semibold text-slate-800 rounded-lg hover:bg-slate-50"
          >
            Services & Search
          </button>
          <button
            onClick={() => handleNavClick('cooperative')}
            className="w-full text-left px-3 py-2 text-sm font-semibold text-slate-800 rounded-lg hover:bg-slate-50"
          >
            The Cooperative Ecosystem
          </button>
          <button
            onClick={() => handleNavClick('community')}
            className="w-full text-left px-3 py-2 text-sm font-semibold text-slate-800 rounded-lg hover:bg-slate-50"
          >
            Community Projects
          </button>
          <button
            onClick={() => handleNavClick('trust')}
            className="w-full text-left px-3 py-2 text-sm font-semibold text-slate-800 rounded-lg hover:bg-slate-50"
          >
            Trust & Safety
          </button>
          <button
            onClick={() => handleNavClick('society')}
            className="w-full text-left px-3 py-2 text-sm font-semibold text-slate-800 rounded-lg hover:bg-slate-50"
          >
            Housing Society Portal
          </button>
          {isAuthenticated ? (
            <button
              onClick={async () => { await handleLogout(); setIsMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm font-semibold text-red-600 rounded-lg hover:bg-red-50"
            >
              Sign Out ({currentUser?.name})
            </button>
          ) : (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <button onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm font-bold text-slate-800 rounded-lg bg-slate-50">Login</button>
              <button onClick={() => { navigate('/signup'); setIsMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm font-bold text-white rounded-lg bg-black">Sign Up</button>
              <button onClick={() => { setIsMobileMenuOpen(false); setIsLocationModalOpen(false); navigate('/'); setTimeout(()=> setActiveTab('join-executive'), 0) }} className="w-full text-left px-3 py-2 text-sm font-bold text-black rounded-lg bg-white border-2 border-black">Join as Executive</button>
            </div>
          )}
        </div>
      )}
      </header>
    </>
  );
};

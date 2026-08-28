import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { LocationModal } from './components/layout/LocationModal';
import { AuthModal } from './components/auth/AuthModal';
import { AICopilotDrawer } from './components/ai/AICopilotDrawer';

// Customer Modules
import { CustomerDashboard } from './components/customer/CustomerDashboard';
import { ServiceSearch } from './components/customer/ServiceSearch';
import { ProviderProfileModal } from './components/customer/ProviderProfileModal';
import { BookingModal } from './components/customer/BookingModal';
import { LiveBookingTracker } from './components/customer/LiveBookingTracker';
import { CustomerPaymentHistory } from './components/customer/CustomerPaymentHistory';
import { InvoiceModal } from './components/customer/InvoiceModal';
import { ReviewModal } from './components/customer/ReviewModal';

// Provider Modules
import { ProviderDashboard } from './components/provider/ProviderDashboard';
import { EarningsLedger } from './components/provider/EarningsLedger';

// Executive Modules
import { JoinExecutivePage } from './components/executive/JoinExecutivePage';
import { ExecutiveDashboard } from './components/executive/ExecutiveDashboard';

// Cooperative & Community Modules
import { CooperativePortal } from './components/cooperative/CooperativePortal';
import { CommunityPortal } from './components/community/CommunityPortal';
import { SocietyDashboard } from './components/society/SocietyDashboard';

// Trust, Safety & Admin Modules
import { TrustAndSafety } from './components/trust/TrustAndSafety';
import { ReportProblemModal } from './components/trust/ReportProblemModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ProfilePage } from './components/profile/ProfilePage';
import { getVisibleBookings } from './services/accessControl';

export function AppContent() {
  const {
    currentUser,
    activeRole,
    activeTab,
    setActiveTab,
    bookings,
    setActiveBookingForTracking,
    setIsAuthModalOpen,
    setAuthModalTab
  } = useApp();
  const visibleBookings = getVisibleBookings(bookings, currentUser);

  const [searchParam, setSearchParam] = useState('');

  const handleOpenSearchWithCategory = (catName) => {
    setSearchParam(catName);
    setActiveTab('search');
  };

  // Sync /join-executive URL to activeTab and handle AppContext navigate events
  React.useEffect(() => {
    const path = window.location.pathname;
    if (path === '/join-executive') setActiveTab('join-executive');
    const handler = (e) => { if (e.detail === 'join-executive') setActiveTab('join-executive'); };
    window.addEventListener('zolve:navigate', handler);
    const onPop = () => {
      if (window.location.pathname === '/join-executive') setActiveTab('join-executive');
      else if (activeTab === 'join-executive') setActiveTab('home');
    };
    window.addEventListener('popstate', onPop);
    return () => { window.removeEventListener('zolve:navigate', handler); window.removeEventListener('popstate', onPop); };
  }, []);

  React.useEffect(() => {
    if (activeTab === 'join-executive') window.history.pushState({}, '', '/join-executive');
    else if (window.location.pathname === '/join-executive') window.history.pushState({}, '', '/');
  }, [activeTab]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-brand-500 selection:text-white">
      {/* Top Main Navigation */}
      <Navbar />

      {/* Main Content View Switcher */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8">
        <AnimatePresence mode="wait">
          {/* PUBLIC & CUSTOMER VIEWS */}
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {activeRole === 'provider' ? (
                <ProviderDashboard />
              ) : activeRole === 'executive' ? (
                <ExecutiveDashboard />
              ) : activeRole === 'admin' ? (
                <AdminDashboard />
              ) : activeRole === 'society_admin' ? (
                <SocietyDashboard />
              ) : (
                <CustomerDashboard onOpenSearchWithCategory={handleOpenSearchWithCategory} />
              )}
            </motion.div>
          )}
          {activeTab === 'join-executive' && (
            <motion.div key="join-executive" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
              <JoinExecutivePage />
            </motion.div>
          )}

          {activeTab === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <ServiceSearch initialSearch={searchParam} />
            </motion.div>
          )}

          {activeTab === 'bookings' && (
            <motion.div
              key="bookings"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 pb-16"
            >
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-subtle flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
                  My Bookings ({visibleBookings.length})
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Track real-time provider arrival, chat with technicians, and review completed services — only your own orders; executives see only their vertical after mobile OTP verification.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {!currentUser ? (
                <div className="p-8 rounded-3xl bg-white border text-center">
                  <p className="text-sm font-bold">Sign in to view your bookings</p>
                  <p className="text-xs text-slate-500 mt-1">Zero order history until you book. Executives must verify mobile to see vertical orders.</p>
                  <button onClick={()=>{ setAuthModalTab('signin'); setIsAuthModalOpen(true); }} className="mt-3 px-4 py-2 rounded-xl bg-brand-900 text-white text-xs font-bold">Sign In</button>
                </div>
              ) : visibleBookings.length===0 ? (
                <div className="p-8 rounded-3xl bg-white border text-center text-sm text-slate-500">No bookings found for your account. {currentUser.role==='executive' && currentUser.executiveStatus==='pending_approval' ? 'Community executive pending Society Admin approval.' : 'Book a service to see it here.'}</div>
              ) : visibleBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-subtle flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={b.providerAvatar}
                      alt={b.providerName}
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-coop-500/20"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 font-bold text-xs">
                          #{b.bookingCode}
                        </span>
                        <h3 className="text-base font-bold text-slate-900">{b.serviceName}</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Provider: <strong className="text-slate-800">{b.providerName}</strong> ({b.providerTitle})
                      </p>
                      <div className="text-xs text-slate-400 mt-1">
                        Scheduled: {b.scheduledDate} • {b.scheduledTime}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 gap-3">
                    <div className="text-left md:text-right">
                      <div className="text-sm font-black text-slate-900">₹{b.totalAmount} (Paid)</div>
                      <span className="px-2 py-0.5 rounded-full bg-coop-50 text-coop-800 text-[10px] font-bold">
                        {b.bookingStatus.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <button
                      onClick={() => setActiveBookingForTracking(b)}
                      className="px-4 py-2 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold transition-colors shadow-sm"
                    >
                      Track & Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'payments' && (
          <motion.div key="payments" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            <CustomerPaymentHistory />
          </motion.div>
        )}
        {activeTab === 'earnings' && (
          <motion.div key="earnings" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            <EarningsLedger />
          </motion.div>
        )}
        {activeTab === 'cooperative' && (
          <motion.div key="cooperative" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            <CooperativePortal />
          </motion.div>
        )}
        {activeTab === 'community' && (
          <motion.div key="community" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            <CommunityPortal />
          </motion.div>
        )}
        {activeTab === 'training' && (
          <motion.div key="training" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            <CooperativePortal />
          </motion.div>
        )}
        {activeTab === 'society' && (
          <motion.div key="society" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            <SocietyDashboard />
          </motion.div>
        )}
        {activeTab === 'trust' && (
          <motion.div key="trust" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            <TrustAndSafety />
          </motion.div>
        )}
        {activeTab === 'admin' && (
          <motion.div key="admin" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            <AdminDashboard />
          </motion.div>
        )}
        {activeTab === 'profile' && (
          <motion.div key="profile" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            <ProfilePage />
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* Global Footer */}
      <Footer />

      {/* GLOBAL MODALS & DRAWERS */}
      <LocationModal />
      <AuthModal />
      <AICopilotDrawer />
      <ProviderProfileModal />
      <BookingModal />
      <LiveBookingTracker />
      <InvoiceModal />
      <ReviewModal />
      <ReportProblemModal />
    </div>
  );
}

export default function App() {
  return <AppContent />;
}

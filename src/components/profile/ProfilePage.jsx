import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getVisibleBookings } from '../../services/accessControl';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Package,
  Wallet,
  HelpCircle,
  Sun,
  Moon,
  LogOut,
  ShieldCheck,
  Edit2,
  ChevronRight
} from 'lucide-react';

export const ProfilePage = () => {
  const {
    currentUser,
    activeRole,
    bookings,
    setActiveTab,
    setActiveBookingForTracking,
    setIsCopilotOpen,
    logout,
    theme,
    toggleTheme,
    zolveMoney
  } = useApp();

  const [activeSection, setActiveSection] = useState('none'); // 'orders' | 'money' | 'help' | 'none'

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
          <User className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-extrabold font-display dark:text-white">No profile yet</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Please sign in to view your profile, orders and Zolve Money.</p>
      </div>
    );
  }

  const visible = getVisibleBookings(bookings, currentUser);
  const primaryAddress =
    currentUser.savedAddresses?.find((a) => a.isDefault)?.addressLine ||
    currentUser.savedAddresses?.[0]?.addressLine ||
    currentUser.location ||
    'No address on file';

  const handleYourOrders = () => {
    setActiveSection('orders');
    // also allow navigation to bookings tab if needed
  };
  const handleNeedHelp = () => {
    setIsCopilotOpen(true);
    setActiveSection('help');
  };
  const handleZolveMoney = () => setActiveSection('money');

  const sectionTabs = [
    { id: 'orders', label: 'Your Orders', icon: Package, desc: `${visible.length} orders`, action: handleYourOrders },
    { id: 'money', label: 'Zolve Money', icon: Wallet, desc: `₹${zolveMoney.balance}`, action: handleZolveMoney },
    { id: 'help', label: 'Need Help', icon: HelpCircle, desc: 'AI Copilot', action: handleNeedHelp },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Heading */}
      <div className="rounded-3xl bg-gradient-to-br from-brand-900 via-brand-950 to-coop-950 text-white p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display">My Account</h1>
        <p className="text-xs text-slate-300 mt-1">Manage your profile, orders, rewards and preferences</p>
      </div>

      {/* Profile identity card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-subtle p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <img
            src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
            alt={currentUser.name}
            className="w-20 h-20 rounded-2xl object-cover ring-2 ring-coop-500/20 shrink-0"
          />
          <div className="flex-1 min-w-0 space-y-4 w-full">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{currentUser.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 text-[10px] font-bold uppercase">
                  {activeRole.replace('_', ' ')}
                  {currentUser.executiveVertical ? ` • ${currentUser.executiveVertical}` : ''}
                </span>
                {currentUser.mobileVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-coop-50 dark:bg-coop-950 text-coop-700 dark:text-coop-300 text-[10px] font-bold border border-coop-200 dark:border-coop-800">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <Phone className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mobile Number</div>
                  <div className="font-semibold text-slate-900 dark:text-white truncate">{currentUser.phone || 'Not set'}</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</div>
                  <div className="font-semibold text-slate-900 dark:text-white truncate">{currentUser.email || 'Not set'}</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 sm:col-span-2">
                <MapPin className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Address</div>
                  <div className="font-medium text-slate-900 dark:text-white leading-relaxed">{primaryAddress}</div>
                  {currentUser.savedAddresses?.length > 1 && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      + {currentUser.savedAddresses.length - 1} more saved address{currentUser.savedAddresses.length > 2 ? 'es' : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Three horizontal options under My Account */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">My Account</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {sectionTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={tab.action}
              className={`p-5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
                activeSection === tab.id
                  ? 'bg-brand-50 dark:bg-brand-950 border-brand-300 dark:border-brand-800 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-subtle'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tab.id === 'money' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400' : tab.id === 'help' ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                  <tab.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{tab.label}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{tab.desc}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Section detail */}
      {activeSection === 'orders' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-subtle overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h4 className="text-sm font-bold dark:text-white">Your Orders ({visible.length})</h4>
            <button onClick={() => setActiveTab('bookings')} className="text-xs font-bold text-brand-700 dark:text-brand-300 hover:underline">View all in Bookings →</button>
          </div>
          {visible.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No orders yet. Book a service to see it here. Executives see only vertical orders after mobile OTP.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {visible.slice(0, 6).map((b) => (
                <div key={b.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={b.providerAvatar} alt={b.providerName} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{b.serviceName} <span className="font-normal text-slate-500">#{b.bookingCode}</span></div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{b.scheduledDate} • {b.bookingStatus.replace(/_/g, ' ')}</div>
                    </div>
                  </div>
                  <button onClick={() => setActiveBookingForTracking(b)} className="shrink-0 px-3 py-1.5 rounded-xl bg-brand-900 dark:bg-brand-800 text-white text-xs font-bold">Track</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSection === 'money' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-subtle overflow-hidden">
          <div className="p-6 sm:p-8 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-white/80">Zolve Money Wallet</div>
                <div className="text-3xl font-black mt-1">₹{zolveMoney.balance}</div>
                <p className="text-xs text-white/80 mt-1">Earn ₹10–₹200 randomly on every service you book. Use on next checkout.</p>
              </div>
              <Wallet className="w-10 h-10 text-white/90" />
            </div>
          </div>
          <div className="p-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">Recent Rewards</h4>
            {zolveMoney.history.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No rewards yet. Book your first service to earn Zolve Money!</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-auto pr-1">
                {zolveMoney.history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">+ ₹{h.amount} <span className="font-normal text-slate-500">for {h.serviceName}</span></div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">#{h.bookingCode} • {h.date} {h.time || ''}</div>
                    </div>
                    <span className="text-xs font-black text-coop-700 dark:text-coop-400">+₹{h.amount}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3">Rewards are credited instantly after successful booking. Random ₹10–₹200 per order.</p>
          </div>
        </div>
      )}

      {activeSection === 'help' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
          <h4 className="text-sm font-bold dark:text-white flex items-center gap-2"><HelpCircle className="w-4 h-4 text-indigo-600" /> Need Help</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Chat with Zolve AI Copilot for booking help, cancellations, or service queries.</p>
          <button onClick={() => setIsCopilotOpen(true)} className="mt-4 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">Open AI Copilot →</button>
        </div>
      )}

      {/* Light / Dark mode + Logout */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-subtle p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              {theme === 'dark' ? <Moon className="w-5 h-5 text-slate-700 dark:text-slate-300" /> : <Sun className="w-5 h-5 text-amber-600" />}
            </div>
            <div>
              <div className="text-sm font-bold dark:text-white">Appearance</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Switch between light and dark mode</div>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center gap-2"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => logout()}
            className="w-full py-3 rounded-xl bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-bold flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </div>
      </div>
    </div>
  );
};

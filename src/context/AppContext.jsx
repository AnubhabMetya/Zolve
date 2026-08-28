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

const AppContext = createContext(null);

const STORAGE_KEY_PREFIX = 'zolve_app_state_v1';

export const AppProvider = ({ children }) => {
  // 1. Auth State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}_user`);
    return saved ? JSON.parse(saved) : null; // default null to show split-screen auth screen
  });

  const [activeRole, setActiveRole] = useState(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}_role`);
    return saved || 'customer';
  });

  // 2. Core Entities State
  const [providers, setProviders] = useState(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}_providers`);
    return saved ? JSON.parse(saved) : INITIAL_PROVIDERS;
  });

  const [bookings, setBookings] = useState(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}_bookings`);
    return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
  });

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

  const [earningsLedger, setEarningsLedger] = useState(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}_ledger`);
    return saved ? JSON.parse(saved) : PROVIDER_EARNINGS_LEDGER;
  });

  const [supportTickets, setSupportTickets] = useState(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}_tickets`);
    return saved ? JSON.parse(saved) : INITIAL_SUPPORT_TICKETS;
  });

  const [executiveApplications, setExecutiveApplications] = useState(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}_exec_apps`);
    return saved ? JSON.parse(saved) : [];
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

  const [selectedLocation, setSelectedLocation] = useState('Indiranagar, Bengaluru');
  const [activeTab, setActiveTab] = useState('home'); // active navigation view
  const [theme, setTheme] = useState(() => localStorage.getItem(`${STORAGE_KEY_PREFIX}_theme`) || 'light');
  const [zolveMoney, setZolveMoney] = useState(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}_zolve_money`);
    return saved ? JSON.parse(saved) : { balance: 0, history: [] };
  });

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

  // Sync to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_user`, JSON.stringify(currentUser));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_role`, activeRole);
    } else {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}_user`);
    }
  }, [currentUser, activeRole]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}_bookings`, JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}_proposals`, JSON.stringify(proposals));
  }, [proposals]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}_providers`, JSON.stringify(providers));
  }, [providers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}_exec_apps`, JSON.stringify(executiveApplications));
  }, [executiveApplications]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}_theme`, theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}_zolve_money`, JSON.stringify(zolveMoney));
  }, [zolveMoney]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  // Auth Operations
  const login = (user, role = 'customer') => {
    setCurrentUser(user);
    setActiveRole(role);
    setIsAuthModalOpen(false);
    addNotification({
      title: `Welcome back, ${user.name}!`,
      message: `Signed in successfully as ${role.replace('_', ' ').toUpperCase()}.`,
      type: 'system'
    });
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}_user`);
    setActiveTab('home');
    addNotification({
      title: 'Signed Out',
      message: 'You have been safely signed out of Zolve.',
      type: 'system'
    });
  };

  const switchDemoRole = (roleKey) => {
    const targetUser = DEMO_USERS[roleKey];
    if (targetUser) {
      setCurrentUser(targetUser);
      setActiveRole(targetUser.role);
      setActiveTab('home');
      addNotification({
        title: `Switched to Demo: ${targetUser.name}`,
        message: `Role changed to ${targetUser.role.toUpperCase()}`,
        type: 'system'
      });
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

  // Booking Flow Operations
  const createBooking = (bookingData) => {
    const newBookingId = `bk-zol-${Math.floor(1000 + Math.random() * 9000)}`;
    const bookingCode = `ZOL-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBooking = {
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

    setBookings((prev) => [newBooking, ...prev]);

    // Also add to provider earnings ledger
    const newLedgerItem = {
      id: `ledg_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      bookingCode: newBooking.bookingCode,
      serviceName: newBooking.serviceName,
      customerName: newBooking.customerName,
      grossAmount: newBooking.totalAmount,
      customerPaid: newBooking.totalAmount,
      platformFee: newBooking.platformFee || 80,
      coopAllocation: newBooking.coopReserveFee || 40,
      taxes: newBooking.taxes || 40,
      netEarnings: newBooking.providerEarnings || (newBooking.baseAmount),
      status: 'SETTLED'
    };
    setEarningsLedger((prev) => [newLedgerItem, ...prev]);

    // Notify provider and customer + award Zolve Money
    awardZolveMoney(newBooking.bookingCode, newBooking.serviceName);
    addNotification({
      title: 'Booking Confirmed!',
      message: `Your booking #${newBooking.bookingCode} for ${newBooking.serviceName} is confirmed.`,
      type: 'booking'
    });

    return newBooking;
  };

  const updateBookingStatus = (bookingId, newStatus, reason = null) => {
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

    addNotification({
      title: `Booking #${bookingId.substring(0, 11)} Updated`,
      message: `Status transitioned to ${newStatus.replace(/_/g, ' ')}`,
      type: 'booking'
    });
  };

  const sendBookingChatMessage = (bookingId, text, sender = 'customer') => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          const newMsg = {
            id: `msg-${Date.now()}`,
            sender,
            text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          return {
            ...b,
            chatMessages: [...(b.chatMessages || []), newMsg]
          };
        }
        return b;
      })
    );
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

  // Support / Dispute Ticket Creation
  const createSupportTicket = (ticketData) => {
    const newTicket = {
      id: `tkt-${Date.now()}`,
      ticketCode: `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
      userName: currentUser?.name || 'Anonymous User',
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
        communityProjects: COMMUNITY_PROJECTS,
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
        setIsReportProblemOpen
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

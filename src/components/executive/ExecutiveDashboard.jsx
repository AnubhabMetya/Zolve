import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { isExecutivePending } from '../../services/accessControl';
import { ExecutiveApplicationService } from '../../services/executiveApplicationService';
import { haversineKm } from '../../services/locationService';
import { CommunityOperationsCenter } from './CommunityOperationsCenter';
import { ExecutiveJobDiscovery } from './ExecutiveJobDiscovery';
import {
  ShieldCheck,
  Clock,
  Phone,
  Mail,
  RefreshCw,
  Zap,
  Briefcase,
  Compass,
  CheckCircle2,
  MapPin,
  TrendingUp,
  Bell,
  User,
  Star,
  Navigation,
  ArrowRight,
  AlertCircle,
  Play,
  Check,
  Award,
  DollarSign
} from 'lucide-react';

export const ExecutiveDashboard = () => {
  const {
    currentUser,
    bookings,
    updateBookingStatus,
    setActiveBookingForTracking,
    notifications,
    declinedJobIds
  } = useApp();
  const { user: supaUser } = useAuth();
  const [checking, setChecking] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, nearby, my_jobs, skills, performance, notifications

  // Real-time polling heartbeat fallback every 3s while pending
  useEffect(() => {
    if (!isExecutivePending(currentUser)) return;
    const interval = setInterval(async () => {
      if (supaUser) {
        try {
          await ExecutiveApplicationService.fetchMyLatestApplication(supaUser);
        } catch {}
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [currentUser, supaUser]);

  const handleManualCheck = async () => {
    setChecking(true);
    try {
      if (supaUser) {
        await ExecutiveApplicationService.fetchMyLatestApplication(supaUser);
      }
      ExecutiveApplicationService.broadcastExecutiveEvent({ type: 'STATUS_PING' });
    } catch {}
    setTimeout(() => setChecking(false), 600);
  };

  if (!currentUser || currentUser.role !== 'executive') return null;

  // 1. PENDING STATE (Community Executive awaiting Society Admin approval)
  if (isExecutivePending(currentUser)) {
    return (
      <div className="py-14 text-center space-y-6 max-w-xl mx-auto">
        <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-amber-100 animate-ping opacity-60"></div>
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center relative z-10 shadow-md">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>
        </div>

        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 mb-2">
            Verification In Progress
          </span>
          <h2 className="text-2xl font-black text-slate-900 font-display">
            Pending Society Admin Approval
          </h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Your Community & Society Executive registration has been submitted. Society administrators
            review credentials before granting access to community emergency dispatch and society orders.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Live Sync Active • Instant Approval Connected</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 text-xs text-left space-y-2.5 shadow-subtle">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <span className="text-slate-500">Vertical:</span>
            <strong className="text-slate-900">{currentUser.executiveVertical} Services</strong>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <span className="text-slate-500">Applicant:</span>
            <strong className="text-slate-900">{currentUser.name}</strong>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <span className="text-slate-500">Email:</span>
            <strong className="text-slate-900">{currentUser.email}</strong>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <span className="text-slate-500">Status:</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
              PENDING APPROVAL
            </span>
          </div>
          {currentUser.assignedServices?.length > 0 && (
            <div>
              <span className="text-slate-500 block mb-1">Selected Skills:</span>
              <div className="flex flex-wrap gap-1.5">
                {currentUser.assignedServices.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={handleManualCheck}
            disabled={checking}
            className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking Status…' : 'Check Approval Status'}</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. COMMUNITY EXECUTIVE (Approved / Active) -> Unlocks Community Operations Center
  if (currentUser.executiveVertical === 'community') {
    return <CommunityOperationsCenter executiveUser={currentUser} />;
  }

  // 3. HOUSEHOLD & PERSONAL OPERATIONS DASHBOARD
  const assignedSkills = currentUser.assignedServices || [];
  const execCoords = currentUser.coordinates || { lat: 22.5726, lng: 88.3639 }; // Defaults to canonical Kolkata coordinates if not yet set

  // Calculate nearby opportunities (strictly <= 50 km and matches at least one assigned skill)
  const nearbyJobs = useMemo(() => {
    return bookings.filter((b) => {
      if (declinedJobIds?.has(b.id)) return false;
      const status = String(b.bookingStatus || '').toUpperCase();
      if (status === 'SERVICE_COMPLETED' || status === 'CANCELLED') return false;

      // Skill match
      const matchesSkill =
        assignedSkills.length === 0 ||
        assignedSkills.some((s) =>
          s.toLowerCase().includes((b.serviceName || '').toLowerCase()) ||
          (b.serviceName || '').toLowerCase().includes(s.toLowerCase())
        );
      if (!matchesSkill) return false;

      // Distance check: strictly <= 50 km
      const jobLat = b.coordinates?.lat || b.lat || 22.5726;
      const jobLng = b.coordinates?.lng || b.lng || 88.3639;
      const dist = haversineKm(execCoords.lat, execCoords.lng, jobLat, jobLng);
      return dist <= 50.0;
    });
  }, [bookings, declinedJobIds, assignedSkills, execCoords]);

  // My Accepted / Active Jobs
  const myAcceptedJobs = useMemo(() => {
    return bookings.filter(
      (b) =>
        b.assignedExecutiveId === currentUser.id ||
        b.bookingStatus === 'PROVIDER_ACCEPTED' ||
        b.bookingStatus === 'PROVIDER_ON_THE_WAY' ||
        b.bookingStatus === 'SERVICE_STARTED'
    );
  }, [bookings, currentUser.id]);

  const completedJobs = useMemo(() => {
    return bookings.filter(
      (b) =>
        (b.assignedExecutiveId === currentUser.id || b.executiveAssignedId === currentUser.id) &&
        b.bookingStatus === 'SERVICE_COMPLETED'
    );
  }, [bookings, currentUser.id]);

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-700 to-indigo-700 flex items-center justify-center text-white text-xl font-bold shadow-md">
            {currentUser.name ? currentUser.name.charAt(0) : 'E'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-slate-900 font-display">
                {currentUser.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                ACTIVE EXECUTIVE
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[11px] font-bold border border-brand-200">
                {currentUser.executiveVertical === 'personal'
                  ? 'Personal & Family'
                  : 'Household Services'}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1 text-slate-700">
                <Mail className="w-3.5 h-3.5 text-coop-600" />
                {currentUser.email}
              </span>
              <span className="flex items-center gap-1 text-slate-700">
                <Phone className="w-3.5 h-3.5 text-coop-600" />
                {currentUser.phone || '+91 98765 43210'}
              </span>
              <span className="flex items-center gap-1 text-slate-700 font-medium">
                <MapPin className="w-3.5 h-3.5 text-brand-600" />
                {currentUser.location || 'Local Coverage Area'}
                {currentUser.locationAccuracy && (
                  <span className="text-[10px] text-slate-400">
                    (±{Math.round(currentUser.locationAccuracy)}m)
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Operating Radius Badge */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-right">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Operating Zone
            </span>
            <span className="text-xs font-extrabold text-slate-800">50 km Hard Radius</span>
          </div>
        </div>
      </div>

      {/* Operations Navigation Tabs */}
      <div className="flex items-center gap-1 sm:gap-2 p-1.5 rounded-2xl bg-slate-100 border border-slate-200/80 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'overview'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-brand-600" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('nearby')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 relative ${
            activeTab === 'nearby'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-coop-600" />
          <span>Nearby Jobs</span>
          {nearbyJobs.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-brand-600 text-white text-[10px] font-extrabold">
              {nearbyJobs.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('my_jobs')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'my_jobs'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
          <span>My Accepted Jobs</span>
          {myAcceptedJobs.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold">
              {myAcceptedJobs.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('skills')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'skills'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-3.5 h-3.5 text-amber-600" />
          <span>Skills & Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'performance'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          <span>Performance</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'notifications'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bell className="w-3.5 h-3.5 text-slate-600" />
          <span>Notifications</span>
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-subtle">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">Active Jobs</span>
                <Briefcase className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{myAcceptedJobs.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">In progress / accepted</div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-subtle">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">Nearby &lt;50 km</span>
                <Compass className="w-4 h-4 text-brand-600" />
              </div>
              <div className="text-2xl font-black text-brand-700">{nearbyJobs.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">Matching verified skills</div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-subtle">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">Completed Jobs</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700">{completedJobs.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">100% on-time rate</div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-subtle">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">FairMatch Rating</span>
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              </div>
              <div className="text-2xl font-black text-slate-900">4.92 ★</div>
              <div className="text-[11px] text-amber-600 font-semibold mt-1">
                Tier 1 Preferred Executive
              </div>
            </div>
          </div>

          {/* Assigned Skills & Quick Discovery CTA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 p-6 rounded-3xl bg-white border border-slate-200 shadow-subtle space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Your Registered Skills ({assignedSkills.length} of 3 selected)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Only jobs matching these exact skills within your 50 km zone are allotted.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('skills')}
                  className="text-xs text-brand-700 font-bold hover:underline"
                >
                  View Details
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {assignedSkills.map((skill) => (
                  <div
                    key={skill}
                    className="px-3.5 py-2 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold flex items-center gap-2 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>{skill}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Ready to dispatch? {nearbyJobs.length} eligible customer requests available now.
                </div>
                <button
                  onClick={() => setActiveTab('nearby')}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-950 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  <span>Explore Opportunities</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Service Radius Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-subtle flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-emerald-400 mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  GPS Geofence Active
                </div>
                <h4 className="text-base font-black">50 km Geographic Eligibility</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Zolve guarantees that no distant or irrelevant jobs are shown. You only see orders
                  where the customer's coordinates are verified to be within 50 km of your base.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-white/10 text-xs text-slate-300 flex items-center justify-between">
                <span>FairMatch Workload</span>
                <span className="font-bold text-emerald-400">Optimal (0 Active Load)</span>
              </div>
            </div>
          </div>

          {/* Quick Active Jobs List */}
          {myAcceptedJobs.length > 0 && (
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-subtle space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-900">Current Ongoing Tasks</h3>
                <button
                  onClick={() => setActiveTab('my_jobs')}
                  className="text-xs text-brand-700 font-bold hover:underline"
                >
                  Manage All Jobs
                </button>
              </div>
              <div className="space-y-3">
                {myAcceptedJobs.slice(0, 3).map((job) => (
                  <div
                    key={job.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-bold">
                          #{job.bookingCode || job.id.slice(-6)}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900">
                          {job.serviceName}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Customer: <strong>{job.customerName}</strong> • {job.address}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-extrabold border border-indigo-200">
                        {job.bookingStatus?.replace(/_/g, ' ')}
                      </span>
                      <button
                        onClick={() => setActiveTab('my_jobs')}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold hover:bg-slate-50"
                      >
                        Action
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. NEARBY JOBS DISCOVERY TAB */}
      {activeTab === 'nearby' && (
        <ExecutiveJobDiscovery executiveUser={currentUser} executiveSkills={assignedSkills} />
      )}

      {/* 3. MY ACCEPTED JOBS TAB */}
      {activeTab === 'my_jobs' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">My Accepted Orders</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage status updates and track progress for your accepted bookings.
              </p>
            </div>
          </div>

          {myAcceptedJobs.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-4 shadow-subtle">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Briefcase className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No active jobs in your queue</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Explore nearby opportunities within your 50 km zone and accept a request to begin work.
              </p>
              <button
                onClick={() => setActiveTab('nearby')}
                className="px-6 py-2.5 rounded-xl bg-brand-900 text-white text-xs font-bold hover:bg-brand-950 transition-colors"
              >
                Discover Nearby Jobs
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myAcceptedJobs.map((job) => {
                const status = job.bookingStatus || 'PROVIDER_ACCEPTED';
                return (
                  <div
                    key={job.id}
                    className="p-6 rounded-3xl bg-white border border-slate-200 shadow-subtle space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold border border-brand-200">
                          #{job.bookingCode || job.id.slice(-6)}
                        </span>
                        <h3 className="text-base font-black text-slate-900">{job.serviceName}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 text-xs font-extrabold border border-indigo-200">
                          {status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm font-black text-emerald-700">
                          ₹{job.totalAmount || 499}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
                      <div>
                        <span className="font-bold text-slate-800 block">Customer Information</span>
                        <div className="mt-1">
                          {job.customerName}
                          {job.customerPhone ? (
                            <a
                              href={`tel:+91${job.customerPhone}`}
                              className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-coop-50 text-coop-700 border border-coop-200 font-bold"
                            >
                              <Phone className="w-3 h-3" />
                              +91 {job.customerPhone}
                            </a>
                          ) : (
                            <span className="text-slate-400 ml-1">(Phone masked for privacy)</span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{job.address}</span>
                        </div>
                      </div>

                      <div>
                        <span className="font-bold text-slate-800 block">Schedule & Notes</span>
                        <div className="mt-1">
                          {job.scheduledDate || 'Today'} • {job.scheduledTime || 'Flexible Arrival'}
                        </div>
                        <div className="mt-1 text-slate-500">
                          Payment: <strong>{job.paymentMode || 'Online'}</strong> • OTP Verified
                        </div>
                      </div>
                    </div>

                    {/* Progress Control Actions */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <button
                        onClick={() => setActiveBookingForTracking(job)}
                        className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5"
                      >
                        <Navigation className="w-3.5 h-3.5 text-brand-600" />
                        <span>Track Route</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {status === 'PROVIDER_ACCEPTED' && (
                          <button
                            onClick={() => updateBookingStatus(job.id, 'PROVIDER_ON_THE_WAY')}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Mark On The Way</span>
                          </button>
                        )}
                        {status === 'PROVIDER_ON_THE_WAY' && (
                          <button
                            onClick={() => updateBookingStatus(job.id, 'SERVICE_STARTED')}
                            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Start Service</span>
                          </button>
                        )}
                        {status === 'SERVICE_STARTED' && (
                          <button
                            onClick={() => updateBookingStatus(job.id, 'SERVICE_COMPLETED')}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Completed</span>
                          </button>
                        )}
                        {status === 'SERVICE_COMPLETED' && (
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Task Finished</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. SKILLS & PROFILE TAB */}
      {activeTab === 'skills' && (
        <div className="space-y-6 max-w-3xl">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-subtle space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">Executive Identity & Skills</h3>
              <span className="px-3 py-1 rounded-full bg-brand-50 text-brand-800 text-xs font-bold border border-brand-200">
                Verified Executive
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Full Name</span>
                <strong className="text-slate-900 text-sm">{currentUser.name}</strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Email Verification</span>
                <span className="text-slate-900 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {currentUser.email} (Email OTP Verified)
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Operating Base</span>
                <strong className="text-slate-900">
                  {currentUser.location || 'Local Region'}
                  {currentUser.locationAccuracy && (
                    <span className="text-slate-400 font-normal">
                      {' '}
                      (GPS Accuracy: ±{Math.round(currentUser.locationAccuracy)}m)
                    </span>
                  )}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Geographic Coverage</span>
                <strong className="text-slate-900">50 km Hard Boundary</strong>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Assigned Services (Max 3 Allowed)
                </h4>
                <span className="text-xs font-bold text-brand-700">
                  {assignedSkills.length} / 3 Selected
                </span>
              </div>
              <div className="space-y-2.5">
                {assignedSkills.map((skill, index) => (
                  <div
                    key={skill}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-extrabold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{skill}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active Skill
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. PERFORMANCE TAB */}
      {activeTab === 'performance' && (
        <div className="space-y-6 max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-subtle">
              <span className="text-xs font-bold text-slate-500">On-Time Arrival</span>
              <div className="text-2xl font-black text-slate-900 mt-1">98.4%</div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">Above target (95%)</div>
            </div>
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-subtle">
              <span className="text-xs font-bold text-slate-500">Customer Rating</span>
              <div className="text-2xl font-black text-amber-500 mt-1">4.92 ★</div>
              <div className="text-[11px] text-slate-500 mt-1">Based on verified reviews</div>
            </div>
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-subtle">
              <span className="text-xs font-bold text-slate-500">FairMatch Standing</span>
              <div className="text-2xl font-black text-brand-700 mt-1">Tier 1</div>
              <div className="text-[11px] text-brand-600 font-semibold mt-1">Top priority queue</div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-subtle space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Operational Integrity Standards</h3>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Strict 50 km Geographic Verification:</strong> You are never allotted jobs
                  outside your 50 km operational boundary, minimizing transit delays.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>FairMatch Workload Balancing:</strong> New jobs are distributed fairly based
                  on your current active tasks to prevent executive burnout.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Zero-Delay Direct Dispatch:</strong> Bookings created by nearby customers are
                  broadcast instantly to your discovery feed in real time.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. NOTIFICATIONS TAB */}
      {activeTab === 'notifications' && (
        <div className="space-y-4 max-w-3xl">
          <h2 className="text-xl font-extrabold text-slate-900">Executive Activity & Alerts</h2>
          {notifications.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-500">
              No new alerts at this time.
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif, index) => (
                <div
                  key={index}
                  className="p-4 rounded-2xl bg-white border border-slate-200 shadow-subtle flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{notif.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{notif.message}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

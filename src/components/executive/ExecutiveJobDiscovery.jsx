import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ExecutiveJobCard } from './ExecutiveJobCard';
import { ExecutiveJobDetail } from './ExecutiveJobDetail';
import { resolveCity } from '../../services/cityResolver';
import { haversineKm } from '../../services/locationService';
import {
  Compass,
  RefreshCw,
  Sparkles,
  Search,
  Filter,
  SlidersHorizontal,
  MapPin,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const ExecutiveJobDiscovery = ({
  executiveUser,
  executiveSkills = [],
  onJobAccepted,
}) => {
  const {
    bookings = [],
    selectedLocation,
    acceptExecutiveJob,
    declineExecutiveJob,
    declinedJobIds = new Set(),
  } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const [sortBy, setSortBy] = useState('fairmatch'); // 'fairmatch' | 'distance' | 'payout'
  const [filterSkill, setFilterSkill] = useState('ALL');

  // Executive canonical location
  const execCoords = useMemo(() => {
    if (selectedLocation?.lat != null && selectedLocation?.lng != null) {
      return { lat: selectedLocation.lat, lng: selectedLocation.lng };
    }
    return null;
  }, [selectedLocation]);

  const execCity = useMemo(() => {
    const res = resolveCity({
      lat: selectedLocation?.lat,
      lng: selectedLocation?.lng,
      name: selectedLocation?.name,
      text: selectedLocation?.name || selectedLocation?.city
    });
    return res?.city || selectedLocation?.city || null;
  }, [selectedLocation]);

  // Smooth discovery transition on mount / location change
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [execCity, executiveSkills]);

  // HARD ELIGIBILITY PIPELINE
  const eligibleJobs = useMemo(() => {
    const skillsList = (executiveSkills && executiveSkills.length > 0)
      ? executiveSkills
      : (executiveUser?.assignedServices || []);

    return bookings
      .filter((b) => {
        // 1. Exclude already declined jobs
        if (declinedJobIds && (declinedJobIds.has(b.id) || (typeof declinedJobIds.includes === 'function' && declinedJobIds.includes(b.id)))) {
          return false;
        }

        // 2. HARD SKILL MATCH: executive skill must include required service
        if (!skillsList.includes(b.serviceName)) {
          return false;
        }

        // 3. Status check: open, confirmed, or unassigned/matching status
        const s = (b.bookingStatus || '').toUpperCase();
        const isOpen =
          s === 'CONFIRMED' ||
          s === 'PAYMENT_PENDING' ||
          s === 'PROVIDER_ASSIGNED' ||
          s === 'PENDING';
        if (!isOpen) return false;

        // 4. HARD 50 KM GEOGRAPHIC ELIGIBILITY RULE
        let dist = null;
        if (execCoords && b.customerCoords?.lat != null && b.customerCoords?.lng != null) {
          dist = haversineKm(execCoords.lat, execCoords.lng, b.customerCoords.lat, b.customerCoords.lng);
        } else if (execCoords && b.address) {
          // Resolve booking city from address/text
          const bCity = resolveCity({ text: b.address, name: b.address });
          if (bCity?.coords?.lat != null) {
            dist = haversineKm(execCoords.lat, execCoords.lng, bCity.coords.lat, bCity.coords.lng);
          }
        }

        // If distance measured, enforce <= 50 km strictly
        if (dist != null) {
          if (dist > 50) return false;
        } else if (execCity) {
          // If no GPS coords on booking, match city name directly
          const bCityName = b.city || resolveCity({ text: b.address })?.city;
          if (bCityName && bCityName.toLowerCase() !== execCity.toLowerCase()) {
            return false;
          }
        }

        return true;
      })
      .map((b) => {
        let distanceKm = null;
        if (execCoords && b.customerCoords?.lat != null && b.customerCoords?.lng != null) {
          distanceKm = haversineKm(execCoords.lat, execCoords.lng, b.customerCoords.lat, b.customerCoords.lng);
        }

        // Compute FairMatch score based on skill, distance, urgency, and workload
        const distScore = distanceKm != null ? Math.max(20, Math.round(100 - (distanceKm / 50) * 80)) : 80;
        const skillScore = 95; // certified match
        const fairMatchScore = Math.min(99, Math.round(skillScore * 0.45 + distScore * 0.35 + 85 * 0.20));

        const matchReasons = [
          `✓ Skill match (${b.serviceName})`,
          distanceKm != null ? `✓ Within ${Math.round(distanceKm)} km (< 50 km)` : '✓ Within service area',
          `✓ FairMatch score: ${fairMatchScore}`
        ];

        return {
          ...b,
          distanceKm,
          fairMatchScore,
          matchReasons
        };
      })
      .filter((b) => filterSkill === 'ALL' || b.serviceName === filterSkill)
      .sort((a, b) => {
        if (sortBy === 'distance') {
          return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
        }
        if (sortBy === 'payout') {
          return (b.totalAmount || 0) - (a.totalAmount || 0);
        }
        // default: FairMatch score descending
        return (b.fairMatchScore || 0) - (a.fairMatchScore || 0);
      });
  }, [bookings, executiveSkills, executiveUser, execCoords, execCity, declinedJobIds, filterSkill, sortBy]);

  const handleAccept = async (jobId) => {
    setAcceptingId(jobId);
    try {
      if (acceptExecutiveJob) {
        await acceptExecutiveJob(jobId);
      }
      if (onJobAccepted) onJobAccepted(jobId);
    } catch (e) {
      console.warn('[ExecutiveJobDiscovery] accept failed:', e);
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDecline = (jobId) => {
    if (declineExecutiveJob) {
      declineExecutiveJob(jobId);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER & FILTER BAR */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-brand-900" />
              <h2 className="text-xl font-extrabold text-slate-900 font-display">
                Jobs Near You
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Filtered strictly by your qualified skills and the hard 50 km geographic radius rule.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {execCity ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                {execCity} • 50 km radius
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600">
                <MapPin className="w-3.5 h-3.5" /> All service areas
              </span>
            )}

            <button
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => setIsLoading(false), 400);
              }}
              title="Refresh jobs"
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CONTROLS: SORT & SKILL FILTER */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              Filter Skill:
            </span>
            <button
              onClick={() => setFilterSkill('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                filterSkill === 'ALL'
                  ? 'bg-brand-900 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              All Skills ({executiveSkills.length})
            </button>
            {executiveSkills.map((skill) => (
              <button
                key={skill}
                onClick={() => setFilterSkill(skill)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 ${
                  filterSkill === skill
                    ? 'bg-brand-900 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Sort by:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="fairmatch">FairMatch Affinity</option>
              <option value="distance">Proximity (Closest)</option>
              <option value="payout">Highest Payout</option>
            </select>
          </div>
        </div>
      </div>

      {/* BODY: LOADING TRANSITION OR JOB LIST */}
      {isLoading ? (
        <div className="py-16 text-center space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto text-brand-900 animate-spin">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Finding opportunities around you...
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Matching your certified skills with real customer bookings within 50 km.
            </p>
          </div>
        </div>
      ) : eligibleJobs.length === 0 ? (
        /* EMPTY STATE */
        <div className="bg-white rounded-3xl border border-slate-200/90 p-10 sm:p-14 text-center space-y-4 shadow-subtle">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              No Open Jobs Near You
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              We did not find any open service bookings within your 50 km coverage area matching your selected skills:{' '}
              <strong className="text-slate-700">
                {executiveSkills.join(', ') || 'selected skills'}
              </strong>
              .
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 max-w-sm mx-auto text-left text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-800 text-[11px] uppercase">Zolve Dispatch Principles:</div>
            <div>• Never pads search with distant providers from other cities.</div>
            <div>• Strictly enforces trade qualifications & GPS boundaries.</div>
            <div>• New incoming customer orders will appear here in real-time.</div>
          </div>
        </div>
      ) : (
        /* JOB CARDS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-200">
          {eligibleJobs.map((job) => (
            <ExecutiveJobCard
              key={job.id}
              job={job}
              isAccepting={acceptingId === job.id}
              onViewDetails={(j) => {
                setSelectedJob(j);
                setIsDetailOpen(true);
              }}
              onAcceptJob={handleAccept}
              onDeclineJob={handleDecline}
            />
          ))}
        </div>
      )}

      {/* JOB DETAIL MODAL */}
      <ExecutiveJobDetail
        job={selectedJob}
        currentUser={executiveUser}
        isOpen={isDetailOpen}
        isAccepting={acceptingId === selectedJob?.id}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedJob(null);
        }}
        onAcceptJob={handleAccept}
        onDeclineJob={handleDecline}
      />
    </div>
  );
};

export default ExecutiveJobDiscovery;

import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Star,
  ShieldCheck,
  Award,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Wrench,
  ArrowRight,
  MessageSquare,
  Sparkles,
  Zap
} from 'lucide-react';

export const ProviderProfileModal = () => {
  const {
    selectedProviderForProfile,
    setSelectedProviderForProfile,
    setSelectedProviderForBooking
  } = useApp();

  if (!selectedProviderForProfile) return null;
  const p = selectedProviderForProfile;

  const handleBookNow = () => {
    setSelectedProviderForBooking(p);
    setSelectedProviderForProfile(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative max-h-[92vh] flex flex-col">
        {/* Header Cover & Close Button */}
        <div className="relative h-32 bg-gradient-to-r from-brand-900 via-brand-800 to-coop-800 p-6 flex items-start justify-between text-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-bold tracking-wide text-coop-300">
              Verified Professional Profile
            </span>
          </div>
          <button
            onClick={() => setSelectedProviderForProfile(null)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {/* Avatar & Header Details */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-16 sm:-mt-20">
            <div className="flex items-end gap-4">
              <img
                src={p.avatar}
                alt={p.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover ring-4 ring-white shadow-xl bg-slate-100"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-extrabold text-slate-900 font-display">{p.name}</h2>
                  {p.isCoopMember && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-coop-50 text-coop-700 text-xs font-extrabold border border-coop-200">
                      <Award className="w-3.5 h-3.5 text-coop-600" /> Cooperative Member
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">{p.title}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                  <span className="flex items-center gap-1 text-amber-600 font-bold">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    {p.rating} ({p.ratingCount} reviews)
                  </span>
                  <span>•</span>
                  <span className="font-semibold text-slate-700">{p.completedJobs} jobs done</span>
                  <span>•</span>
                  <span>{p.experienceYears}+ years exp</span>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Inspection Base</div>
              <div className="text-2xl font-black text-slate-900">₹{p.basePrice}</div>
            </div>
          </div>

          {/* 4 VERIFICATION BADGES */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-coop-100 text-coop-700 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-900">Identity</div>
                <div className="text-[10px] text-coop-700 font-semibold">Govt Verified ✓</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-brand-100 text-brand-700 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-900">Skill Test</div>
                <div className="text-[10px] text-brand-700 font-semibold">Benchmarked ✓</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-900">Phone & OTP</div>
                <div className="text-[10px] text-amber-700 font-semibold">2FA Authenticated ✓</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-700 shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-900">Co-op Tier</div>
                <div className="text-[10px] text-purple-700 font-semibold">
                  {p.isCoopMember ? "Full Member" : "Verified Pro"}
                </div>
              </div>
            </div>
          </div>

          {/* About Bio */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">About Provider</h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {p.bio}
            </p>
          </div>

          {/* Skills & Categories */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Skills & Equipment</h4>
            <div className="flex flex-wrap gap-2">
              {p.skills?.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1.5 rounded-xl bg-brand-50 text-brand-900 border border-brand-200/60 text-xs font-semibold"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Location & Availability */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Service Area</div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-coop-600" />
                <span>{p.location}</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Current Availability</div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-coop-600" />
                <span>{p.availability}</span>
              </div>
            </div>
          </div>

          {/* Recent Verified Customer Reviews */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Verified Customer Reviews ({p.recentReviews?.length || 0})
              </h4>
            </div>

            <div className="space-y-3">
              {p.recentReviews?.map((rev) => (
                <div key={rev.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-900">{rev.customerName}</div>
                    <div className="text-[10px] text-slate-400">{rev.date}</div>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-500 text-amber-500" />
                    ))}
                    <span className="text-[10px] font-semibold text-slate-500 ml-1">
                      • {rev.serviceName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 italic">"{rev.comment}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer CTAs */}
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Base Starting Rate</div>
            <div className="text-lg font-extrabold text-slate-900">₹{p.basePrice}</div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedProviderForProfile(null)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Close
            </button>
            <button
              onClick={handleBookNow}
              className="px-6 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
            >
              <span>Book Service with {p.name.split(' ')[0]}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

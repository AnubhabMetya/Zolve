import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Star, Sparkles, CheckCircle2, MessageSquare, Award } from 'lucide-react';

export const ReviewModal = () => {
  const { activeBookingForReview, setActiveBookingForReview, submitReview } = useApp();

  const [overallRating, setOverallRating] = useState(5);
  const [qualityRating, setQualityRating] = useState(5);
  const [profRating, setProfRating] = useState(5);
  const [punctualityRating, setPunctualityRating] = useState(5);
  const [commRating, setCommRating] = useState(5);
  const [comment, setComment] = useState('Excellent service! The provider was on time, carried all required professional tools, and resolved the issue with high craftsmanship.');

  if (!activeBookingForReview) return null;
  const b = activeBookingForReview;

  const handleSubmit = (e) => {
    e.preventDefault();
    submitReview(b.id, {
      providerId: b.providerId,
      serviceName: b.serviceName,
      rating: overallRating,
      qualityRating,
      professionalismRating: profRating,
      punctualityRating,
      communicationRating: commRating,
      comment
    });

        setActiveBookingForReview(null);
  };

  const renderStarPicker = (val, setVal) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setVal(star)}
          className="p-1 text-slate-300 hover:text-amber-400 focus:outline-none transition-colors"
        >
          <Star
            className={`w-5 h-5 ${
              star <= val ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
            }`}
          />
        </button>
      ))}
      <span className="text-xs font-bold text-slate-700 ml-2">{val}.0</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">Rate Your Experience</h3>
              <p className="text-[11px] text-slate-500">Service for #{b.bookingCode}</p>
            </div>
          </div>

          <button
            onClick={() => setActiveBookingForReview(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Provider Snapshot */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
            <img
              src={b.providerAvatar}
              alt={b.providerName}
              className="w-12 h-12 rounded-xl object-cover ring-2 ring-coop-500/20"
            />
            <div>
              <div className="text-xs font-bold text-slate-900">{b.providerName}</div>
              <div className="text-[11px] text-slate-500">{b.serviceName}</div>
            </div>
          </div>

          {/* Multi-Criteria Ratings */}
          <div className="space-y-3.5 divide-y divide-slate-100 text-xs">
            <div className="flex items-center justify-between pt-1">
              <span className="font-bold text-slate-800">Overall Experience</span>
              {renderStarPicker(overallRating, setOverallRating)}
            </div>

            <div className="flex items-center justify-between pt-2.5">
              <span className="font-medium text-slate-600">Work Quality & Skill</span>
              {renderStarPicker(qualityRating, setQualityRating)}
            </div>

            <div className="flex items-center justify-between pt-2.5">
              <span className="font-medium text-slate-600">Professionalism & Ethics</span>
              {renderStarPicker(profRating, setProfRating)}
            </div>

            <div className="flex items-center justify-between pt-2.5">
              <span className="font-medium text-slate-600">Punctuality</span>
              {renderStarPicker(punctualityRating, setPunctualityRating)}
            </div>

            <div className="flex items-center justify-between pt-2.5">
              <span className="font-medium text-slate-600">Communication</span>
              {renderStarPicker(commRating, setCommRating)}
            </div>
          </div>

          {/* Written Feedback */}
          <div className="space-y-1.5 pt-2">
            <label className="block text-xs font-bold text-slate-800">Your Feedback / Comments</label>
            <textarea
              rows={3}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share how the provider performed, their tools, and overall conduct..."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none leading-relaxed"
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Submit Verified Review</span>
          </button>
        </form>
      </div>
    </div>
  );
};

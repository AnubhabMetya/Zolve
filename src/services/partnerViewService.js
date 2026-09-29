// Customer-safe partner view — resolves inconsistent provider field names into ONE
// canonical shape. Only non-sensitive fields are exposed (no Aadhaar/PAN/bank/address).
// Never fabricates: missing data yields nulls and the UI degrades gracefully.

// Top-panel branch decision — pure, unit-tested. Single source of truth is the
// booking record: bookingStatus + providerId/providerName. Timeline, top
// status and identity ALL derive from it; there is no parallel status state.
//  - 'assigned'    → valid partner identity present (takes priority, any status)
//  - 'finding'     → pre-assignment, identity hidden
//  - 'replacement' → REASSIGNING with no replacement yet (old partner hidden)
//  - 'loading'     → assigned/accepted/en-route WITHOUT identity: assignment
//    data missing. Never silent — UI shows a diagnostic card and logs.
export const PRE_ASSIGNMENT_STATUSES = new Set([
  'CREATED', 'MATCHING', 'AWAITING_PARTNER', 'PAYMENT_PENDING', 'CONFIRMED',
]);

export const resolveProfessionalPanelState = (booking = {}) => {
  if (booking?.providerId || booking?.providerName) return 'assigned';
  const status = booking?.bookingStatus;
  if (!status || PRE_ASSIGNMENT_STATUSES.has(status)) return 'finding';
  if (status === 'REASSIGNING') return 'replacement';
  return 'loading';
};
export const normalizePartnerForCustomerView = (booking = {}, provider = null) => {
  const p = provider || {};
  const b = booking || {};

  const pick = (...vals) => {
    for (const v of vals) {
      if (v !== null && v !== undefined && v !== '') return v;
    }
    return null;
  };

  const name = pick(p.name, p.fullName, b.providerName);
  if (!name) {
    return { assigned: false, name: null };
  }

  // Rating / jobs / experience resolve from the provider registry first,
  // then from the booking snapshot persisted at assignment time (so the
  // card still shows qualification + rating when the registry misses).
  const ratingNum = Number(pick(p.rating, p.averageRating, b.providerRating));
  const rating = Number.isFinite(ratingNum) && ratingNum > 0 ? Math.round(ratingNum * 10) / 10 : null;

  const jobsRaw = Number(pick(p.completedJobs, p.jobsCompleted, p.jobs_completed, b.providerJobsCompleted));
  const jobsCompleted = Number.isFinite(jobsRaw) && jobsRaw >= 0 ? Math.floor(jobsRaw) : null;

  const expRaw = pick(p.experienceYears, p.experience, p.experience_years, b.providerExperienceYears);
  const expNum = expRaw === null ? null : Number(expRaw);
  let experienceLabel = null;
  if (Number.isFinite(expNum) && expNum >= 0) {
    if (expNum < 1) experienceLabel = 'New Zolve partner';
    else if (expNum < 2) experienceLabel = '1+ year experience';
    else experienceLabel = `${Math.floor(expNum)}+ years experience`;
  }

  const rawSkills = Array.isArray(p.skills) && p.skills.length > 0 ? p.skills
    : Array.isArray(p.assignedSkills) && p.assignedSkills.length > 0 ? p.assignedSkills
    : Array.isArray(b.providerSkills) ? b.providerSkills : [];
  const skills = rawSkills.filter((s) => typeof s === 'string' && s.trim()).slice(0, 4);

  const v = p.verifications || {};
  const badges = [];
  if (v.identity) badges.push('Identity Verified');
  if (v.background) badges.push('Background Verified');
  if (v.skill) badges.push('Skill Certified');
  if (p.isCoopMember || b.isCoopMember) badges.push('Zolve Partner');

  return {
    assigned: true,
    id: pick(p.id, p.providerId, b.providerId),
    name,
    photo: pick(p.avatar, p.photo, p.profilePhoto, p.avatarUrl, b.providerAvatar),
    title: pick(p.title, p.trade, p.specialization, b.providerTitle),
    rating,
    ratingCount: Number.isFinite(Number(pick(p.ratingCount, b.providerRatingCount))) ? Number(pick(p.ratingCount, b.providerRatingCount)) : null,
    jobsCompleted,
    experienceLabel,
    skills,
    badges,
    isCoopMember: Boolean(p.isCoopMember || b.isCoopMember),
    phone: pick(p.phone, b.providerPhone),
  };
};

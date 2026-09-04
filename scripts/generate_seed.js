import * as fs from 'fs';
import { INITIAL_PROVIDERS } from '../src/data/mockData.js';

const outPath = 'src/db/seed_providers.sql';
let sql = `-- Seed providers table from INITIAL_PROVIDERS (deterministic prototype cooperative members)
-- Generated: ${new Date().toISOString()}
-- Total providers: ${INITIAL_PROVIDERS.length}
-- Synthetic prototype members are marked as "Synthetic prototype cooperative member — not a real person."
-- Idempotent: ON CONFLICT (id) DO UPDATE
BEGIN;
`;

for (const p of INITIAL_PROVIDERS) {
  const coordsJson = JSON.stringify(p.coords).replace(/'/g, "''");
  const verifJson = JSON.stringify(p.verifications).replace(/'/g, "''");
  const reviewsJson = JSON.stringify(p.recentReviews || []).replace(/'/g, "''");
  const serviceCats = `ARRAY[${(p.serviceCategories||[]).map(s=> `'${s.replace(/'/g,"''")}'`).join(', ')}]::text[]`;
  const skills = `ARRAY[${(p.skills||[]).map(s=> `'${s.replace(/'/g,"''")}'`).join(', ')}]::text[]`;
  const name = p.name.replace(/'/g, "''");
  const title = p.title.replace(/'/g, "''");
  const location = p.location.replace(/'/g, "''");
  const bio = p.bio.replace(/'/g, "''");
  const coopBadge = p.coopBadge ? `'${p.coopBadge.replace(/'/g,"''")}'` : 'NULL';
  const coopDividend = p.coopDividendScore ? `'${p.coopDividendScore.replace(/'/g,"''")}'` : 'NULL';
  const avatar = p.avatar.replace(/'/g, "''");
  const phone = p.phone.replace(/'/g, "''");
  const email = p.email.replace(/'/g, "''");
  sql += `INSERT INTO public.providers (id, name, title, rating, rating_count, completed_jobs, experience_years, avatar, phone, email, location, coords, base_price, starting_price, availability, is_coop_member, coop_badge, coop_dividend_score, verifications, service_categories, skills, bio, recent_reviews) VALUES (
  '${p.id}',
  '${name}',
  '${title}',
  ${p.rating},
  ${p.ratingCount},
  ${p.completedJobs},
  ${p.experienceYears},
  '${avatar}',
  '${phone}',
  '${email}',
  '${location}',
  '${coordsJson}'::jsonb,
  ${p.basePrice},
  ${p.startingPrice || p.basePrice},
  '${p.availability.replace(/'/g,"''")}',
  ${p.isCoopMember},
  ${coopBadge},
  ${coopDividend},
  '${verifJson}'::jsonb,
  ${serviceCats},
  ${skills},
  '${bio}',
  '${reviewsJson}'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  completed_jobs = EXCLUDED.completed_jobs,
  experience_years = EXCLUDED.experience_years,
  avatar = EXCLUDED.avatar,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  location = EXCLUDED.location,
  coords = EXCLUDED.coords,
  base_price = EXCLUDED.base_price,
  starting_price = EXCLUDED.starting_price,
  availability = EXCLUDED.availability,
  is_coop_member = EXCLUDED.is_coop_member,
  coop_badge = EXCLUDED.coop_badge,
  coop_dividend_score = EXCLUDED.coop_dividend_score,
  verifications = EXCLUDED.verifications,
  service_categories = EXCLUDED.service_categories,
  skills = EXCLUDED.skills,
  bio = EXCLUDED.bio,
  recent_reviews = EXCLUDED.recent_reviews;
`;
}

sql += `COMMIT;
-- Verification:
-- SELECT COUNT(*) FROM public.providers;
-- Expected: ${INITIAL_PROVIDERS.length}
-- Coverage by city/service:
-- SELECT location, COUNT(*) FROM public.providers GROUP BY location;
`;

fs.writeFileSync(outPath, sql);
console.log(`Generated ${outPath} with ${INITIAL_PROVIDERS.length} providers`);

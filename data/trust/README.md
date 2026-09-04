# Synthetic Trust History — Zolve AI Feature 5

> **Synthetic prototype data — not real customer bookings. DO NOT insert into `public.bookings`.**
> Trust & Safety anomaly detection is a prototype decision-support system based on synthetic historical behavior.

## Purpose

Current `public.bookings` history (3 mock bookings, insufficient provider activity) cannot train meaningful anomaly detection. This dataset provides separate deterministic synthetic provider-level daily behavioral observations for prototyping peer-aware anomaly detection, with clear path to replace with real aggregated booking data.

Real bookings (`public.bookings`, `public.providers`) remain source of truth; synthetic data is never written to Supabase.

## Files

- `data/synthetic_trust_history.csv` — 14,040 rows (234 providers × 60 days), includes disclaimer header `# Synthetic prototype data — not real customer bookings.`
- `scripts/generate_synthetic_trust_data.py` — deterministic generator (hash-based, fixed seed 42)
- `scripts/validate_synthetic_trust_data.py` — validation
- `src/services/trustAnomalyService.js` — weighted scoring, peer-aware (city+service)
- `src/services/trustAnomalyService.test.js` — 11 deterministic tests
- `src/components/ai/TrustAnomalyDashboard.jsx` — admin dashboard
- `src/data/trustHistory.json` — static JSON copy for UI (derived from CSV, 4.5 MB, not a booking insertion)

## Coverage

- **Providers:** 234 distinct `prov-*` IDs sampled from `src/data/mockData.js` (first 234, includes synthetic siliguri etc.), deterministic
- **Cities:** 20 canonical (`Delhi NCR`, `Gurugram`, `Mumbai`, `Bengaluru`, `Chennai`, `Hyderabad`, `Kolkata`, `Ahmedabad`, `Pune`, `Surat`, `Visakhapatnam`, `Coimbatore`, `Vadodara`, `Nagpur`, `Jaipur`, `Lucknow`, `Kochi`, `Indore`, `Patna`, `Bhopal`)
- **Services:** 14 `srv-*` from `SERVICE_CATEGORIES`
- **Dates:** 60 days `2026-07-05` → `2026-09-02` (`2026-07-05` inclusive, daily grain)
- **Rows:** 14,040 = 234 × 60, deterministic SHA256 `1a253ea8f7eec33d`

## Schema

| column | type | description |
|---|---|---|
| `provider_id` | string | existing `prov-*` ID |
| `date` | YYYY-MM-DD | daily observation |
| `city` | string | canonical city |
| `service_id` | string | `srv-*` |
| `service_name` | string | human name |
| `booking_count` | int ≥0 | daily bookings (0-8 typical, anomalous 5-8) |
| `completed_count` | int | `booking - cancelled - rejected` |
| `cancelled_count` | int | ≤ booking_count |
| `rejected_count` | int | ≤ booking_count, cancelled+rejected ≤ booking |
| `rating` | float 1.0-5.0 | daily proxy (base provider rating ±0.15, anomalous low) |
| `active_jobs` | int 0-6 | active workload snapshot |
| `daily_earnings_proxy` | int | `completed * base_price` with ±10% noise |

## Methodology (deterministic, prototype only)

- **Determinism:** `hashlib.md5(f"{provider_id}|{date}|{salt}")` → uniform 0-1, no global RNG drift; re-run produces byte-identical CSV.
- **Base volume:** 40% 0, 30% 1, 20% 2, 8% 3, 2% 4 per provider/day; anomalous providers (6% of providers, ~13) have 30% days +3-5 extra.
- **Spike:** 2% normal days spike to 5-7 bookings.
- **Cancellation:** normal 6-10%, anomalous 25-45% on 50% anomalous days, occasional 30% spike.
- **Rejection:** normal 3-6%, anomalous 15-30% on 40% anomalous days.
- **Rating:** base provider rating ±0.15 noise, anomalous 25% days -0.8 to -1.5.
- **Workload:** `active = booking*0.3-0.5`, anomalous +2-4, spike 5 on 1.5% days, clamped 0-6.
- **Earnings:** `completed * base_price * 0.9-1.1`.

Do NOT claim real Indian market statistics.

## Validation

```bash
python scripts/generate_synthetic_trust_data.py
python scripts/validate_synthetic_trust_data.py
```

Checks: deterministic, no duplicate provider/date/service, non-negative counts, cancellation/rejection ≤ booking, valid ratings 1-5, valid provider IDs/cities/services, explicit disclaimer.

## Replacement with Real Data

Pipeline is input-agnostic: replace `trustHistory` array with real aggregated daily per-provider query:

```sql
SELECT provider_id, scheduled_date::date AS date, city, service_id,
       COUNT(*) AS booking_count,
       COUNT(*) FILTER (WHERE booking_status='SERVICE_COMPLETED') AS completed_count,
       COUNT(*) FILTER (WHERE booking_status='CANCELLED') AS cancelled_count,
       COUNT(*) FILTER (WHERE booking_status='REFUNDED') AS rejected_count,
       AVG(rating) AS rating, -- from reviews
       COUNT(*) FILTER (WHERE booking_status IN ('CONFIRMED',...)) AS active_jobs
FROM public.bookings GROUP BY 1,2,3,4
```

No code change beyond data source.

## Limitations

- Synthetic — not for production suspensions; Stage 1 explainable only.
- Peer groups require ≥3 providers per city/service; small groups reduce concentration signal.
- No real holidays/weather; no actual rejection reason codes.
- Daily grain, not hourly; earnings proxy simplified.

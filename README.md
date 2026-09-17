# Zolve — Cooperative Gig Services Platform (SIH26089)

**Challenge #89 of 236 | Agriculture, FoodTech & Rural Development | Software Edition**
**Sponsoring Organization:** Ministry of Cooperation — Department: National Council for Cooperative Training (NCCT)
**Submission Deadline:** 30 September 2026 | **Cash Prize:** ₹1,00,000 / Winning Team

> Cooperative-owned digital service marketplace enabling Labour Cooperative Federations & Labour Cooperative Societies to provide verified household & community services while ensuring fair wages, worker welfare, and consumer trust.

---

## SIH Problem Statement — Expected Features Coverage

| # | Feature | Status | Code Evidence |
|---|---------|--------|---------------|
| 1 | Service provider registration & verification | ✅ Implemented (Supabase Auth + KYC upload + admin approve) | `src/pages/SignupPage.jsx:82`, `src/context/AuthContext.jsx:105`, `src/services/kycService.js`, `src/components/admin/AdminDashboard.jsx:365` |
| 2 | Worker skill profiling & certification | ✅ Implemented (3-skill cap + training academy + quiz cert) | `src/components/executive/ExecutiveSkillSelector.jsx`, `src/components/cooperative/CooperativePortal.jsx:275`, `src/services/certificationService.js` |
| 3 | Customer booking & scheduling (IST 2h rule) | ✅ Implemented | `src/components/customer/BookingModal.jsx:71` `isSlotEligible >=2h` |
| 4 | Geo-location based service matching (50km hard rule) | ✅ Implemented | `src/services/locationService.js:149` `haversineKm`, `src/components/common/MapView.jsx` |
| 5 | Digital payments & invoicing (Razorpay) | ✅ Implemented (live checkout + HMAC verify + PDF) | `src/services/razorpayService.js`, `src/components/customer/InvoiceModal.jsx` |
| 6 | Rating & feedback (5-criteria) | ✅ Implemented | `src/components/customer/ReviewModal.jsx`, `src/db/schema.sql:161` |
| 7 | Worker welfare & insurance (4% fund + ₹5L cover) | ✅ Implemented | `src/services/insuranceService.js`, `src/components/provider/WelfareInsurancePanel.jsx` |
| 8 | Emergency & on-demand booking | ✅ Implemented | `src/services/emergencyDispatchService.js` (100-pt weighted), `BookingModal.jsx:28` |
| 9 | Cooperative federation admin dashboard (21 hubs) | ✅ Implemented | `src/components/admin/AdminDashboard.jsx` 9 tabs |
| 10 | Multilingual mobile app (6 languages + PWA) | ✅ Implemented (en, hi, bn, mr, ta, te) | `src/i18n/config.js`, `src/locales/*.json`, `vite-plugin-pwa` |
| 11 | AI demand forecasting & workforce allocation | ✅ Implemented (XGBoost prototype + deterministic engine) | `models/demand_forecast_xgb.json`, `src/services/workforceAllocationService.js` |

**Technology Components:** Mobile Applications (PWA) ✅ | AI (XGBoost + rule engines) ✅ | Geo-Spatial (Leaflet + haversine) ✅ | Digital Payments (Razorpay + n8n) ✅ | Cloud (Supabase + Vercel) ✅

---

## Quick Start

```bash
npm install
cp .env.example .env   # fill VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_RAZORPAY_KEY_ID (optional sandbox)
npm run dev            # http://localhost:5173
npm run build          # production
```

**Demo Roles:** Append `?demo` to URL or use Navbar → Demo Role (Customer / Coop Member / Provider / Executive / Society Admin / Platform Admin). Without `?demo` and as non-admin, demo switcher is hidden.

---

## Architecture

```
Vite + React 19 + React Router 7 + Tailwind 3
i18next (6 locales, localStorage persist `zolve_lang`)
Leaflet + react-leaflet (OSM tiles, Nominatim geocode)
Supabase (Auth PKCE, Postgres RLS, Realtime, Storage for KYC, Edge Functions for OTP)
Vercel (SPA rewrite)
Razorpay (order create → HMAC verify → webhook) via n8n blueprints
XGBoost demand model (synthetic 50k rows, 9.3MB artifact)
```

**Key Services:** `src/services/` — `aiEngine.js` (classifier), `semanticService.js` (TF-IDF), `fairMatchService.js` (7 weights), `workforceAllocationService.js`, `emergencyDispatchService.js`, `trustAnomalyService.js`, `locationService.js`, `razorpayService.js`, `kycService.js`, `insuranceService.js`, `certificationService.js`

---

## 50 km Hard Rule

No Bengaluru fallback. Every matching path checks `haversineKm <= 50` — `CustomerDashboard.jsx:84`, `ExecutiveJobDiscovery.jsx:84`, `workforceAllocationService.js:137`, `emergencyDispatchService.js:127`, `fairMatchService.js`.

---

## Multilingual

`src/i18n/config.js` — `en, hi, bn, mr, ta, te` with `i18next-browser-languagedetector` (localStorage `zolve_lang`). Switcher in `Navbar.jsx` (`LanguageSwitcher.jsx` compact). All core nav + booking strings externalized in `src/locales/*.json`.

## PWA

`vite-plugin-pwa` in `vite.config.js` — manifest `Zolve` standalone, `theme_color #0f172a`, icons `public/icons/icon-192.png` & `512.png` (maskable), Workbox cache for OSM tiles + Nominatim + static assets. Test: Lighthouse → Installable.

## Payments

Sandbox without `VITE_RAZORPAY_KEY_ID`, live via `window.Razorpay` `razorpayService.js:96`. Blueprints in `src/backend-blueprints/*.n8n.json` document server HMAC. Invoice PDF via `jsPDF` in `InvoiceModal.jsx`.

## AI Forecasting

Synthetic prototype: `data/synthetic_demand_history.csv` (50.4k), `models/demand_forecast_xgb.json`. Admin dashboard loads live CSV `public/data/forecastPredictions.json` via `aiDataLoader.js:loadForecastPredictions()` — no hardcoded fallback. Disclaimer in `models/demand_forecast_metrics.json`.

---

## Demo Credentials (Supabase seed)

Use `SignupPage` to create accounts, or `?demo` role switch. KYC docs seeded in `public/data/` + `src/db/seed_*`.

---

## Submission Checklist for SIH

- [x] 6-language switcher visible in jury demo
- [x] PWA install prompt (Chrome → Install Zolve)
- [x] Live booking 2h IST rule
- [x] 50km geo demos (Kolkata vs distant city)
- [x] Razorpay test payment + invoice PDF
- [x] Admin: KYC verify → approve → provider badge
- [x] Emergency dispatch weighted ranking demo
- [x] Workforce allocation SHORTAGE/SURPLUS table
- [x] Insurance claim flow (provider welfare panel)

---

## Team

Zolve — SIH Internal Round Top 10 / 230 teams. Built for Ministry of Cooperation, NCCT.

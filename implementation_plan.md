# Implementation Plan: Production-Quality Executive Operations Portal

Upgrade the existing Zolve Executive experience into a field-service operations portal across all three verticals (**Household**, **Personal & Family**, and **Community & Society**). This upgrade reuses the existing architecture, database schema, AppContext, canonical location, FairMatch, access control, and Emergency Dispatch services without modifying auth, Supabase RLS, or unrelated features.

---

## User Review Required

> [!IMPORTANT]
> - **Zero Schema Migration Needed**: The existing `public.executive_applications` table already has `services text[]` and `vertical text`. Selected skills (up to 3) will persist directly into `services text[]` linked to `applicant_id = auth.uid()`.
> - **Hard 50 km Geographic Rule**: In accordance with the project's strict geo-rules, executives will only discover jobs within <= 50 km of their GPS location. No fallback to Bengaluru or any other city will occur.
> - **Community Executive Gate**: Pending Community Executives will see the real-time pending screen and remain strictly blocked from community operations until approved by Society Admin.

---

## Proposed Changes

### 1. Reusable Executive Components (`src/components/executive/`)

#### [NEW] [`ExecutiveSkillSelector.jsx`](file:///c:/Users/Anubhab%20Metya/Zolve/src/components/executive/ExecutiveSkillSelector.jsx)
- Displays "Choose up to 3 services you're qualified to perform."
- Dynamic counter: `"0 / 3 selected"`, `"1 / 3 selected"`, etc.
- When 3 services are selected, disables remaining unselected services with a visual indicator.
- Allows toggling/deselecting.
- Loaded with exact vertical skill list for Household (8 services) and Personal (3 services).

#### [NEW] [`ExecutiveLocationStep.jsx`](file:///c:/Users/Anubhab%20Metya/Zolve/src/components/executive/ExecutiveLocationStep.jsx)
- Integrates with `AppContext`'s canonical location state (`selectedLocation`, `detectLocation`, `setSelectedLocationWithSource`).
- Displays `"Detecting your service area..."` spinner/skeleton.
- Upon GPS success:
  - `"✓ Location detected"`
  - City name and State (e.g., `"Kolkata, West Bengal"` via `resolveCity`)
  - `"GPS detected • Accuracy: XX m"`
  - `[Change Location]` button opening the canonical location modal or manual city/pincode selection.
- If GPS denied or unavailable: provides clear manual location selector without defaulting to Bengaluru.
- Displays 50 km service radius badge.

#### [NEW] [`ExecutiveJobCard.jsx`](file:///c:/Users/Anubhab%20Metya/Zolve/src/components/executive/ExecutiveJobCard.jsx)
- Compact, professional card for nearby opportunities:
  - Service Name & Category
  - Job problem description snippet
  - Distance (via `formatDistanceKm`, e.g. `"3.4 km away"`)
  - Scheduled date & time
  - Urgency badge (e.g. `"Urgent Request"` for same-day/next-day)
  - Compensation (`₹totalAmount` / `₹providerEarnings`)
  - Job status badge
  - Location/neighborhood (address without exposing sensitive customer info)
  - Match explanation tags (e.g. `✓ Skill Match`, `✓ Within 50km`)
  - FairMatch score badge (e.g. `FairMatch: 92`)
  - Quick action buttons: `[View Details]`, `[Accept Job]`, `[Decline]`

#### [NEW] [`ExecutiveJobDetail.jsx`](file:///c:/Users/Anubhab%20Metya/Zolve/src/components/executive/ExecutiveJobDetail.jsx)
- Modal / drawer showing complete job operational details:
  - Header: `"URGENT SERVICE REQUEST"` or `"SERVICE OPPORTUNITY"`
  - Full problem description & customer notes
  - Location & exact distance
  - Requested service window
  - Customer contact details gated strictly by `canViewOrderDetails(currentUser)` (masked until verified/accepted)
  - Service requirements checklist
  - **Explainable Matching section**:
    - `"Why this job is recommended"`
    - `✓ Skill match`: Matches your qualified skill in [Service Name]
    - `✓ Within your service area`: [X] km away (within 50 km radius)
    - `✓ Available for requested time`: No scheduling conflict
    - `✓ Low current workload`: Active jobs [N]
    - `✓ FairMatch score`: Detailed breakdown derived from `fairMatchRank`
  - Actions: `[Accept Job]` (transitions booking to `PROVIDER_ACCEPTED` / `assignedExecutiveId`), `[Decline]` (hides job for current session).

#### [NEW] [`ExecutiveJobDiscovery.jsx`](file:///c:/Users/Anubhab%20Metya/Zolve/src/components/executive/ExecutiveJobDiscovery.jsx)
- Orchestrates job matching:
  - Initial loading transition: `"Finding opportunities around you..."` with skeleton cards.
  - Strict Eligibility Filter:
    1. Executive skill match: `assignedServices.includes(job.serviceName)`
    2. Geographic distance <= 50 km between executive canonical location and job coordinates
    3. `accessControl` visibility verification
    4. Unassigned or open booking status (`CONFIRMED`, `PAYMENT_PENDING`)
  - FairMatch ranking integration (`fairMatchRank` / score weighting)
  - Zero padding from distant cities.
  - Empty state when no jobs match: `"No open jobs in your service area matching your selected skills"` with advice to expand skills or change location.

#### [NEW] [`EmergencyDispatchPanel.jsx`](file:///c:/Users/Anubhab%20Metya/Zolve/src/components/executive/EmergencyDispatchPanel.jsx)
- Reusable panel for Community operations wrapping existing `emergencyDispatch` engine (`emergencyDispatchService.js`).
- Displays priority (HIGH/CRITICAL), service required, location, distance, time reported, required skills, eligible responders.
- Actions: `[Respond]` and `[Dispatch Qualified Executive]`.

#### [NEW] [`CommunityOperationsCenter.jsx`](file:///c:/Users/Anubhab%20Metya/Zolve/src/components/executive/CommunityOperationsCenter.jsx)
- Dedicated Command Center for approved Community & Society Executives:
  - Title: `"Community Operations Command Center"`
  - GPS-derived service area: e.g. `"Kolkata, West Bengal • Service area: 50 km"`
  - Key Operational Metrics:
    - Emergency Requests
    - Active Community Issues
    - Pending Services
    - Resolved Today
  - Tabbed sub-views:
    - Community Emergency Dispatch (`EmergencyDispatchPanel`)
    - Society Service Requests (Water sump cleaning, sanitization, electrical setups)
    - Society Resident Maintenance Issues

---

### 2. Update Existing Executive Pages & Context

#### [MODIFY] [`src/components/executive/JoinExecutivePage.jsx`](file:///c:/Users/Anubhab%20Metya/Zolve/src/components/executive/JoinExecutivePage.jsx)
- Upgrade Step 2:
  - Embed `ExecutiveSkillSelector` for Household (8 services) and Personal (3 services) with max-3 rule and dynamic counter.
  - Embed `ExecutiveLocationStep` with GPS detection, accuracy indicator, and manual override.
  - Basic details (Full name, Email, Mobile).
- Step 3: Verified Email OTP via existing `sendEmailOtp` / `verifyEmailOtp`.
- Step 4:
  - For Household/Personal: Smooth transition `"Finding opportunities around you..."` transitioning directly to the executive dashboard.
  - For Community: Real-time pending screen with live sync and Society Admin approval listener.

#### [MODIFY] [`src/components/executive/ExecutiveDashboard.jsx`](file:///c:/Users/Anubhab%20Metya/Zolve/src/components/executive/ExecutiveDashboard.jsx)
- If Community Executive is pending: display pending approval screen with live sync.
- If Community Executive is approved: render `CommunityOperationsCenter`.
- If Household or Personal Executive: render production-grade dashboard with navigation tabs:
  - **Overview**: Active Jobs, Nearby Opportunities, Completed Jobs, Current Workload, Selected Skills.
  - **Nearby Jobs**: `ExecutiveJobDiscovery` with FairMatch ranking and explainable matching.
  - **My Jobs**: In-progress & accepted jobs with action buttons (`PROVIDER_ON_THE_WAY`, `SERVICE_STARTED`, `SERVICE_COMPLETED`).
  - **Skills & Profile**: Displays selected 3 skills, vertical, verified contact details.
  - **Performance**: Real metrics calculated from executive's actual bookings (completed count, acceptance rate, customer rating).
  - **Notifications**: Live executive alerts and booking notices.

#### [MODIFY] [`src/context/AppContext.jsx`](file:///c:/Users/Anubhab%20Metya/Zolve/src/context/AppContext.jsx)
- Ensure `registerExecutive` properly preserves and propagates the executive's custom selected `services` (the up to 3 chosen skills) to `assignedServices` on `currentUser` and `executiveApplications`.
- Provide `acceptExecutiveJob(bookingId)` which transitions booking to `PROVIDER_ACCEPTED` / sets `assignedExecutiveId = currentUser.id`.

---

### 3. Automated Test Suite

#### [NEW] [`src/services/executiveOperations.test.js`](file:///c:/Users/Anubhab%20Metya/Zolve/src/services/executiveOperations.test.js)
Comprehensive deterministic unit and integration tests verifying all 10 requirements:
1. Maximum 3 skills enforced during onboarding.
2. Correct vertical skill lists for all 3 verticals.
3. GPS-derived executive location with accuracy and canonical city.
4. Hard 50 km geographic eligibility (distant jobs excluded, nearby jobs included).
5. Skill-based job filtering (only jobs matching executive's chosen skills appear).
6. Pending Community Executive access denial (`getVisibleBookings` returns empty, command center locked).
7. Approved Community Executive access granted (command center unlocked with 50 km service area).
8. Executive refresh/session hydration (selected skills restored from persisted app).
9. No Bengaluru fallback when GPS location is Kolkata or unknown.
10. Empty nearby jobs state rendered cleanly when no matching jobs exist.

---

## Verification Plan

### Automated Tests
1. Run new executive operations suite:
   ```bash
   node src/services/executiveOperations.test.js
   ```
2. Run existing suites to ensure zero regression:
   ```bash
   node src/services/cityGeo.test.js
   node src/services/fairMatchService.test.js
   node src/services/emergencyDispatchService.test.js
   node src/services/otpService.test.js
   node src/services/locationConsolidation.test.js
   node src/services/executiveApplicationService.test.js
   ```
3. Full production build verification:
   ```bash
   npm run build
   ```

### Manual Verification
- Test Household Executive onboarding: select 1, 2, and 3 skills; verify 4th is blocked; verify GPS detection.
- Test Job Discovery: verify jobs show distance, urgency, FairMatch score, and "Why this job is recommended".
- Test Job acceptance: verify state transition and appearance in "My Jobs".
- Test Community Executive: verify pending status locks operations; verify approval in Admin portal immediately unlocks Community Operations Command Center with Emergency Dispatch.

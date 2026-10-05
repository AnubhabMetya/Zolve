# Zolve — AI-Powered Cooperative Gig Services Platform

> **Fair work. Smart matching. Better opportunities.**

Zolve is an **AI-powered cooperative gig-services platform** designed to connect customers with trusted local service professionals while creating a fairer and more transparent system for workers.

Unlike traditional gig platforms that primarily optimize for speed and platform profit, Zolve focuses on **fair opportunity distribution, local matching, skill-based recommendations, and worker empowerment**.

---

## 🚀 What is Zolve?

Zolve connects two sides of the service ecosystem:

**Customers** who need reliable local services  
↓  
**Zolve AI Matching Engine**  
↓  
**Verified Service Professionals**

The platform intelligently considers:

- Service requirements
- Professional skills
- Geographic proximity
- Availability
- Existing bookings
- Semantic similarity
- Fairness between professionals

This allows Zolve to find the **right professional for the job while preventing the same workers from receiving all the opportunities**.

---

## 🎯 Problem

Traditional gig-service platforms often face several problems:

- Workers compete for the same limited opportunities.
- A small number of highly ranked workers may receive most bookings.
- Customers may be matched with professionals who are far away.
- Skill descriptions and customer requirements may not match accurately.
- Workers have limited control over their availability and growth.
- Platform algorithms can become difficult for workers to understand.

Zolve addresses these problems through an **AI-assisted, cooperative matching model**.

---

## 💡 Our Solution

Zolve uses a multi-stage intelligent matching pipeline:

```text
Customer Request
       ↓
Geographic Filtering
       ↓
Service / Skill Eligibility
       ↓
Semantic Matching
       ↓
Availability Check
       ↓
Double-Booking Prevention
       ↓
FairMatch Ranking
       ↓
Top Local Professionals
       ↓
Assignment
```

The system does not simply select the "closest" or "highest-rated" professional.

Instead, it attempts to find a professional who is:

**Qualified + Nearby + Available + Semantically Relevant + Fairly Selected**

---

# 🤖 AI Matching System

## 1. Semantic Service Matching

Customers do not always describe their requirements using predefined service names.

For example:

> "I need someone to clean my three-room apartment before guests arrive."

The system can understand that this is related to:

> **3 Room Deep Cleaning**

Zolve uses semantic matching to connect natural-language requests with available services and professional skills.

A **TF-IDF fallback mechanism** is also available when semantic embeddings are unavailable.

---

## 2. FairMatch

Zolve introduces a fairness-aware ranking layer called **FairMatch**.

Instead of repeatedly selecting the same highly ranked professionals, the system considers factors such as:

- Skill compatibility
- Distance
- Availability
- Previous workload
- Opportunity distribution

This helps create a more balanced allocation of work.

### Objective

```text
Best Match
      +
Fair Opportunity
      =
Zolve Match
```

---

# 📍 Intelligent Geographic Matching

Zolve uses location-aware filtering to prevent unrealistic matches.

The matching pipeline first identifies professionals within a defined geographic radius.

```text
Customer Location
       ↓
City / Locality Filter
       ↓
≤ 50 km Radius
       ↓
Qualified Local Professionals
```

The prototype includes multiple Indian city hubs such as:

- Delhi NCR
- Gurugram
- Mumbai
- Bengaluru
- Chennai
- Hyderabad
- Kolkata
- Ahmedabad
- Pune
- Surat
- Visakhapatnam
- Coimbatore
- Vadodara
- Nagpur
- Jaipur
- Lucknow
- Kochi
- Indore
- Patna
- Bhopal
- Siliguri

---

# 👷 Professional / Executive Portal

Zolve is not only a customer booking platform.

The **Executive Portal** is designed around the professional's experience.

### Features

- 🟢 Online / Offline availability
- 📅 Today's schedule
- 💼 Job cards
- 📍 Live location
- 🗺️ Google Maps navigation
- 💰 Earnings dashboard
- 📈 Skill upgrades
- 🎁 Incentive programs
- 🔥 Opportunity heatmap
- 📊 Work and booking information

During the matching process, the customer's interface does not immediately expose the professional's personal identity.

Instead, it displays:

> **Finding a Professional...**

This keeps the experience focused on the service rather than turning the process into a race between individual workers.

---

# 🔐 Professional Verification

Zolve is designed with a multi-step professional verification process.

```text
Registration
    ↓
OTP Verification
    ↓
Identity Verification
    ↓
Aadhaar / PAN Verification
    ↓
Skill Verification / Training
    ↓
Professional Approval
    ↓
Zolve Executive Portal
```

The goal is to create a more trustworthy service ecosystem for customers while giving professionals a structured path to participate.

---

# 💳 Payments

Zolve integrates **Razorpay** for payment processing.

The booking flow is designed around:

```text
Service Selection
      ↓
Cart
      ↓
Coupon
      ↓
Checkout
      ↓
Payment
      ↓
Booking Creation
      ↓
Professional Matching
```

---

# 🎟️ Coupon System

The prototype includes promotional coupons:

| Coupon | Discount | Minimum Order | Maximum Discount |
|---|---:|---:|---:|
| `ZOLVE10` | 10% | ₹799 | ₹100 |
| `ZOLVE20` | 20% | ₹1,099 | ₹150 |
| `ZOLVE30` | 30% | ₹1,599 | ₹250 |

Discounts are automatically capped according to the configured limits.

---

# 🧹 Example Services

The prototype includes services such as:

| Service | Example Price |
|---|---:|
| 1 Room Cleaning | ₹999 |
| 2 Room Cleaning | ₹1,399 |
| 3 Room Cleaning | ₹1,899 |
| Kitchen Cleaning | ₹799 |
| Bathroom Cleaning | ₹799 |
| Full Deep Cleaning | ₹2,999 |

Pricing can be extended dynamically as the platform grows.

---

# 🔄 Booking Lifecycle

Zolve uses a state-based booking system.

```text
CREATED
   ↓
MATCHING
   ↓
AWAITING_PARTNER
   ↓
ASSIGNED
   ↓
EN_ROUTE
   ↓
ARRIVED
   ↓
SERVICE_STARTED
   ↓
SERVICE_COMPLETED
```

Additional states handle exceptional situations:

```text
REASSIGNING
RESCHEDULE
REFUND_REQUESTED
REFUND_COMPLETED
```

This makes the booking system easier to manage and extend.

---

# 🏗️ Technology Stack

### Frontend

- React
- Vite
- Tailwind CSS
- JavaScript

### Backend / Database

- Supabase
- PostgreSQL
- Row Level Security (RLS)

### AI / Matching

- Semantic embeddings
- TF-IDF
- FairMatch ranking
- Geographic distance calculation
- Haversine distance

### Payments

- Razorpay

### Automation

- n8n Cloud

### Deployment

- Vercel

---

# 🧠 System Architecture

```text
                     ┌────────────────────┐
                     │      Customer      │
                     │      Web App       │
                     └─────────┬──────────┘
                               │
                               ▼
                     ┌────────────────────┐
                     │   Zolve Platform   │
                     └─────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌─────────────┐  ┌──────────────┐  ┌─────────────┐
       │  Semantic   │  │ Geo Filter   │  │ Availability│
       │  Matching   │  │  ≤ 50 km     │  │   Check     │
       └──────┬──────┘  └──────┬───────┘  └──────┬──────┘
              │                │                 │
              └────────────────┼─────────────────┘
                               ▼
                       ┌──────────────┐
                       │  FairMatch   │
                       │   Ranking    │
                       └──────┬───────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │  Local Qualified │
                     │  Professionals   │
                     └────────┬─────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │ Executive Portal │
                     └──────────────────┘
```

---

# 📊 Matching Pipeline

Zolve's matching engine follows this order:

### Step 1 — Geographic Filter

Remove professionals outside the configured service radius.

### Step 2 — Skill Eligibility

Keep only professionals qualified for the requested service.

### Step 3 — Semantic Retrieval

Compare the customer's request with available services and professional skills.

### Step 4 — Availability

Remove professionals who are unavailable at the requested time.

### Step 5 — Double-Booking Prevention

Ensure that a professional is not assigned overlapping jobs.

### Step 6 — FairMatch

Rank eligible professionals using relevance, distance, availability, and fairness.

### Step 7 — Assignment

Return the best available candidates and proceed with assignment.

---

# 🧪 Testing

The prototype has been tested across the major matching components.

| Component | Tests |
|---|---:|
| FairMatch | 37 |
| CityGeo | 14 |
| Semantic Matching | 10 |
| **Total** | **61** |

### Result

**61 tests passed successfully.**

The tests cover matching behavior, geographic filtering, semantic retrieval, and fairness-related logic.

---

# 📁 Project Structure

```text
Zolve/
│
├── src/
│   ├── components/
│   │   ├── customer/
│   │   ├── executive/
│   │   └── shared/
│   │
│   ├── services/
│   │   ├── matching/
│   │   ├── geo/
│   │   └── payments/
│   │
│   ├── pages/
│   └── utils/
│
├── supabase/
│   └── migrations/
│
├── public/
│
├── package.json
├── vite.config.js
└── README.md
```

*The exact structure may evolve as the project grows.*

---

# ⚙️ Getting Started

## Prerequisites

Make sure you have installed:

- Node.js
- npm
- Git

---

## 1. Clone the Repository

```bash
git clone https://github.com/AnubhabMetya/Zolve.git
cd Zolve
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Configure Environment Variables

Create a `.env` file in the project root.

Example:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Add any additional environment variables required by your payment or automation integrations.

> Never commit API keys, service-role keys, payment secrets, or other credentials to GitHub.

---

## 4. Start Development Server

```bash
npm run dev
```

The application will be available at the local development URL shown by Vite.

---

# 🌐 Deployment

Zolve can be deployed using **Vercel**.

Typical deployment flow:

```text
GitHub
   ↓
Vercel
   ↓
Build
   ↓
Production Deployment
```

Make sure the required environment variables are configured in the Vercel project settings.

---

# 🗺️ Roadmap

### Current

- [x] Customer service booking
- [x] Semantic matching
- [x] Geographic filtering
- [x] FairMatch
- [x] Professional availability
- [x] Executive portal
- [x] Booking state management
- [x] Razorpay integration
- [x] Supabase integration

### Future

- [ ] Production-grade AI matching model
- [ ] Real-time professional location tracking
- [ ] Advanced workload balancing
- [ ] Worker reputation system
- [ ] Skill certification marketplace
- [ ] Cooperative governance mechanisms
- [ ] Automated dispute resolution
- [ ] Dynamic incentive optimization
- [ ] Advanced fraud detection
- [ ] Multi-city production deployment
- [ ] Native mobile application

---

# 🌱 Why Zolve?

Zolve is built around a simple principle:

> **Technology should not only make services faster — it should make opportunities fairer.**

The platform combines **AI, geolocation, service intelligence, and cooperative principles** to create a service marketplace where customers get better matches and professionals get a more balanced opportunity to earn.

---

# 🤝 Contributing

Contributions, suggestions, and improvements are welcome.

### Basic workflow

```bash
git checkout -b feature/your-feature
```

Make your changes, test them, and submit a pull request.

Please keep contributions focused, documented, and tested.

---

# 📄 License

This project is currently intended as a prototype / development project.

Add an appropriate open-source license here if the repository is later released under one.

---

# 👨‍💻 Project

**Zolve — AI-Powered Cooperative Gig Services Platform**

Built with:

**React • Vite • Tailwind CSS • Supabase • AI Matching • Razorpay • n8n • Vercel**

---

⭐ If you find the concept interesting, consider starring the repository and following the project's development.

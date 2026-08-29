// ====================================================================
// ZOLVE DEMO & SEED DATA STORE
// Realistic, authentic, community-centric data for Zolve Platform
// ====================================================================

export const DEMO_USERS = {
  customer: {
    id: "usr-cust-001",
    name: "Anubhab Metya",
    email: "anubhab@zolve.local",
    phone: "+91 98765 43210",
    role: "customer",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    location: "Indiranagar 100ft Road, Bengaluru",
    savedAddresses: [
      {
        id: "addr-1",
        label: "Home",
        addressLine: "Flat 402, Sunshine Heights, 12th Main, Indiranagar, Bengaluru - 560038",
        landmark: "Near Metro Station",
        isDefault: true,
      },
      {
        id: "addr-2",
        label: "Office",
        addressLine: "Level 3, Tech Hub, Outer Ring Road, Bellandur, Bengaluru - 560103",
        landmark: "Opposite Ecospace",
        isDefault: false,
      }
    ]
  },
  providerCoop: {
    id: "usr-prov-001",
    providerId: "prov-rajesh-01",
    name: "Rajesh Kumar",
    email: "rajesh@zolve.local",
    phone: "+91 98111 22334",
    role: "provider",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    location: "Koramangala / Indiranagar, Bengaluru",
    isCoopMember: true,
    coopMemberSince: "August 2024",
    coopParticipation: "94%",
    dividendPoints: 4850,
  },
  providerStandard: {
    id: "usr-prov-002",
    providerId: "prov-rahul-02",
    name: "Rahul Verma",
    email: "rahul@zolve.local",
    phone: "+91 98222 33445",
    role: "provider",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    location: "HSR Layout, Bengaluru",
    isCoopMember: false,
  },
  admin: {
    id: "usr-admin-001",
    name: "Zolve Operations Admin",
    email: "admin@zolve.local",
    phone: "+91 99999 00000",
    role: "admin",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    location: "HQ - Bengaluru",
  },
  societyAdmin: {
    id: "usr-soc-001",
    name: "Vikram Malhotra",
    email: "greenvalley@zolve.local",
    phone: "+91 98333 44556",
    role: "society_admin",
    societyName: "Green Valley Residency",
    location: "Sarjapur Road, Bengaluru (340 Units)",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
  },
  // --- EXECUTIVE DEMO PERSONAS (separate from Provider) ---
  executiveHousehold: {
    id: "usr-exec-hh-001",
    name: "Arjun Patel",
    email: "arjun.exec@zolve.local",
    phone: "+91 98765 11101",
    role: "executive",
    executiveVertical: "household",
    executiveStatus: "active",
    mobileVerified: true,
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
    location: "Indiranagar, Bengaluru",
    assignedServices: ["Full Home Deep Cleaning","Plumbing Repair & Leakage Fix","Electrical Repair & Wiring","Carpentry & Furniture Assembly","AC Deep Foam Jet Servicing","Wall Painting & Waterproofing","Gardening & Balcony Greenery","Organic Pest Control"]
  },
  executivePersonal: {
    id: "usr-exec-pf-001",
    name: "Kavya Nair",
    email: "kavya.exec@zolve.local",
    phone: "+91 98765 22202",
    role: "executive",
    executiveVertical: "personal",
    executiveStatus: "active",
    mobileVerified: true,
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
    location: "Koramangala, Bengaluru",
    assignedServices: ["Home Chef & Meal Preparation","Elder Assistance & Companionship","Moving & Heavy Lifting Assistance"]
  },
  executiveCommunity: {
    id: "usr-exec-cs-001",
    name: "Suresh Reddy",
    email: "suresh.exec@zolve.local",
    phone: "+91 98765 33303",
    role: "executive",
    executiveVertical: "community",
    executiveStatus: "active",
    mobileVerified: true,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    location: "Sarjapur Road, Bengaluru",
    assignedServices: ["Society Common Area Sanitization","Water Sump & Overhead Tank Cleaning","Community Event Sound & Electrical Setup"]
  },
  executiveCommunityPending: {
    id: "usr-exec-cs-002",
    name: "Neel Sharma (Pending Approval)",
    email: "neel.exec@zolve.local",
    phone: "+91 98765 44404",
    role: "executive",
    executiveVertical: "community",
    executiveStatus: "pending_approval",
    mobileVerified: true,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    location: "Whitefield, Bengaluru",
    assignedServices: ["Society Common Area Sanitization","Water Sump & Overhead Tank Cleaning","Community Event Sound & Electrical Setup"]
  }
};

export const SERVICE_CATEGORIES = [
  {
    id: "cat-household",
    name: "Household Services",
    tagline: "Essential everyday maintenance, fixes & deep cleaning",
    badge: "12 Services",
    icon: "Home",
    color: "from-blue-500/10 to-indigo-500/10 text-blue-600 border-blue-200",
    services: [
      {
        id: "srv-clean-01",
        name: "Full Home Deep Cleaning",
        category: "Household",
        subcategory: "Cleaning",
        description: "Intensive 360° sanitization for 1BHK/2BHK/3BHK including floor scrubbing, kitchen degreasing & balcony care.",
        basePrice: 1299,
        unit: "per session",
        timeEst: "3 - 4 hours",
        rating: 4.9,
        popular: true,
        image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80"
      },
      {
        id: "srv-plumb-01",
        name: "Plumbing Repair & Leakage Fix",
        category: "Household",
        subcategory: "Plumbing",
        description: "Faucet replacement, drain unclogging, pipe repair, toilet cistern fixes, and pressure pump service.",
        basePrice: 449,
        unit: "base visit + parts",
        timeEst: "45 - 90 mins",
        rating: 4.88,
        popular: true,
        image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=600&auto=format&fit=crop&q=80"
      },
      {
        id: "srv-elec-01",
        name: "Electrical Repair & Wiring",
        category: "Household",
        subcategory: "Electrical",
        description: "MCB tripping resolution, smart switchboard installation, light fixture mounting, inverter connection.",
        basePrice: 399,
        unit: "base inspection",
        timeEst: "45 - 60 mins",
        rating: 4.92,
        popular: true,
        image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80"
      },
      {
        id: "srv-carp-01",
        name: "Carpentry & Furniture Assembly",
        category: "Household",
        subcategory: "Carpentry",
        description: "Modular wardrobe repair, lock installation, bespoke shelving, door alignment, wooden polish.",
        basePrice: 499,
        unit: "per service",
        timeEst: "1 - 2 hours",
        rating: 4.82,
        popular: false,
        image: "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=600&auto=format&fit=crop&q=80"
      },
      {
        id: "srv-ac-01",
        name: "AC Deep Foam Jet Servicing",
        category: "Household",
        subcategory: "Appliance Repair",
        description: "High-pressure pump cleaning of indoor cooling coils, outdoor condenser flush, cooling gas check.",
        basePrice: 699,
        unit: "per AC unit",
        timeEst: "60 mins",
        rating: 4.91,
        popular: true,
        image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&auto=format&fit=crop&q=80"
      },
      {
        id: "srv-paint-01",
        name: "Wall Painting & Waterproofing",
        category: "Household",
        subcategory: "Painting",
        description: "Single room accent walls, anti-damp treatment, touch-ups, complete interior & exterior painting.",
        basePrice: 1999,
        unit: "starts at / room",
        timeEst: "1 - 2 days",
        rating: 4.78,
        popular: false,
        image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&auto=format&fit=crop&q=80"
      },
      {
        id: "srv-garden-01",
        name: "Gardening & Balcony Greenery",
        category: "Household",
        subcategory: "Gardening",
        description: "Soil conditioning, organic pest repellent, pot repotting, pruning, aesthetic balcony setup.",
        basePrice: 499,
        unit: "per session",
        timeEst: "2 hours",
        rating: 4.85,
        popular: false,
        image: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80"
      },
      {
        id: "srv-pest-01",
        name: "Organic Pest Control",
        category: "Household",
        subcategory: "Pest Control",
        description: "Eco-friendly, odorless treatment for termites, cockroaches, ants, and bed bugs. Child & pet safe.",
        basePrice: 899,
        unit: "per apartment",
        timeEst: "1 - 2 hours",
        rating: 4.87,
        popular: false,
        image: "/organic-pest-control.jpg"
      }
    ]
  },
  {
    id: "cat-personal",
    name: "Personal & Family Services",
    tagline: "Dedicated human care for nutrition, seniors, and relocation",
    badge: "5 Services",
    icon: "HeartHandshake",
    color: "from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-200",
    services: [
      {
        id: "srv-cook-01",
        name: "Home Chef & Meal Preparation",
        category: "Personal",
        subcategory: "Cooking",
        description: "Freshly cooked North/South Indian or Continental meals for everyday or small family gatherings.",
        basePrice: 650,
        unit: "per meal session",
        timeEst: "2 hours",
        rating: 4.95,
        popular: true,
        image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&auto=format&fit=crop&q=80"
      },
      {
        id: "srv-elder-01",
        name: "Elder Assistance & Companionship",
        category: "Personal",
        subcategory: "Elder Assistance",
        description: "Assistance with hospital visits, medication management, light walks, technology help, and grocery walks.",
        basePrice: 500,
        unit: "per 3-hour slot",
        timeEst: "3 hours",
        rating: 4.98,
        popular: true,
        image: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=600&auto=format&fit=crop&q=80"
      },
      {
        id: "srv-move-01",
        name: "Moving & Heavy Lifting Assistance",
        category: "Personal",
        subcategory: "Moving Assistance",
        description: "Trained helpers with dollies for intra-society shifting, furniture shifting, and carton packaging.",
        basePrice: 799,
        unit: "per helper / slot",
        timeEst: "2 - 3 hours",
        rating: 4.8,
        popular: false,
        image: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600&auto=format&fit=crop&q=80"
      }
    ]
  },
  {
    id: "cat-community",
    name: "Community & Society Services",
    tagline: "Empowering residential societies with managed cooperative teams",
    badge: "5 Services",
    icon: "Building2",
    color: "from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-200",
    services: [
      {
        id: "srv-soc-clean-01",
        name: "Society Common Area Sanitization",
        category: "Community",
        subcategory: "Apartment Maintenance",
        description: "Clubhouse, gym, stairwells, and lift lobby rotary cleaning with industrial grade machines.",
        basePrice: 2499,
        unit: "per block",
        timeEst: "4 hours",
        rating: 4.93,
        popular: true,
        image: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&auto=format&fit=crop&q=80"
      },
      {
        id: "srv-soc-tank-01",
        name: "Water Sump & Overhead Tank Cleaning",
        category: "Community",
        subcategory: "Apartment Maintenance",
        description: "6-stage vacuum de-sludging, high-pressure washing, antibacterial UV sterilizer treatment.",
        basePrice: 3500,
        unit: "per 50,000L tank",
        timeEst: "5 hours",
        rating: 4.9,
        popular: false,
        image: "/water-sump-tank-cleaning.jpg"
      },
      {
        id: "srv-soc-event-01",
        name: "Community Event Sound & Electrical Setup",
        category: "Community",
        subcategory: "Community Event Support",
        description: "Festival, AGM, and sports day electrical safety inspections, temporary illumination, and backup.",
        basePrice: 1800,
        unit: "per event",
        timeEst: "Flexible",
        rating: 4.88,
        popular: false,
        image: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&auto=format&fit=crop&q=80"
      }
    ]
  }
];

export const EXECUTIVE_VERTICALS = [
  {
    id: 'household',
    key: 'household',
    label: 'Household Services',
    title: 'Executive for Household Services',
    badge: '8 Services',
    description: 'Own the full home stack — cleaning, plumbing, electrical, carpentry, AC, painting, gardening, pest control.',
    services: ['Full Home Deep Cleaning','Plumbing Repair & Leakage Fix','Electrical Repair & Wiring','Carpentry & Furniture Assembly','AC Deep Foam Jet Servicing','Wall Painting & Waterproofing','Gardening & Balcony Greenery','Organic Pest Control'],
    icon: 'Home',
    color: 'from-blue-600 to-indigo-700',
    categoryIds: ['cat-household']
  },
  {
    id: 'personal',
    key: 'personal',
    label: 'Personal & Family Services',
    title: 'Executive for Personal & Family Services',
    badge: '3 Services',
    description: 'Human care vertical — home chef, elder companionship, moving & heavy lifting.',
    services: ['Home Chef & Meal Preparation','Elder Assistance & Companionship','Moving & Heavy Lifting Assistance'],
    icon: 'HeartHandshake',
    color: 'from-emerald-600 to-teal-700',
    categoryIds: ['cat-personal']
  },
  {
    id: 'community',
    key: 'community',
    label: 'Community & Society Services',
    title: 'Executive for Community & Society Services',
    badge: '3 Services',
    description: 'Society-scale operations — common area sanitization, tank cleaning, event sound & electrical.',
    services: ['Society Common Area Sanitization','Water Sump & Overhead Tank Cleaning','Community Event Sound & Electrical Setup'],
    icon: 'Building2',
    color: 'from-amber-600 to-orange-700',
    categoryIds: ['cat-community']
  }
];

export const INITIAL_PROVIDERS = [
  {
    id: "prov-rajesh-01",
    name: "Rajesh Kumar",
    title: "Master Electrician & Smart Home Specialist",
    rating: 4.92,
    ratingCount: 184,
    completedJobs: 326,
    experienceYears: 8,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
    phone: "+91 98111 22334",
    email: "rajesh.kumar@zolve-coop.org",
    location: "Indiranagar / Koramangala (2.4 km)",
    basePrice: 399,
    startingPrice: 399,
    availability: "Available Today (10:00 AM - 7:00 PM)",
    isCoopMember: true,
    coopBadge: "Cooperative Member — Governance Delegate",
    coopDividendScore: "Top 5% Patronage Tier",
    verifications: {
      identity: true,
      skill: true,
      phone: true,
      background: true,
      coopMember: true
    },
    serviceCategories: ["Electrical", "Smart Home", "Community Event Support"],
    skills: ["MCB & Distribution Boards", "Inverter Wiring", "Phase Balancing", "Industrial Safety Level 2", "EV Charger Setup"],
    bio: "Cooperative founding member with 8+ years experience in domestic and commercial electrical engineering. Passionate about community electrical safety standards and mentoring apprentice technicians.",
    recentReviews: [
      {
        id: "rev-01",
        customerName: "Ananya Iyer",
        rating: 5,
        date: "24 Aug 2026",
        serviceName: "Electrical Repair & Wiring",
        comment: "Rajesh fixed our master circuit board tripping issue within 30 minutes! Very respectful, carried proper insulated tools, and even explained safety precautions."
      },
      {
        id: "rev-02",
        customerName: "Siddharth Rao",
        rating: 5,
        date: "18 Aug 2026",
        serviceName: "Smart Switchboard Installation",
        comment: "Excellent precision. Being a cooperative member, he takes true ownership of his work. Highly recommended!"
      }
    ]
  },
  {
    id: "prov-priya-02",
    name: "Priya Sharma",
    title: "Lead Cleaning Specialist & Sanitation Expert",
    rating: 4.95,
    ratingCount: 220,
    completedJobs: 412,
    experienceYears: 6,
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80",
    phone: "+91 98450 11223",
    email: "priya.sharma@zolve-coop.org",
    location: "HSR Layout & Bellandur (3.1 km)",
    basePrice: 799,
    startingPrice: 799,
    availability: "Available Tomorrow (9:00 AM - 5:00 PM)",
    isCoopMember: true,
    coopBadge: "Cooperative Member — Quality Lead",
    coopDividendScore: "Top 2% Patronage Tier",
    verifications: {
      identity: true,
      skill: true,
      phone: true,
      background: true,
      coopMember: true
    },
    serviceCategories: ["Cleaning", "Full Home Deep Cleaning", "Apartment Maintenance"],
    skills: ["German Karcher Steam Jet", "Kitchen Grease Extraction", "Tile Grout Restoration", "Eco-friendly Disinfection"],
    bio: "Leads an expert cooperative sanitation squad. We believe a clean home fosters mental peace. We use hospital-grade non-toxic organic agents safe for infants and pets.",
    recentReviews: [
      {
        id: "rev-03",
        customerName: "Gaurav Malhotra",
        rating: 5,
        date: "22 Aug 2026",
        serviceName: "Full Home Deep Cleaning",
        comment: "Priya's team transformed our flat before housewarming. Incredible attention to window sills and grease filters!"
      }
    ]
  },
  {
    id: "prov-amit-03",
    name: "Amit Das",
    title: "Senior Hydraulic & Plumbing Specialist",
    rating: 4.88,
    ratingCount: 156,
    completedJobs: 280,
    experienceYears: 9,
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80",
    phone: "+91 98777 66554",
    email: "amit.das@zolve-coop.org",
    location: "Koramangala & Domlur (1.8 km)",
    basePrice: 449,
    startingPrice: 449,
    availability: "Available in 45 mins (Emergency Ready)",
    isCoopMember: true,
    coopBadge: "Cooperative Member — Safety Council",
    coopDividendScore: "Top 10% Patronage Tier",
    verifications: {
      identity: true,
      skill: true,
      phone: true,
      background: true,
      coopMember: true
    },
    serviceCategories: ["Plumbing", "Water Tank Cleaning", "Apartment Maintenance"],
    skills: ["Concealed Pipe Leak Detection", "Pressure Pump Calibration", "Water Heater Valves", "Sanitaryware Fitting"],
    bio: "Certified plumber with mastery in solving persistent dampness and water hammer issues. Committed to fair, upfront pricing without hidden surprises.",
    recentReviews: [
      {
        id: "rev-04",
        customerName: "Meera Nair",
        rating: 5,
        date: "25 Aug 2026",
        serviceName: "Plumbing Repair & Leakage Fix",
        comment: "Solved a 2-month long wall seepage mystery in 20 minutes with his pressure meter. Clean work!"
      }
    ]
  },
  {
    id: "prov-neha-04",
    name: "Neha Singh",
    title: "HVAC & Appliance Electronics Technician",
    rating: 4.90,
    ratingCount: 110,
    completedJobs: 195,
    experienceYears: 5,
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80",
    phone: "+91 98999 88776",
    email: "neha.singh@zolve-coop.org",
    location: "Whitefield & Marathahalli (4.5 km)",
    basePrice: 599,
    startingPrice: 599,
    availability: "Available Today (2:00 PM - 8:00 PM)",
    isCoopMember: true,
    coopBadge: "Cooperative Member",
    coopDividendScore: "Top 15% Patronage Tier",
    verifications: {
      identity: true,
      skill: true,
      phone: true,
      background: true,
      coopMember: true
    },
    serviceCategories: ["Appliance Repair", "AC Servicing", "Electrical"],
    skills: ["Inverter AC PCB Diagnostics", "Washing Machine Motor Overhaul", "R32/R410 Gas Charging", "Microwave Magnetron Fix"],
    bio: "Electronics diploma holder specializing in modern microcontroller appliance boards and high-efficiency inverter air conditioning systems.",
    recentReviews: [
      {
        id: "rev-05",
        customerName: "Rohan V.",
        rating: 5,
        date: "20 Aug 2026",
        serviceName: "AC Deep Foam Jet Servicing",
        comment: "Neha was extremely thorough. Airflow velocity increased immediately and she showed the PCB diagnostics reading."
      }
    ]
  },
  {
    id: "prov-rahul-05",
    name: "Rahul Verma",
    title: "Artisan Carpenter & Modular Fixer",
    rating: 4.82,
    ratingCount: 95,
    completedJobs: 210,
    experienceYears: 7,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80",
    phone: "+91 98222 33445",
    email: "rahul.verma@zolve-pro.org",
    location: "HSR Layout (3.8 km)",
    basePrice: 499,
    startingPrice: 499,
    availability: "Available Today (11:00 AM - 6:00 PM)",
    isCoopMember: false,
    coopBadge: null,
    verifications: {
      identity: true,
      skill: true,
      phone: true,
      background: true,
      coopMember: false
    },
    serviceCategories: ["Carpentry", "Moving Assistance"],
    skills: ["Hettich/Hafele Hardware", "Hydraulic Bed Hinges", "Wooden Lacquer Finish", "Custom Shelving"],
    bio: "Skilled woodwork craftsman for modular kitchen alignments, bespoke shoe racks, and secure digital door lock integrations.",
    recentReviews: [
      {
        id: "rev-06",
        customerName: "Sanjay Bose",
        rating: 5,
        date: "15 Aug 2026",
        serviceName: "Carpentry & Furniture Assembly",
        comment: "Assembled our 6-door study wardrobe without any squeaks. Cleaned up sawdust before leaving."
      }
    ]
  },
  {
    id: "prov-sunita-06",
    name: "Sunita Devi",
    title: "Culinary Specialist & Nutrition Home Chef",
    rating: 4.94,
    ratingCount: 160,
    completedJobs: 350,
    experienceYears: 10,
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80",
    phone: "+91 98111 88990",
    email: "sunita.devi@zolve-coop.org",
    location: "Indiranagar & Domlur (1.2 km)",
    basePrice: 650,
    startingPrice: 650,
    availability: "Available Tomorrow Morning (7:00 AM - 12:00 PM)",
    isCoopMember: true,
    coopBadge: "Cooperative Member — Community Nutrition Trainer",
    coopDividendScore: "Top 3% Patronage Tier",
    verifications: {
      identity: true,
      skill: true,
      phone: true,
      background: true,
      coopMember: true
    },
    serviceCategories: ["Cooking", "Elder Assistance"],
    skills: ["Balanced Diabetic Diets", "Traditional Sattvic Meals", "Multi-course Family Dinners", "Hygienic Prep & Sanitization"],
    bio: "10+ years providing nourishing, home-style wholesome cooking tailored to dietary restrictions like low-oil, low-sodium, and high-protein requirements.",
    recentReviews: [
      {
        id: "rev-07",
        customerName: "Deepika Sen",
        rating: 5,
        date: "23 Aug 2026",
        serviceName: "Home Chef & Meal Preparation",
        comment: "Sunita ji cooked a delicious meal for our family get-together. The Dal Tadka and Paneer Lababdar were sensational!"
      }
    ]
  }
];

export const INITIAL_BOOKINGS = [
  {
    id: "bk-zol-8291",
    bookingCode: "ZOL-8291",
    customerId: "usr-cust-001",
    customerName: "Anubhab Metya",
    customerPhone: "+91 98765 43210",
    providerId: "prov-rajesh-01",
    providerName: "Rajesh Kumar",
    providerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    providerPhone: "+91 98111 22334",
    providerTitle: "Master Electrician",
    isCoopMember: true,
    serviceId: "srv-elec-01",
    serviceName: "Electrical Repair & Wiring",
    category: "Household",
    address: "Flat 402, Sunshine Heights, 12th Main, Indiranagar, Bengaluru - 560038",
    scheduledDate: "2026-08-27",
    scheduledTime: "10:30 AM - 11:30 AM",
    description: "Main circuit breaker tripping whenever AC and geyser are turned on together. Need load testing.",
    baseAmount: 800,
    platformFee: 80,
    coopReserveFee: 40,
    taxes: 44,
    totalAmount: 964,
    providerEarnings: 844,
    bookingStatus: "CONFIRMED", // Stages: PAYMENT_PENDING -> CONFIRMED -> PROVIDER_ASSIGNED -> PROVIDER_ACCEPTED -> PROVIDER_ON_THE_WAY -> SERVICE_STARTED -> SERVICE_COMPLETED
    paymentStatus: "CAPTURED",
    paymentId: "pay_Nz92A1bX_Live",
    razorpayOrderId: "order_Kz8271049281",
    paymentMethod: "UPI / PhonePe",
    createdAt: "2026-08-26T02:15:00Z",
    chatMessages: [
      { id: "msg-1", sender: "provider", text: "Namaste Anubhab! I have accepted your booking for tomorrow 10:30 AM. I'll bring the multi-meter and spare 32A MCB.", time: "02:20 AM" },
      { id: "msg-2", sender: "customer", text: "Great Rajesh! The security guard will let you straight up to 4th floor.", time: "02:22 AM" }
    ]
  },
  {
    id: "bk-zol-7419",
    bookingCode: "ZOL-7419",
    customerId: "usr-cust-001",
    customerName: "Anubhab Metya",
    customerPhone: "+91 98765 43210",
    providerId: "prov-priya-02",
    providerName: "Priya Sharma",
    providerAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    providerPhone: "+91 98450 11223",
    providerTitle: "Sanitation Specialist",
    isCoopMember: true,
    serviceId: "srv-clean-01",
    serviceName: "Full Home Deep Cleaning",
    category: "Household",
    address: "Flat 402, Sunshine Heights, 12th Main, Indiranagar, Bengaluru - 560038",
    scheduledDate: "2026-08-26",
    scheduledTime: "03:00 PM - 06:30 PM",
    description: "Deep clean 2BHK flat prior to parents visiting this weekend.",
    baseAmount: 1499,
    platformFee: 120,
    coopReserveFee: 60,
    taxes: 82,
    totalAmount: 1761,
    providerEarnings: 1559,
    bookingStatus: "PROVIDER_ON_THE_WAY",
    paymentStatus: "CAPTURED",
    paymentId: "pay_Kx93810294_Live",
    razorpayOrderId: "order_Jx918273645",
    paymentMethod: "HDFC Credit Card",
    createdAt: "2026-08-25T14:30:00Z",
    chatMessages: [
      { id: "msg-101", sender: "provider", text: "Hello! We are in transit from Indiranagar hub with the high pressure steam equipment. ETA 15 mins.", time: "02:45 PM" }
    ]
  },
  {
    id: "bk-zol-6102",
    bookingCode: "ZOL-6102",
    customerId: "usr-cust-001",
    customerName: "Anubhab Metya",
    customerPhone: "+91 98765 43210",
    providerId: "prov-amit-03",
    providerName: "Amit Das",
    providerAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
    providerPhone: "+91 98777 66554",
    providerTitle: "Senior Plumber",
    isCoopMember: true,
    serviceId: "srv-plumb-01",
    serviceName: "Plumbing Repair & Leakage Fix",
    category: "Household",
    address: "Flat 402, Sunshine Heights, 12th Main, Indiranagar, Bengaluru - 560038",
    scheduledDate: "2026-08-20",
    scheduledTime: "11:00 AM - 12:00 PM",
    description: "Kitchen sink drain was clogged with hard water residue.",
    baseAmount: 600,
    platformFee: 60,
    coopReserveFee: 30,
    taxes: 33,
    totalAmount: 723,
    providerEarnings: 630,
    bookingStatus: "SERVICE_COMPLETED",
    paymentStatus: "CAPTURED",
    paymentId: "pay_Jx83726154_Live",
    razorpayOrderId: "order_Hx82736152",
    paymentMethod: "Google Pay UPI",
    createdAt: "2026-08-20T08:00:00Z",
    completedAt: "2026-08-20T12:15:00Z",
    reviewed: true,
    chatMessages: []
  }
];

export const COOPERATIVE_PROPOSALS = [
  {
    id: "prop-01",
    code: "ZCP-2026-09",
    title: "Establish Cooperative Emergency Health & Tool Insurance Pool",
    category: "Member Welfare",
    proposer: "Rajesh Kumar (Electrician Delegate)",
    summary: "Allocate 20% of Q3 platform cooperative reserve fund to sponsor 5 Lakh health coverage and tool replacement insurance for all active members completing >20 jobs/month.",
    status: "active",
    deadline: "2026-09-05T23:59:59Z",
    quorumRequired: 150,
    votes: {
      yes: 142,
      no: 18,
      abstain: 6,
      total: 166
    },
    userVoted: null, // "YES" | "NO" | "ABSTAIN"
    budgetAllocation: "₹4,20,000 INR from Reserve Fund"
  },
  {
    id: "prop-02",
    code: "ZCP-2026-08",
    title: "Subsidize EV Two-Wheeler & Tool Battery Swapping Network",
    category: "Green Mobility",
    proposer: "Priya Sharma (Sanitation Squad Lead)",
    summary: "Partner with community battery swapping stations to provide members 40% subsidized battery swaps for daily commuting to client homes.",
    status: "active",
    deadline: "2026-09-12T23:59:59Z",
    quorumRequired: 150,
    votes: {
      yes: 189,
      no: 12,
      abstain: 4,
      total: 205
    },
    userVoted: "YES",
    budgetAllocation: "Cooperative Green Initiative Grant"
  },
  {
    id: "prop-03",
    code: "ZCP-2026-07",
    title: "Introduce 5% Annual Patronage Dividend for 95%+ Punctuality Rating",
    category: "Economic Dividend",
    proposer: "Amit Das (Safety Council)",
    summary: "Distribute year-end platform operating surplus back to top-rated cooperative providers based on verified completed hours and community ratings.",
    status: "passed",
    deadline: "2026-08-15T23:59:59Z",
    quorumRequired: 150,
    votes: {
      yes: 234,
      no: 8,
      abstain: 2,
      total: 244
    },
    userVoted: "YES",
    budgetAllocation: "Direct Surplus Dividend Distribution"
  }
];

export const COOPERATIVE_TRAINING_MODULES = [
  {
    id: "trn-01",
    title: "Smart Home IoT & EV Charger Installation Certification",
    category: "Electrical & Tech",
    duration: "16 Hours (4 Weekend Sessions)",
    instructor: "National Skill Development Council Master Trainer",
    enrolledCount: 48,
    status: "Enrolled",
    progress: 75,
    badge: "Level 3 Certified Smart Electrician",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "trn-02",
    title: "Hospital Grade Antimicrobial Sanitation Standards",
    category: "Cleaning & Hygiene",
    duration: "8 Hours",
    instructor: "Dr. Arvind Rao (Healthcare Sanitation Specialist)",
    enrolledCount: 62,
    status: "Completed",
    progress: 100,
    badge: "Certified Bio-Sanitation Lead",
    image: "https://images.unsplash.com/photo-1584634731339-252c581abfc5?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "trn-03",
    title: "Customer Empathy, De-escalation & Professional Ethics",
    category: "Community & Soft Skills",
    duration: "6 Hours (Interactive Workshop)",
    instructor: "Zolve Member Experience Guild",
    enrolledCount: 110,
    status: "Available to Join",
    progress: 0,
    badge: "5-Star Trust Ambassador",
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=500&auto=format&fit=crop&q=80"
  }
];

export const COMMUNITY_PROJECTS = [
  {
    id: "proj-01",
    title: "Indiranagar Green Canopy & Stormwater Drain Cleanout",
    date: "August 30, 2026",
    location: "100ft Road & BDA Complex Neighborhood",
    participants: "38 Cooperative Providers + 65 Residents",
    impact: "Cleaned 2.4 km of rainwater channels preventing monsoon stagnation.",
    image: "https://images.unsplash.com/photo-1558441719-8b449c6ff673?w=500&auto=format&fit=crop&q=80",
    category: "Civic Action"
  },
  {
    id: "proj-02",
    title: "Free Electrical Safety Audits for Senior Citizen Homes",
    date: "Ongoing Weekly Drive",
    location: "Koramangala 4th Block & HSR Sector 2",
    participants: "18 Certified Electrician Members",
    impact: "Inspected 84 households, fixed 42 grounding leakages free of charge.",
    image: "https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=500&auto=format&fit=crop&q=80",
    category: "Elder Care"
  },
  {
    id: "proj-03",
    title: "Apprentice Tool Grant for Youth from Underprivileged Wards",
    date: "September 15, 2026",
    location: "Zolve East Skill Center",
    participants: "25 Apprentice Graduates",
    impact: "Funded complete professional toolkit kits for newly certified youth.",
    image: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=500&auto=format&fit=crop&q=80",
    category: "Youth Upliftment"
  }
];

export const SOCIETY_DATA = {
  name: "Green Valley Residency",
  units: 340,
  blocks: 4,
  location: "Sarjapur Main Road, Bengaluru",
  manager: "Vikram Malhotra",
  stats: {
    openRequests: 8,
    completedThisMonth: 54,
    pendingApproval: 4,
    emergencyOpen: 1
  },
  activeRequests: [
    {
      id: "soc-req-101",
      unit: "Block C - Lift 2",
      service: "Lift Lobby Emergency Lighting Fix",
      priority: "Emergency",
      status: "ASSIGNED",
      provider: "Rajesh Kumar",
      date: "Today, 11:00 AM"
    },
    {
      id: "soc-req-102",
      unit: "Clubhouse & Pool Deck",
      service: "Deep Chlorine Tile Scrubbing",
      priority: "High",
      status: "SCHEDULED",
      provider: "Priya Sharma Squad",
      date: "Tomorrow, 08:00 AM"
    },
    {
      id: "soc-req-103",
      unit: "Block A - Common Sump",
      service: "Bi-monthly UV Water Tank Sterilization",
      priority: "Normal",
      status: "IN_PROGRESS",
      provider: "Amit Das Team",
      date: "Today, 02:00 PM"
    }
  ]
};

export const PROVIDER_EARNINGS_LEDGER = [
  {
    id: "ledg-01",
    date: "2026-08-25",
    bookingCode: "ZOL-7419",
    serviceName: "Full Home Deep Cleaning",
    customerName: "Anubhab Metya",
    grossAmount: 1761,
    customerPaid: 1761,
    platformFee: 120,
    coopAllocation: 60,
    taxes: 82,
    netEarnings: 1499,
    status: "SETTLED"
  },
  {
    id: "ledg-02",
    date: "2026-08-24",
    bookingCode: "ZOL-7390",
    serviceName: "AC Deep Servicing (2 Units)",
    customerName: "Kavita Rao",
    grossAmount: 1420,
    customerPaid: 1420,
    platformFee: 100,
    coopAllocation: 50,
    taxes: 70,
    netEarnings: 1200,
    status: "SETTLED"
  },
  {
    id: "ledg-03",
    date: "2026-08-23",
    bookingCode: "ZOL-7312",
    serviceName: "Smart MCB Box & Inverter Wire",
    customerName: "Vinod Joshi",
    grossAmount: 980,
    customerPaid: 980,
    platformFee: 80,
    coopAllocation: 40,
    taxes: 46,
    netEarnings: 814,
    status: "SETTLED"
  },
  {
    id: "ledg-04",
    date: "2026-08-21",
    bookingCode: "ZOL-7201",
    serviceName: "Kitchen Light & Fan Installation",
    customerName: "Sneha Reddy",
    grossAmount: 650,
    customerPaid: 650,
    platformFee: 50,
    coopAllocation: 25,
    taxes: 30,
    netEarnings: 545,
    status: "SETTLED"
  }
];

export const INITIAL_SUPPORT_TICKETS = [
  {
    id: "tkt-001",
    ticketCode: "TCK-8812",
    userName: "Ramesh Pai",
    userRole: "customer",
    bookingCode: "ZOL-6910",
    category: "Billing / Overcharge Query",
    description: "Wanted clarification on additional spare valve cost of ₹250 added during plumbing visit.",
    status: "resolved",
    resolutionNotes: "Provider provided official hardware receipt from dealer. Customer satisfied and reimbursed.",
    createdAt: "2026-08-22T10:00:00Z"
  },
  {
    id: "tkt-002",
    ticketCode: "TCK-8924",
    userName: "Deepa Nair",
    userRole: "customer",
    bookingCode: "ZOL-7401",
    category: "Punctuality / Delay",
    description: "Provider was delayed by 25 mins due to heavy waterlogging near Silk Board junction.",
    status: "resolved",
    resolutionNotes: "Provider communicated in advance via in-app chat. ₹100 goodwill coupon issued.",
    createdAt: "2026-08-24T16:20:00Z"
  }
];

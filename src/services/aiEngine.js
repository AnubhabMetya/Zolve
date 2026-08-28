// ====================================================================
// ZOLVE AI INTELLIGENCE ENGINE
// Service classification, Provider matching, Dynamic pricing, Copilot & Fraud detection
// ====================================================================

import { INITIAL_PROVIDERS, SERVICE_CATEGORIES } from '../data/mockData';

// 1. Natural Language Service Classifier
export const classifyServiceQuery = (query) => {
  if (!query || query.trim() === '') return null;
  const q = query.toLowerCase();

  // Keyword intent mapping
  if (q.includes('leak') || q.includes('pipe') || q.includes('tap') || q.includes('faucet') || q.includes('drain') || q.includes('clog') || q.includes('sink') || q.includes('water pressure') || q.includes('flush') || q.includes('plumb')) {
    return {
      category: 'Household',
      subcategory: 'Plumbing',
      serviceId: 'srv-plumb-01',
      serviceName: 'Plumbing Repair & Leakage Fix',
      confidence: 0.96,
      estimatedPriceRange: { min: 450, max: 950 },
      urgency: q.includes('emergency') || q.includes('burst') || q.includes('flooding') ? 'Emergency' : 'High',
      explanation: 'Detected plumbing issue related to water fixture or drainage. Immediate specialist recommended.'
    };
  }

  if (q.includes('spark') || q.includes('mcb') || q.includes('trip') || q.includes('switch') || q.includes('wiring') || q.includes('light') || q.includes('fan') || q.includes('short circuit') || q.includes('electric') || q.includes('inverter') || q.includes('meter')) {
    return {
      category: 'Household',
      subcategory: 'Electrical',
      serviceId: 'srv-elec-01',
      serviceName: 'Electrical Repair & Wiring',
      confidence: 0.98,
      estimatedPriceRange: { min: 400, max: 850 },
      urgency: q.includes('spark') || q.includes('smoke') || q.includes('fire') ? 'Emergency' : 'High',
      explanation: 'Identified electrical load/wiring fault. High-voltage safety precautions apply.'
    };
  }

  if (q.includes('clean') || q.includes('dust') || q.includes('maid') || q.includes('sanitize') || q.includes('scrub') || q.includes('deep clean') || q.includes('grease') || q.includes('sofa') || q.includes('wash')) {
    return {
      category: 'Household',
      subcategory: 'Cleaning',
      serviceId: 'srv-clean-01',
      serviceName: 'Full Home Deep Cleaning',
      confidence: 0.94,
      estimatedPriceRange: { min: 1299, max: 2499 },
      urgency: 'Normal',
      explanation: 'Identified home sanitization & deep cleaning request with multi-room checklist.'
    };
  }

  if (q.includes('ac') || q.includes('air condition') || q.includes('cooling') || q.includes('gas') || q.includes('fridge') || q.includes('washing machine') || q.includes('appliance') || q.includes('refrigerator')) {
    return {
      category: 'Household',
      subcategory: 'Appliance Repair',
      serviceId: 'srv-ac-01',
      serviceName: 'AC Deep Foam Jet Servicing',
      confidence: 0.95,
      estimatedPriceRange: { min: 699, max: 1499 },
      urgency: 'Normal',
      explanation: 'Identified HVAC / cooling appliance maintenance requirement.'
    };
  }

  if (q.includes('wood') || q.includes('door') || q.includes('lock') || q.includes('cupboard') || q.includes('wardrobe') || q.includes('hinge') || q.includes('furniture') || q.includes('carpenter') || q.includes('drill') || q.includes('shelf')) {
    return {
      category: 'Household',
      subcategory: 'Carpentry',
      serviceId: 'srv-carp-01',
      serviceName: 'Carpentry & Furniture Assembly',
      confidence: 0.92,
      estimatedPriceRange: { min: 499, max: 1100 },
      urgency: 'Normal',
      explanation: 'Detected woodwork, hinge alignment or modular furniture assembly need.'
    };
  }

  if (q.includes('cook') || q.includes('food') || q.includes('meal') || q.includes('dinner') || q.includes('lunch') || q.includes('chef') || q.includes('diet') || q.includes('party')) {
    return {
      category: 'Personal',
      subcategory: 'Cooking',
      serviceId: 'srv-cook-01',
      serviceName: 'Home Chef & Meal Preparation',
      confidence: 0.96,
      estimatedPriceRange: { min: 650, max: 1500 },
      urgency: 'Normal',
      explanation: 'Matched with culinary specialist for personalized home meal preparation.'
    };
  }

  if (q.includes('elder') || q.includes('senior') || q.includes('parent') || q.includes('hospital') || q.includes('medicine') || q.includes('assist') || q.includes('walk')) {
    return {
      category: 'Personal',
      subcategory: 'Elder Assistance',
      serviceId: 'srv-elder-01',
      serviceName: 'Elder Assistance & Companionship',
      confidence: 0.97,
      estimatedPriceRange: { min: 500, max: 1200 },
      urgency: 'High',
      explanation: 'Dedicated compassionate support specialist for elder care and hospital guidance.'
    };
  }

  if (q.includes('shift') || q.includes('move') || q.includes('relocat') || q.includes('heavy') || q.includes('carton') || q.includes('box') || q.includes('lift')) {
    return {
      category: 'Personal',
      subcategory: 'Moving Assistance',
      serviceId: 'srv-move-01',
      serviceName: 'Moving & Heavy Lifting Assistance',
      confidence: 0.91,
      estimatedPriceRange: { min: 799, max: 1800 },
      urgency: 'Normal',
      explanation: 'Logistics and heavy-lifting squad with safety equipment.'
    };
  }

  if (q.includes('society') || q.includes('apartment') || q.includes('building') || q.includes('tank') || q.includes('sump') || q.includes('clubhouse') || q.includes('event')) {
    return {
      category: 'Community',
      subcategory: 'Apartment Maintenance',
      serviceId: 'srv-soc-clean-01',
      serviceName: 'Society Common Area Sanitization',
      confidence: 0.93,
      estimatedPriceRange: { min: 2499, max: 6000 },
      urgency: 'Normal',
      explanation: 'Large-scale residential community infrastructure management.'
    };
  }

  return {
    category: 'Household',
    subcategory: 'General Assistance',
    serviceId: 'srv-plumb-01',
    serviceName: 'General Household Maintenance',
    confidence: 0.75,
    estimatedPriceRange: { min: 399, max: 800 },
    urgency: 'Normal',
    explanation: 'Matched with multi-skilled certified technician for diagnostic visit.'
  };
};

// 2. AI Provider Smart Matcher
export const matchProvidersForQuery = (query, providers = INITIAL_PROVIDERS) => {
  const classification = classifyServiceQuery(query);
  if (!classification) return providers;

  return [...providers].sort((a, b) => {
    // Score based on subcategory skill match
    const aHasSkill = a.serviceCategories.some(c => c.toLowerCase().includes(classification.subcategory.toLowerCase()));
    const bHasSkill = b.serviceCategories.some(c => c.toLowerCase().includes(classification.subcategory.toLowerCase()));

    if (aHasSkill && !bHasSkill) return -1;
    if (!aHasSkill && bHasSkill) return 1;

    // Weight cooperative members higher
    if (a.isCoopMember && !b.isCoopMember) return -1;
    if (!a.isCoopMember && b.isCoopMember) return 1;

    // Rating and completed jobs weight
    return b.rating * Math.log(b.completedJobs + 1) - a.rating * Math.log(a.completedJobs + 1);
  });
};

// 3. AI Service Dynamic Price Estimator
export const estimateDynamicPrice = (serviceName, description, urgency = 'Normal') => {
  let base = 500;
  if (serviceName.includes('Cleaning')) base = 1299;
  if (serviceName.includes('Electrical')) base = 400;
  if (serviceName.includes('Plumbing')) base = 450;
  if (serviceName.includes('AC')) base = 699;
  if (serviceName.includes('Chef') || serviceName.includes('Cook')) base = 650;
  if (serviceName.includes('Society')) base = 2499;

  let multiplier = 1.0;
  if (urgency === 'Emergency') multiplier = 1.35;
  if (urgency === 'High') multiplier = 1.15;

  const estimatedBase = Math.round(base * multiplier);
  const platformFee = Math.round(estimatedBase * 0.08); // 8% transparent platform fee
  const coopFee = Math.round(estimatedBase * 0.04);     // 4% member welfare fund
  const gst = Math.round((platformFee + coopFee) * 0.18); // 18% GST on fees

  return {
    baseService: estimatedBase,
    platformFee,
    coopFee,
    gst,
    total: estimatedBase + platformFee + coopFee + gst,
    providerPayout: estimatedBase,
    isEstimate: true
  };
};

// 4. Smart Copilot Interactive Assistant
export const getAICopilotResponse = (userPrompt, userRole = 'customer') => {
  const p = userPrompt.toLowerCase();

  if (p.includes('cooperative') || p.includes('coop') || p.includes('model') || p.includes('dividend')) {
    return "Zolve is structured as a cooperative ecosystem. Unlike conventional gig apps where workers take orders without voice, Zolve's eligible providers participate in platform governance, vote on welfare proposals, and receive annual patronage dividend shares from platform operating surplus.";
  }

  if (p.includes('razorpay') || p.includes('payment') || p.includes('refund') || p.includes('safety')) {
    return "All payments on Zolve are securely tokenized through Razorpay with 100% server-side HMAC-SHA256 signature verification. Money is held in escrow until the service is verified complete. If a job is cancelled before provider dispatch, instant full refund is triggered.";
  }

  if (p.includes('verify') || p.includes('trust') || p.includes('background') || p.includes('police')) {
    return "Every Zolve professional undergoes 4-tier verification: 1) Govt Photo ID & Aadhaar verification, 2) Practical Skill Benchmarking, 3) Police Criminal Background Check, and 4) Code of Conduct Training.";
  }

  if (p.includes('book') || p.includes('schedule') || p.includes('how to')) {
    return "Booking is simple! Type your requirement in the search bar (e.g. 'kitchen sink leaking'), pick a verified provider, select your preferred date & time slot, and confirm via Razorpay. You can track their arrival live on the map!";
  }

  if (p.includes('emergency') || p.includes('urgent') || p.includes('night')) {
    return "For urgent emergencies (water burst, electrical sparking), select 'Emergency Ready' providers. They are equipped with rapid-response toolkits and dispatched with priority within 30-45 minutes.";
  }

  return "I'm your Zolve AI Assistant. I can help you find verified local providers, estimate transparent job costs, understand cooperative member benefits, or track your live booking.";
};

// 5. Admin AI Demand Predictions & Anomaly Alerts
export const getAdminDemandForecast = () => {
  return [
    { category: 'Plumbing & Drainage', forecastGrowth: '+34%', reason: 'Monsoon rainfall causing localized drain surges in Indiranagar & HSR', priority: 'High Demand' },
    { category: 'Electrical & Inverter', forecastGrowth: '+22%', reason: 'Summer peak load & storm grid fluctuations in East Bengaluru', priority: 'Moderate' },
    { category: 'Deep Home Cleaning', forecastGrowth: '+45%', reason: 'Pre-festival home renovation season starting next week', priority: 'Surge Expected' },
    { category: 'Appliance & AC Service', forecastGrowth: '+18%', reason: 'Bi-annual filter servicing cycle for residential apartments', priority: 'Steady' }
  ];
};

export const getFraudAnomalyFlags = () => {
  return [
    {
      id: "anom-01",
      severity: "Low",
      type: "High Frequency Booking",
      description: "Customer account booked 4 services in 10 minutes (Automated society bulk schedule verified)",
      status: "Verified Legitimate",
      timestamp: "Today, 02:10 AM"
    },
    {
      id: "anom-02",
      severity: "Medium",
      type: "Price Variance Check",
      description: "Custom spare part quote of ₹1,800 on booking ZOL-7120 reviewed & matched with dealer invoice",
      status: "Approved by System",
      timestamp: "Yesterday, 07:45 PM"
    }
  ];
};

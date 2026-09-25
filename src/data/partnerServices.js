// Zolve Partner Service Catalog — 15 flat services for onboarding Step 1
// Single source of truth for cards, search, filters, illustration mapping, vertical derivation

export const PARTNER_SERVICES = [
  {
    id: 'ac-appliances',
    name: 'AC & Appliances',
    description: 'Installation, repair, servicing and maintenance',
    categoryGroup: 'Home Services',
    verticalId: 'household',
    badge: { label: 'High Demand', tone: 'blue' },
    accent: 'from-sky-50 to-blue-100/60',
    badgeTone: 'bg-blue-50 text-blue-700 border-blue-200',
    illustrationAlt: '3D air conditioner unit with cooling effect',
  },
  {
    id: 'plumbing',
    name: 'Plumbing',
    description: 'Leakage repair, pipe fitting, bathroom solutions',
    categoryGroup: 'Home Services',
    verticalId: 'household',
    badge: { label: 'High Demand', tone: 'blue' },
    accent: 'from-cyan-50 to-sky-100/50',
    badgeTone: 'bg-amber-50 text-amber-700 border-amber-200',
    illustrationAlt: '3D pipe faucet and wrench',
  },
  {
    id: 'electrical',
    name: 'Electrical',
    description: 'Wiring, switch repair, lighting and electrical fitting',
    categoryGroup: 'Home Services',
    verticalId: 'household',
    badge: { label: 'Popular', tone: 'amber' },
    accent: 'from-amber-50 to-yellow-100/50',
    badgeTone: 'bg-amber-50 text-amber-700 border-amber-200',
    illustrationAlt: '3D electrical plug and switch',
  },
  {
    id: 'cleaning',
    name: 'Cleaning',
    description: 'Home cleaning, deep cleaning and maintenance',
    categoryGroup: 'Home Services',
    verticalId: 'household',
    badge: { label: 'Popular', tone: 'emerald' },
    accent: 'from-emerald-50 to-teal-100/50',
    badgeTone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    illustrationAlt: '3D cleaning bucket and spray bottle',
  },
  {
    id: 'carpentry',
    name: 'Carpentry',
    description: 'Furniture repair, assembly, doors and woodwork',
    categoryGroup: 'Home Services',
    verticalId: 'household',
    badge: null,
    accent: 'from-orange-50 to-amber-100/50',
    badgeTone: '',
    illustrationAlt: '3D hammer and wood pieces',
  },
  {
    id: 'painting',
    name: 'Painting',
    description: 'Home painting, wall treatment and touch-up',
    categoryGroup: 'Home Services',
    verticalId: 'household',
    badge: { label: 'Growing', tone: 'violet' },
    accent: 'from-violet-50 to-purple-100/50',
    badgeTone: 'bg-violet-50 text-violet-700 border-violet-200',
    illustrationAlt: '3D paint roller and bucket',
  },
  {
    id: 'gardening',
    name: 'Gardening',
    description: 'Lawn care, plant maintenance and landscaping',
    categoryGroup: 'Home Services',
    verticalId: 'household',
    badge: { label: 'Seasonal', tone: 'emerald' },
    accent: 'from-green-50 to-emerald-100/50',
    badgeTone: 'bg-green-50 text-green-700 border-green-200',
    illustrationAlt: '3D plant pot and gardening tools',
  },
  {
    id: 'home-chef',
    name: 'Home Chef',
    description: 'Daily meals, special diets and meal preparation',
    categoryGroup: 'Personal & Family',
    verticalId: 'personal',
    badge: { label: 'Popular', tone: 'orange' },
    accent: 'from-orange-50 to-red-100/50',
    badgeTone: 'bg-orange-50 text-orange-700 border-orange-200',
    illustrationAlt: '3D chef hat and cooking pan',
  },
  {
    id: 'elder-care',
    name: 'Elder Care',
    description: 'Assistance, companionship and daily support',
    categoryGroup: 'Personal & Family',
    verticalId: 'personal',
    badge: null,
    accent: 'from-rose-50 to-pink-100/50',
    badgeTone: '',
    illustrationAlt: '3D elder care support visual',
  },
  {
    id: 'child-care',
    name: 'Child Care',
    description: 'Babysitting, nanny support and childcare assistance',
    categoryGroup: 'Personal & Family',
    verticalId: 'personal',
    badge: { label: 'Growing', tone: 'pink' },
    accent: 'from-pink-50 to-rose-100/50',
    badgeTone: 'bg-pink-50 text-pink-700 border-pink-200',
    illustrationAlt: '3D childcare professional illustration',
  },
  {
    id: 'drivers',
    name: 'Drivers',
    description: 'Personal driving, family driving and transport support',
    categoryGroup: 'Personal & Family',
    verticalId: 'personal',
    badge: null,
    accent: 'from-slate-50 to-gray-100/60',
    badgeTone: '',
    illustrationAlt: '3D steering wheel and car key',
  },
  {
    id: 'home-nursing',
    name: 'Home Nursing',
    description: 'Home-care assistance and health support',
    categoryGroup: 'Personal & Family',
    verticalId: 'personal',
    badge: { label: 'High Demand', tone: 'red' },
    accent: 'from-red-50 to-rose-100/50',
    badgeTone: 'bg-red-50 text-red-700 border-red-200',
    illustrationAlt: '3D medical kit and stethoscope',
  },
  {
    id: 'pest-control',
    name: 'Pest Control',
    description: 'General pest-control and treatment services',
    categoryGroup: 'Home Services',
    verticalId: 'household',
    badge: null,
    accent: 'from-lime-50 to-green-100/50',
    badgeTone: '',
    illustrationAlt: '3D pest control sprayer and shield',
  },
  {
    id: 'moving',
    name: 'Moving & Heavy Lifting',
    description: 'Home shifting, furniture moving and heavy-item handling',
    categoryGroup: 'Personal & Family',
    verticalId: 'personal',
    badge: null,
    accent: 'from-stone-50 to-orange-100/40',
    badgeTone: '',
    illustrationAlt: '3D moving boxes and trolley',
  },
  {
    id: 'community-services',
    name: 'Community Services',
    description: 'Society cleaning, tank cleaning, maintenance and event support',
    categoryGroup: 'Community',
    verticalId: 'community',
    badge: { label: 'Community', tone: 'indigo' },
    accent: 'from-indigo-50 to-violet-100/50',
    badgeTone: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    illustrationAlt: '3D community building maintenance visual',
  },
];

export const CATEGORY_FILTERS = ['All', 'Home Services', 'Personal & Family', 'Community'];

export const getServiceById = (id) => PARTNER_SERVICES.find((s) => s.id === id) || null;

export const getVerticalForServices = (serviceIds) => {
  if (!serviceIds || serviceIds.length === 0) return 'household';
  if (serviceIds.includes('community-services')) return 'community';
  const counts = { household: 0, personal: 0, community: 0 };
  serviceIds.forEach((id) => {
    const svc = PARTNER_SERVICES.find((p) => p.id === id);
    if (svc) counts[svc.verticalId] += 1;
  });
  // tie -> household preferred
  if (counts.personal > counts.household) return 'personal';
  return 'household';
};

// For display: map partner service ids to legacy service names expected by registerExecutive / ExecutiveApplication
export const partnerIdsToLegacyNames = (ids) => {
  const map = {
    'ac-appliances': 'AC Deep Foam Jet Servicing',
    'plumbing': 'Plumbing Repair & Leakage Fix',
    'electrical': 'Electrical Repair & Wiring',
    'cleaning': 'Full Home Deep Cleaning',
    'carpentry': 'Carpentry & Furniture Assembly',
    'painting': 'Wall Painting & Waterproofing',
    'gardening': 'Gardening & Balcony Greenery',
    'home-chef': 'Home Chef & Meal Preparation',
    'elder-care': 'Elder Assistance & Companionship',
    'child-care': 'Child Care & Babysitting',
    'drivers': 'Driver & Transport Support',
    'home-nursing': 'Home Nursing & Health Support',
    'pest-control': 'Organic Pest Control',
    'moving': 'Moving & Heavy Lifting Assistance',
    'community-services': 'Society Common Area Sanitization',
  };
  return ids.map((id) => map[id] || id);
};

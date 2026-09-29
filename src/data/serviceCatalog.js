// ZOLVE CENTRALIZED SERVICE CATALOG — customer-side source of truth
// Prototype prices per spec. Edit ONLY here to change prices/descriptions.
// price: { kind: 'fixed'|'starting'|'quote', amount: number|null }

const micro = (id, name, description, duration, price, image, active = true) => ({
  id, name, description, duration, price, image, active,
});
const fixed = (amount) => ({ kind: 'fixed', amount });
const starting = (amount) => ({ kind: 'starting', amount });
const quote = () => ({ kind: 'quote', amount: null });

export const SERVICE_CATALOG = {
  cleaning: {
    id: 'cleaning', name: 'Full Home Cleaning',
    tagline: 'Choose the cleaning service that best fits your home.',
    blurb: 'Professional deep-cleaning services delivered at your selected time.',
    illustration: 'cleaning',
    items: [
      micro('clean-1room', '1 Room Cleaning', 'Bedroom or living room deep cleaning', '60–75 min', fixed(999), '/illustrations/micro-3d/clean-1room.png'),
      micro('clean-2room', '2 Room Cleaning', 'Deep cleaning for two rooms', '90–120 min', fixed(1399), '/illustrations/micro-3d/clean-2room.png'),
      micro('clean-3room', '3 Room Cleaning', 'Complete deep cleaning for three rooms', '2–2.5 hours', fixed(1899), '/illustrations/micro-3d/clean-3room.png'),
      micro('clean-kitchen', 'Kitchen Cleaning', 'Deep cleaning of kitchen surfaces, cabinets and floor', '60–75 min', fixed(799), '/illustrations/micro-3d/clean-kitchen.png'),
      micro('clean-bathroom', 'Bathroom Cleaning', 'Deep cleaning of tiles, fixtures, floor and sanitary areas', '45–60 min', fixed(799), '/illustrations/micro-3d/clean-bathroom.png'),
      micro('clean-fullhouse', 'Full House Deep Cleaning', 'Comprehensive deep cleaning for the entire home', '3–4 hours', fixed(2999), '/illustrations/micro-3d/clean-fullhouse.png'),
    ],
  },
  plumbing: {
    id: 'plumbing', name: 'Plumbing', tagline: 'Fixes, fittings and leakage solutions.',
    blurb: 'Certified plumbing services delivered at your selected time.',
    illustration: 'plumbing',
    items: [
      micro('plumb-tap-repair', 'Tap Repair', 'Fix leaking or faulty taps', '30–45 min', fixed(129), '/illustrations/micro-3d/plumb-tap-repair.png'),
      micro('plumb-tap-install', 'Tap Installation', 'Install new taps and fixtures', '30–45 min', fixed(179), '/illustrations/micro-3d/plumb-tap-install.png'),
      micro('plumb-flush', 'Flush Repair', 'Cistern and flush mechanism repair', '30–60 min', fixed(199), '/illustrations/micro-3d/plumb-flush.png'),
      micro('plumb-drain', 'Drain Blockage', 'Unclog drains and restore flow', '45–60 min', fixed(249), '/illustrations/micro-3d/plumb-drain.png'),
      micro('plumb-pipe', 'Pipe Leakage Fix', 'Detect and fix pipe leakages', '60–90 min', fixed(299), '/illustrations/micro-3d/plumb-pipe.png'),
      micro('plumb-basin', 'Basin Installation', 'Wash basin installation', '60–90 min', fixed(499), '/illustrations/micro-3d/plumb-basin.png'),
      micro('plumb-toilet', 'Toilet Repair', 'Toilet repair and sanitary fixes', '60–90 min', fixed(599), '/illustrations/micro-3d/plumb-toilet.png'),
    ],
  },
  electrical: {
    id: 'electrical', name: 'Electrical', tagline: 'Wiring, fittings and quick fixes.',
    blurb: 'Verified electricians delivered at your selected time.',
    illustration: 'electrical',
    items: [
      micro('elec-switch', 'Switch Replacement', 'Replace faulty switches', '20–30 min', fixed(99), '/illustrations/micro-3d/elec-switch.png'),
      micro('elec-socket', 'Socket Replacement', 'Replace faulty sockets', '20–30 min', fixed(99), '/illustrations/micro-3d/elec-socket.png'),
      micro('elec-fan-install', 'Fan Installation', 'Ceiling fan installation', '30–45 min', fixed(149), '/illustrations/micro-3d/elec-fan-install.png'),
      micro('elec-fan-repair', 'Fan Repair', 'Fan repair and servicing', '30–60 min', fixed(199), '/illustrations/micro-3d/elec-fan-repair.png'),
      micro('elec-light', 'Light Installation', 'Lights and fixture mounting', '20–40 min', fixed(129), '/illustrations/micro-3d/elec-light.png'),
      micro('elec-mcb', 'MCB Repair', 'MCB tripping resolution', '30–60 min', fixed(199), '/illustrations/micro-3d/elec-mcb.png'),
      micro('elec-doorbell', 'Doorbell Installation', 'Doorbell fitting and wiring', '20–30 min', fixed(149), '/illustrations/micro-3d/elec-doorbell.png'),
    ],
  },
  'ac-appliances': {
    id: 'ac-appliances', name: 'AC & Appliances', tagline: 'Service, repair and installation.',
    blurb: 'Appliance experts delivered at your selected time.',
    illustration: 'ac-appliances',
    items: [
      micro('ac-inspection', 'AC Inspection', 'Complete AC health check', '30–45 min', fixed(299), '/illustrations/micro-3d/ac-inspection.png'),
      micro('ac-basic', 'AC Basic Service', 'Filters, coils and cooling check', '45–60 min', fixed(449), '/illustrations/micro-3d/ac-basic.png'),
      micro('ac-foam', 'AC Foam/Jet Service', 'High-pressure foam jet cleaning', '60 min', fixed(599), '/illustrations/micro-3d/ac-foam.png'),
      micro('ac-deep', 'AC Deep Cleaning', 'Intensive indoor + outdoor cleaning', '60–90 min', fixed(949), '/illustrations/micro-3d/ac-deep.png'),
      micro('ac-install', 'AC Installation', 'Split/window AC installation', '90–120 min', fixed(1699), '/illustrations/micro-3d/ac-install.png'),
      micro('ac-uninstall', 'AC Uninstallation', 'Safe AC removal', '45–60 min', fixed(699), '/illustrations/micro-3d/ac-uninstall.png'),
      micro('ac-fridge', 'Refrigerator Inspection', 'Fridge cooling and health check', '30–45 min', fixed(299), '/illustrations/micro-3d/ac-fridge.png'),
      micro('ac-wm', 'Washing Machine Inspection', 'Washer diagnosis and check', '30–45 min', fixed(299), '/illustrations/micro-3d/ac-wm.png'),
    ],
  },
  carpentry: {
    id: 'carpentry', name: 'Carpentry', tagline: 'Repair, assembly and woodwork.',
    blurb: 'Skilled carpenters delivered at your selected time.',
    illustration: 'carpentry',
    items: [
      micro('carp-furniture', 'Furniture Repair', 'Repair of wooden furniture', '60–90 min', fixed(199), '/illustrations/micro-3d/carp-furniture.png'),
      micro('carp-door', 'Door Repair', 'Door alignment and fixes', '45–60 min', fixed(199), '/illustrations/micro-3d/carp-door.png'),
      micro('carp-shelf', 'Shelf Installation', 'Wall shelf mounting', '30–45 min', fixed(149), '/illustrations/micro-3d/carp-shelf.png'),
      micro('carp-drawer', 'Drawer Repair', 'Drawer channel and alignment fix', '30–45 min', fixed(149), '/illustrations/micro-3d/carp-drawer.png'),
      micro('carp-chair', 'Chair/Table Repair', 'Chair and table fixes', '30–60 min', fixed(149), '/illustrations/micro-3d/carp-chair.png'),
      micro('carp-single-bed', 'Single Bed Assembly', 'Single bed assembly', '60–90 min', fixed(499), '/illustrations/micro-3d/carp-single-bed.png'),
      micro('carp-double-bed', 'Double Bed Assembly', 'Double bed assembly', '90–120 min', fixed(699), '/illustrations/micro-3d/carp-double-bed.png'),
      micro('carp-wardrobe', 'Wardrobe Assembly', 'Wardrobe assembly and fitting', '2–3 hours', fixed(999), '/illustrations/micro-3d/carp-wardrobe.png'),
    ],
  },
  painting: {
    id: 'painting', name: 'Painting', tagline: 'Walls, rooms and full homes.',
    blurb: 'Professional painters with site visit and quote confirmation.',
    illustration: 'painting',
    items: [
      micro('paint-single-wall', 'Single Wall', 'Accent wall painting', '1 day', starting(1499), '/illustrations/micro-3d/paint-single-wall.png'),
      micro('paint-small-room', 'Small Room', 'Complete small room painting', '1–2 days', starting(3499), '/illustrations/micro-3d/paint-small-room.png'),
      micro('paint-bedroom', 'Bedroom Painting', 'Full bedroom painting', '1–2 days', starting(5999), '/illustrations/micro-3d/paint-bedroom.png'),
      micro('paint-living', 'Living Room', 'Living room painting', '2 days', starting(7499), '/illustrations/micro-3d/paint-living.png'),
      micro('paint-kitchen', 'Kitchen Painting', 'Kitchen wall painting', '1 day', starting(3499), '/illustrations/micro-3d/paint-kitchen.png'),
      micro('paint-bathroom', 'Bathroom Painting', 'Bathroom wall treatment', '1 day', starting(2499), '/illustrations/micro-3d/paint-bathroom.png'),
      micro('paint-2room', '2 Room Package', 'Two-room painting package', '2–3 days', starting(9999), '/illustrations/micro-3d/paint-2room.png'),
      micro('paint-fullhome', 'Full Home Painting', 'Complete home painting', '3–5 days', starting(18999), '/illustrations/micro-3d/paint-fullhome.png'),
    ],
  },
  gardening: {
    id: 'gardening', name: 'Gardening', tagline: 'Plants, lawns and balconies.',
    blurb: 'Garden experts delivered at your selected time.',
    illustration: 'gardening',
    items: [
      micro('gard-visit', 'Plant Care Visit', 'Plant health check and care', '45–60 min', fixed(399), '/illustrations/micro-3d/gard-visit.png'),
      micro('gard-balcony', 'Balcony Garden Cleanup', 'Balcony cleanup and setup', '60–90 min', fixed(499), '/illustrations/micro-3d/gard-balcony.png'),
      micro('gard-prune', 'Pruning & Trimming', 'Plant pruning and shaping', '60 min', fixed(499), '/illustrations/micro-3d/gard-prune.png'),
      micro('gard-lawn', 'Lawn Maintenance', 'Mowing and lawn care', '90 min', fixed(699), '/illustrations/micro-3d/gard-lawn.png'),
      micro('gard-cleanup', 'Garden Cleanup', 'Full garden cleanup', '2 hours', fixed(799), '/illustrations/micro-3d/gard-cleanup.png'),
    ],
  },
  'home-chef': {
    id: 'home-chef', name: 'Home Chef', tagline: 'Daily meals and prep.',
    blurb: 'Home chefs for fresh, hygienic meals.',
    illustration: 'home-chef',
    items: [
      micro('chef-2p', 'Basic Meal — 2 People', 'Fresh meal for two', '90 min', fixed(499), '/illustrations/micro-3d/chef-2p.png'),
      micro('chef-4p', 'Basic Meal — 4 People', 'Fresh meal for four', '2 hours', fixed(799), '/illustrations/micro-3d/chef-4p.png'),
      micro('chef-family', 'Family Meal — 4–6 People', 'Family meal session', '2 hours', fixed(999), '/illustrations/micro-3d/chef-family.png'),
      micro('chef-diet', 'Special Diet Meal Prep', 'Diet-specific meal prep', '2 hours', fixed(899), '/illustrations/micro-3d/chef-diet.png'),
      micro('chef-weekly', 'Weekly Meal Prep', 'Batch prep for the week', '3–4 hours', fixed(2499), '/illustrations/micro-3d/chef-weekly.png'),
    ],
  },
  'elder-care': {
    id: 'elder-care', name: 'Elder Care', tagline: 'Assistance and companionship.',
    blurb: 'Trained elder-care support at your home.',
    illustration: 'elder-care',
    items: [
      micro('elder-1h', '1-Hour Assistance', 'Help with daily tasks', '1 hour', fixed(399), '/illustrations/micro-3d/elder-1h.png'),
      micro('elder-2h', '2-Hour Assistance', 'Extended support visit', '2 hours', fixed(699), '/illustrations/micro-3d/elder-2h.png'),
      micro('elder-4h', '4-Hour Companion Care', 'Half-day companionship', '4 hours', fixed(1199), '/illustrations/micro-3d/elder-4h.png'),
      micro('elder-daily', 'Daily Companion Visit', 'Routine daily visit', '60–90 min', fixed(499), '/illustrations/micro-3d/elder-daily.png'),
    ],
  },
  'child-care': {
    id: 'child-care', name: 'Child Care', tagline: 'Safe, reliable childcare.',
    blurb: 'Verified childcare support at your home.',
    illustration: 'child-care',
    items: [
      micro('child-2h', '2-Hour Child Care', 'Short childcare session', '2 hours', fixed(699), '/illustrations/micro-3d/child-2h.png'),
      micro('child-4h', '4-Hour Child Care', 'Half-day childcare', '4 hours', fixed(1199), '/illustrations/micro-3d/child-4h.png'),
      micro('child-evening', 'Evening Child Care', 'Evening supervision', '3 hours', fixed(799), '/illustrations/micro-3d/child-evening.png'),
      micro('child-weekend', 'Weekend Care', 'Weekend childcare session', '4 hours', fixed(999), '/illustrations/micro-3d/child-weekend.png'),
    ],
  },
  drivers: {
    id: 'drivers', name: 'Drivers', tagline: 'Local and airport trips.',
    blurb: 'Verified drivers on your schedule.',
    illustration: 'drivers',
    items: [
      micro('drv-2h', 'Local Driver — 2 Hours', 'City driving for 2 hours', '2 hours', fixed(499), '/illustrations/micro-3d/drv-2h.png'),
      micro('drv-4h', 'Local Driver — 4 Hours', 'City driving for 4 hours', '4 hours', fixed(899), '/illustrations/micro-3d/drv-4h.png'),
      micro('drv-8h', 'Local Driver — 8 Hours', 'Full-day city driving', '8 hours', fixed(1499), '/illustrations/micro-3d/drv-8h.png'),
      micro('drv-airport', 'Airport Drop', 'One-way airport transfer', 'Varies', starting(699), '/illustrations/micro-3d/drv-airport.png'),
    ],
  },
  'home-nursing': {
    id: 'home-nursing', name: 'Home Nursing', tagline: 'Care visits and support.',
    blurb: 'Trained home-care assistance.',
    illustration: 'home-nursing',
    items: [
      micro('nurse-basic', 'Basic Home-Care Visit', 'Routine home-care check', '60 min', fixed(599), '/illustrations/micro-3d/nurse-basic.png'),
      micro('nurse-elder', 'Elder Assistance Visit', 'Elder home-care visit', '60–90 min', fixed(599), '/illustrations/micro-3d/nurse-elder.png'),
      micro('nurse-postsurgery', 'Post-Surgery Support Visit', 'Recovery support visit', '90 min', fixed(799), '/illustrations/micro-3d/nurse-postsurgery.png'),
      micro('nurse-4h', '4-Hour Care Session', 'Half-day care session', '4 hours', fixed(1499), '/illustrations/micro-3d/nurse-4h.png'),
      micro('nurse-8h', '8-Hour Care Session', 'Full-day care session', '8 hours', fixed(2499), '/illustrations/micro-3d/nurse-8h.png'),
    ],
  },
  'pest-control': {
    id: 'pest-control', name: 'Pest Control', tagline: 'Safe, targeted treatments.',
    blurb: 'Eco-safe pest treatments for your home.',
    illustration: 'pest-control',
    items: [
      micro('pest-cockroach', 'Cockroach Treatment', 'Targeted cockroach control', '45–60 min', fixed(499), '/illustrations/micro-3d/pest-cockroach.png'),
      micro('pest-mosquito', 'Mosquito Treatment', 'Mosquito control treatment', '45 min', fixed(599), '/illustrations/micro-3d/pest-mosquito.png'),
      micro('pest-ant', 'Ant Treatment', 'Ant trail treatment', '30–45 min', fixed(399), '/illustrations/micro-3d/pest-ant.png'),
      micro('pest-bedbug', 'Bed Bug Treatment', 'Intensive bed-bug treatment', '60–90 min', fixed(899), '/illustrations/micro-3d/pest-bedbug.png'),
      micro('pest-general', 'General Pest Treatment', 'Whole-home general treatment', '60 min', fixed(699), '/illustrations/micro-3d/pest-general.png'),
      micro('pest-termite-insp', 'Termite Inspection', 'Termite survey visit', '30–45 min', fixed(399), '/illustrations/micro-3d/pest-termite-insp.png'),
      micro('pest-termite', 'Termite Treatment', 'Full termite treatment', '2–3 hours', starting(1999), '/illustrations/micro-3d/pest-termite.png'),
    ],
  },
  moving: {
    id: 'moving', name: 'Moving & Heavy Lifting', tagline: 'Shifting made simple.',
    blurb: 'Trained helpers with equipment.',
    illustration: 'moving',
    items: [
      micro('move-single', 'Single Item Moving', 'Move one heavy item', '60 min', fixed(399), '/illustrations/micro-3d/move-single.png'),
      micro('move-furniture', 'Furniture Moving', 'Furniture shifting help', '90 min', fixed(599), '/illustrations/micro-3d/move-furniture.png'),
      micro('move-2item', '2-Item Move', 'Two-item move', '90 min', fixed(799), '/illustrations/micro-3d/move-2item.png'),
      micro('move-room', 'Small Room Shifting', 'Single room shifting', '2–3 hours', fixed(1499), '/illustrations/micro-3d/move-room.png'),
      micro('move-1bhk', '1BHK Assistance', '1BHK shifting crew', '3–4 hours', fixed(2499), '/illustrations/micro-3d/move-1bhk.png'),
      micro('move-2bhk', '2BHK Assistance', '2BHK shifting crew', '4–6 hours', fixed(3999), '/illustrations/micro-3d/move-2bhk.png'),
    ],
  },
  'community-services': {
    id: 'community-services', name: 'Community Services', tagline: 'Society-scale operations.',
    blurb: 'Managed cooperative teams for societies and events.',
    illustration: 'community-services',
    items: [
      micro('comm-area', 'Society Common Area Cleaning', 'Clubhouse, lobby and stairwell cleaning', '4 hours', starting(1499), '/illustrations/micro-3d/comm-area.png'),
      micro('comm-tank', 'Water Tank Cleaning', 'Overhead tank cleaning', '3–4 hours', fixed(999), '/illustrations/micro-3d/comm-tank.png'),
      micro('comm-sump', 'Sump Cleaning', 'Sump de-sludging and wash', '3 hours', fixed(799), '/illustrations/micro-3d/comm-sump.png'),
      micro('comm-sanitize', 'Society Sanitization', 'Common-area sanitization drive', '4 hours', fixed(1499), '/illustrations/micro-3d/comm-sanitize.png'),
      micro('comm-electrical', 'Event Electrical Setup', 'Temporary event power setup', 'Flexible', fixed(999), '/illustrations/micro-3d/comm-electrical.png'),
      micro('comm-sound', 'Event Sound Setup', 'Event sound setup and support', 'Flexible', fixed(1499), '/illustrations/micro-3d/comm-sound.png'),
      micro('comm-maint', 'Community Maintenance Visit', 'General maintenance visit', '2 hours', fixed(799), '/illustrations/micro-3d/comm-maint.png'),
      micro('comm-large', 'Large Society Work', 'Custom scope — site visit and quote', 'Site visit', quote(), '/illustrations/micro-3d/comm-large.png'),
    ],
  },
};

export const CATALOG_CATEGORY_IDS = Object.keys(SERVICE_CATALOG);

export const getCategoryById = (id) => SERVICE_CATALOG[id] || null;

export const getAllMicroServices = () => {
  const out = [];
  for (const cat of Object.values(SERVICE_CATALOG)) {
    for (const item of cat.items) out.push({ ...item, categoryId: cat.id, categoryName: cat.name });
  }
  return out;
};

export const getMicroServiceById = (id) => {
  for (const cat of Object.values(SERVICE_CATALOG)) {
    const found = cat.items.find((i) => i.id === id);
    if (found) return { ...found, categoryId: cat.id, categoryName: cat.name };
  }
  return null;
};

export const formatPrice = (price) => {
  if (!price) return '';
  if (price.kind === 'quote') return 'Request Quote';
  if (price.kind === 'starting') return `Starting ₹${price.amount.toLocaleString('en-IN')}`;
  return `₹${price.amount.toLocaleString('en-IN')}`;
};

export const isPayableItem = (item) => item && item.price && item.price.kind !== 'quote' && item.price.amount > 0;

// Map legacy / natural-language service names to a catalog category.
// Used so DIRECT category clicks route to the catalog and never invoke Semantic AI.
const LEGACY_NAME_MAP = [
  ['full home deep cleaning', 'cleaning'], ['home cleaning', 'cleaning'], ['house cleaning', 'cleaning'],
  ['plumbing repair', 'plumbing'], ['leakage fix', 'plumbing'], ['plumbing', 'plumbing'],
  ['electrical repair', 'electrical'], ['wiring', 'electrical'], ['electrical', 'electrical'],
  ['carpentry', 'carpentry'], ['furniture assembly', 'carpentry'],
  ['ac deep foam', 'ac-appliances'], ['ac ', 'ac-appliances'], ['appliance repair', 'ac-appliances'],
  ['refrigerator', 'ac-appliances'], ['washing machine', 'ac-appliances'],
  ['wall painting', 'painting'], ['waterproofing', 'painting'], ['painting', 'painting'],
  ['gardening', 'gardening'], ['balcony greenery', 'gardening'],
  ['home chef', 'home-chef'], ['meal preparation', 'home-chef'],
  ['elder assistance', 'elder-care'], ['elder care', 'elder-care'], ['companionship', 'elder-care'],
  ['child care', 'child-care'], ['babysitting', 'child-care'],
  ['driver', 'drivers'], ['transport support', 'drivers'],
  ['home nursing', 'home-nursing'], ['health support', 'home-nursing'],
  ['pest control', 'pest-control'], ['termite', 'pest-control'],
  ['moving', 'moving'], ['heavy lifting', 'moving'], ['shifting', 'moving'],
  ['society common area', 'community-services'], ['water sump', 'community-services'],
  ['overhead tank', 'community-services'], ['community event', 'community-services'],
  ['community', 'community-services'], ['sanitization', 'community-services'],
];

export const findCategoryForServiceName = (name) => {
  if (!name || typeof name !== 'string') return null;
  const q = name.toLowerCase().trim();
  for (const [key, catId] of LEGACY_NAME_MAP) {
    if (q.includes(key)) return SERVICE_CATALOG[catId] || null;
  }
  for (const cat of Object.values(SERVICE_CATALOG)) {
    if (q.includes(cat.name.toLowerCase()) || cat.name.toLowerCase().includes(q)) return cat;
  }
  return null;
};

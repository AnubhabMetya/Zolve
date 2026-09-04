// ====================================================================
// ZOLVE SEMANTIC SERVICE MATCHING — Feature 1
// Lightweight client-side embedding (TF-IDF + cosine) — no API keys
// Provider embeddings are precomputed once and reused.
// Upgrade path: Supabase pgvector + server-side SentenceTransformers via Edge Function
// ====================================================================

import { SERVICE_CATEGORIES, INITIAL_PROVIDERS } from '../data/mockData.js';
import { haversineKm, SERVICE_RADIUS_KM } from './locationService.js';

// --- Stopwords (compact) ---
const STOPWORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being','am','my','your','our','its','of','for','in','on','at','to','with','and','or','but','so','if','then','that','this','these','those','it','as','by','from','has','have','had','do','does','did','will','would','can','could','should','not','no','yes','i','we','you','he','she','they','me','him','her','us','them','what','which','who','whom','when','where','why','how','very','just','about','into','over','under','up','down','out','again','further','once','here','there','all','any','both','each','few','more','most','other','some','such','only','own','same','than','too','s','t','d','ll','m','o','y'
]);

// Synonym expansion groups — injecting canonical __*__ tokens improves semantic recall
// Each group lists phrases/words that map to a canonical semantic token.
// FIX: split broad appliance group into dedicated tokens so washing-machine/refrigerator/microwave
// never collapse to AC label. Keep AC group strictly AC-related.
const SEMANTIC_GROUPS = [
  { token: '__plumbing__', terms: ['plumb','plumbing','leak','leaking','leakage','drip','dripping','tap','faucet','pipe','pipeline','drain','clog','clogged','sink','toilet','flush','cistern','valve','water','pressure','pump','seepage','damp','water pressure','bathroom tap','kitchen sink'] },
  { token: '__electrical__', terms: ['electrical','electric','electrician','spark','sparking','mcb','trip','tripping','switch','switchboard','wiring','wire','light','fan','socket','meter','inverter','short circuit','short-circuit','shock'] },
  { token: '__cleaning__', terms: ['clean','cleaning','dust','dusty','maid','sanitize','sanitization','scrub','deep clean','deep cleaning','grease','sofa','mop','sweep','housekeeping','hygiene'] },
  { token: '__ac__', terms: ['ac','air conditioner','air-conditioner','air conditioning','aircon','ac repair','ac servicing','foam jet','cooling','not cooling','warm air','blowing warm','compressor','refrigerant','r32','gas charging','hvac','ac deep foam jet'] },
  { token: '__washing_machine__', terms: ['washing machine','washer','washing-machine','laundry machine','drum','spin cycle','top load','front load','washing machine motor','washing machine drum','vibration','strange noise','making noise'] },
  { token: '__refrigerator__', terms: ['refrigerator','fridge','freezer','double door','fridge cooling','refrigerator cooling','fridge not cooling','refrigerator not cooling','deep freezer'] },
  { token: '__microwave__', terms: ['microwave','microwave oven','magnetron','not heating','heating issue','microwave not heating','oven not heating'] },
  { token: '__appliance_generic__', terms: ['appliance','appliance repair','home appliance','electronics appliance'] },
  { token: '__car_washing__', terms: ['car washing','car wash','car cleaning'] },
  { token: '__carpentry__', terms: ['carpenter','carpentry','wood','wooden','door','lock','cupboard','wardrobe','hinge','furniture','drill','shelf','shelving','polish','modular','handle'] },
  { token: '__painting__', terms: ['paint','painting','wall','waterproofing','damp','putty','primer','colour','color','exterior','interior'] },
  { token: '__gardening__', terms: ['garden','gardening','balcony','plant','plants','pruning','soil','greenery','terrace garden','flower'] },
  { token: '__pest__', terms: ['pest','pest control','cockroach','termite','ants','bed bug','mosquito','insect','spray','treatment'] },
  { token: '__cooking__', terms: ['cook','cooking','chef','meal','meals','food','dinner','lunch','diet','party','kitchen','cuisine'] },
  { token: '__elder__', terms: ['elder','senior','elderly','parent','hospital','medicine','companionship','caregiver','assist','assistance','walk'] },
  { token: '__moving__', terms: ['shift','shifting','move','moving','relocate','relocation','heavy','carton','box','lift','lifting','pack','packaging'] },
  { token: '__community__', terms: ['society','apartment','building','tank','sump','overhead tank','clubhouse','common area','gym','lobby','event','community','residential'] },
];

// Pre-index: term -> token for fast lookup (normalize terms)
const TERM_TO_TOKEN = new Map();
for (const g of SEMANTIC_GROUPS) {
  for (const t of g.terms) {
    TERM_TO_TOKEN.set(t.toLowerCase(), g.token);
  }
}

// --- Text normalization ---
function normalizeText(text) {
  return (text || '').toLowerCase();
}

function tokenizeWithExpansion(text) {
  const raw = normalizeText(text);
  // Preserve multi-word terms first — replace with underscored single token before splitting
  let expanded = raw;
  // Replace multi-word terms with underscored version to keep as single token
  const multiWord = [];
  for (const g of SEMANTIC_GROUPS) {
    for (const term of g.terms) {
      if (term.includes(' ')) multiWord.push({ term: term.toLowerCase(), token: g.token });
    }
  }
  // Sort by length descending so longer phrases match first
  multiWord.sort((a,b)=> b.term.length - a.term.length);
  for (const { term, token } of multiWord) {
    if (expanded.includes(term)) {
      // inject canonical token alongside
      expanded = expanded.split(term).join(` ${term.replace(/\s+/g,'_')} ${token} `);
    }
  }
  // Split on non-alphanumeric (keep _)
  const tokens = expanded.split(/[^a-z0-9_]+/).filter(Boolean);
  const result = [];
  for (const tok of tokens) {
    const clean = tok.replace(/_/g,' ').trim() ? tok : tok; // keep underscore tokens for multi-word
    // also expand single-word synonyms to canonical token
    // map sanitized tok (with spaces restored? but single words have no space)
    const lookupKey = tok.replace(/_/g,' ');
    const canonical = TERM_TO_TOKEN.get(lookupKey) || TERM_TO_TOKEN.get(tok);
    if (STOPWORDS.has(tok) || STOPWORDS.has(lookupKey)) {
      // still inject canonical if it exists — stopword like 'water' is not stopword now
      if (canonical) result.push(canonical);
      continue;
    }
    // Include original token if not stopword
    if (tok.length > 1) result.push(tok);
    if (canonical && canonical !== tok) result.push(canonical);
    // Also map plural/synonym variants: leaking -> leak etc handled via group injection; keep as is for TF
  }
  // Also detect single-word synonyms that were split: e.g., 'leaking' should inject plumbing
  // We already injected via per-token canonical check above
  return result.filter(Boolean);
}

// --- Corpus building ---
// Augment service text with appliance synonyms so appliance queries map to the single Appliance Repair service (srv-ac-01)
// but display layer will override label to Washing Machine / Refrigerator / Microwave variants.
const SERVICE_AUGMENT = {
  'srv-ac-01': 'appliance repair home appliance washing machine washer laundry drum vibration strange noise refrigerator fridge freezer microwave magnetron oven not heating R32 gas cooling compressor air conditioner ac servicing',
  'srv-plumb-01': 'tap faucet pipe drain leak sink toilet flush cistern',
  'srv-elec-01': 'mcb switch wiring electrical spark trip light fan',
  'srv-clean-01': 'cleaning dust sanitize deep clean grease',
  'srv-carp-01': 'carpentry wood door wardrobe furniture',
};

function buildServiceCorpus() {
  const docs = [];
  for (const cat of SERVICE_CATEGORIES) {
    for (const srv of cat.services) {
      const augment = SERVICE_AUGMENT[srv.id] || '';
      const text = [srv.name, srv.category, srv.subcategory, srv.description, augment].join(' ');
      docs.push({ id: srv.id, name: srv.name, category: cat.name, subcategory: srv.subcategory, description: srv.description, basePrice: srv.basePrice, text });
    }
  }
  return docs;
}

function buildProviderCorpus(providers = INITIAL_PROVIDERS) {
  return providers.map(p => {
    const text = [
      p.serviceCategories?.join(' ') || '',
      p.skills?.join(' ') || '',
      p.title || '',
      p.bio || '',
      p.experienceYears ? `${p.experienceYears} years experience` : '',
      p.name || ''
    ].join(' ');
    return { id: p.id, provider: p, text };
  });
}

// --- Vocabulary & IDF (computed once) ---
let _vocab = null; // sorted unique tokens
let _vocabIndex = null; // token -> index
let _idf = null; // Float64Array
let _serviceDocs = null;
let _serviceVectors = null; // array of Float32Array normalized
let _providerDocs = null;
let _providerVectors = null;
let _providerIdToIdx = null;
let _initialized = false;

function ensureInitialized() {
  if (_initialized) return;
  _serviceDocs = buildServiceCorpus();
  _providerDocs = buildProviderCorpus(INITIAL_PROVIDERS);

  const allTexts = [..._serviceDocs.map(d=>d.text), ..._providerDocs.map(d=>d.text)];
  const docTokenSets = allTexts.map(t => new Set(tokenizeWithExpansion(t)));
  // Collect vocab
  const vocabSet = new Set();
  for (const s of docTokenSets) for (const tok of s) vocabSet.add(tok);
  // Also include query-time tokens that are canonical group tokens even if not in docs (ensure coverage)
  for (const g of SEMANTIC_GROUPS) vocabSet.add(g.token);
  _vocab = Array.from(vocabSet).sort();
  _vocabIndex = new Map(_vocab.map((t,i)=>[t,i]));
  const N = docTokenSets.length;
  _idf = new Float64Array(_vocab.length);
  for (let i=0;i<_vocab.length;i++) {
    const tok = _vocab[i];
    let df = 0;
    for (const s of docTokenSets) if (s.has(tok)) df++;
    // Smoothed IDF
    _idf[i] = Math.log((N + 1) / (df + 1)) + 1;
  }
  // Precompute vectors
  _serviceVectors = _serviceDocs.map(d => textToVectorNormalized(d.text));
  _providerVectors = _providerDocs.map(d => textToVectorNormalized(d.text));
  _providerIdToIdx = new Map(_providerDocs.map((d,i)=>[d.id,i]));
  _initialized = true;
}

function textToVectorNormalized(text) {
  if (!_vocabIndex) ensureInitialized();
  const vec = new Float32Array(_vocab.length);
  const tokens = tokenizeWithExpansion(text);
  if (!tokens.length) return vec;
  const tf = new Map();
  for (const tok of tokens) {
    const idx = _vocabIndex.get(tok);
    if (idx == null) continue;
    tf.set(idx, (tf.get(idx)||0)+1);
  }
  // TF-IDF
  let sumSq = 0;
  for (const [idx, count] of tf) {
    // sublinear TF: 1 + log(count)
    const tfVal = 1 + Math.log(count);
    const val = tfVal * _idf[idx];
    vec[idx] = val;
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq) || 1;
  for (let i=0;i<vec.length;i++) if (vec[i]!==0) vec[i] /= norm;
  return vec;
}

function cosineSimilarity(a, b) {
  let dot = 0;
  // Both normalized => dot is cosine
  // Optimized: iterate non-zero would be faster, but dense small vocab is fine ( ~ few hundred)
  for (let i=0;i<a.length;i++) dot += a[i]*b[i];
  return dot;
}

// Generic display name mapping for appliance sub-types — never show AC-specific name for washing-machine queries
// Preserves internal id/category (srv-ac-01 / Appliance Repair) for booking compatibility.
function getApplianceDisplayOverride(query, topDoc) {
  const q = (query || '').toLowerCase();
  const isApplianceService = topDoc && (topDoc.id === 'srv-ac-01' || topDoc.subcategory === 'Appliance Repair');
  if (!isApplianceService) return null;
  const hasWashing = /\b(washing machine|washer|washing|laundry|drum|spin)\b/.test(q);
  const hasRefrigerator = /\b(refrigerator|fridge|freezer)\b/.test(q);
  const hasMicrowave = /\b(microwave|magnetron)\b/.test(q) || (q.includes('oven') && q.includes('heating'));
  const hasAC = /\b(ac\b|air conditioner|air-conditioner|air conditioning|aircon)\b/.test(q);
  // Priority: specific appliance type wins over generic AC
  if (hasWashing) return { name: 'Washing Machine / Appliance Repair', subcategory: 'Appliance Repair', description: 'Washing machine drum, motor, vibration and noise repair — appliance specialist service.' };
  if (hasRefrigerator) return { name: 'Refrigerator / Appliance Repair', subcategory: 'Appliance Repair', description: 'Refrigerator cooling, compressor and gas servicing — appliance specialist.' };
  if (hasMicrowave) return { name: 'Microwave / Appliance Repair', subcategory: 'Appliance Repair', description: 'Microwave magnetron and heating repair — appliance specialist.' };
  if (hasAC) return { name: 'AC Repair / AC Servicing', subcategory: 'Appliance Repair', description: topDoc.description };
  // If query is appliance-generic but no specific sub-type, keep generic appliance label
  if (/\b(appliance)\b/.test(q)) return { name: 'Appliance Repair', subcategory: 'Appliance Repair', description: topDoc.description };
  return null;
}

// Build related skills for a service result
function buildRelatedSkills(serviceDoc, providers) {
  const related = new Set();
  // subcategory + service name tokens
  related.add(serviceDoc.subcategory);
  related.add(serviceDoc.name);
  // collect provider skills that overlap high-scoring providers for that service category
  const catLower = serviceDoc.subcategory.toLowerCase();
  for (const p of providers.slice(0,5)) {
    for (const sk of (p.skills||[])) {
      if (sk.toLowerCase().includes(catLower.split(' ')[0]) || catLower.includes(sk.toLowerCase().split(' ')[0])) {
        related.add(sk);
      }
    }
  }
  return Array.from(related).slice(0,6);
}

/**
 * Main semantic match entrypoint.
 * @param {string} query - customer natural language description
 * @param {Array} providersOverride - optional providers list (defaults to INITIAL)
 * @returns {object} { query, detectedService, confidence, relatedSkills, topProviders, allServiceScores, allProviderScores, isLowConfidence, fallbackReason }
 */
export function semanticMatch(query, providersOverride = null, customerLocation = null) {
  ensureInitialized();
  let providers = providersOverride || INITIAL_PROVIDERS;
  // CITY hard filter + 50km distance hard constraint (Feature: geo filter before semantic ranking)
  // Use coordinates as final truth; city labels are display only. Gurugram/Delhi/Noida within 50km are mutually eligible.
  if (customerLocation && customerLocation.lat != null && customerLocation.lng != null) {
    const filtered = providers.filter(p => {
      if (!p.coords || p.coords.lat == null || p.coords.lng == null) return false;
      const d = haversineKm(customerLocation.lat, customerLocation.lng, p.coords.lat, p.coords.lng);
      return d <= SERVICE_RADIUS_KM;
    });
    // Do NOT pad with distant providers; if filtered has 0, keep empty (will trigger low relevance)
    providers = filtered;
  }
  // Rebuild provider vectors if custom provider set differs in length/ids or geo-filtered
  let providerDocs = _providerDocs;
  let providerVectors = _providerVectors;
  if (providers !== INITIAL_PROVIDERS || providers.length !== _providerDocs.length) {
    // Recompute for this call (still cached per vocab)
    providerDocs = buildProviderCorpus(providers);
    providerVectors = providerDocs.map(d => textToVectorNormalized(d.text));
  }

  const q = (query || '').trim();
  if (!q) {
    return {
      query: q,
      detectedService: null,
      confidence: 0,
      relatedSkills: [],
      topProviders: [],
      allServiceScores: [],
      allProviderScores: [],
      isLowConfidence: true,
      fallbackReason: 'empty_query'
    };
  }
  if (q.length < 3) {
    return { query: q, detectedService: null, confidence: 0, relatedSkills: [], topProviders: [], allServiceScores: [], allProviderScores: [], isLowConfidence: true, fallbackReason: 'too_short' };
  }

  const qVec = textToVectorNormalized(q);
  const qNorm = Math.hypot(...qVec);
  if (qNorm < 0.001) {
    return { query: q, detectedService: null, confidence: 0, relatedSkills: [], topProviders: [], allServiceScores: [], allProviderScores: [], isLowConfidence: true, fallbackReason: 'no_tokens' };
  }

  // Score services
  const serviceScores = _serviceDocs.map((doc, i) => {
    const score = cosineSimilarity(qVec, _serviceVectors[i]);
    return { doc, score, service: doc };
  }).sort((a,b)=> b.score - a.score);

  const topService = serviceScores[0];
  const confidence = topService ? topService.score : 0; // 0-1 cosine

  // Low confidence threshold — tuned so unrelated like "I want to order pizza" is low
  const LOW_THRESHOLD = 0.12;
  const isLow = confidence < LOW_THRESHOLD;

  // Display confidence scaled for UI (cosine 0.35 -> ~90%, 0.13 -> ~45%) — keeps raw for logic, scaled for display
  const scaleConfidence = (raw) => Math.round(Math.min(96, Math.max(12, raw * 180 + 28)));
  const confidencePercent = scaleConfidence(confidence);

  // Score providers
  const providerScores = providerDocs.map((pd, i) => {
    const s = cosineSimilarity(qVec, providerVectors[i]);
    // Blend with lightweight rating boost (5%) — no fairness/workload yet
    const provider = pd.provider;
    const ratingBoost = (provider.rating ? (provider.rating - 4.5) * 0.02 : 0); // up to ~0.01
    const blended = s + ratingBoost;
    return { provider, score: s, blended, doc: pd };
  }).sort((a,b)=> b.blended - a.blended);

  const topProviders = providerScores.slice(0,15).map(p => ({
    provider: p.provider,
    score: Math.max(0, Math.min(1, p.score)),
    confidence: scaleConfidence(p.score),
    rawScore: p.score,
    matchedSkills: p.provider.skills?.slice(0,3) || []
  }));

  // Related skills from top service
  let relatedSkills = [];
  if (topService) {
    relatedSkills = buildRelatedSkills(topService.doc, topProviders.map(tp=>tp.provider));
  }

  // Display-name override for appliance queries (generic label, preserves internal id for booking)
  let displayService = null;
  let displayOverride = null;
  if (topService) {
    displayOverride = getApplianceDisplayOverride(q, topService.doc);
    if (displayOverride) {
      displayService = {
        id: topService.doc.id,
        name: displayOverride.name,
        category: topService.doc.category,
        subcategory: displayOverride.subcategory,
        description: displayOverride.description,
        basePrice: topService.doc.basePrice,
        _internalName: topService.doc.name,
        _internalId: topService.doc.id
      };
    } else {
      // For AC queries that hit Appliance Repair via TF-IDF but contain no explicit AC token,
      // still normalize to AC Repair if the raw query is AC cooling without appliance keywords
      // (already handled above via hasAC). Otherwise keep original.
      displayService = {
        id: topService.doc.id,
        name: topService.doc.name,
        category: topService.doc.category,
        subcategory: topService.doc.subcategory,
        description: topService.doc.description,
        basePrice: topService.doc.basePrice
      };
      // Normalize AC display for AC cooling queries that didn't trigger hasAC due to implicit cooling
      // If top is Appliance Repair and query is cooling-related but not washing/refrigerator/microwave, map to AC
      const qLower = q.toLowerCase();
      const isCoolingQuery = qLower.includes('cooling') || qLower.includes('warm air') || qLower.includes('not cooling') || qLower.includes('ac');
      const isSpecificAppliance = /\b(washing|washer|laundry|refrigerator|fridge|freezer|microwave|magnetron)\b/.test(qLower);
      if (displayService.id === 'srv-ac-01' && isCoolingQuery && !isSpecificAppliance && displayService.name === 'AC Deep Foam Jet Servicing') {
        // Keep internal mapping but present generic AC label for user-facing consistency
        displayService.name = 'AC Repair / AC Servicing';
      }
    }
  }

  // Also map allServiceScores display names through same override for the top entry (keeps list consistent)
  const mappedAllScores = serviceScores.slice(0,6).map(s=> {
    const ov = getApplianceDisplayOverride(q, s.doc);
    let displayName = s.doc.name;
    if (ov) displayName = ov.name;
    else if (s.doc.id === 'srv-ac-01' && s.doc.name === 'AC Deep Foam Jet Servicing') {
      const qLower2 = q.toLowerCase();
      const isCooling2 = qLower2.includes('cooling') || qLower2.includes('warm air') || qLower2.includes('not cooling') || qLower2.includes('ac');
      const isSpecific2 = /\b(washing|washer|laundry|refrigerator|fridge|freezer|microwave|magnetron)\b/.test(qLower2);
      if (isCooling2 && !isSpecific2) displayName = 'AC Repair / AC Servicing';
    }
    return { name: displayName, subcategory: s.doc.subcategory, score: s.score, percent: scaleConfidence(s.score), _internalName: s.doc.name };
  });

  return {
    query: q,
    detectedService: displayService,
    confidence,
    confidencePercent,
    relatedSkills,
    topProviders,
    allServiceScores: mappedAllScores,
    allProviderScores: providerScores.slice(0,20).map(p=> ({ id: p.provider.id, name: p.provider.name, score: p.score})),
    isLowConfidence: isLow,
    fallbackReason: isLow ? 'low_confidence' : null
  };
}

// Convenience: update provider embeddings when Supabase providers change (call once after fetch)
export function rebuildProviderEmbeddings(providers) {
  ensureInitialized();
  if (!providers || !providers.length) return;
  _providerDocs = buildProviderCorpus(providers);
  _providerVectors = _providerDocs.map(d => textToVectorNormalized(d.text));
  _providerIdToIdx = new Map(_providerDocs.map((d,i)=>[d.id,i]));
}

// Export internals for testing / debugging
export const _internals = {
  ensureInitialized,
  tokenizeWithExpansion,
  textToVectorNormalized,
  cosineSimilarity,
  getVocab: () => { ensureInitialized(); return _vocab; },
  getServiceDocs: () => { ensureInitialized(); return _serviceDocs; },
};

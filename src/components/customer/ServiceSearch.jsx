import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Clock, Sparkles, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SemanticServiceMatcher } from '../ai/SemanticServiceMatcher';
import { SERVICE_CATALOG, getAllMicroServices, findCategoryForServiceName } from '../../data/serviceCatalog.js';
import { MicroServiceCard } from './MicroServiceCard.jsx';
import { StickyCartBar } from './StickyCartBar.jsx';

// SERVICE-FIRST discovery: natural-language AI + service catalog.
// No provider/executive listing, no provider filters — Zolve allocates internally.
export const ServiceSearch = ({ initialSearch = '' }) => {
  const {
    selectedLocation,
    locationStatus,
    locationError,
    setIsLocationModalOpen,
  } = useApp();
  const navigate = useNavigate();

  const userCoords = (selectedLocation && typeof selectedLocation !== 'string' && selectedLocation.lat != null && selectedLocation.lng != null) ? { lat: selectedLocation.lat, lng: selectedLocation.lng } : null;
  const selectedLocationName = (selectedLocation && typeof selectedLocation !== 'string' && selectedLocation.name) ? selectedLocation.name : (selectedLocation?.city || 'Location not set');
  const hasExplicitLocation = selectedLocation && typeof selectedLocation !== 'string' && selectedLocation.lat != null;

  const [searchQuery, setSearchQuery] = useState(initialSearch || '');

  const handleSelectServiceName = (name) => {
    const cat = findCategoryForServiceName(name);
    if (cat) navigate(`/services/${cat.id}`);
    else setSearchQuery(name);
  };

  const queryResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return getAllMicroServices().filter((m) =>
      m.name.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.categoryName.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery]);

  const categories = useMemo(() => Object.values(SERVICE_CATALOG), []);

  const categoryStartingPrice = (cat) => {
    const amounts = cat.items.filter((i) => i.price.kind !== 'quote').map((i) => i.price.amount);
    if (!amounts.length) return 'Request Quote';
    return `Starting ₹${Math.min(...amounts).toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-8 pb-28">
      <div className="relative rounded-3xl bg-gradient-to-br from-brand-900 via-brand-950 to-coop-950 text-white p-6 sm:p-8 lg:p-10 overflow-hidden shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-brand-500/15 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-xs font-semibold text-coop-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Service Catalog</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            What service do you need?
          </h1>
          <p className="text-xs text-slate-300">
            Choose what you need near <strong className="text-coop-300">{selectedLocationName}</strong> — Zolve assigns the right professional after booking.
          </p>
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search services... e.g. tap repair"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 bg-white/10 backdrop-blur-md text-white placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-coop-400"
            />
          </div>
        </div>
      </div>

      {locationStatus === 'detecting' && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 flex items-center justify-between gap-3 text-xs text-blue-800">
          <span className="flex items-center gap-2"><Clock className="w-4 h-4 animate-spin" /> Detecting your location…</span>
        </div>
      )}
      {locationStatus === 'denied' && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 flex items-center justify-between gap-3 text-xs text-red-800">
          <span>Location access was denied.</span>
          <button onClick={() => setIsLocationModalOpen(true)} className="px-3 py-1.5 rounded-full bg-white border border-red-200 font-bold">Choose location manually</button>
        </div>
      )}
      {locationStatus === 'unavailable' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 flex items-center justify-between gap-3 text-xs text-amber-800">
          <span>Unable to detect your location.</span>
          <button onClick={() => setIsLocationModalOpen(true)} className="px-3 py-1.5 rounded-full bg-white border font-bold">Choose location manually</button>
        </div>
      )}
      {!hasExplicitLocation && locationStatus !== 'detecting' && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center space-y-2">
          <p className="text-sm font-bold text-slate-700">Location not set</p>
          <p className="text-xs text-slate-500">Choose your location to see bookable time slots. Services are city-specific.</p>
          <button onClick={() => setIsLocationModalOpen(true)} className="px-4 py-2 rounded-xl bg-brand-900 text-white text-xs font-bold">Choose location manually</button>
          {locationError && <p className="text-[11px] text-slate-400">{locationError}</p>}
        </div>
      )}

      <SemanticServiceMatcher onSelectServiceName={handleSelectServiceName} />

      {queryResults && (
        <div className="space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900">
            {queryResults.length > 0 ? `Matching services (${queryResults.length})` : 'No services match your search'}
          </h2>
          {queryResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {queryResults.map((m) => (
                <MicroServiceCard key={m.id} item={m} categoryIllustration={SERVICE_CATALOG[m.categoryId]?.illustration} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Try a different keyword, or describe your problem above for AI matching.</p>
          )}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-extrabold text-slate-900">Browse all services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => navigate(`/services/${cat.id}`)}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:shadow-xl transition-all p-5 flex items-center gap-4 text-left group"
            >
              <span className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/60 ring-1 ring-slate-200/60 flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src={`/illustrations/partner-3d/${cat.illustration}.png`}
                  alt={cat.name}
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  className="w-[88%] h-[88%] object-contain"
                />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-900">{cat.name}</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">{cat.items.length} services • {categoryStartingPrice(cat)}</span>
                <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-slate-900 group-hover:gap-2 transition-all">
                  Explore <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </span>
            </button>
          ))}
        </div>
        {userCoords && (
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> Showing services near {selectedLocationName} — slots reflect live bookable capacity.
          </p>
        )}
      </div>
      <StickyCartBar />
    </div>
  );
};

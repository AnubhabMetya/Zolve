import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { MapPin, Search, Check, X, Building, Navigation, Loader2, AlertCircle } from 'lucide-react';
import { getCurrentPosition, reverseGeocode, isGeolocationSupported, searchPlaces, searchByPincode, isValidIndianPincode } from '../../services/locationService';

const POPULAR_AREAS = [
  { name: 'Indiranagar, Bengaluru', hub: 'East Hub', distance: '0.8 km', coords: { lat: 12.9784, lng: 77.6408 } },
  { name: 'Koramangala, Bengaluru', hub: 'Central Hub', distance: '2.3 km', coords: { lat: 12.9279, lng: 77.6271 } },
  { name: 'HSR Layout, Bengaluru', hub: 'South Hub', distance: '3.5 km', coords: { lat: 12.9116, lng: 77.6387 } },
  { name: 'Bellandur / Outer Ring Rd', hub: 'Tech Corridor', distance: '4.1 km', coords: { lat: 12.9259, lng: 77.6778 } },
  { name: 'Whitefield, Bengaluru', hub: 'East IT Zone', distance: '6.2 km', coords: { lat: 12.9698, lng: 77.7499 } },
  { name: 'JP Nagar, Bengaluru', hub: 'South Hub', distance: '5.8 km', coords: { lat: 12.9082, lng: 77.5833 } },
  { name: 'Malleshwaram, Bengaluru', hub: 'West Hub', distance: '7.0 km', coords: { lat: 13.0039, lng: 77.5648 } },
  { name: 'Green Valley Residency (Society)', hub: 'Private Society Network', distance: 'Sarjapur Rd', coords: { lat: 12.8500, lng: 77.695 } },
];

export const LocationModal = () => {
  const { isLocationModalOpen, setIsLocationModalOpen, selectedLocation, setSelectedLocation } = useApp();
  const [search, setSearch] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [remoteResults, setRemoteResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [pincode, setPincode] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState('');
  const debounceRef = useRef(null);
  const searchIdRef = useRef(0);

  // Debounced India-wide search via Nominatim (countrycodes=in)
  useEffect(() => {
    const q = search.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setRemoteResults([]);
      setSearching(false);
      setSearchError('');
      return;
    }
    setSearching(true);
    setSearchError('');
    debounceRef.current = setTimeout(async () => {
      const curId = ++searchIdRef.current;
      try {
        const results = await searchPlaces(q, 8);
        if (curId !== searchIdRef.current) return;
        setRemoteResults(results);
      } catch (e) {
        if (curId !== searchIdRef.current) return;
        setSearchError(e.message || 'Search failed');
        setRemoteResults([]);
      } finally {
        if (curId === searchIdRef.current) setSearching(false);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const filtered = POPULAR_AREAS.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
  // avoid duplicating local popular inside remote results
  const filteredNames = new Set(filtered.map(f => f.name.toLowerCase()));
  const dedupedRemote = remoteResults.filter(r => !filteredNames.has(r.name.toLowerCase()) && !filteredNames.has((r.short || '').toLowerCase()));

  const handleSelect = (item) => {
    setSelectedLocation({ name: item.name, lat: item.coords.lat, lng: item.coords.lng });
    setIsLocationModalOpen(false);
  };

  const handleSelectRemote = (item) => {
    const label = item.short || item.name.split(',').slice(0, 3).join(',').trim();
    setSelectedLocation({ name: label, full: item.name, lat: item.lat, lng: item.lng, pincode: item.pincode });
    setIsLocationModalOpen(false);
  };

  const handlePincodeSearch = async () => {
    const pin = pincode.trim();
    if (!isValidIndianPincode(pin)) { setPinError('Enter valid 6-digit pincode (e.g. 560034, 110001)'); return; }
    setPinLoading(true); setPinError('');
    try {
      const results = await searchByPincode(pin, 5);
      if (!results.length) throw new Error('No location found for this pincode');
      const best = results[0];
      const label = best.short || `${pin} - ${best.name.split(',').slice(0,2).join(',')}`;
      // Directly set location with GPS coords - tracker will use lat/lng
      setSelectedLocation({ name: label, full: best.name, lat: best.lat, lng: best.lng, pincode: pin });
      setIsLocationModalOpen(false);
    } catch (e) {
      setPinError(e.message || 'Pincode lookup failed');
    } finally { setPinLoading(false); }
  };

  const handleUseCurrentLocation = async () => {
    if (!isGeolocationSupported()) { setGpsError('Geolocation not supported on this device'); return; }
    if (window.isSecureContext === false && window.location.hostname !== 'localhost') { setGpsError('GPS requires HTTPS — use localhost or deploy to HTTPS'); return; }
    setGpsLoading(true); setGpsError('');
    try {
      const pos = await getCurrentPosition();
      let name = `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`;
      try {
        const rev = await reverseGeocode(pos.lat, pos.lng);
        name = rev.name;
      } catch { /* keep coords name */ }
      setSelectedLocation({ name, lat: pos.lat, lng: pos.lng });
      setIsLocationModalOpen(false);
    } catch (e) {
      setGpsError(e.message || 'Failed to get location');
    } finally { setGpsLoading(false); }
  };

  const selectedName = typeof selectedLocation === 'string' ? selectedLocation : selectedLocation?.name;

  return (
    <AnimatePresence>
      {isLocationModalOpen && (
        <motion.div
          key="location-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[5.5rem] sm:pt-20 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setIsLocationModalOpen(false)}
        >
          <motion.div
            key="location-panel"
            initial={{ y: -90, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -90, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340, mass: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden will-change-transform">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-coop-100 text-coop-700">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">Select Service Area</h3>
              <p className="text-xs text-slate-500">Find active cooperative providers near you</p>
            </div>
          </div>
          <button
            onClick={() => setIsLocationModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Use Current Location */}
        <div className="p-6 space-y-4">
          <button
            onClick={handleUseCurrentLocation}
            disabled={gpsLoading}
            className="w-full py-2.5 rounded-xl bg-brand-900 hover:bg-brand-800 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
          >
            {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            <span>{gpsLoading ? 'Detecting location...' : 'Use Current Location (GPS)'}</span>
          </button>
          {gpsError && <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{gpsError}</span></div>}
          {!isGeolocationSupported() && <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">Your browser does not support GPS. Pick manually below.</p>}

          {/* Pincode */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-700" />
              <span className="text-xs font-bold text-slate-800">Search by Pincode</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="e.g. 560034, 110001, 400001"
                value={pincode}
                onChange={(e) => { const v = e.target.value.replace(/\D/g,'').slice(0,6); setPincode(v); if(pinError) setPinError(''); }}
                onKeyDown={(e) => { if(e.key==='Enter') handlePincodeSearch(); }}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm tracking-widest"
              />
              <button
                onClick={handlePincodeSearch}
                disabled={pinLoading || !isValidIndianPincode(pincode)}
                className="px-4 py-2 rounded-xl bg-brand-900 hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
              >
                {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {pinLoading ? 'Locating...' : 'Locate'}
              </button>
            </div>
            {pinError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">{pinError}</p>}
          </div>

          <div className="flex items-center gap-2 py-1">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">or search place</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search any location in India (e.g. Delhi, Dadar Mumbai, Hyderabad)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-coop-500 text-sm"
              autoFocus
            />
            <div className="absolute right-3 top-2.5 flex items-center">
              {searching && <Loader2 className="w-4 h-4 animate-spin text-coop-600" />}
              {!searching && search && (
                <button onClick={() => setSearch('')} className="p-1 rounded-full hover:bg-slate-100">
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
          </div>
          {searchError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{searchError}</p>}

          {/* Area List */}
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {/* Local popular (Bengaluru) */}
            {filtered.length > 0 && (
              <>
                {search.trim().length >= 2 && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pt-1">Popular areas</p>}
                {filtered.map((item) => {
                  const isSelected = selectedName === item.name;
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleSelect(item)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-coop-50 border border-coop-200 text-coop-900 font-semibold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Building className={`w-4 h-4 ${isSelected ? 'text-coop-600' : 'text-slate-400'}`} />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{item.name}</div>
                          <div className="text-[10px] text-slate-500">{item.hub} • {item.distance}</div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-coop-600" />}
                    </button>
                  );
                })}
              </>
            )}

            {/* India-wide Nominatim results */}
            {search.trim().length >= 2 && (
              <>
                {dedupedRemote.length > 0 && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pt-2">Suggestions across India</p>}
                {dedupedRemote.map((item) => (
                  <button
                    key={`${item.lat}-${item.lng}-${item.name}`}
                    onClick={() => handleSelectRemote(item)}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-2.5 hover:bg-brand-50 border border-transparent hover:border-brand-200 transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 truncate">{item.short || item.name.split(',').slice(0,3).join(',')}</div>
                      <div className="text-[10px] text-slate-500 truncate">{item.name}</div>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{item.lat.toFixed(2)}, {item.lng.toFixed(2)}</span>
                  </button>
                ))}
                {!searching && filtered.length === 0 && dedupedRemote.length === 0 && (
                  <div className="text-center py-6 px-3 space-y-1">
                    <p className="text-xs font-semibold text-slate-600">No results for &ldquo;{search}&rdquo;</p>
                    <p className="text-[11px] text-slate-500">Try &ldquo;Connaught Place, Delhi&rdquo; or &ldquo;Bandra, Mumbai&rdquo;. Search works pan-India.</p>
                  </div>
                )}
                {searching && (
                  <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Searching across India...
                  </div>
                )}
              </>
            )}

            {search.trim().length < 2 && filtered.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">No matching popular area. Type to search any city in India.</p>
            )}
          </div>
          </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

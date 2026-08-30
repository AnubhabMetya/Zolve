import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MapPin, Search, Check, X, Building, Navigation, Loader2, AlertCircle } from 'lucide-react';
import { getCurrentPosition, reverseGeocode, isGeolocationSupported } from '../../services/locationService';

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

  if (!isLocationModalOpen) return null;

  const filtered = POPULAR_AREAS.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = (item) => {
    setSelectedLocation({ name: item.name, lat: item.coords.lat, lng: item.coords.lng });
    setIsLocationModalOpen(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
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
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search neighborhood or society..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-coop-500 text-sm"
              autoFocus
            />
          </div>

          {/* Area List */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
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
          </div>
        </div>
      </div>
    </div>
  );
};

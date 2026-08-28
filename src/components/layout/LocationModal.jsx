import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MapPin, Search, Check, X, Building } from 'lucide-react';

const POPULAR_AREAS = [
  { name: 'Indiranagar, Bengaluru', hub: 'East Hub', distance: '0.8 km' },
  { name: 'Koramangala, Bengaluru', hub: 'Central Hub', distance: '2.3 km' },
  { name: 'HSR Layout, Bengaluru', hub: 'South Hub', distance: '3.5 km' },
  { name: 'Bellandur / Outer Ring Rd', hub: 'Tech Corridor', distance: '4.1 km' },
  { name: 'Whitefield, Bengaluru', hub: 'East IT Zone', distance: '6.2 km' },
  { name: 'JP Nagar, Bengaluru', hub: 'South Hub', distance: '5.8 km' },
  { name: 'Malleshwaram, Bengaluru', hub: 'West Hub', distance: '7.0 km' },
  { name: 'Green Valley Residency (Society)', hub: 'Private Society Network', distance: 'Sarjapur Rd' },
];

export const LocationModal = () => {
  const { isLocationModalOpen, setIsLocationModalOpen, selectedLocation, setSelectedLocation } = useApp();
  const [search, setSearch] = useState('');

  if (!isLocationModalOpen) return null;

  const filtered = POPULAR_AREAS.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = (locName) => {
    setSelectedLocation(locName);
    setIsLocationModalOpen(false);
  };

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

        {/* Search */}
        <div className="p-6 space-y-4">
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
              const isSelected = selectedLocation === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => handleSelect(item.name)}
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

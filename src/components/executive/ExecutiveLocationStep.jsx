import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { resolveCity } from '../../services/cityResolver';
import { CITY_HUBS } from '../../data/mockData';
import {
  MapPin,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Compass,
  Building2,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

export const ExecutiveLocationStep = ({ onLocationConfirmed }) => {
  const {
    selectedLocation,
    setSelectedLocationWithSource,
    locationStatus,
    locationError,
    detectLocation,
    setIsLocationModalOpen
  } = useApp();

  const [isManualPickerOpen, setIsManualPickerOpen] = useState(false);
  const [manualCity, setManualCity] = useState('');
  const [manualPincode, setManualPincode] = useState('');
  const [manualError, setManualError] = useState('');

  // Derived location values
  const hasCoords = selectedLocation?.lat != null && selectedLocation?.lng != null;
  const isGPS = selectedLocation?.source === 'gps';
  const accuracyMeters = selectedLocation?.accuracy
    ? Math.round(selectedLocation.accuracy)
    : 18;

  // Resolved canonical city name
  const resolved = selectedLocation
    ? resolveCity({
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        pincode: selectedLocation.pincode,
        name: selectedLocation.name,
        text: selectedLocation.name || selectedLocation.city
      })
    : null;

  const cityName = resolved?.city || selectedLocation?.city || selectedLocation?.name || null;
  const stateName = resolved?.state || selectedLocation?.state || '';
  const displayLocation = cityName
    ? `${cityName}${stateName ? `, ${stateName}` : ''}`
    : selectedLocation?.name || null;

  const isDetecting = locationStatus === 'detecting';
  const isDeniedOrUnavailable =
    locationStatus === 'denied' ||
    locationStatus === 'unavailable' ||
    locationStatus === 'timeout' ||
    locationStatus === 'unsupported' ||
    (!selectedLocation && !isDetecting);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCity && !manualPincode) {
      setManualError('Please select a city or enter a valid 6-digit pincode.');
      return;
    }
    const res = resolveCity({
      text: manualCity,
      name: manualCity,
      pincode: manualPincode
    });
    if (!res || !res.city || res.supported === false) {
      setManualError('Zolve operates within 50 km of 21 supported city hubs. Please select a supported city.');
      return;
    }
    setSelectedLocationWithSource({
      city: res.city,
      name: `${res.city}, ${res.state || 'India'}`,
      lat: res.coords?.lat,
      lng: res.coords?.lng,
      state: res.state,
      pincode: manualPincode || res.pincode,
      source: 'manual',
      supported: true
    });
    setIsManualPickerOpen(false);
    setManualError('');
  };

  return (
    <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-brand-900" />
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Operational Service Area
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
          50 km Radius Rule
        </span>
      </div>

      {/* STATE 1: DETECTING GPS */}
      {isDetecting && !selectedLocation && (
        <div className="py-4 text-center space-y-2">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-brand-50 text-brand-900 animate-spin">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div className="text-xs font-semibold text-slate-700">
            Detecting your service area...
          </div>
          <p className="text-[11px] text-slate-500">
            Requesting browser GPS for accurate job dispatching
          </p>
        </div>
      )}

      {/* STATE 2: LOCATION DETECTED */}
      {selectedLocation && displayLocation && (
        <div className="bg-white rounded-xl border border-emerald-200/90 p-3.5 space-y-2 shadow-subtle">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/80 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                  <span>✓ Location detected</span>
                </div>
                <div className="text-sm font-extrabold text-slate-900 leading-tight">
                  {displayLocation}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                  {isGPS ? (
                    <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                      <Navigation className="w-3 h-3 text-emerald-600" />
                      GPS detected • Accuracy: {accuracyMeters} m
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                      <MapPin className="w-3 h-3 text-brand-700" />
                      Manual Service Hub (Validated)
                    </span>
                  )}
                  <span>•</span>
                  <span className="text-slate-600 font-medium">
                    Service area: 50 km
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (setIsLocationModalOpen) setIsLocationModalOpen(true);
                else setIsManualPickerOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shrink-0"
            >
              Change Location
            </button>
          </div>
        </div>
      )}

      {/* STATE 3: DENIED OR UNAVAILABLE OR UNKNOWN */}
      {isDeniedOrUnavailable && !selectedLocation && (
        <div className="bg-white rounded-xl border border-amber-200 p-3.5 space-y-3">
          <div className="flex items-start gap-2 text-amber-800 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">
                {locationStatus === 'denied'
                  ? 'Location Access Denied'
                  : 'Unable to Detect GPS Location'}
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Zolve requires a service area to match you with nearby jobs. Please select your operating city hub manually.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (detectLocation) detectLocation();
              }}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Retry GPS
            </button>
            <button
              type="button"
              onClick={() => setIsManualPickerOpen(!isManualPickerOpen)}
              className="px-4 py-2 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold transition-colors"
            >
              Select City Hub Manually
            </button>
          </div>
        </div>
      )}

      {/* MANUAL CITY PICKER MODAL / EXPANDER */}
      {isManualPickerOpen && (
        <form
          onSubmit={handleManualSubmit}
          className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 animate-in fade-in duration-150"
        >
          <div className="text-xs font-bold text-slate-900">
            Select Your Primary Operational City
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                Supported City Hub
              </label>
              <select
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="">-- Choose city --</option>
                {CITY_HUBS.map((h) => (
                  <option key={h.id} value={h.city}>
                    {h.city} ({h.state})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                Local Pincode (Optional)
              </label>
              <input
                type="text"
                maxLength={6}
                value={manualPincode}
                onChange={(e) => setManualPincode(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 700001"
                className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {manualError && (
            <p className="text-[11px] text-red-600 font-medium">{manualError}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsManualPickerOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-brand-900 text-white text-xs font-bold"
            >
              Confirm Location
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ExecutiveLocationStep;

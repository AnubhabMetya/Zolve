import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { getVisibleBookings } from '../../services/accessControl';
import { isValidIndianMobile, normalizePhone } from '../../services/otpService';
import { getCurrentPosition, reverseGeocode, isGeolocationSupported, searchPlaces, searchByPincode, isValidIndianPincode } from '../../services/locationService';
import MapView from '../common/MapView';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Package,
  Wallet,
  HelpCircle,
  Sun,
  Moon,
  LogOut,
  ShieldCheck,
  Edit2,
  ChevronRight,
  AlertCircle,
  Save,
  Plus,
  Home,
  Briefcase,
  Trash2,
  Star,
  Navigation,
  Loader2,
  Search,
  X,
  Check,
  Building2
} from 'lucide-react';

// ---------- Address helpers ----------
function parseReverseToForm(rev) {
  const raw = rev.raw || {}
  const addr = raw.address || {}
  const house = [addr.house_number, addr.building].filter(Boolean).join(' ')
  const road = [addr.road, addr.residential, addr.neighbourhood].filter(Boolean).join(', ')
  const suburb = addr.suburb || addr.city_district || addr.county || ''
  return {
    streetArea: [road, suburb].filter(Boolean).join(', ') || rev.short || '',
    city: addr.city || addr.town || addr.village || addr.county || '',
    state: addr.state || '',
    pincode: addr.postcode || '',
    landmark: addr.amenity || addr.shop || '',
    houseFlat: house,
  }
}

function AddressFormModal({ open, onClose, onSave, initial, gpsBusy }) {
  const [form, setForm] = useState(() => initial || { label:'Home', type:'home', houseFlat:'', apartment:'', streetArea:'', landmark:'', city:'', state:'', pincode:'', coords:null, isDefault:false })
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState('')
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])
  const [pincodeInput, setPincodeInput] = useState(initial?.pincode || '')
  const [pinLoading, setPinLoading] = useState(false)
  const [pinError, setPinError] = useState('')
  const [mapCoords, setMapCoords] = useState(initial?.coords || null)
  const debounceRef = useRef(null)
  const searchIdRef = useRef(0)

  useEffect(()=> {
    if(open) {
      setForm(initial ? { ...initial, pincode: String(initial.pincode||'') } : { label:'Home', type:'home', houseFlat:'', apartment:'', streetArea:'', landmark:'', city:'', state:'', pincode:'', coords:null, isDefault:false })
      setMapCoords(initial?.coords || null)
      setSearch('')
      setResults([])
      setGpsError('')
      setPinError('')
      setPincodeInput(initial?.pincode || '')
    }
  }, [open, initial])

  // address search debounce
  useEffect(()=>{
    const q=search.trim()
    if(!open) return
    if(debounceRef.current) clearTimeout(debounceRef.current)
    if(q.length<3){ setResults([]); setSearching(false); return }
    setSearching(true)
    debounceRef.current=setTimeout(async()=>{
      const cur=++searchIdRef.current
      try{
        const r=await searchPlaces(q,6)
        if(cur!==searchIdRef.current) return
        setResults(r)
      }catch{ if(cur===searchIdRef.current) setResults([]) }
      finally{ if(cur===searchIdRef.current) setSearching(false)}
    },400)
    return()=>clearTimeout(debounceRef.current)
  },[search,open])

  if(!open) return null

  const update = (k,v)=> setForm(p=> ({ ...p, [k]:v }))
  const handleType = (t)=>{
    const label = t==='home'?'Home':t==='work'?'Work':'Other'
    setForm(p=> ({ ...p, type:t, label: p.type==='other' && t!=='other' ? label : (t==='other' ? (p.label==='Home'||p.label==='Work' ? 'Other' : p.label) : label) }))
  }

  const handleUseCurrent = async()=>{
    if(!isGeolocationSupported()){ setGpsError('Geolocation not supported on this device'); return }
    if(window.isSecureContext===false && window.location.hostname!=='localhost'){ setGpsError('GPS requires HTTPS — use localhost or HTTPS'); return }
    setGpsLoading(true); setGpsError('')
    try{
      const pos=await getCurrentPosition()
      setMapCoords({ lat:pos.lat, lng:pos.lng })
      update('coords',{ lat:pos.lat, lng:pos.lng })
      try{
        const rev=await reverseGeocode(pos.lat,pos.lng)
        const parsed=parseReverseToForm(rev)
        setForm(prev=> ({
          ...prev,
          streetArea: prev.streetArea || parsed.streetArea || rev.short || '',
          city: prev.city || parsed.city || '',
          state: prev.state || parsed.state || '',
          pincode: prev.pincode || parsed.pincode || '',
          landmark: prev.landmark || parsed.landmark || '',
          houseFlat: prev.houseFlat || parsed.houseFlat || '',
          coords: { lat:pos.lat, lng:pos.lng }
        }))
        setPincodeInput(parsed.pincode || form.pincode)
      }catch{}
    }catch(e){ setGpsError(e.message || 'Failed to get location') }
    finally{ setGpsLoading(false)}
  }

  const handlePickResult = (r)=>{
    setMapCoords({ lat:r.lat, lng:r.lng })
    const parts = r.name.split(',').map(s=>s.trim())
    // naive split to prefill
    setForm(prev=> ({
      ...prev,
      streetArea: r.short || parts.slice(0,3).join(', '),
      city: parts.find(p=> p.length>2) || prev.city,
      coords: { lat:r.lat, lng:r.lng }
    }))
    // try reverse to get pincode/state
    reverseGeocode(r.lat, r.lng).then(rev=>{
      const p=parseReverseToForm(rev)
      setForm(pr=> ({ ...pr, city: p.city||pr.city, state: p.state||pr.state, pincode: p.pincode||pr.pincode, landmark: pr.landmark||p.landmark }))
      if(p.pincode) setPincodeInput(p.pincode)
    }).catch(()=>{})
    setSearch('')
    setResults([])
  }

  const handlePinLocate = async()=>{
    const pin=pincodeInput.trim()
    if(!isValidIndianPincode(pin)){ setPinError('Enter valid 6-digit pincode'); return }
    setPinLoading(true); setPinError('')
    try{
      const res=await searchByPincode(pin,1)
      const best=res[0]
      setMapCoords({ lat:best.lat, lng:best.lng })
      setForm(prev=> ({ ...prev, pincode:pin, city: best.district || prev.city, state: best.state || prev.state, streetArea: prev.streetArea || best.short?.split(',').slice(0,2).join(', ') || '', coords:{ lat:best.lat, lng:best.lng } }))
      // also reverse to get precise locality
      try{ const rev=await reverseGeocode(best.lat,best.lng); const p=parseReverseToForm(rev); setForm(pr=>({ ...pr, city: p.city||pr.city, state: p.state||pr.state })) }catch{}
    }catch(e){ setPinError(e.message || 'Pincode lookup failed') }
    finally{ setPinLoading(false) }
  }

  const handleMapMove = (coords)=>{
    setMapCoords(coords)
    update('coords', coords)
    // reverse to update city/state/pincode lightly (no overwrite house)
    reverseGeocode(coords.lat, coords.lng).then(rev=>{
      const p=parseReverseToForm(rev)
      setForm(pr=> ({ ...pr, city: pr.city || p.city, state: pr.state || p.state, pincode: pr.pincode || p.pincode }))
      if(p.pincode) setPincodeInput(p.pincode)
    }).catch(()=>{})
  }

  const isValid = ()=>{
    if(!form.houseFlat.trim()) return 'House / Flat is required'
    if(!form.apartment.trim()) return 'Apartment / Building is required'
    if(!form.streetArea.trim()) return 'Area / Street is required'
    if(!form.city.trim()) return 'City is required'
    if(!form.state.trim()) return 'State is required'
    if(!isValidIndianPincode(form.pincode)) return 'Valid 6-digit pincode required'
    return ''
  }
  const err = isValid()

  const handleSave = ()=>{
    const msg=isValid()
    if(msg) return
    const full = [form.houseFlat, form.apartment, form.streetArea, form.landmark, `${form.city}, ${form.state} - ${form.pincode}`].filter(Boolean).join(', ')
    onSave({ ...form, fullAddress: full, addressLine: full, coords: mapCoords || form.coords })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-6 max-h-[95vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-900 text-white"><MapPin className="w-4 h-4" /></div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{initial ? 'Edit Address' : 'Add New Address'}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Swiggy / Zomato-style — manual + GPS auto-detect</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Use Current Location + Search */}
          <button onClick={handleUseCurrent} disabled={gpsLoading} className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-2">
            {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />} {gpsLoading ? 'Detecting...' : 'Use Current Location (Auto-detect)'}
          </button>
          {gpsError && <div className="flex gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2"><AlertCircle className="w-4 h-4 shrink-0" />{gpsError}</div>}

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search any address in India — e.g. Dadar Mumbai, MG Road Bangalore..." className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <div className="absolute right-3 top-2.5">{searching && <Loader2 className="w-4 h-4 animate-spin text-brand-600" />}</div>
            {results.length>0 && (
              <div className="absolute z-10 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-xl max-h-56 overflow-auto">
                {results.map(r=>(
                  <button key={`${r.lat}-${r.lng}-${r.name}`} onClick={()=>handlePickResult(r)} className="w-full text-left px-3 py-2.5 hover:bg-brand-50 flex gap-2 border-b last:border-0 border-slate-100">
                    <MapPin className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{r.short}</div>
                      <div className="text-[11px] text-slate-500 truncate">{r.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Manual fields — Swiggy/Zomato style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">House / Flat / Block No. <span className="text-red-500">*</span></label>
              <input value={form.houseFlat} onChange={e=>update('houseFlat', e.target.value)} placeholder="e.g. Flat 402, B-12, House No. 45" className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Apartment / Building / Colony <span className="text-red-500">*</span></label>
              <input value={form.apartment} onChange={e=>update('apartment', e.target.value)} placeholder="e.g. Sunshine Heights, Green Valley Residency" className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Street / Area / Locality <span className="text-red-500">*</span></label>
              <input value={form.streetArea} onChange={e=>update('streetArea', e.target.value)} placeholder="e.g. 12th Main, Indiranagar, Outer Ring Road" className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Landmark <span className="text-slate-400 normal-case">(optional)</span></label>
              <input value={form.landmark} onChange={e=>update('landmark', e.target.value)} placeholder="e.g. Near Metro Station, Opposite Ecospace" className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">City <span className="text-red-500">*</span></label>
              <input value={form.city} onChange={e=>update('city', e.target.value)} placeholder="Bengaluru" className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">State <span className="text-red-500">*</span></label>
              <input value={form.state} onChange={e=>update('state', e.target.value)} placeholder="Karnataka" className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Pincode <span className="text-red-500">*</span></label>
              <div className="mt-1 flex gap-2">
                <input value={pincodeInput} onChange={e=>{ const v=e.target.value.replace(/\D/g,'').slice(0,6); setPincodeInput(v); update('pincode', v); if(pinError) setPinError('') }} inputMode="numeric" maxLength={6} placeholder="560038" className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm tracking-widest focus:ring-2 focus:ring-brand-500 outline-none" />
                <button onClick={handlePinLocate} disabled={pinLoading || !isValidIndianPincode(pincodeInput)} className="px-4 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-800 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shrink-0">
                  {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Locate by PIN
                </button>
              </div>
              {pinError && <p className="text-xs text-red-600 mt-1">{pinError}</p>}
              {!pinError && pincodeInput && !isValidIndianPincode(pincodeInput) && <p className="text-[11px] text-amber-600 mt-1">Enter 6 digits, first digit 1-9</p>}
            </div>
          </div>

          {/* Save as — Swiggy style pills */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Save as</label>
            <div className="flex gap-2">
              {[
                { id:'home', label:'Home', icon: Home },
                { id:'work', label:'Work', icon: Briefcase },
                { id:'other', label:'Other', icon: MapPin },
              ].map(t=>{
                const Active = form.type===t.id
                return (
                  <button key={t.id} onClick={()=>handleType(t.id)} className={`flex-1 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${Active ? 'bg-brand-900 text-white border-brand-900' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'}`}>
                    <t.icon className="w-4 h-4" /> {t.label}
                  </button>
                )
              })}
            </div>
            {form.type==='other' && (
              <input value={form.label} onChange={e=>update('label', e.target.value)} placeholder="Label e.g. Parents House, Friend's Place" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            )}
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={!!form.isDefault} onChange={e=>update('isDefault', e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-brand-600" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">Set as default address</span>
            </label>
          </div>

          {/* Map */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Pin exact location (drag marker)</span>
              <span className="text-[11px] text-slate-500">{mapCoords ? `${mapCoords.lat.toFixed(5)}, ${mapCoords.lng.toFixed(5)}` : 'No pin yet'}</span>
            </div>
            <MapView customerPos={mapCoords || null} draggable onCustomerMove={handleMapMove} height="200px" />
            <p className="text-[10px] text-slate-400">Drag the blue pin to fine-tune. Coordinates saved with address for accurate service tracking.</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center justify-between shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold">Cancel</button>
          <button onClick={handleSave} disabled={!!err} title={err || ''} className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${err ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-brand-900 hover:bg-brand-800 text-white'}`}>
            <Save className="w-4 h-4" /> {initial ? 'Update Address' : 'Save Address'}
          </button>
        </div>
        {err && <div className="px-6 pb-3 text-[11px] text-amber-700 bg-amber-50 border-t border-amber-200 flex gap-1.5"><AlertCircle className="w-4 h-4 shrink-0" />{err}</div>}
      </div>
    </div>
  )
}

export const ProfilePage = () => {
  const {
    currentUser,
    activeRole,
    bookings,
    setActiveTab,
    setActiveBookingForTracking,
    setIsCopilotOpen,
    logout,
    theme,
    toggleTheme,
    zolveMoney,
    savedAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  } = useApp();
  const { updatePhone } = useAuth();

  const [activeSection, setActiveSection] = useState('none');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneSuccess, setPhoneSuccess] = useState('');

  // address modal
  const [addrModalOpen, setAddrModalOpen] = useState(false);
  const [editingAddr, setEditingAddr] = useState(null);

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
          <User className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-extrabold font-display dark:text-white">No profile yet</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Please sign in to view your profile, orders and Zolve Money.</p>
      </div>
    );
  }

  const visible = getVisibleBookings(bookings, currentUser);
  const addresses = savedAddresses || currentUser.savedAddresses || [];
  const primaryAddress = addresses.find(a=>a.isDefault)?.fullAddress || addresses.find(a=>a.isDefault)?.addressLine || addresses[0]?.fullAddress || addresses[0]?.addressLine || currentUser.location || 'No address on file';

  const handleYourOrders = () => setActiveSection('orders');
  const handleNeedHelp = () => { setIsCopilotOpen(true); setActiveSection('help'); };
  const handleZolveMoney = () => setActiveSection('money');

  const sectionTabs = [
    { id: 'orders', label: 'Your Orders', icon: Package, desc: `${visible.length} orders`, action: handleYourOrders },
    { id: 'money', label: 'Zolve Money', icon: Wallet, desc: `₹${zolveMoney.balance}`, action: handleZolveMoney },
    { id: 'help', label: 'Need Help', icon: HelpCircle, desc: 'AI Copilot', action: handleNeedHelp },
  ];

  const openAdd = () => { setEditingAddr(null); setAddrModalOpen(true) }
  const openEdit = (a) => { setEditingAddr(a); setAddrModalOpen(true) }
  const handleSaveAddr = (data) => {
    if(editingAddr) updateAddress(editingAddr.id, data)
    else addAddress(data)
    setAddrModalOpen(false); setEditingAddr(null)
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Heading */}
      <div className="rounded-3xl bg-gradient-to-br from-brand-900 via-brand-950 to-coop-950 text-white p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display">My Account</h1>
        <p className="text-xs text-slate-300 mt-1">Manage your profile, addresses, orders, rewards and preferences</p>
      </div>

      {/* Profile identity card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-subtle p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <img
            src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
            alt={currentUser.name}
            className="w-20 h-20 rounded-2xl object-cover ring-2 ring-coop-500/20 shrink-0"
          />
          <div className="flex-1 min-w-0 space-y-4 w-full">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{currentUser.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 text-[10px] font-bold uppercase">
                  {activeRole.replace('_', ' ')}
                  {currentUser.executiveVertical ? ` • ${currentUser.executiveVertical}` : ''}
                </span>
                {currentUser.mobileVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-coop-50 dark:bg-coop-950 text-coop-700 dark:text-coop-300 text-[10px] font-bold border border-coop-200 dark:border-coop-800">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <Phone className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">Mobile Number {!currentUser.phone && <span className="text-red-600">— Required</span>}</div>
                  {!isEditingPhone ? (
                    <div className="flex items-center gap-2">
                      <div className={`font-semibold truncate ${currentUser.phone ? 'text-slate-900 dark:text-white' : 'text-red-600'}`}>{currentUser.phone ? `+91 ${currentUser.phone}` : 'Not set — executive cannot contact you'}</div>
                      <button onClick={()=>{ setPhoneDraft(currentUser.phone || ''); setIsEditingPhone(true); setPhoneError(''); setPhoneSuccess(''); }} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 shrink-0"><Edit2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <div className="mt-1 space-y-1.5">
                      <div className="flex gap-1.5">
                        <input autoFocus value={phoneDraft} onChange={e=>{ setPhoneDraft(e.target.value.replace(/\D/g,'').slice(0,10)); setPhoneError(''); }} placeholder="98765 43210" inputMode="numeric" maxLength={10} className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs" />
                        <button disabled={phoneSaving} onClick={async()=>{ if(!isValidIndianMobile(phoneDraft)){ setPhoneError('Enter valid 10-digit number starting 6-9'); return; } setPhoneSaving(true); setPhoneError(''); try{ await updatePhone(normalizePhone(phoneDraft)); setPhoneSuccess('Saved'); setIsEditingPhone(false);}catch(err){ setPhoneError(err.message);}finally{ setPhoneSaving(false);} }} className="px-3 py-1.5 rounded-lg bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold disabled:opacity-60 flex items-center gap-1"><Save className="w-3 h-3" />{phoneSaving?'Saving...':'Save'}</button>
                        <button onClick={()=>setIsEditingPhone(false)} className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs">Cancel</button>
                      </div>
                      {phoneError && <div className="text-[11px] text-red-600 flex gap-1"><AlertCircle className="w-3 h-3" />{phoneError}</div>}
                      {!phoneError && <div className="text-[10px] text-slate-400">10 digits, starts 6-9. Executive will call on this during service.</div>}
                    </div>
                  )}
                  {phoneSuccess && !isEditingPhone && <div className="text-[11px] text-coop-700 font-semibold mt-1">{phoneSuccess}</div>}
                  {!currentUser.phone && !isEditingPhone && <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mt-1.5">Add your mobile — booking is blocked until executive can reach you.</div>}
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</div>
                  <div className="font-semibold text-slate-900 dark:text-white truncate">{currentUser.email || 'Not set'}</div>
                </div>
              </div>
              {/* Compact primary address summary */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 sm:col-span-2">
                <MapPin className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">Default Address {addresses.length>0 && <span className="px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700 text-[9px]">{addresses.length} saved</span>}</div>
                  <div className="font-medium text-slate-900 dark:text-white leading-relaxed">{primaryAddress}</div>
                </div>
                <button onClick={openAdd} className="shrink-0 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1 hover:bg-slate-50"><Plus className="w-3.5 h-3.5" /> Add</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Addresses — Swiggy/Zomato style */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-subtle overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-200 dark:border-orange-800">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">Saved Addresses <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400">{addresses.length}</span></h3>
            </div>
          </div>
          <button onClick={openAdd} className="px-4 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" /> Add New Address
          </button>
        </div>

        {addresses.length===0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto"><Building2 className="w-7 h-7 text-orange-500" /></div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">No saved address yet</h4>
            <button onClick={openAdd} className="mt-2 px-5 py-2.5 rounded-xl bg-brand-900 text-white text-xs font-bold inline-flex items-center gap-1.5"><Navigation className="w-4 h-4" /> Use Current Location to Add</button>
          </div>
        ) : (
          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map(a=>(
              <div key={a.id} className={`p-4 rounded-2xl border-2 text-left relative flex flex-col gap-2 ${a.isDefault ? 'border-brand-300 bg-brand-50/50 dark:bg-brand-950/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 ${a.type==='home'?'bg-emerald-600':a.type==='work'?'bg-indigo-600':'bg-slate-900'}`}>
                      {a.type==='home' ? <Home className="w-4 h-4" /> : a.type==='work' ? <Briefcase className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {a.label || (a.type==='home'?'Home':a.type==='work'?'Work':'Other')}
                        {a.isDefault && <span className="px-1.5 py-0.5 rounded-full bg-brand-900 text-white text-[9px] font-bold flex items-center gap-0.5"><Star className="w-3 h-3" /> Default</span>}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{a.type.toUpperCase()} • {a.pincode}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={()=>openEdit(a)} className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"><Edit2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" /></button>
                    <button onClick={()=>{ if(confirm(`Delete ${a.label}?`)) deleteAddress(a.id) }} className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-red-200 text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">{a.fullAddress || a.addressLine}</div>
                  {a.landmark && <div className="text-[11px] text-slate-600 dark:text-slate-400 flex gap-1"><span className="font-bold">Landmark:</span> {a.landmark}</div>}
                  {a.coords && <div className="text-[10px] text-slate-400">{a.coords.lat.toFixed(5)}, {a.coords.lng.toFixed(5)}{a.city ? ` • ${a.city}, ${a.state}` : ''}</div>}
                </div>
                <div className="flex gap-2 pt-1">
                  {!a.isDefault && <button onClick={()=>setDefaultAddress(a.id)} className="flex-1 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold flex items-center justify-center gap-1"><Star className="w-3 h-3" /> Set as Default</button>}
                  {a.isDefault && <span className="flex-1 py-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center gap-1"><Check className="w-3 h-3" /> Default Address</span>}
                  <button onClick={()=>openEdit(a)} className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-bold flex items-center gap-1"><Edit2 className="w-3 h-3" /> Edit Address</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddressFormModal open={addrModalOpen} onClose={()=>{ setAddrModalOpen(false); setEditingAddr(null)}} onSave={handleSaveAddr} initial={editingAddr} />

      {/* Three horizontal options under My Account */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">My Account</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {sectionTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={tab.action}
              className={`p-5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
                activeSection === tab.id
                  ? 'bg-brand-50 dark:bg-brand-950 border-brand-300 dark:border-brand-800 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-subtle'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tab.id === 'money' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400' : tab.id === 'help' ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                  <tab.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{tab.label}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{tab.desc}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Section detail */}
      {activeSection === 'orders' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-subtle overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h4 className="text-sm font-bold dark:text-white">Your Orders ({visible.length})</h4>
            <button onClick={() => setActiveTab('bookings')} className="text-xs font-bold text-brand-700 dark:text-brand-300 hover:underline">View all in Bookings →</button>
          </div>
          {visible.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No orders yet. Book a service to see it here. Executives see only vertical orders after Email OTP verification.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {visible.slice(0, 6).map((b) => (
                <div key={b.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={b.providerAvatar} alt={b.providerName} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{b.serviceName} <span className="font-normal text-slate-500">#{b.bookingCode}</span></div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{b.scheduledDate} • {b.bookingStatus.replace(/_/g, ' ')}</div>
                    </div>
                  </div>
                  <button onClick={() => setActiveBookingForTracking(b)} className="shrink-0 px-3 py-1.5 rounded-xl bg-brand-900 dark:bg-brand-800 text-white text-xs font-bold">Track</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSection === 'money' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-subtle overflow-hidden">
          <div className="p-6 sm:p-8 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-white/80">Zolve Money Wallet</div>
                <div className="text-3xl font-black mt-1">₹{zolveMoney.balance}</div>
                <p className="text-xs text-white/80 mt-1">Earn ₹10–₹200 randomly on every service you book. Use on next checkout.</p>
              </div>
              <Wallet className="w-10 h-10 text-white/90" />
            </div>
          </div>
          <div className="p-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">Recent Rewards</h4>
            {zolveMoney.history.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No rewards yet. Book your first service to earn Zolve Money!</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-auto pr-1">
                {zolveMoney.history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">+ ₹{h.amount} <span className="font-normal text-slate-500">for {h.serviceName}</span></div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">#{h.bookingCode} • {h.date} {h.time || ''}</div>
                    </div>
                    <span className="text-xs font-black text-coop-700 dark:text-coop-400">+₹{h.amount}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3">Rewards are credited instantly after successful booking. Random ₹10–₹200 per order.</p>
          </div>
        </div>
      )}

      {activeSection === 'help' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
          <h4 className="text-sm font-bold dark:text-white flex items-center gap-2"><HelpCircle className="w-4 h-4 text-indigo-600" /> Need Help</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Chat with Zolve AI Copilot for booking help, cancellations, or service queries.</p>
          <button onClick={() => setIsCopilotOpen(true)} className="mt-4 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">Open AI Copilot →</button>
        </div>
      )}

      {/* Light / Dark mode + Logout */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-subtle p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              {theme === 'dark' ? <Moon className="w-5 h-5 text-slate-700 dark:text-slate-300" /> : <Sun className="w-5 h-5 text-amber-600" />}
            </div>
            <div>
              <div className="text-sm font-bold dark:text-white">Appearance</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Switch between light and dark mode</div>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center gap-2"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => logout()}
            className="w-full py-3 rounded-xl bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-bold flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </div>
      </div>
    </div>
  );
};

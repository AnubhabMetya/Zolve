// ====================================================================
// ZOLVE REALTIME SERVICE — Supabase Broadcast + Local Mock Fallback
// If VITE_SUPABASE_URL missing, falls back to BroadcastChannel + localStorage
// ====================================================================
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
  } catch {
    supabase = null;
  }
}

export function isRealtimeEnabled() {
  return !!supabase;
}

export function getSupabase() {
  return supabase;
}

// Local fallback: BroadcastChannel + storage event for cross-tab
const BC_NAME = 'zolve_location_bc';
let bc = null;
function getBC() {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!bc) {
    try { bc = new BroadcastChannel(BC_NAME); } catch { bc = null; }
  }
  return bc;
}

// Subscribe to booking location updates
// Returns { unsubscribe: fn, channel }
export function subscribeBookingLocation(bookingId, onUpdate) {
  // Supabase path
  if (supabase) {
    const channel = supabase.channel(`booking:${bookingId}`, { config: { broadcast: { self: false } } });
    channel
      .on('broadcast', { event: 'location_update' }, (payload) => {
        if (payload?.payload) onUpdate(payload.payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // ok
        }
      });
    return {
      channel,
      unsubscribe: () => {
        try { supabase.removeChannel(channel); } catch { /* ignore */ }
      },
    };
  }

  // Mock fallback
  const channelBC = getBC();
  const storageHandler = (e) => {
    if (e.key === `zolve_live_${bookingId}` && e.newValue) {
      try { onUpdate(JSON.parse(e.newValue)); } catch { /* ignore */ }
    }
  };
  window.addEventListener('storage', storageHandler);

  const bcHandler = (e) => {
    if (e.data?.bookingId === bookingId && e.data?.coords) onUpdate(e.data.coords);
  };
  if (channelBC) channelBC.addEventListener('message', bcHandler);

  // Also poll localStorage occasionally for same-tab fallback (BroadcastChannel handles same-tab? self:false, so storage event is for cross-tab)
  return {
    channel: null,
    unsubscribe: () => {
      window.removeEventListener('storage', storageHandler);
      if (channelBC) channelBC.removeEventListener('message', bcHandler);
    },
  };
}

export function publishLocation(bookingId, coords) {
  const payload = { ...coords, updatedAt: new Date().toISOString(), bookingId };

  // Supabase broadcast
  if (supabase) {
    const ch = supabase.channel(`booking:${bookingId}`);
    // fire-and-forget; ensure channel is subscribed first or use send
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ch.send({ type: 'broadcast', event: 'location_update', payload });
        supabase.removeChannel(ch);
      }
    });
    // also write to fallback so tabs without realtime still update
  }

  // Local fallback
  try {
    localStorage.setItem(`zolve_live_${bookingId}`, JSON.stringify(payload));
  } catch { /* ignore */ }
  const channelBC = getBC();
  if (channelBC) {
    try { channelBC.postMessage({ bookingId, coords: payload }); } catch { /* ignore */ }
  }
  // Also trigger for same-tab listeners via custom event
  window.dispatchEvent(new CustomEvent('zolve:live-location', { detail: { bookingId, coords: payload } }));
}

// Helper: listen for custom event (same-tab)
export function onLocalLocationUpdate(handler) {
  const fn = (e) => handler(e.detail);
  window.addEventListener('zolve:live-location', fn);
  return () => window.removeEventListener('zolve:live-location', fn);
}

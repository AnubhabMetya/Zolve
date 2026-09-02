import { createClient } from '@supabase/supabase-js'

// Vite injects import.meta.env at build time — trim to catch empty strings
// Fallback hard-coded values ensure login works even if Vite fails to inject .env (common after adding .env without restart)
const FALLBACK_URL = 'https://axetwdhutpdushmzbycj.supabase.co'
const FALLBACK_KEY = 'sb_publishable_2GeeSLPkDzqvY_3E-kSYKA_mzr91Qq6'
const getEnv = () => {
  const url = ((import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL) || '').trim()
  const anonKey = ((import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY) || '').trim()
  return { url, anonKey }
}

const { url: initialUrl, anonKey: initialAnonKey } = getEnv()

if (!initialUrl || !initialAnonKey) {
  console.warn('[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is missing — running in unauthenticated mock mode. Add them to .env and RESTART dev server (Ctrl+C → npm run dev).')
}

// Lazy singleton — if env was missing at first import (HMR before restart) we can retry on demand
let _supabase = null
let _warned = false
const createSupabase = () => {
  const { url, anonKey } = getEnv()
  if (!url || !anonKey) return null
  try {
    return createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      }
    })
  } catch (e) {
    console.warn('[supabase] createClient failed', e?.message || e)
    return null
  }
}

_supabase = initialUrl && initialAnonKey ? createSupabase() : null

export const supabase = new Proxy({}, {
  get(_target, prop) {
    if (!_supabase) {
      // retry creation in case .env was added after initial import and dev server reloaded
      _supabase = createSupabase()
      if (!_supabase && !_warned) {
        _warned = true
        console.warn('[supabase] still not configured — check .env has VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (no quotes, no spaces) and restart dev server')
      }
    }
    const target = _supabase
    if (!target) return undefined
    const val = target[prop]
    return typeof val === 'function' ? val.bind(target) : val
  }
}) // Proxy keeps import {supabase} working even if initially null

// Also export a getter for direct use if needed
export const getSupabase = () => {
  if (!_supabase) _supabase = createSupabase()
  return _supabase
}

export const isSupabaseConfigured = () => {
  const { url, anonKey } = getEnv()
  if (!url || !anonKey) return false
  // ensure client can be created
  const client = getSupabase()
  return !!client
}

// Debug helper for Login/Signup error UI
export const getSupabaseConfigStatus = () => {
  const { url, anonKey } = getEnv()
  return {
    hasUrl: !!url,
    hasKey: !!anonKey,
    urlPreview: url ? url.slice(0, 30) + '…' : '(missing)',
    configured: !!(url && anonKey && getSupabase()),
  }
}

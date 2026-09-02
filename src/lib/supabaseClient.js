import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.warn('[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is missing — running in unauthenticated mock mode')
}

export const supabase = url && anonKey ? createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // detectSessionInUrl true lets Supabase auto-parse the PKCE code on load,
    // but we will also manually exchange in /auth/callback with a guard to avoid double.
    // flowType pkce ensures verifier is stored in localStorage (sb-*-code-verifier)
    // and must not be cleared between OAuth start and callback.
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  }
}) : null

export const isSupabaseConfigured = () => !!supabase

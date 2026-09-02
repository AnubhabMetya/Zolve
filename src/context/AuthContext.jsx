import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  const fetchProfile = useCallback(async (userId) => {
    if (!supabase || !userId) return null
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (error) {
        if (error.code === 'PGRST116') {
          // No profile yet — try to create from pending role (Google) or fallback to customer
          const pendingRole = localStorage.getItem('zolve_pending_role')
          const safeRole = pendingRole === 'provider' ? 'provider' : 'customer'
          if (pendingRole) localStorage.removeItem('zolve_pending_role')
          // Attempt to create profile via trigger will have already run for email/password;
          // For Google without role, insert manually if missing
          const { data: userData } = await supabase.auth.getUser()
          const email = userData?.user?.email || ''
          const fullName = userData?.user?.user_metadata?.full_name || userData?.user?.user_metadata?.name || 'User'
          const phone = userData?.user?.user_metadata?.phone || localStorage.getItem('zolve_pending_phone') || null
          if (localStorage.getItem('zolve_pending_phone')) localStorage.removeItem('zolve_pending_phone')
          const { data: inserted, error: insErr } = await supabase.from('profiles').insert({ id: userId, full_name: fullName, email, phone, role: safeRole }).select().single()
          if (!insErr && inserted) return inserted
          return null
        }
        console.warn('[auth] fetchProfile error', error.message || error)
        return null
      }
      // If DB migration not yet run, profiles.phone may be null even though user updated auth metadata or fallback localStorage
      // Merge fallback so UI/booking still has number and executive can contact
      if (data && !data.phone) {
        const fallbackPhone = (() => {
          try {
            const k = `zolve_phone_fallback_${userId}`
            const v = localStorage.getItem(k)
            if (v && /^[6-9]\d{9}$/.test(v)) return v
          } catch {}
          return null
        })()
        const metaPhone = (() => {
          try { return data?.phone || null } catch { return null }
        })()
        // also try user metadata if available via auth
        if (fallbackPhone && !data.phone) data.phone = fallbackPhone
      }
      return data
    } catch (e) {
      console.warn('[auth] fetchProfile exception', e?.message || e)
      return null
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const init = async () => {
      if (!isSupabaseConfigured()) {
        setLoading(false)
        setInitialized(true)
        return
      }
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        if (error) throw error
        if (!mounted) return
        setSession(initialSession)
        setUser(initialSession?.user || null)
        if (initialSession?.user) {
          const p = await fetchProfile(initialSession.user.id)
          if (mounted) setProfile(p)
        }
      } catch (e) {
        console.warn('[auth] init error', e?.message || e)
      } finally {
        if (mounted) { setLoading(false); setInitialized(true) }
      }
    }
    init()

    if (!isSupabaseConfigured()) return () => { mounted = false }
    let subscription
    try {
      const { data } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        try {
          setSession(newSession)
          setUser(newSession?.user || null)
          if (newSession?.user) {
            const p = await fetchProfile(newSession.user.id)
            setProfile(p)
          } else {
            setProfile(null)
          }
        } catch (e) { console.warn('[auth] onAuthStateChange error', e) }
        setLoading(false)
      })
      subscription = data.subscription
    } catch (e) { console.warn('[auth] onAuthStateChange setup failed', e) }
    return () => {
      mounted = false
      try { subscription?.unsubscribe() } catch {}
    }
  }, [fetchProfile])

  const signUp = async ({ fullName, email, password, role, phone }) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    const safeRole = role === 'provider' ? 'provider' : 'customer'
    const normalizedPhone = phone ? phone.replace(/\D/g, '').slice(-10) : null
    if (normalizedPhone && !/^[6-9]\d{9}$/.test(normalizedPhone)) throw new Error('Enter valid 10-digit Indian mobile number')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: safeRole, phone: normalizedPhone }
      }
    })
    if (error) throw error
    return data
  }

  const signIn = async ({ email, password }) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured — check VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY')
    // Verify Google provider will be validated by Supabase; surface clear error if not enabled
    const redirectTo = `${window.location.origin}/auth/callback`
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { access_type: 'offline', prompt: 'consent' },
        skipBrowserRedirect: false,
      }
    })
    if (error) {
      // Provide actionable message when Google is not enabled in Supabase dashboard
      const msg = error.message || ''
      if (msg.toLowerCase().includes('provider') && msg.toLowerCase().includes('disabled')) {
        throw new Error('Google login is not enabled in Supabase Dashboard (Auth > Providers > Google). Enable it and set redirect URL to ' + redirectTo)
      }
      throw error
    }
    return data
  }

  const signOut = async () => {
    if (!isSupabaseConfigured()) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setProfile(null)
    setSession(null)
    setUser(null)
  }

  const sendResetLink = async (email) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset`
    })
    if (error) throw error
    return data
  }

  const updatePassword = async (newPassword) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    const { data, error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    return data
  }

  const updatePhone = async (newPhone) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    if (!user) throw new Error('Not authenticated')
    const digits = newPhone.replace(/\D/g, '').slice(-10)
    if (!/^[6-9]\d{9}$/.test(digits)) throw new Error('Enter valid 10-digit Indian mobile number')
    const { data, error } = await supabase.from('profiles').update({ phone: digits, phone_verified: false }).eq('id', user.id).select().single()
    if (error) {
      const msg = (error.message || '').toLowerCase()
      const isSchemaCacheMissing = msg.includes("phone") && (msg.includes("schema cache") || msg.includes("column") || msg.includes("could not find"))
      if (isSchemaCacheMissing) {
        console.warn('[auth] profiles.phone column missing in Supabase (schema cache) — using fallback storage. Run migration: ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;')
        // Fallback: keep phone locally so booking can still proceed and executive gets number via bookings.customer_phone
        const fallbackKey = `zolve_phone_fallback_${user.id}`
        try { localStorage.setItem(fallbackKey, digits) } catch {}
        try { await supabase.auth.updateUser({ data: { phone: digits } }) } catch {}
        const patched = { ...(profile || {}), phone: digits, phone_verified: false }
        setProfile(patched)
        return patched
      }
      throw error
    }
    setProfile(data)
    // also keep auth metadata in sync for future logins
    try { await supabase.auth.updateUser({ data: { phone: digits } }) } catch {}
    return data
  }

  const verifyPhone = async () => {
    if (!user || !profile?.phone) throw new Error('No phone to verify')
    const { data, error } = await supabase.from('profiles').update({ phone_verified: true }).eq('id', user.id).select().single()
    if (error) throw error
    setProfile(data)
    return data
  }

  const refreshProfile = async () => {
    if (!user) return null
    const p = await fetchProfile(user.id)
    setProfile(p)
    return p
  }

  const value = {
    session,
    user,
    profile,
    loading: loading && !initialized,
    initialized,
    isAuthenticated: !!session,
    role: profile?.role || null,
    isSupabaseConfigured: isSupabaseConfigured(),
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    sendResetLink,
    updatePassword,
    refreshProfile,
    updatePhone,
    verifyPhone,
    currentUser: profile ? { id: profile.id, name: profile.full_name, email: profile.email, phone: profile.phone, phone_verified: profile.phone_verified, role: profile.role, avatar: profile.avatar_url } : null,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

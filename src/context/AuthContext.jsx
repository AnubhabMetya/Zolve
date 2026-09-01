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
          const { data: inserted, error: insErr } = await supabase.from('profiles').insert({ id: userId, full_name: fullName, email, role: safeRole }).select().single()
          if (!insErr && inserted) return inserted
          return null
        }
        console.warn('[auth] fetchProfile error', error.message || error)
        return null
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

  const signUp = async ({ fullName, email, password, role }) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    const safeRole = role === 'provider' ? 'provider' : 'customer'
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: safeRole }
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
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) throw error
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
    currentUser: profile ? { id: profile.id, name: profile.full_name, email: profile.email, role: profile.role, avatar: profile.avatar_url } : null,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

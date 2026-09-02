import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'

export const AuthCallback = () => {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [status, setStatus] = useState('Completing authentication...')
  const hasRunRef = useRef(false)

  useEffect(() => {
    // Requirement 9: Prevent double exchange (React.StrictMode mounts twice in dev).
    if (hasRunRef.current) return
    hasRunRef.current = true

    let cancelled = false

    const handle = async () => {
      if (!isSupabaseConfigured() || !supabase) {
        setError('Supabase not configured')
        setTimeout(() => navigate('/login', { replace: true }), 1500)
        return
      }

      try {
        // Check for OAuth error returned via query or hash
        const searchParams = new URLSearchParams(window.location.search)
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        const oauthError = searchParams.get('error') || hashParams.get('error')
        const oauthErrorDesc = searchParams.get('error_description') || hashParams.get('error_description') || hashParams.get('error_code')
        if (oauthError) {
          throw new Error(oauthErrorDesc || oauthError)
        }

        // Requirement 3 & 4: Read code query param and exchange exactly as code string.
        const code = searchParams.get('code')

        // If supabase already auto-exchanged via detectSessionInUrl, getSession will already have a session.
        // Check session first to avoid unnecessary second exchange which would throw "code verifier not found".
        const { data: { session: preSession } } = await supabase.auth.getSession()
        if (preSession && !cancelled) {
          setStatus('Session restored, redirecting...')
          // Clean URL (remove code) to avoid re-processing on refresh
          window.history.replaceState({}, '', window.location.pathname)
          navigate('/dashboard', { replace: true })
          return
        }

        if (code) {
          setStatus('Exchanging code for session...')
          // Requirement 4: MUST call with code string, not full href
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) {
            // Requirement 8: PKCE verifier must remain available. Common failure is verifier not found
            // when detectSessionInUrl already consumed it or second mount tried again.
            const msg = (exchangeError.message || '').toLowerCase()
            const isVerifierError = msg.includes('code verifier') || msg.includes('pkce')
            if (isVerifierError) {
              // Check if session was already established despite verifier error (race with auto detect)
              const { data: { session: retrySession } } = await supabase.auth.getSession()
              if (retrySession) {
                window.history.replaceState({}, '', window.location.pathname)
                navigate('/dashboard', { replace: true })
                return
              }
              throw new Error(
                'PKCE code verifier not found in storage. This happens when localStorage was cleared between the OAuth start and callback, or the callback ran twice, or a second Supabase client overwrote storage. Ensure Supabase storage is preserved and redirect URL exactly matches: ' +
                window.location.origin + '/auth/callback'
              )
            }
            throw exchangeError
          }
          // Success — data.session should now exist; AuthContext onAuthStateChange will load profile
          if (data?.session) {
            window.history.replaceState({}, '', window.location.pathname)
            if (!cancelled) navigate('/dashboard', { replace: true })
            return
          }
        } else if (hashParams.get('access_token')) {
          // Implicit flow fallback (should not happen with pkce, but handle)
          const { data: { session: hashSession } } = await supabase.auth.getSession()
          if (hashSession) {
            navigate('/dashboard', { replace: true })
            return
          }
        }

        // After exchange (or if no code but auto-detected), verify session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (cancelled) return
        if (session) {
          window.history.replaceState({}, '', window.location.pathname)
          navigate('/dashboard', { replace: true })
        } else {
          // No session and no code — likely user landed directly or redirect URL mismatch
          throw new Error(
            'No session returned. If Google redirected correctly, ensure Supabase Dashboard > Auth > Redirect URLs includes exactly: ' +
            window.location.origin + '/auth/callback'
          )
        }
      } catch (err) {
        console.warn('[AuthCallback] error', err?.message || err)
        if (!cancelled) {
          setError(err?.message || 'Authentication failed')
          setStatus('')
        }
      }
    }

    handle()
    return () => { cancelled = true }
  }, [navigate])

  return (
    <div className="p-8 text-center space-y-3">
      {error ? (
        <>
          <div className="text-xs text-red-600 max-w-md mx-auto break-words">{error}</div>
          <div className="text-[11px] text-slate-500">Redirect URL used: {typeof window !== 'undefined' ? window.location.origin + '/auth/callback' : '/auth/callback'}</div>
          <button onClick={() => navigate('/login', { replace: true })} className="px-4 py-2 rounded-xl bg-brand-900 text-white text-xs font-bold">Back to Login</button>
        </>
      ) : (
        <>
          <div className="text-xs text-slate-500">{status}</div>
          <div className="w-6 h-6 border-2 border-slate-300 border-t-brand-700 rounded-full animate-spin mx-auto" />
        </>
      )}
    </div>
  )
}

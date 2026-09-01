import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

export const AuthCallback = () => {
  const navigate = useNavigate()
  useEffect(() => {
    const handle = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
    }
    handle()
  }, [navigate])
  return <div className="p-8 text-xs text-slate-500 text-center">Completing authentication...</div>
}

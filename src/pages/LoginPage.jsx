import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'

export const LoginPage = () => {
  const { signIn, signInWithGoogle, isSupabaseConfigured } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const validate = () => {
    if (!email.trim() || !password) { setError('Please fill in all required fields.'); return false }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address.'); return false }
    return true
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(''); setInfo('')
    if (!isSupabaseConfigured) { setError('Supabase not configured. Check env.'); return }
    if (!validate()) return
    setLoading(true)
    try {
      await signIn({ email: email.trim(), password })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err?.message || 'Login failed'
      if (msg.toLowerCase().includes('invalid')) setError('Invalid email or password. Please try again.')
      else if (msg.toLowerCase().includes('confirm')) setError('Please confirm your email before logging in.')
      else setError(msg)
    } finally { setLoading(false) }
  }

  const handleGoogle = async () => {
    setError('')
    setGoogleLoading(true)
    try { await signInWithGoogle() } catch (err) { setError(err?.message || 'Google login failed') } finally { setGoogleLoading(false) }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-[#F8FAFC] dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col md:flex-row">
        <div className="w-full md:w-5/12 bg-gradient-to-br from-brand-900 via-brand-950 to-coop-950 text-white p-8 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-black border border-white/20 flex items-center justify-center text-white font-black text-2xl">Z</div>
              <div><span className="text-2xl font-extrabold">Zolve</span><p className="text-[10px] text-coop-400 font-bold uppercase tracking-widest">Cooperative Platform</p></div>
            </div>
            <div>
              <h2 className="text-2xl font-bold font-display leading-snug">Welcome back</h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">Sign in to track bookings, manage services and access your cooperative dashboard.</p>
            </div>
          </div>
          <div className="pt-6 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/5 rounded-xl py-2"><div className="text-base font-extrabold">10K+</div><div className="text-[9px] text-slate-400 uppercase">Services</div></div>
            <div className="bg-white/5 rounded-xl py-2"><div className="text-base font-extrabold text-coop-400">1K+</div><div className="text-[9px] text-slate-400 uppercase">Providers</div></div>
            <div className="bg-white/5 rounded-xl py-2"><div className="text-base font-extrabold text-amber-400">50+</div><div className="text-[9px] text-slate-400 uppercase">Societies</div></div>
          </div>
        </div>
        <div className="w-full md:w-7/12 p-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">Login to Zolve</h3>
            <p className="text-xs text-slate-500 mt-1">Enter your credentials to continue</p>
          </div>
          {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
          {info && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{info}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-900 placeholder:text-slate-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input type={show ? 'text' : 'password'} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-900" />
                <button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
              <div className="text-right mt-1"><Link to="/forgot" className="text-xs text-brand-700 hover:underline font-semibold">Forgot Password?</Link></div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold shadow-md disabled:opacity-60">{loading ? 'Logging in...' : 'Login'}</button>
          </form>
          <div className="relative flex items-center gap-2 py-1"><div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" /><span className="text-[10px] text-slate-400 uppercase font-bold">or</span><div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" /></div>
          <button onClick={handleGoogle} disabled={googleLoading} className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-xs font-bold hover:bg-slate-50 flex items-center justify-center gap-2 disabled:opacity-60">{googleLoading ? 'Redirecting...' : 'Continue with Google'}</button>
          <p className="text-xs text-center text-slate-500">Don't have an account? <Link to="/signup" className="text-brand-700 font-bold hover:underline">Sign Up</Link></p>
        </div>
      </div>
    </div>
  )
}

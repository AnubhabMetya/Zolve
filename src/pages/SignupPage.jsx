import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2, Home, Briefcase, Phone } from 'lucide-react'
import { isValidIndianMobile, normalizePhone } from '../services/otpService'

export const SignupPage = () => {
  const { signUp, signInWithGoogle, isSupabaseConfigured } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState('customer')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const validate = () => {
    if (!fullName.trim() || !email.trim() || !password || !confirm) { setError('Please fill in all required fields.'); return false }
    if (fullName.trim().length < 2) { setError('Full name must be at least 2 characters.'); return false }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address.'); return false }
    if (phone.trim() && !isValidIndianMobile(phone)) { setError('If provided, phone must be valid 10-digit Indian number (6-9 start).'); return false }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return false }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) { setError('Password must include upper, lower and number.'); return false }
    if (password !== confirm) { setError('Passwords do not match.'); return false }
    if (!['customer','provider'].includes(role)) { setError('Invalid role.'); return false }
    return true
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setError(''); setInfo('')
    if (!isSupabaseConfigured) { setError('Supabase not configured.'); return }
    if (!validate()) return
    setLoading(true)
    try {
      await signUp({ fullName: fullName.trim(), email: email.trim(), password, role, phone: phone.trim() ? normalizePhone(phone) : null })
      setInfo('Account created. Please check your email to confirm, then login.')
      setTimeout(()=> navigate('/login', { replace: true }), 1500)
    } catch (err) {
      const msg = err?.message || 'Signup failed'
      if (msg.toLowerCase().includes('already')) setError('An account with this email already exists. Try login.')
      else setError(msg)
    } finally { setLoading(false) }
  }

  const handleGoogle = async () => {
    setError(''); setInfo('')
    if (!isSupabaseConfigured) { setError('Supabase not configured. Check env.'); return }
    if (phone.trim() && !isValidIndianMobile(phone)) { setError('If provided, phone must be valid 10-digit Indian number.'); return }
    setGoogleLoading(true)
    try {
      // For Google, role and phone are stored temporarily and used after OAuth if profile missing
      localStorage.setItem('zolve_pending_role', role)
      if (phone.trim()) localStorage.setItem('zolve_pending_phone', normalizePhone(phone))
      else localStorage.removeItem('zolve_pending_phone')
      await signInWithGoogle()
    } catch (err) { setError(err?.message || 'Google signup failed') } finally { setGoogleLoading(false) }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-[#F8FAFC] dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col md:flex-row">
        <div className="w-full md:w-5/12 bg-gradient-to-br from-brand-900 via-brand-950 to-coop-950 text-white p-8 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-black border border-white/20 flex items-center justify-center text-white font-black text-2xl">Z</div><div><span className="text-2xl font-extrabold">Zolve</span><p className="text-[10px] text-coop-400 font-bold uppercase tracking-widest">Cooperative Platform</p></div></div>
            <div><h2 className="text-2xl font-bold font-display leading-snug">Join Zolve</h2><p className="text-xs text-slate-300 mt-2 leading-relaxed">Create your account as Customer or Service Provider. Admin role cannot be self-assigned.</p></div>
          </div>
          <div className="pt-6 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/5 rounded-xl py-2"><div className="text-base font-extrabold">10K+</div><div className="text-[9px] text-slate-400 uppercase">Services</div></div>
            <div className="bg-white/5 rounded-xl py-2"><div className="text-base font-extrabold text-coop-400">1K+</div><div className="text-[9px] text-slate-400 uppercase">Providers</div></div>
            <div className="bg-white/5 rounded-xl py-2"><div className="text-base font-extrabold text-amber-400">50+</div><div className="text-[9px] text-slate-400 uppercase">Societies</div></div>
          </div>
        </div>
        <div className="w-full md:w-7/12 p-8 space-y-6">
          <div><h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">Create Account</h3><p className="text-xs text-slate-500 mt-1">Choose your role and get started</p></div>
          {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
          {info && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{info}</div>}
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={()=>setRole('customer')} className={`p-3 rounded-2xl border text-left ${role==='customer' ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-500/20' : 'border-slate-200 bg-white dark:bg-slate-900'}`}>
                <div className="flex items-center gap-1.5 mb-1"><Home className="w-4 h-4 text-brand-600" /><span className="text-xs font-bold">Customer</span></div><p className="text-[10px] text-slate-500">Book services</p>
              </button>
              <button type="button" onClick={()=>setRole('provider')} className={`p-3 rounded-2xl border text-left ${role==='provider' ? 'border-coop-600 bg-coop-50 ring-2 ring-coop-500/20' : 'border-slate-200 bg-white dark:bg-slate-900'}`}>
                <div className="flex items-center gap-1.5 mb-1"><Briefcase className="w-4 h-4 text-coop-600" /><span className="text-xs font-bold">Service Provider</span></div><p className="text-[10px] text-slate-500">Offer services</p>
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
              <div className="relative"><User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" /><input type="text" required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="User" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-900 placeholder:text-slate-400 placeholder:opacity-60" /></div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <div className="relative"><Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" /><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-900" /></div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mobile Number <span className="font-normal text-[10px] text-slate-500">(optional — you can add at booking if needed)</span></label>
              <div className="relative"><Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" /><input type="tel" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="98765 43210" inputMode="numeric" maxLength={10} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-900" /></div>
              <p className="text-[10px] text-slate-400 mt-1">10 digits, starts 6-9. If skipped, we’ll ask for it during booking (after location, before billing) so executive can reach you.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <div className="relative"><Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" /><input type={show ? 'text' : 'password'} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-900" /><button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-2.5 p-1 text-slate-400">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
              <p className="text-[10px] text-slate-400 mt-1">Min 8 chars, upper/lower/number</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Confirm Password</label>
              <div className="relative"><Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" /><input type={show ? 'text' : 'password'} required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="••••••••" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-900" /></div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold shadow-md disabled:opacity-60">{loading ? 'Creating account...' : 'Create Account'}</button>
          </form>
          <div className="relative flex items-center gap-2 py-1"><div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" /><span className="text-[10px] text-slate-400 uppercase font-bold">or</span><div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" /></div>
          <button onClick={handleGoogle} disabled={googleLoading} className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-xs font-bold hover:bg-slate-50 flex items-center justify-center gap-2 disabled:opacity-60">{googleLoading ? 'Redirecting...' : 'Continue with Google'}</button>
          <p className="text-xs text-center text-slate-500">Already have an account? <Link to="/login" className="text-brand-700 font-bold hover:underline">Login</Link></p>
        </div>
      </div>
    </div>
  )
}

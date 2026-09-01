import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Mail, AlertCircle, CheckCircle2 } from 'lucide-react'

export const ForgotPasswordPage = () => {
  const { sendResetLink, isSupabaseConfigured } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email.'); return }
    if (!isSupabaseConfigured) { setError('Supabase not configured.'); return }
    setLoading(true)
    try {
      await sendResetLink(email.trim())
      setSuccess('Reset link sent. Check your email (including spam).')
    } catch (err) {
      setError(err?.message || 'Failed to send reset link')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-[#F8FAFC] dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200/80 p-8 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">Forgot Password</h3>
          <p className="text-xs text-slate-500 mt-1">Enter your email to receive a password reset link</p>
        </div>
        {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
        {success && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{success}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <div className="relative"><Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" /><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-900" /></div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold shadow-md disabled:opacity-60">{loading ? 'Sending reset link...' : 'Send Reset Link'}</button>
        </form>
        <p className="text-xs text-center text-slate-500"><Link to="/login" className="text-brand-700 font-bold hover:underline">Back to Login</Link></p>
      </div>
    </div>
  )
}

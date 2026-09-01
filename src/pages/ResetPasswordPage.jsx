import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'

export const ResetPasswordPage = () => {
  const { updatePassword, isSupabaseConfigured } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!password || !confirm) { setError('Please fill in all fields.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) { setError('Must include upper, lower and number.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (!isSupabaseConfigured) { setError('Supabase not configured.'); return }
    setLoading(true)
    try {
      await updatePassword(password)
      setSuccess('Password updated. Redirecting to login...')
      setTimeout(()=> navigate('/login', { replace: true }), 1500)
    } catch (err) { setError(err?.message || 'Failed to update password') } finally { setLoading(false) }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-[#F8FAFC] dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200/80 p-8 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">Reset Password</h3>
          <p className="text-xs text-slate-500 mt-1">Enter your new password</p>
        </div>
        {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
        {success && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{success}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">New Password</label>
            <div className="relative"><Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" /><input type={show ? 'text' : 'password'} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-900" /><button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-2.5 p-1 text-slate-400">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
            <div className="relative"><Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" /><input type={show ? 'text' : 'password'} required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="••••••••" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-900" /></div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold shadow-md disabled:opacity-60">{loading ? 'Updating password...' : 'Update Password'}</button>
        </form>
      </div>
    </div>
  )
}

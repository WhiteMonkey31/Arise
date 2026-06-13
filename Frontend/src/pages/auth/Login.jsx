import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import { useAuthStore } from '../../store/authStore'
import { toastSuccess, toastError } from '../../components/ui/ToastProvider'

const isDev = import.meta.env.DEV

export default function Login() {
  const navigate   = useNavigate()
  const { login, isLoading } = useAuth()
  const { login: mockLogin } = useAuthStore()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      toastError('Please enter email and password')
      return
    }
    try {
      await login(email, password)
      toastSuccess('Signed in successfully!')
      navigate('/dashboard')
    } catch (err) {
      toastError(err.message || 'Login failed')
    }
  }

  /** Dev bypass — injects a mock token so the dashboard loads without a backend */
  const handleDemoLogin = () => {
    mockLogin('demo@rfpilot.dev', 'demo')
    toastSuccess('Demo mode — using mock profile')
    navigate('/dashboard')
  }

  /** Quick-fill the seed-script credentials */
  const fillSeedCreds = () => {
    setEmail('demo@rfpilot.dev')
    setPassword('Demo1234!')
    toastSuccess('Seed credentials filled')
  }

  return (
    <div className="space-y-6 fade-in select-none">
      {/* Header */}
      <div className="text-center space-y-1.5 flex flex-col items-center justify-center">
        <img src="/logo.svg" alt="logo" className="size-14" />
        <h2 className="font-serif font-bold text-xl text-(--text) tracking-tight">Sign in to RFPilot</h2>
        <p className="text-[10px] text-(--muted) font-bold uppercase tracking-wider font-sans">
          Bid &amp; Proposal Response Engine
        </p>
      </div>

      {/* Dev-mode banner */}
      {isDev && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            ⚡ Dev Mode — Quick Access
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDemoLogin}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 px-3 py-2 text-[10px] font-bold text-white transition-all cursor-pointer"
            >
              Demo Login (no backend)
            </button>
            <button
              onClick={fillSeedCreds}
              className="rounded-xl border border-amber-200 dark:border-amber-800 bg-(--surface) hover:bg-amber-50 dark:hover:bg-amber-950/20 px-3 py-2 text-[10px] font-bold text-amber-700 dark:text-amber-400 transition-all cursor-pointer"
            >
              Fill seed credentials
            </button>
            <Link
              to="/dev/api-test"
              className="rounded-xl border border-amber-200 dark:border-amber-800 bg-(--surface) hover:bg-amber-50 dark:hover:bg-amber-950/20 px-3 py-2 text-[10px] font-bold text-amber-700 dark:text-amber-400 transition-all"
            >
              API Test Dashboard →
            </Link>
          </div>
        </div>
      )}

      {/* Real login form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-xl border border-(--border) bg-(--surface-2) px-3.5 py-3 text-xs text-(--text) placeholder:text-(--muted)/60 focus:border-(--accent) focus:bg-(--surface) focus:outline-none transition-all"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">Password</label>
            <span className="text-[10px] text-(--accent) hover:underline cursor-pointer font-bold font-sans">Forgot?</span>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-(--border) bg-(--surface-2) px-3.5 py-3 text-xs text-(--text) placeholder:text-(--muted)/60 focus:border-(--accent) focus:bg-(--surface) focus:outline-none transition-all"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-1 rounded-xl bg-(--accent) px-4 py-3 text-xs font-bold text-white shadow-[var(--shadow-sm)] hover:opacity-90 hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:translate-y-0"
        >
          {isLoading && (
            <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          )}
          {isLoading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <div className="text-center text-[10px] text-(--muted) font-bold font-sans pt-1">
        Don't have an account?{' '}
        <Link to="/register" className="text-(--accent) font-bold hover:underline">
          Create Organization
        </Link>
      </div>
    </div>
  )
}

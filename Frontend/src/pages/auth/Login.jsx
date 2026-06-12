import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { useAuthStore } from '../../store/authStore'
import { toastSuccess, toastError } from '../../components/ui/ToastProvider'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [email, setEmail] = useState('sarah.j@acme-consulting.com')
  const [password, setPassword] = useState('password123')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      toastError('Please enter email and password')
      return
    }
    
    login(email, password)
    toastSuccess('Signed in successfully!')
    navigate('/')
  }

  return (
    <div className="space-y-6 fade-in select-none">
      <div className="text-center space-y-1.5 flex flex-col items-center justify-center">
        <img src="/logo.svg" alt="logo" className='size-15 '/>
        <h2 className="font-serif font-bold text-xl text-(--text) tracking-tight">Sign in to RFPilot</h2>
        <p className="text-[10px] text-(--muted) font-bold uppercase tracking-wider font-sans">Bid & Proposal Response Engine</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-(--border) bg-(--surface) px-3 py-2.5 text-xs text-(--text) focus:border-(--accent) focus:outline-hidden transition"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <label className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">Password</label>
            <span className="text-[10px] text-(--accent) hover:underline cursor-pointer font-bold font-sans">Forgot?</span>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-(--border) bg-(--surface) px-3 py-2.5 text-xs text-(--text) focus:border-(--accent) focus:outline-hidden transition"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full mt-2 rounded-xl bg-(--accent) px-4 py-3 text-xs font-bold text-white shadow-sm hover:opacity-95 transition cursor-pointer text-center"
        >
          Sign In
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
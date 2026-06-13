import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import { toastSuccess, toastError } from '../../components/ui/ToastProvider'

export default function Register() {
  const navigate = useNavigate()
  const { register, isLoading } = useAuth()
  const [formData, setFormData] = useState({
    orgName: '',
    name: '',
    email: '',
    password: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.orgName.trim() || !formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      toastError('All fields are required')
      return
    }
    try {
      await register({
        email: formData.email,
        password: formData.password,
        org_name: formData.orgName,
      })
      toastSuccess('Organization registered successfully!')
      navigate('/dashboard')
    } catch (err) {
      toastError(err.message || 'Registration failed')
    }
  }

  return (
    <div className="space-y-6 fade-in select-none">
      <div className="text-center space-y-1.5 flex flex-col items-center justify-center">
         <img src="/logo.svg" alt="logo" className='size-15 '/>
        <h2 className="font-serif font-bold text-xl text-(--text) tracking-tight">Create Organization</h2>
        <p className="text-[10px] text-(--muted) font-bold uppercase tracking-wider font-sans">Register new proposal hub</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">Organization Name</label>
          <input type="text" placeholder="e.g. Acme Tech Group"
            value={formData.orgName}
            onChange={(e) => setFormData(prev => ({ ...prev, orgName: e.target.value }))}
            className="w-full rounded-xl border border-(--border) bg-(--surface-2) px-3.5 py-3 text-xs text-(--text) placeholder:text-(--muted)/60 focus:border-(--accent) focus:bg-(--surface) focus:outline-none transition-all"
            required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">Administrator Name</label>
          <input type="text" placeholder="e.g. Sarah Jenkins"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full rounded-xl border border-(--border) bg-(--surface-2) px-3.5 py-3 text-xs text-(--text) placeholder:text-(--muted)/60 focus:border-(--accent) focus:bg-(--surface) focus:outline-none transition-all"
            required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">Email Address</label>
          <input type="email" placeholder="admin@company.com"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full rounded-xl border border-(--border) bg-(--surface-2) px-3.5 py-3 text-xs text-(--text) placeholder:text-(--muted)/60 focus:border-(--accent) focus:bg-(--surface) focus:outline-none transition-all"
            required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">Password</label>
          <input type="password" placeholder="Create secure password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            className="w-full rounded-xl border border-(--border) bg-(--surface-2) px-3.5 py-3 text-xs text-(--text) placeholder:text-(--muted)/60 focus:border-(--accent) focus:bg-(--surface) focus:outline-none transition-all"
            required />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 rounded-xl bg-(--accent) px-4 py-3 text-xs font-bold text-white shadow-[var(--shadow-sm)] hover:opacity-90 hover:-translate-y-0.5 transition-all cursor-pointer text-center disabled:opacity-60 disabled:translate-y-0 flex items-center justify-center gap-2"
        >
          {isLoading && <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
          {isLoading ? 'Creating…' : 'Create Hub & Admin'}
        </button>
      </form>

      <div className="text-center text-[10px] text-(--muted) font-bold font-sans pt-1">
        Already have an account?{' '}
        <Link to="/login" className="text-(--accent) font-bold hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  )
}
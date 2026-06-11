import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { useAuthStore } from '../../store/authStore'
import { toastSuccess, toastError } from '../../components/ui/ToastProvider'

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [formData, setFormData] = useState({
    orgName: '',
    name: '',
    email: '',
    password: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.orgName.trim() || !formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      toastError('All fields are required')
      return
    }

    login(formData.email, formData.password)
    toastSuccess('Organization registered successfully!')
    navigate('/')
  }

  return (
    <div className="space-y-6 fade-in select-none">
      <div className="text-center space-y-1.5">
        <div className="h-10 w-10 rounded-2xl bg-[var(--accent)] text-white font-serif font-semibold text-xl flex items-center justify-center mx-auto shadow-sm mb-3">
          C
        </div>
        <h2 className="font-serif font-bold text-xl text-[var(--text)] tracking-tight">Create Organization</h2>
        <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider font-sans">Register new proposal hub</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] uppercase font-bold tracking-wider text-[var(--muted)]">Organization Name</label>
          <input
            type="text"
            placeholder="e.g. Acme Tech Group"
            value={formData.orgName}
            onChange={(e) => setFormData(prev => ({ ...prev, orgName: e.target.value }))}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-hidden transition"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[9px] uppercase font-bold tracking-wider text-[var(--muted)]">Administrator Name</label>
          <input
            type="text"
            placeholder="e.g. Sarah Jenkins"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-hidden transition"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[9px] uppercase font-bold tracking-wider text-[var(--muted)]">Email Address</label>
          <input
            type="email"
            placeholder="e.g. admin@acme.com"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-hidden transition"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[9px] uppercase font-bold tracking-wider text-[var(--muted)]">Password</label>
          <input
            type="password"
            placeholder="Create secure password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-hidden transition"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full mt-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-xs font-bold text-white shadow-sm hover:opacity-95 transition cursor-pointer text-center"
        >
          Create Hub & Admin
        </button>
      </form>

      <div className="text-center text-[10px] text-[var(--muted)] font-bold font-sans pt-1">
        Already have an account?{' '}
        <Link to="/login" className="text-[var(--accent)] font-bold hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  )
}
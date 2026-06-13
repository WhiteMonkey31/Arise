import React from 'react'

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* Soft radial glow behind card */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 rounded-full bg-(--accent)/6 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm slide-up">
        <div className="rounded-3xl border border-(--border) bg-(--surface) p-8 shadow-[var(--shadow-lg)]">
          {children}
        </div>
      </div>
    </div>
  )
}

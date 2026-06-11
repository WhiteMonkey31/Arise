import React, { useState } from 'react'

export default function RegenerateButton({ onRegenerate, isLoading }) {
  const [isOpen, setIsOpen] = useState(false)
  const [instruction, setInstruction] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onRegenerate(instruction)
    setInstruction('')
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[10px] font-bold text-[var(--text)] hover:bg-[var(--accent-bg)] shadow-sm hover:border-[var(--accent)] transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
      >
        <svg className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
        <span>{isLoading ? 'Streaming...' : 'AI Regenerate'}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <form 
            onSubmit={handleSubmit}
            className="absolute right-0 mt-2 w-60 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-lg z-30 flex flex-col gap-2.5 fade-in"
          >
            <div className="flex flex-col gap-1">
              <label className="text-[8px] uppercase font-bold tracking-wider text-[var(--muted)]">Style Instructions (Optional)</label>
              <input
                type="text"
                placeholder="e.g. make it more concise..."
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[10px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-hidden transition"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-[var(--accent)] py-2 text-[10px] font-bold text-white shadow-sm hover:opacity-95 cursor-pointer text-center"
            >
              Regenerate
            </button>
          </form>
        </>
      )}
    </div>
  )
}
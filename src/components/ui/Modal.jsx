import React, { useEffect } from 'react'

export default function Modal({ isOpen, onClose, title, children, footerActions }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-stone-900/40 dark:bg-stone-950/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl z-10 fade-in transition-all duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif font-bold text-lg text-[var(--text)]">{title}</h3>
          <button 
            onClick={onClose}
            className="rounded-xl p-1.5 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--accent-bg)] transition cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body Content */}
        <div className="text-sm text-[var(--text)]">{children}</div>

        {/* Footer Actions */}
        {footerActions && (
          <div className="flex items-center justify-end gap-2.5 mt-5 border-t border-[var(--border)] pt-4">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  )
}
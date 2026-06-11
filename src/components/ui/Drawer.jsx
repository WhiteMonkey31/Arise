import React, { useEffect } from 'react'

export default function Drawer({ isOpen, onClose, title, children }) {
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

  return (
    <div className={`fixed inset-0 z-50 transition-all ${isOpen ? 'visible' : 'invisible'}`}>
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-stone-900/40 dark:bg-stone-950/60 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Slide-over container */}
      <div 
        className={`absolute top-0 right-0 h-full w-full sm:w-[480px] border-l border-[var(--border)] bg-[var(--surface)] p-6 md:p-8 shadow-2xl flex flex-col transition-transform duration-300 ease-out z-10 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-5 flex-shrink-0">
            <h3 className="font-serif font-bold text-base sm:text-lg text-[var(--text)] truncate pr-4">
              {title}
            </h3>
            <button 
              onClick={onClose}
              className="rounded-xl p-1.5 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--accent-bg)] transition cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Drawer scrollable content */}
          <div className="flex-grow overflow-y-auto pr-1 text-sm text-[var(--text)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
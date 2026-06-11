import React from 'react'

export default function EmptyState({ icon, title, description, actionLabel, onAction }) {
  const getIcon = () => {
    switch (icon) {
      case 'workspace':
        return (
          <svg className="w-8 h-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
          </svg>
        )
      case 'compliance':
        return (
          <svg className="w-8 h-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.03 0 1.9.693 2.166 1.638m-7.377 2.24c0-1.135.845-2.098 1.976-2.192a48.424 48.424 0 0 1 1.123-.08M3.75 20.25H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M3.75 20.25h14.25M3.75 20.25A2.25 2.25 0 0 1 1.5 18V6.108" />
          </svg>
        )
      case 'analytics':
        return (
          <svg className="w-8 h-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21a7.5 7.5 0 0 0-7.5-7.5v7.5Z" />
          </svg>
        )
      default:
        return (
          <svg className="w-8 h-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        )
    }
  }

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 md:p-12 border border-dashed border-[var(--border)] rounded-3xl bg-[var(--surface)] fade-in w-full">
      <div className="h-14 w-14 rounded-2xl bg-[var(--accent-bg)] flex items-center justify-center mb-4 border border-[var(--border)]">
        {getIcon()}
      </div>
      <h3 className="font-serif font-bold text-sm sm:text-base text-[var(--text)]">{title}</h3>
      <p className="text-xs text-[var(--muted)] mt-1.5 max-w-xs leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-95 transition cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
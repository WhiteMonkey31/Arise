import React from 'react'

export default function DeadlineChip({ deadline }) {
  const getDaysRemaining = (dateStr) => {
    if (!dateStr) return 0
    // Strip time to compare dates only
    const today = new Date()
    today.setHours(0,0,0,0)
    const target = new Date(dateStr)
    target.setHours(0,0,0,0)
    const diffTime = target - today
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const days = getDaysRemaining(deadline)

  const getStyles = (diffDays) => {
    if (diffDays < 0) {
      return 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-300 border-red-100 dark:border-red-900/30'
    }
    if (diffDays <= 4) {
      return 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-300 border-amber-100 dark:border-amber-900/30'
    }
    return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/30'
  }

  const label = days < 0 
    ? 'Overdue' 
    : days === 0 
    ? 'Due Today' 
    : days === 1 
    ? '1 day left' 
    : `${days} days left`

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border ${getStyles(days)}`}>
      <svg className="w-2.5 h-2.5 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      {label}
    </span>
  )
}
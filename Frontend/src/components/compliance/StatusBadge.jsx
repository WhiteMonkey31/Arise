import React from 'react'

export default function StatusBadge({ status }) {
  const getStyles = (stat) => {
    switch (stat?.toUpperCase()) {
      case 'PASS':
        return 'bg-emerald-55/10 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/30'
      case 'FAIL':
        return 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-100 dark:border-red-900/30'
      case 'GAP':
        return 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-900/30'
      case 'PARTIAL':
        return 'bg-amber-55/10 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/30'
      default:
        return 'bg-stone-50 dark:bg-stone-900/30 text-stone-700 dark:text-stone-300 border-stone-100 dark:border-stone-800'
    }
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border tracking-wider ${getStyles(status)}`}>
      {status || 'UNKNOWN'}
    </span>
  )
}
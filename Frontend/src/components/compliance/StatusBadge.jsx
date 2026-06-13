import React from 'react'

const STYLES = {
  PASS:    'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/30',
  FAIL:    'bg-red-50    dark:bg-red-950/30     text-red-700    dark:text-red-300    border-red-200    dark:border-red-900/30',
  GAP:     'bg-purple-50 dark:bg-purple-950/30  text-purple-700 dark:text-purple-300  border-purple-200 dark:border-purple-900/30',
  PARTIAL: 'bg-amber-50  dark:bg-amber-950/30   text-amber-700  dark:text-amber-300   border-amber-200  dark:border-amber-900/30',
  DEFAULT: 'bg-stone-50  dark:bg-stone-900/30   text-stone-600  dark:text-stone-400   border-stone-200  dark:border-stone-800',
}

export default function StatusBadge({ status }) {
  const key = status?.toUpperCase()
  const cls = STYLES[key] || STYLES.DEFAULT

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border tracking-wider ${cls}`}>
      {status || 'UNKNOWN'}
    </span>
  )
}

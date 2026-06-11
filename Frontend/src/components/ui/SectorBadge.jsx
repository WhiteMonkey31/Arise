import React from 'react'

export default function SectorBadge({ sector }) {
  const getSectorStyles = (sec) => {
    switch (sec?.toLowerCase()) {
      case 'it services':
        return 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/30'
      case 'healthcare':
        return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/30'
      case 'logistics':
        return 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/30'
      case 'construction':
        return 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-100 dark:border-orange-900/30'
      default:
        return 'bg-stone-50 dark:bg-stone-900/30 text-stone-700 dark:text-stone-300 border-stone-100 dark:border-stone-800'
    }
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getSectorStyles(sector)}`}>
      {sector || 'Other'}
    </span>
  )
}
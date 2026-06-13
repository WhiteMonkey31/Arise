import React from 'react'

export default function WordCountBar({ current = 0, target = 150 }) {
  const ratio   = target > 0 ? current / target : 0
  const percent = Math.min(100, Math.round(ratio * 100))
  const isShort = ratio < 0.8
  const isOver  = ratio > 1.2

  const barColor = isOver  ? 'bg-red-500'
                 : isShort ? 'bg-amber-500'
                 :           'bg-emerald-500'

  const labelColor = isOver  ? 'text-red-600 dark:text-red-400'
                   : isShort ? 'text-amber-600 dark:text-amber-400'
                   :           'text-emerald-600 dark:text-emerald-400'

  return (
    <div className="space-y-1 w-full max-w-[160px] shrink-0 select-none">
      <div className="flex justify-between items-center text-[9px] font-bold text-(--muted)">
        <span>Word Count</span>
        <span className={labelColor}>{current} / {target}</span>
      </div>
      <div className="h-1.5 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden border border-(--border)">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

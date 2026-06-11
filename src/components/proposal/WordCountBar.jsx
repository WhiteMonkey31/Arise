import React from 'react'

export default function WordCountBar({ current = 0, target = 100 }) {
  const ratio = target > 0 ? current / target : 0
  const isOutOfRange = ratio < 0.8 || ratio > 1.2
  const percent = Math.min(100, Math.round(ratio * 100))

  return (
    <div className="space-y-1 w-full max-w-[160px] flex-shrink-0 select-none">
      <div className="flex justify-between items-center text-[9px] font-bold text-[var(--muted)]">
        <span>Word Count</span>
        <span className={isOutOfRange ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}>
          {current} / {target}
        </span>
      </div>
      <div className="h-1.5 w-full bg-stone-100 dark:bg-stone-850/80 rounded-full overflow-hidden border border-[var(--border)]">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isOutOfRange ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
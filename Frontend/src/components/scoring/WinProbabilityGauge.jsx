import React, { useEffect, useState } from 'react'

export default function WinProbabilityGauge({ score = 0 }) {
  // Animate the arc drawing on mount
  const [animated, setAnimated] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(score))
    return () => cancelAnimationFrame(id)
  }, [score])

  const radius = 18
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (animated / 100) * circumference

  const colorClass =
    score < 40 ? 'stroke-red-500'
    : score <= 65 ? 'stroke-amber-500'
    : 'stroke-emerald-500 dark:stroke-emerald-400'

  const textColor =
    score < 40 ? 'text-red-600 dark:text-red-400'
    : score <= 65 ? 'text-amber-600 dark:text-amber-400'
    : 'text-emerald-600 dark:text-emerald-400'

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg className="w-11 h-11 transform -rotate-90">
        <circle cx="22" cy="22" r={radius}
          className="stroke-stone-100 dark:stroke-stone-800"
          strokeWidth="3" fill="transparent"
        />
        <circle cx="22" cy="22" r={radius}
          className={`${colorClass} transition-all duration-700 ease-out`}
          strokeWidth="3.5" fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      <span className={`absolute text-[10px] font-bold ${textColor}`}>
        {score}%
      </span>
    </div>
  )
}

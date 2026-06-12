import React from 'react'

export default function WinProbabilityGauge({ score = 0 }) {
  const getGaugeColor = (val) => {
    if (val < 40) return 'stroke-red-500 text-red-500'
    if (val <= 65) return 'stroke-amber-500 text-amber-500'
    return 'stroke-emerald-600 dark:stroke-emerald-500 text-emerald-600 dark:text-emerald-500'
  }

  const radius = 18
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg className="w-11 h-11 transform -rotate-90">
        {/* Background track */}
        <circle
          cx="22"
          cy="22"
          r={radius}
          className="stroke-stone-100 dark:stroke-stone-800/80"
          strokeWidth="3"
          fill="transparent"
        />
        {/* Active progress */}
        <circle
          cx="22"
          cy="22"
          r={radius}
          className={`${getGaugeColor(score)} transition-all duration-500 ease-out`}
          strokeWidth="3.5"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-(--text)">
        {score}%
      </span>
    </div>
  )
}
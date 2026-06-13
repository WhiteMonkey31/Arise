import React, { useEffect, useRef, useState } from 'react'

const STEPS = [
  'Uploading RFP document',
  'Parsing and extracting layout text',
  'Identifying compliance criteria and gaps',
  'Matching past performance capabilities',
  'Calibrating win probability indices',
]

export default function ExtractionProgress({ progress, status, onComplete }) {
  // If we receive a real `progress` prop (0-100) from the job poller, use it.
  // Otherwise run the local animation.
  const hasRealProgress = typeof progress === 'number'
  const [localPct, setLocalPct] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (hasRealProgress) return // let real progress drive display

    timerRef.current = setInterval(() => {
      setLocalPct((prev) => {
        if (prev >= 95) { clearInterval(timerRef.current); return 95 }
        return prev + 1
      })
    }, 40)
    return () => clearInterval(timerRef.current)
  }, [hasRealProgress])

  // When real job finishes, animate to 100 and call onComplete
  useEffect(() => {
    if (hasRealProgress && progress >= 100) {
      const t = setTimeout(() => onComplete?.(), 600)
      return () => clearTimeout(t)
    }
  }, [progress, hasRealProgress, onComplete])

  const pct = hasRealProgress ? progress : localPct
  const currentStep = Math.min(Math.floor(pct / 20), STEPS.length - 1)
  const circumference = 2 * Math.PI * 34

  return (
    <div className="space-y-6 max-w-md mx-auto p-7 border border-(--border) rounded-3xl bg-(--surface) shadow-[var(--shadow-md)] slide-up select-none">
      <div className="text-center space-y-1">
        <h3 className="font-serif font-bold text-base text-(--text)">Analyzing RFP Document</h3>
        <p className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">
          AI is extracting compliance requirements
        </p>
      </div>

      {/* Circular progress */}
      <div className="flex flex-col items-center py-2">
        <div className="relative h-24 w-24 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90">
            <circle cx="48" cy="48" r="34"
              className="stroke-stone-100 dark:stroke-stone-800"
              strokeWidth="4" fill="transparent"
            />
            <circle cx="48" cy="48" r="34"
              className="stroke-(--accent) transition-all duration-200"
              strokeWidth="5" fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (pct / 100) * circumference}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="font-serif font-bold text-xl text-(--text)">{pct}%</span>
          </div>
        </div>
      </div>

      {/* Step checklist */}
      <div className="space-y-3 pt-1">
        {STEPS.map((step, idx) => {
          const isDone   = pct >= (idx + 1) * 20
          const isActive = currentStep === idx && !isDone

          return (
            <div
              key={idx}
              className={`flex items-center gap-3 text-xs transition-all duration-300 ${
                isDone ? 'text-(--text)' : isActive ? 'text-(--accent)' : 'text-(--muted) opacity-40'
              }`}
            >
              {isDone ? (
                <div className="h-5 w-5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 animate-scaleIn">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : isActive ? (
                <div className="h-5 w-5 rounded-full border-2 border-t-(--accent) border-(--border) animate-spin shrink-0" />
              ) : (
                <div className="h-5 w-5 rounded-full border border-(--border) bg-stone-50 dark:bg-stone-900/10 shrink-0" />
              )}
              <span className="font-sans font-medium truncate">{step}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

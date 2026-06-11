import React, { useEffect, useState } from 'react'

export default function ExtractionProgress({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [percent, setPercent] = useState(0)

  const steps = [
    'Uploading RFP document',
    'Parsing and extracting layout text',
    'Identifying compliance criteria and gaps',
    'Matching past performance capabilities',
    'Calibrating win probability indices'
  ]

  useEffect(() => {
    let timer
    
    const increment = () => {
      setPercent((prev) => {
        if (prev >= 100) {
          clearInterval(timer)
          setTimeout(() => {
            onComplete?.()
          }, 600)
          return 100
        }
        
        const stepIndex = Math.floor(prev / 20)
        if (stepIndex !== currentStep && stepIndex < steps.length) {
          setCurrentStep(stepIndex)
        }
        
        return prev + 1
      })
    }

    timer = setInterval(increment, 40) // Fast and smooth 4-second loading simulation

    return () => clearInterval(timer)
  }, [onComplete, currentStep])

  return (
    <div className="space-y-6 max-w-md mx-auto p-6 border border-(--border) rounded-3xl bg-(--surface) shadow-sm fade-in select-none">
      <div className="text-center space-y-1">
        <h3 className="font-serif font-bold text-base text-(--text)">Analyzing RFP Document</h3>
        <p className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">Please wait while the AI parses compliance criteria</p>
      </div>

      {/* Progress Circle & Text */}
      <div className="flex flex-col items-center py-2">
        <div className="relative h-20 w-20 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="34"
              className="stroke-stone-100 dark:stroke-stone-800/80"
              strokeWidth="3.5"
              fill="transparent"
            />
            <circle
              cx="40"
              cy="40"
              r="34"
              className="stroke-(--accent) transition-all duration-100"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 34}
              strokeDashoffset={2 * Math.PI * 34 - (percent / 100) * (2 * Math.PI * 34)}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute font-serif font-bold text-lg text-(--text)">{percent}%</span>
        </div>
      </div>

      {/* Step Checklist */}
      <div className="space-y-3.5 pt-2 text-xs font-semibold">
        {steps.map((step, idx) => {
          const isDone = percent >= (idx + 1) * 20
          const isActive = currentStep === idx && percent < (idx + 1) * 20
          
          return (
            <div 
              key={idx}
              className={`flex items-center gap-3 transition-opacity duration-205 ${
                isDone ? 'text-(--text)' : isActive ? 'text-(--accent)' : 'text-(--muted) opacity-50'
              }`}
            >
              {isDone ? (
                <div className="h-5 w-5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 animate-scaleIn">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : isActive ? (
                <div className="h-5 w-5 rounded-full border-2 border-t-(--accent) border-(--border) animate-spin shrink-0" />
              ) : (
                <div className="h-5 w-5 rounded-full border border-(--border) bg-stone-50 dark:bg-stone-900/10 shrink-0" />
              )}
              <span className="truncate font-sans font-medium">{step}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
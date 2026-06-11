import React from 'react'

export function Spinner({ size = 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'
  return (
    <div className="flex justify-center items-center">
      <div className={`animate-spin rounded-full border-2 border-stone-200/20 dark:border-stone-800 border-t-(--accent) ${sizeClasses}`} />
    </div>
  )
}

export function Skeleton({ className }) {
  return (
    <div className={`animate-pulse bg-stone-200/50 dark:bg-stone-800/50 rounded-xl ${className}`} />
  )
}

export default function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-12 w-full">
      <Spinner size="lg" />
    </div>
  )
}
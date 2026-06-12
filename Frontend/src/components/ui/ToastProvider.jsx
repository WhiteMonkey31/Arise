import React from 'react'
import { useUiStore } from '../../store/uiStore'

export const toastSuccess = (msg) => useUiStore.getState().addToast(msg, 'success')
export const toastError = (msg) => useUiStore.getState().addToast(msg, 'error')
export const toastLoading = (msg) => useUiStore.getState().addToast(msg, 'loading')

export default function ToastProvider() {
  const { toasts, removeToast } = useUiStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success'
        const isError = toast.type === 'error'
        const isLoading = toast.type === 'loading'
        
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border border-(--border) bg-(--surface) p-4 shadow-lg fade-in transition-all duration-300"
          >
            <div className="flex items-center gap-2.5">
              {isSuccess && (
                <div className="h-5 w-5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {isError && (
                <div className="h-5 w-5 rounded-full bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              {isLoading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-200/20 dark:border-stone-800 border-t-(--accent) shrink-0" />
              )}
              <span className="text-xs font-semibold text-(--text)">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-(--muted) hover:text-(--text) transition shrink-0 cursor-pointer"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}
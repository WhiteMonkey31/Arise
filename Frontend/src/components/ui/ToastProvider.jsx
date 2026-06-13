import React from 'react'
import { useUiStore } from '../../store/uiStore'

export const toastSuccess = (msg) => useUiStore.getState().addToast(msg, 'success')
export const toastError   = (msg) => useUiStore.getState().addToast(msg, 'error')
export const toastLoading = (msg) => useUiStore.getState().addToast(msg, 'loading')

const TYPE_CONFIG = {
  success: {
    bar: 'bg-emerald-500',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    iconWrap: 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
  },
  error: {
    bar: 'bg-red-500',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    iconWrap: 'bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400',
  },
  loading: {
    bar: 'bg-(--accent)',
    icon: null,
    iconWrap: '',
  },
}

export default function ToastProvider() {
  const { toasts, removeToast } = useUiStore()
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 max-w-xs w-full pointer-events-none">
      {toasts.map((toast) => {
        const cfg = TYPE_CONFIG[toast.type] || TYPE_CONFIG.success
        return (
          <div
            key={toast.id}
            className="pointer-events-auto relative overflow-hidden flex items-center justify-between gap-3 rounded-2xl border border-(--border) bg-(--surface) px-4 py-3 shadow-[var(--shadow-md)] toast-in"
          >
            {/* Accent bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.bar} rounded-l-2xl`} />

            <div className="flex items-center gap-2.5 pl-2">
              {toast.type === 'loading' ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-(--border) border-t-(--accent) shrink-0" />
              ) : (
                <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${cfg.iconWrap}`}>
                  {cfg.icon}
                </div>
              )}
              <span className="text-xs font-semibold text-(--text) leading-snug">{toast.message}</span>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-(--muted) hover:text-(--text) transition shrink-0 cursor-pointer rounded-lg p-0.5 hover:bg-(--accent-bg)"
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

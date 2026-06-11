import React from 'react'
import Modal from './Modal'

export default function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmLabel = 'Confirm', 
  cancelLabel = 'Cancel', 
  isDestructive = false 
}) {
  const footerActions = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border border-min-h-25(--border) bg-min-h-25(--surface) px-4 py-2 text-xs font-bold text-min-h-25(--text) transition hover:bg-min-h-25(--accent-bg) cursor-pointer"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={() => {
          onConfirm?.()
          onClose?.()
        }}
        className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-90 cursor-pointer ${
          isDestructive ? 'bg-red-600' : 'bg-min-h-25(--accent)'
        }`}
      >
        {confirmLabel}
      </button>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} footerActions={footerActions}>
      <p className="text-xs text-min-h-25(--muted) leading-relaxed">{message}</p>
    </Modal>
  )
}
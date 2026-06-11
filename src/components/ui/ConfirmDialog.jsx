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
        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-bold text-[var(--text)] transition hover:bg-[var(--accent-bg)] cursor-pointer"
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
          isDestructive ? 'bg-red-600' : 'bg-[var(--accent)]'
        }`}
      >
        {confirmLabel}
      </button>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} footerActions={footerActions}>
      <p className="text-xs text-[var(--muted)] leading-relaxed">{message}</p>
    </Modal>
  )
}
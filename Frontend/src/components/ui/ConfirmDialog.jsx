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
  isDestructive = false,
}) {
  const footerActions = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border border-(--border) bg-(--surface) px-4 py-2 text-xs font-bold text-(--text) hover:bg-(--accent-bg) transition-all cursor-pointer"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={() => { onConfirm?.(); onClose?.() }}
        className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 cursor-pointer ${
          isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-(--accent) hover:opacity-90'
        }`}
      >
        {confirmLabel}
      </button>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} footerActions={footerActions}>
      <p className="text-xs text-(--muted) leading-relaxed">{message}</p>
    </Modal>
  )
}

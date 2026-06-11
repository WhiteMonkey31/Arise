import React, { useState } from 'react'
import Drawer from '../ui/Drawer'
import ConfirmDialog from '../ui/ConfirmDialog'
import { toastSuccess } from '../ui/ToastProvider'

export default function VersionHistory({ isOpen, onClose, section, onRestore }) {
  const [showConfirmRestore, setShowConfirmRestore] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState(null)

  const handleRestoreClick = (ver) => {
    setSelectedVersion(ver)
    setShowConfirmRestore(true)
  }

  const handleRestore = () => {
    if (selectedVersion) {
      onRestore(selectedVersion.text)
      toastSuccess('Proposal version restored!')
      onClose()
    }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Version History">
      <div className="space-y-4 select-none">
        <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--muted)]">Saved Versions ({section?.versionHistory?.length || 0})</span>
        
        {!section?.versionHistory || section.versionHistory.length === 0 ? (
          <div className="text-center py-8 text-[var(--muted)] text-xs font-medium border border-dashed border-[var(--border)] rounded-2xl p-4 font-sans">
            No previous versions saved for this section.
          </div>
        ) : (
          <div className="space-y-4">
            {section.versionHistory.map((ver, idx) => (
              <div 
                key={idx}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs space-y-3 hover:border-[var(--accent)] transition-all"
              >
                <div className="flex justify-between items-center text-[10px] text-[var(--muted)] font-semibold border-b border-[var(--border)] pb-2 font-sans">
                  <span>Edited by {ver.editor}</span>
                  <span>{ver.timestamp}</span>
                </div>
                
                <p className="font-serif text-[11px] leading-relaxed text-[var(--text)] italic line-clamp-3 select-text">
                  "{ver.text}"
                </p>

                <button
                  type="button"
                  onClick={() => handleRestoreClick(ver)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[9px] font-bold text-[var(--text)] hover:bg-[var(--accent-bg)] transition cursor-pointer"
                >
                  Restore Version
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showConfirmRestore}
        onClose={() => {
          setShowConfirmRestore(false)
          setSelectedVersion(null)
        }}
        onConfirm={handleRestore}
        title="Restore Version"
        message="Are you sure you want to restore this version? This will overwrite the current draft text in the proposal editor."
        confirmLabel="Restore"
      />
    </Drawer>
  )
}
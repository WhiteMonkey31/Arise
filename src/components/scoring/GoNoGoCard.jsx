import React, { useState } from 'react'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { toastSuccess } from '../ui/ToastProvider'
import { useNavigate } from 'react-router'

export default function GoNoGoCard({ workspace }) {
  const navigate = useNavigate()
  const { updateWorkspaceStatus } = useWorkspaceStore()
  const [showConfirm, setShowConfirm] = useState(false)
  const [decisionType, setDecisionType] = useState(null)

  const handleDecisionClick = (type) => {
    setDecisionType(type)
    setShowConfirm(true)
  }

  const handleConfirmDecision = () => {
    if (decisionType === 'GO') {
      updateWorkspaceStatus(workspace.id, 'Submitted')
      toastSuccess('Proposal marked as GO and submitted successfully!')
      navigate('/dashboard')
    } else {
      updateWorkspaceStatus(workspace.id, 'Draft')
      toastSuccess('Proposal marked as NO-GO.')
    }
  }

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8 shadow-sm space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)] pb-5">
        <div>
          <h3 className="font-serif font-bold text-lg text-[var(--text)]">GO / NO-GO Advisory</h3>
          <p className="text-xs text-[var(--muted)] font-medium font-sans mt-0.5">Calculated by aligning RFP values with past performance metrics.</p>
        </div>

        {/* Score gauge badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--muted)]">Overall score:</span>
          <span className="rounded-2xl bg-[var(--accent-bg)] border border-[var(--border)] px-4 py-2 text-sm sm:text-base font-bold text-[var(--accent)] font-serif">
            {workspace.winProbability} / 100
          </span>
        </div>
      </div>

      {/* AI Reasoning summary quotes block */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--accent-bg)] p-4 sm:p-5">
        <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--accent)] block mb-2">Advisory Reasoning</span>
        <p className="font-serif italic text-xs sm:text-[13px] leading-relaxed text-[var(--text)]">
          "{workspace.aiReasoning}"
        </p>
      </div>

      {/* Strengths & Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
        {/* Strengths */}
        <div className="space-y-3">
          <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-600 flex items-center gap-1.5 font-sans">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Top Strengths
          </span>
          <ul className="space-y-2.5 text-xs text-[var(--text)] font-medium leading-relaxed font-sans">
            {workspace.strengths.map((str, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-emerald-500 font-bold">•</span>
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Risks */}
        <div className="space-y-3">
          <span className="text-[9px] uppercase font-bold tracking-wider text-red-600 flex items-center gap-1.5 font-sans">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Core Risks
          </span>
          <ul className="space-y-2.5 text-xs text-[var(--text)] font-medium leading-relaxed font-sans">
            {workspace.risks.map((risk, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-red-500 font-bold">•</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-2.5 border-t border-[var(--border)] pt-5 mt-4">
        <button
          type="button"
          onClick={() => handleDecisionClick('NO-GO')}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-200 transition cursor-pointer"
        >
          No-Go (Archive)
        </button>
        <button
          type="button"
          onClick={() => handleDecisionClick('GO')}
          className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-95 transition cursor-pointer"
        >
          Go (Submit Bid)
        </button>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => {
          setShowConfirm(false)
          setDecisionType(null)
        }}
        onConfirm={handleConfirmDecision}
        title={decisionType === 'GO' ? 'Confirm GO Bid Decision' : 'Confirm NO-GO Archive Decision'}
        message={
          decisionType === 'GO'
            ? 'Are you sure you want to mark this proposal response as a GO and submit the final bid? This action updates the RFP status to Submitted.'
            : 'Are you sure you want to archive this RFP? This changes the status back to Draft.'
        }
        confirmLabel={decisionType === 'GO' ? 'Go (Submit)' : 'Archive'}
        isDestructive={decisionType !== 'GO'}
      />
    </div>
  )
}

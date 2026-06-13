import React, { useState } from 'react'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useUpdateWorkspace } from '../../hooks/useWorkspace'
import { toastSuccess } from '../ui/ToastProvider'
import { useNavigate } from 'react-router'

/**
 * GoNoGoCard — GO / NO-GO decision panel.
 *
 * Props:
 *   workspace  — minimal shape { id, winProbability, gapCount, aiReasoning?, strengths?, risks? }
 *   goNoGo     — GoNoGoResponse from backend { decision, reasoning, confidence, gap_count, risks, win_score }
 *
 * The backend goNoGo response takes precedence for reasoning and risks.
 * Workspace-level strengths/risks are used as a fallback.
 */
export default function GoNoGoCard({ workspace, goNoGo }) {
  const navigate = useNavigate()
  const updateMutation = useUpdateWorkspace()
  const [showConfirm, setShowConfirm] = useState(false)
  const [decisionType, setDecisionType] = useState(null)

  const handleDecisionClick = (type) => {
    setDecisionType(type)
    setShowConfirm(true)
  }

  const handleConfirmDecision = () => {
    const newStatus = decisionType === 'GO' ? 'submitted' : 'draft'
    updateMutation.mutate(
      { workspaceId: workspace.id, payload: { status: newStatus } },
      {
        onSuccess: () => {
          if (decisionType === 'GO') {
            toastSuccess('Proposal marked as GO and submitted successfully!')
            navigate('/dashboard')
          } else {
            toastSuccess('Proposal marked as NO-GO.')
          }
        },
      }
    )
  }

  // Prefer backend goNoGo data, fall back to workspace mock fields
  const reasoning = goNoGo?.reasoning || workspace?.aiReasoning || 'No advisory reasoning available.'
  const risks = goNoGo?.risks?.length
    ? goNoGo.risks
    : (workspace?.risks || [])
  const strengths = workspace?.strengths || []
  const overallScore = workspace?.winProbability ?? (goNoGo?.win_score ? Math.round(goNoGo.win_score * 100) : 0)
  const backendDecision = goNoGo?.decision?.toUpperCase()

  return (
    <div className="rounded-3xl border border-(--border) bg-(--surface) p-6 md:p-8 shadow-sm space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-(--border) pb-5">
        <div>
          <h3 className="font-serif font-bold text-lg text-(--text)">GO / NO-GO Advisory</h3>
          <p className="text-xs text-(--muted) font-medium font-sans mt-0.5">
            Calculated by aligning RFP values with past performance metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {backendDecision && (
            <span className={`rounded-2xl border px-3 py-1.5 text-xs font-bold ${
              backendDecision === 'GO'
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-700'
                : 'bg-red-50 dark:bg-red-950/20 border-red-200 text-red-700'
            }`}>
              {backendDecision}
            </span>
          )}
          <span className="text-xs font-bold text-(--muted)">Overall score:</span>
          <span className="rounded-2xl bg-(--accent-bg) border border-(--border) px-4 py-2 text-sm sm:text-base font-bold text-(--accent) font-serif">
            {overallScore} / 100
          </span>
        </div>
      </div>

      {/* AI Reasoning */}
      <div className="rounded-2xl border border-(--border) bg-(--accent-bg) p-4 sm:p-5">
        <span className="text-[9px] uppercase font-bold tracking-wider text-(--accent) block mb-2">
          Advisory Reasoning
        </span>
        <p className="font-serif italic text-xs sm:text-[13px] leading-relaxed text-(--text)">
          "{reasoning}"
        </p>
        {goNoGo?.confidence && (
          <p className="text-[10px] text-(--muted) mt-2 font-semibold">
            Confidence: <strong className="text-(--text)">{goNoGo.confidence}</strong>
          </p>
        )}
      </div>

      {/* Strengths & Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
        {strengths.length > 0 && (
          <div className="space-y-3">
            <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-600 flex items-center gap-1.5 font-sans">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Top Strengths
            </span>
            <ul className="space-y-2.5 text-xs text-(--text) font-medium leading-relaxed font-sans">
              {strengths.map((str, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {risks.length > 0 && (
          <div className="space-y-3">
            <span className="text-[9px] uppercase font-bold tracking-wider text-red-600 flex items-center gap-1.5 font-sans">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Core Risks
            </span>
            <ul className="space-y-2.5 text-xs text-(--text) font-medium leading-relaxed font-sans">
              {risks.map((risk, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span>{typeof risk === 'string' ? risk : JSON.stringify(risk)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-2.5 border-t border-(--border) pt-5 mt-4">
        <button
          type="button"
          onClick={() => handleDecisionClick('NO-GO')}
          disabled={updateMutation.isPending}
          className="rounded-xl border border-(--border) bg-(--surface) px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-200 transition cursor-pointer disabled:opacity-50"
        >
          No-Go (Archive)
        </button>
        <button
          type="button"
          onClick={() => handleDecisionClick('GO')}
          disabled={updateMutation.isPending}
          className="rounded-xl bg-(--accent) px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-95 transition cursor-pointer disabled:opacity-50"
        >
          Go (Submit Bid)
        </button>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => { setShowConfirm(false); setDecisionType(null) }}
        onConfirm={handleConfirmDecision}
        title={decisionType === 'GO' ? 'Confirm GO Bid Decision' : 'Confirm NO-GO Archive Decision'}
        message={
          decisionType === 'GO'
            ? 'Are you sure you want to mark this proposal as GO and submit the final bid? This updates the status to Submitted.'
            : 'Are you sure you want to archive this RFP? This changes the status back to Draft.'
        }
        confirmLabel={decisionType === 'GO' ? 'Go (Submit)' : 'Archive'}
        isDestructive={decisionType !== 'GO'}
      />
    </div>
  )
}

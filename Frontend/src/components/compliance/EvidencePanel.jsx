import React from 'react'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { toastSuccess } from '../ui/ToastProvider'

export default function EvidencePanel({ workspaceId, requirementId }) {
  const { workspaces, updateRequirementStatus } = useWorkspaceStore()
  
  const workspace = workspaces.find(w => w.id === workspaceId)
  if (!workspace) return null

  const requirement = workspace.requirements.find(r => r.id === requirementId)
  if (!requirement) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--muted)] select-none">
        <div className="h-12 w-12 rounded-2xl bg-[var(--accent-bg)] border border-[var(--border)] flex items-center justify-center mb-3 text-[var(--accent)] opacity-60">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>
        <span className="font-serif font-bold text-xs text-[var(--text)]">Select a Requirement</span>
        <p className="text-[10px] mt-1.5 max-w-[200px] leading-relaxed font-sans font-medium">Click on any requirement row in the compliance table to inspect past performance evidence matches and override tags.</p>
      </div>
    )
  }

  const handleStatusChange = (e) => {
    const newStatus = e.target.value
    updateRequirementStatus(workspaceId, requirement.id, newStatus)
    toastSuccess(`Requirement status updated to ${newStatus}`)
  }

  return (
    <div className="space-y-6 fade-in select-none">
      {/* Requirement Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-[var(--accent)] text-xs">{requirement.id}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--muted)]">Override:</span>
            <select
              value={requirement.status}
              onChange={handleStatusChange}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--text)] focus:border-[var(--accent)] focus:outline-hidden transition cursor-pointer shadow-sm"
            >
              <option value="PASS">PASS</option>
              <option value="FAIL">FAIL</option>
              <option value="GAP">GAP</option>
            </select>
          </div>
        </div>
        
        {/* Quote Block */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--accent-bg)] p-4 border-l-2 border-l-[var(--accent)]">
          <p className="font-serif text-[13px] leading-relaxed text-[var(--text)] italic select-text">
            "{requirement.text}"
          </p>
        </div>
      </div>

      {/* Evidence matches list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
          <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--muted)]">Matched Evidence (Semantic)</span>
          <span className="text-[10px] font-semibold text-[var(--muted)]">{requirement.evidence.length} found</span>
        </div>

        {requirement.evidence.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-red-200/80 p-6 text-center space-y-1.5 bg-red-500/[0.01]">
            <span className="font-serif font-bold text-xs text-red-600">Compliance GAP Identified</span>
            <p className="text-[10px] text-[var(--muted)] leading-relaxed max-w-xs mx-auto font-sans font-medium">
              No previous capability or performance record in our library matches this requirement semantically. You must override or draft custom evidence in the proposal section.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requirement.evidence.map((ev) => (
              <div 
                key={ev.id} 
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs space-y-2 hover:border-[var(--accent)] transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="leading-snug">
                    <span className="font-mono text-[9px] font-bold text-[var(--accent)]">{ev.id}</span>
                    <h5 className="font-serif font-bold text-xs text-[var(--text)] mt-0.5">{ev.title}</h5>
                  </div>
                  <span className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[10px] border border-emerald-100/50 dark:border-emerald-900/10 px-2 py-0.5">
                    {ev.match}% Match
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-[var(--muted)] font-medium font-sans">
                  {ev.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
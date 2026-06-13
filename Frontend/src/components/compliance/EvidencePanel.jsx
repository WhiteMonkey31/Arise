import React from 'react'
import { usePatchCompliance } from '../../hooks/useCompliance'
import { toastSuccess } from '../ui/ToastProvider'

/**
 * EvidencePanel — shows requirement text + capability evidence matches.
 *
 * Receives the full compliance item object from CompliancePage
 * (already fetched via React Query) rather than re-fetching from the store.
 */
export default function EvidencePanel({ workspaceId, requirementId, item }) {
  const patchMutation = usePatchCompliance(workspaceId)

  if (!item) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--muted)] select-none">
        <div className="h-12 w-12 rounded-2xl bg-[var(--accent-bg)] border border-[var(--border)] flex items-center justify-center mb-3 text-[var(--accent)] opacity-60">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>
        <span className="font-serif font-bold text-xs text-[var(--text)]">Select a Requirement</span>
        <p className="text-[10px] mt-1.5 max-w-[200px] leading-relaxed font-sans font-medium">
          Click on any requirement row in the compliance table to inspect past performance evidence matches and override tags.
        </p>
      </div>
    )
  }

  const handleStatusChange = (e) => {
    const newStatus = e.target.value.toLowerCase()
    patchMutation.mutate(
      { itemId: item.id, payload: { status: newStatus } },
      { onSuccess: () => toastSuccess(`Status updated to ${e.target.value}`) }
    )
  }

  // Build evidence array from the capability object attached to this item
  const evidence = item.capability
    ? [{
        id: String(item.capability.id).slice(0, 8),
        title: item.capability.title,
        description: item.capability.certification
          ? `Certification: ${item.capability.certification}`
          : 'Past performance capability',
        match: item.match_score ? Math.round(item.match_score * 100) : null,
      }]
    : []

  const currentStatus = (item.status || 'gap').toUpperCase()

  return (
    <div className="space-y-6 fade-in select-none">
      {/* Requirement Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-[var(--accent)] text-xs">
            {String(item.requirement_id).slice(0, 8)}…
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--muted)]">Override:</span>
            <select
              value={currentStatus}
              onChange={handleStatusChange}
              disabled={patchMutation.isPending}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--text)] focus:border-[var(--accent)] focus:outline-hidden transition cursor-pointer shadow-sm disabled:opacity-50"
            >
              <option value="PASS">PASS</option>
              <option value="PARTIAL">PARTIAL</option>
              <option value="GAP">GAP</option>
            </select>
          </div>
        </div>

        {/* Requirement text */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--accent-bg)] p-4 border-l-2 border-l-[var(--accent)]">
          <p className="font-serif text-[13px] leading-relaxed text-[var(--text)] italic select-text">
            "{item.requirement_text}"
          </p>
        </div>

        {/* Category / notes */}
        {(item.requirement_category || item.notes) && (
          <div className="flex flex-wrap gap-2 text-[10px] text-[var(--muted)] font-medium">
            {item.requirement_category && (
              <span className="rounded-lg bg-stone-50 dark:bg-stone-900/30 px-2 py-0.5 border border-[var(--border)]">
                {item.requirement_category}
              </span>
            )}
            {item.notes && <span className="italic">Note: {item.notes}</span>}
          </div>
        )}
      </div>

      {/* Evidence matches */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
          <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--muted)]">
            Matched Evidence (Semantic)
          </span>
          <span className="text-[10px] font-semibold text-[var(--muted)]">{evidence.length} found</span>
        </div>

        {evidence.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-red-200/80 p-6 text-center space-y-1.5 bg-red-500/[0.01]">
            <span className="font-serif font-bold text-xs text-red-600">Compliance GAP Identified</span>
            <p className="text-[10px] text-[var(--muted)] leading-relaxed max-w-xs mx-auto font-sans font-medium">
              No previous capability or performance record matches this requirement. Override the status or draft custom evidence in the proposal section.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {evidence.map((ev, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs space-y-2 hover:border-[var(--accent)] transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="leading-snug">
                    <span className="font-mono text-[9px] font-bold text-[var(--accent)]">{ev.id}</span>
                    <h5 className="font-serif font-bold text-xs text-[var(--text)] mt-0.5">{ev.title}</h5>
                  </div>
                  {ev.match !== null && (
                    <span className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[10px] border border-emerald-100/50 dark:border-emerald-900/10 px-2 py-0.5">
                      {ev.match}% Match
                    </span>
                  )}
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

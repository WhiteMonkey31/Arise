import React from 'react'
import { useParams, Link } from 'react-router'
import { useWorkspaceDetail } from '../../hooks/useWorkspace'
import { useComplianceData } from '../../hooks/useCompliance'
import EmptyState from '../../components/ui/EmptyState'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import WinProbabilityGauge from '../../components/scoring/WinProbabilityGauge'

export default function WorkspaceOverview() {
  const { workspaceId } = useParams()
  const { data: workspace, isLoading } = useWorkspaceDetail(workspaceId)
  const { data: compliance } = useComplianceData(workspaceId)

  if (isLoading) return <LoadingSpinner />
  if (!workspace) return null

  const hasUploaded = compliance && compliance.total > 0

  if (!hasUploaded) {
    return (
      <EmptyState
        icon="compliance"
        title="No RFP analyzed yet"
        description="Upload your RFP document (PDF or DOCX). The engine will extract requirements and prepare AI draft sections."
      >
        <Link
          to={`/workspace/${workspace.id}/upload`}
          className="inline-flex items-center justify-center mt-5 rounded-2xl bg-(--accent) px-5 py-3 text-xs font-bold text-white shadow-[var(--shadow-sm)] hover:opacity-90 transition-all cursor-pointer"
        >
          Upload RFP Document
        </Link>
      </EmptyState>
    )
  }

  const winPct      = Math.round(compliance.compliance_pct ?? 0)
  const gapCount    = compliance.gap_count ?? 0
  const passCount   = compliance.pass_count ?? 0
  const totalReqs   = compliance.total ?? 0

  const matchLabel  = winPct >= 70 ? 'Strong Match' : winPct >= 50 ? 'Moderate Match' : 'Weak Match'

  return (
    <div className="space-y-8 fade-in select-none">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Win probability */}
        <div className="rounded-3xl border border-(--border) bg-(--surface) p-5 shadow-[var(--shadow-sm)] flex items-center justify-between gap-4 stagger-fade">
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">Win Probability</span>
            <div className="font-serif font-bold text-base text-(--text) mt-1">{matchLabel}</div>
            <p className="text-[10px] text-(--muted) font-medium font-sans">Based on compliance fit</p>
          </div>
          <WinProbabilityGauge score={winPct} />
        </div>

        {/* Requirements */}
        <div className="rounded-3xl border border-(--border) bg-(--surface) p-5 shadow-[var(--shadow-sm)] flex items-center justify-between gap-4 stagger-fade delay-100">
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">Requirements</span>
            <div className="font-serif font-bold text-base text-(--text) mt-1">{totalReqs} Identified</div>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-sans">
              {passCount} passing · {winPct}% fit
            </p>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08" />
            </svg>
          </div>
        </div>

        {/* Gaps */}
        <div className={`rounded-3xl border p-5 shadow-[var(--shadow-sm)] flex items-center justify-between gap-4 stagger-fade delay-200 ${
          gapCount > 0
            ? 'border-amber-200 dark:border-amber-900/30 bg-amber-50/40 dark:bg-amber-950/10'
            : 'border-(--border) bg-(--surface)'
        }`}>
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">Identified Gaps</span>
            <div className="font-serif font-bold text-base text-(--text) mt-1">
              {gapCount} {gapCount === 1 ? 'Gap' : 'Gaps'}
            </div>
            <p className={`text-[10px] font-bold font-sans ${
              gapCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {gapCount > 0 ? 'Requires attention' : 'Ready to draft'}
            </p>
          </div>
          <div className={`h-10 w-10 rounded-2xl flex items-center justify-center border shrink-0 ${
            gapCount > 0
              ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/20'
              : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/20'
          }`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Summary block */}
      <div className="rounded-3xl border border-(--border) bg-(--accent-bg) p-6 md:p-8 stagger-fade delay-200">
        <h3 className="text-[9px] uppercase font-bold tracking-wider text-(--accent) mb-3">Workspace Summary</h3>
        <p className="font-serif italic text-[14.5px] sm:text-base leading-relaxed text-(--text) text-balance">
          "{workspace.name}"
          {workspace.sector ? ` — ${workspace.sector}` : ''}
          {workspace.deadline ? `. Deadline: ${new Date(workspace.deadline).toLocaleDateString()}` : ''}
        </p>
      </div>

      {/* Quick nav */}
      <div className="flex flex-wrap gap-2.5 items-center stagger-fade delay-300">
        <span className="text-[10px] uppercase font-bold tracking-wider text-(--muted) mr-1">Quick Nav:</span>
        {[
          { label: 'Compliance Checklist', path: 'compliance' },
          { label: 'Proposal Editor',      path: 'proposal'   },
          { label: 'Win Score Analysis',   path: 'winscore'   },
        ].map(({ label, path }) => (
          <Link
            key={path}
            to={`/workspace/${workspace.id}/${path}`}
            className="rounded-xl border border-(--border) bg-(--surface) px-4 py-2 text-xs font-bold text-(--text) hover:bg-(--accent-bg) hover:border-(--accent) transition-all shadow-[var(--shadow-sm)]"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}

import React from 'react'
import { useParams, Link } from 'react-router'
import { useWorkspaceStore } from '../../store/workspaceStore'
import EmptyState from '../../components/ui/EmptyState'
import WinProbabilityGauge from '../../components/scoring/WinProbabilityGauge'

export default function WorkspaceOverview() {
  const { workspaceId } = useParams()
  const { workspaces } = useWorkspaceStore()
  
  const workspace = workspaces.find(w => w.id === workspaceId)

  if (!workspace) return null

  const hasUploaded = workspace.requirements && workspace.requirements.length > 0

  if (!hasUploaded) {
    return (
      <EmptyState
        icon="compliance"
        title="No RFP analyzed yet"
        description="To begin, upload your RFP document (PDF or DOCX). The engine will read the document, extract requirements, and prepare AI draft sections."
      >
        <Link 
          to={`/workspace/${workspace.id}/upload`}
          className="inline-flex items-center justify-center mt-5 rounded-2xl bg-(--accent) px-4.5 py-3 text-xs font-bold text-white shadow-sm hover:opacity-95 transition cursor-pointer"
        >
          Upload RFP Document
        </Link>
      </EmptyState>
    )
  }

  return (
    <div className="space-y-8 fade-in select-none">
      {/* KPI Stats widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Win Probability Card */}
        <div className="rounded-3xl border border-(--border) bg-(--surface) p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">Win Probability</span>
            <div className="font-serif font-bold text-lg text-(--text) mt-1">Strong Match</div>
            <p className="text-[10px] text-(--muted) font-medium font-sans">Estimated by scoring matrix</p>
          </div>
          <WinProbabilityGauge score={workspace.winProbability} />
        </div>

        {/* Requirements Card */}
        <div className="rounded-3xl border border-(--border) bg-(--surface) p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">Requirements</span>
            <div className="font-serif font-bold text-lg text-(--text) mt-1">{workspace.requirementsCount} Identified</div>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-sans">{workspace.complianceRate}% Initial Fit</p>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200/10 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08" />
            </svg>
          </div>
        </div>

        {/* Technology Gaps Card */}
        <div className="rounded-3xl border border-(--border) bg-(--surface) p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">Identified Gaps</span>
            <div className="font-serif font-bold text-lg text-(--text) mt-1">
              {workspace.gapCount} {workspace.gapCount === 1 ? 'Gap' : 'Gaps'}
            </div>
            <p className={`text-[10px] font-bold font-sans ${workspace.gapCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
              {workspace.gapCount > 0 ? 'Requires attention' : 'Ready to draft'}
            </p>
          </div>
          <div className={`h-10 w-10 rounded-2xl flex items-center justify-center border ${
            workspace.gapCount > 0 
              ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200/10' 
              : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200/10'
          }`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z" />
            </svg>
          </div>
        </div>
      </div>

      {/* AI Decision Summary */}
      <div className="rounded-3xl border border-(--border) bg-(--accent-bg) p-6 md:p-8">
        <h3 className="text-[9px] uppercase font-bold tracking-wider text-(--accent) mb-2.5">AI Executive Evaluation</h3>
        <p className="font-serif italic text-[14.5px] sm:text-base leading-relaxed text-(--text) text-balance">
          "{workspace.aiReasoning}"
        </p>
      </div>

      {/* Strengths & Risks Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="rounded-3xl border border-(--border) bg-(--surface) p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-(--border) pb-3">
            <div className="h-6 w-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/10 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
              </svg>
            </div>
            <h4 className="font-serif font-bold text-sm text-(--text)">Identified Bid Strengths</h4>
          </div>
          <ul className="space-y-3 text-xs leading-relaxed text-(--muted) font-medium font-sans">
            {workspace.strengths.map((str, idx) => (
              <li key={idx} className="flex gap-2 items-start">
                <span className="text-emerald-500 font-bold shrink-0">•</span>
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Risks */}
        <div className="rounded-3xl border border-(--border) bg-(--surface) p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-(--border) pb-3">
            <div className="h-6 w-6 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/10 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h4 className="font-serif font-bold text-sm text-(--text)">Potential Bid Risks</h4>
          </div>
          <ul className="space-y-3 text-xs leading-relaxed text-(--muted) font-medium font-sans">
            {workspace.risks.map((risk, idx) => (
              <li key={idx} className="flex gap-2 items-start">
                <span className="text-red-500 font-bold shrink-0">•</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Shortcuts */}
      <div className="flex flex-wrap gap-2.5 items-center pt-2">
        <span className="text-[10px] uppercase font-bold tracking-wider text-(--muted) mr-1">Quick Navigation:</span>
        <Link 
          to={`/workspace/${workspace.id}/compliance`}
          className="rounded-xl border border-(--border) bg-(--surface) px-4 py-2 text-xs font-bold text-(--text) hover:bg-(--accent-bg) transition shadow-sm cursor-pointer"
        >
          Compliance Checklist
        </Link>
        <Link 
          to={`/workspace/${workspace.id}/proposal`}
          className="rounded-xl border border-(--border) bg-(--surface) px-4 py-2 text-xs font-bold text-(--text) hover:bg-(--accent-bg) transition shadow-sm cursor-pointer"
        >
          Proposal Editor
        </Link>
        <Link 
          to={`/workspace/${workspace.id}/winscore`}
          className="rounded-xl border border-(--border) bg-(--surface) px-4 py-2 text-xs font-bold text-(--text) hover:bg-(--accent-bg) transition shadow-sm cursor-pointer"
        >
          Win Score Analysis
        </Link>
      </div>
    </div>
  )
}
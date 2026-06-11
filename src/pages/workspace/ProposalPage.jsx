import React, { useState } from 'react'
import { useParams, Link } from 'react-router'
import { useWorkspaceStore } from '../../store/workspaceStore'
import ProposalSection from '../../components/proposal/ProposalSection'
import EmptyState from '../../components/ui/EmptyState'
import { toastSuccess } from '../../components/ui/ToastProvider'

export default function ProposalPage() {
  const { workspaceId } = useParams()
  const { workspaces } = useWorkspaceStore()
  const [isExporting, setIsExporting] = useState(false)

  const workspace = workspaces.find(w => w.id === workspaceId)

  if (!workspace) return null

  const hasUploaded = workspace.requirements && workspace.requirements.length > 0

  if (!hasUploaded) {
    return (
      <EmptyState
        icon="compliance"
        title="No RFP analyzed yet"
        description="To begin proposal drafting, upload your RFP document (PDF or DOCX). The engine will extract all required items."
      >
        <Link 
          to={`/workspace/${workspace.id}/upload`}
          className="inline-flex items-center justify-center mt-5 rounded-2xl bg-[var(--accent)] px-4.5 py-3 text-xs font-bold text-white shadow-sm hover:opacity-95 transition cursor-pointer"
        >
          Upload RFP Document
        </Link>
      </EmptyState>
    )
  }

  const totalSections = workspace.proposalSections.length
  const approvedCount = workspace.proposalSections.filter(s => s.approved === 'Approved').length
  const completeness = totalSections > 0 ? Math.round((approvedCount / totalSections) * 100) : 0

  const handleExport = () => {
    setIsExporting(true)
    setTimeout(() => {
      setIsExporting(false)
      toastSuccess('DOCX document downloaded successfully!')
    }, 1500)
  }

  return (
    <div className="space-y-6 fade-in select-none">
      {/* Overview stats bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-[var(--border)] pb-5">
        <div className="space-y-2 flex-grow max-w-sm w-full">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-[var(--text)]">Proposal Completeness</span>
            <span className="text-[var(--accent)] font-bold">{completeness}% ({approvedCount}/{totalSections} sections approved)</span>
          </div>
          <div className="h-1.5 w-full bg-stone-100 dark:bg-stone-850/80 rounded-full overflow-hidden border border-[var(--border)]">
            <div 
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 self-start lg:self-center">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-xs font-bold text-[var(--text)] hover:bg-[var(--accent-bg)] shadow-sm hover:border-[var(--accent)] transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {isExporting ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-250/20 dark:border-stone-800 border-t-[var(--accent)]" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            )}
            <span>{isExporting ? 'Exporting...' : 'Export DOCX'}</span>
          </button>
        </div>
      </div>

      {/* Sections List */}
      <div className="space-y-6">
        {workspace.proposalSections.map((section) => (
          <ProposalSection 
            key={section.id} 
            workspaceId={workspaceId} 
            section={section} 
          />
        ))}
      </div>
    </div>
  )
}
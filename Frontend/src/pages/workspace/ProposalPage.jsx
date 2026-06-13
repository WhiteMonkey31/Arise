import React from 'react'
import { useParams, Link } from 'react-router'
import { useProposals, useGenerateProposals } from '../../hooks/useProposal'
import { useExport } from '../../hooks/useExport'
import { useJobPoller } from '../../hooks/useJobPoller'
import ProposalSection from '../../components/proposal/ProposalSection'
import EmptyState from '../../components/ui/EmptyState'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function ProposalPage() {
  const { workspaceId } = useParams()
  const { data: proposals = [], isLoading } = useProposals(workspaceId)
  const generateMutation = useGenerateProposals(workspaceId)
  const { exportDoc, isExporting } = useExport(workspaceId)

  // Track the generate-job if one was kicked off
  const [generateJobId, setGenerateJobId] = React.useState(null)
  const { isDone: genDone, progress: genProgress, status: genStatus } = useJobPoller(generateJobId)

  React.useEffect(() => {
    if (genDone) setGenerateJobId(null)
  }, [genDone])

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>

  if (proposals.length === 0 && !generateJobId) {
    return (
      <EmptyState
        icon="compliance"
        title="No proposal sections yet"
        description="Generate AI-drafted sections for all requirements in this workspace, or upload an RFP first."
      >
        <div className="flex gap-3 mt-5">
          <Link
            to={`/workspace/${workspaceId}/upload`}
            className="inline-flex items-center justify-center rounded-2xl border border-(--border) bg-(--surface) px-4.5 py-3 text-xs font-bold text-(--text) shadow-sm hover:bg-(--accent-bg) transition cursor-pointer"
          >
            Upload RFP
          </Link>
          <button
            onClick={() => generateMutation.mutate(undefined, {
              onSuccess: (data) => setGenerateJobId(data.job_id),
            })}
            disabled={generateMutation.isPending}
            className="inline-flex items-center justify-center rounded-2xl bg-(--accent) px-4.5 py-3 text-xs font-bold text-white shadow-sm hover:opacity-95 transition cursor-pointer disabled:opacity-60"
          >
            {generateMutation.isPending ? 'Queuing…' : 'Generate All Sections'}
          </button>
        </div>
      </EmptyState>
    )
  }

  const totalSections = proposals.length
  const approvedCount = proposals.filter((s) => s.status === 'approved').length
  const completeness = totalSections > 0 ? Math.round((approvedCount / totalSections) * 100) : 0

  return (
    <div className="space-y-6 fade-in select-none">
      {/* Overview stats bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-(--border) pb-5">
        <div className="space-y-2 grow max-w-sm w-full">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-(--text)">Proposal Completeness</span>
            <span className="text-(--accent) font-bold">{completeness}% ({approvedCount}/{totalSections} sections approved)</span>
          </div>
          <div className="h-1.5 w-full bg-stone-100 dark:bg-stone-850/80 rounded-full overflow-hidden border border-(--border)">
            <div className="h-full bg-(--accent) rounded-full transition-all duration-300" style={{ width: `${completeness}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-center">
          {/* Generate button */}
          <button
            onClick={() => generateMutation.mutate(undefined, {
              onSuccess: (data) => setGenerateJobId(data.job_id),
            })}
            disabled={generateMutation.isPending || !!generateJobId}
            className="rounded-xl border border-(--border) bg-(--surface) px-4 py-2.5 text-xs font-bold text-(--text) hover:bg-(--accent-bg) shadow-sm hover:border-(--accent) transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {generateJobId ? `Generating… ${genProgress}%` : 'Regenerate All'}
          </button>

          {/* Export button */}
          <button
            onClick={exportDoc}
            disabled={isExporting}
            className="rounded-xl border border-(--border) bg-(--surface) px-4 py-2.5 text-xs font-bold text-(--text) hover:bg-(--accent-bg) shadow-sm hover:border-(--accent) transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {isExporting ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-250/20 dark:border-stone-800 border-t-(--accent)" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            )}
            <span>{isExporting ? 'Exporting…' : 'Export DOCX'}</span>
          </button>
        </div>
      </div>

      {/* Sections List */}
      <div className="space-y-6">
        {proposals.map((section) => (
          <ProposalSection
            key={section.id}
            workspaceId={workspaceId}
            section={{
              id: section.id,
              requirementId: section.requirement_id,
              heading: section.section_title,
              text: section.current_content || section.ai_draft || '',
              wordCount: section.word_count,
              approved: section.status === 'approved' ? 'Approved'
                      : section.status === 'pending' ? 'Pending'
                      : 'Draft',
              qualityBadge: section.quality_badge,
            }}
          />
        ))}
      </div>
    </div>
  )
}

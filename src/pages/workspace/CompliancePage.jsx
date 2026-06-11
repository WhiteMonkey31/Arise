import React, { useState } from 'react'
import { useParams, Link } from 'react-router'
import { useWorkspaceStore } from '../../store/workspaceStore'
import ComplianceTable from '../../components/compliance/ComplianceTable'
import EvidencePanel from '../../components/compliance/EvidencePanel'
import EmptyState from '../../components/ui/EmptyState'

export default function CompliancePage() {
  const { workspaceId } = useParams()
  const { workspaces, selectedRequirementId, setSelectedRequirement } = useWorkspaceStore()
  
  const workspace = workspaces.find(w => w.id === workspaceId)
  const [filter, setFilter] = useState('All')

  if (!workspace) return null

  const hasUploaded = workspace.requirements && workspace.requirements.length > 0

  if (!hasUploaded) {
    return (
      <EmptyState
        icon="compliance"
        title="No RFP analyzed yet"
        description="To begin compliance evaluation, upload your RFP document (PDF or DOCX). The engine will extract all required items."
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

  const filteredReqs = workspace.requirements.filter((req) => {
    if (filter === 'All') return true
    return req.status === filter
  })

  const totalCount = workspace.requirements.length
  const passCount = workspace.requirements.filter(r => r.status === 'PASS').length
  const gapCount = workspace.requirements.filter(r => r.status === 'GAP').length
  const failCount = workspace.requirements.filter(r => r.status === 'FAIL').length

  const filters = ['All', 'PASS', 'GAP', 'FAIL']

  return (
    <div className="space-y-6 fade-in select-none">
      {/* Title & Summary */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-[var(--border)] pb-4">
        <div>
          <h3 className="font-serif font-bold text-lg text-[var(--text)]">Compliance Matrix</h3>
          <p className="text-xs text-[var(--muted)] mt-1 font-medium font-sans">Review requirements extracted from the RFP and check capability alignments.</p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1 bg-stone-100 dark:bg-stone-850 p-1 rounded-2xl border border-[var(--border)] max-w-max self-start lg:self-center">
          {filters.map((f) => {
            const count = f === 'All' ? totalCount : f === 'PASS' ? passCount : f === 'GAP' ? gapCount : failCount
            const isActive = filter === f
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold tracking-tight transition cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <span>{f}</span>
                <span className={`text-[9px] rounded-md px-1.5 py-0.2 ${isActive ? 'bg-white/20 text-white' : 'bg-stone-200 dark:bg-stone-800 text-[var(--muted)]'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Split Pane Layout */}
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Table - 2/3 Width */}
        <div className="w-full xl:w-2/3 flex-shrink-0">
          <ComplianceTable
            requirements={filteredReqs}
            selectedId={selectedRequirementId}
            onSelect={setSelectedRequirement}
          />
        </div>

        {/* Evidence Panel - 1/3 Width */}
        <div className="w-full xl:w-1/3 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs h-[500px] overflow-y-auto">
          <EvidencePanel
            workspaceId={workspaceId}
            requirementId={selectedRequirementId}
          />
        </div>
      </div>
    </div>
  )
}
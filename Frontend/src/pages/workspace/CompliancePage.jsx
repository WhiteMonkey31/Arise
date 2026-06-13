import React, { useState } from 'react'
import { useParams, Link } from 'react-router'
import { useComplianceData, usePatchCompliance } from '../../hooks/useCompliance'
import ComplianceTable from '../../components/compliance/ComplianceTable'
import EvidencePanel from '../../components/compliance/EvidencePanel'
import EmptyState from '../../components/ui/EmptyState'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function CompliancePage() {
  const { workspaceId } = useParams()
  const { data: compliance, isLoading } = useComplianceData(workspaceId)
  const patchMutation = usePatchCompliance(workspaceId)

  const [filter, setFilter] = useState('All')
  const [selectedItemId, setSelectedItemId] = useState(null)

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>

  if (!compliance || compliance.total === 0) {
    return (
      <EmptyState
        icon="compliance"
        title="No RFP analyzed yet"
        description="To begin compliance evaluation, upload your RFP document (PDF or DOCX). The engine will extract all required items."
      >
        <Link
          to={`/workspace/${workspaceId}/upload`}
          className="inline-flex items-center justify-center mt-5 rounded-2xl bg-(--accent) px-4.5 py-3 text-xs font-bold text-white shadow-sm hover:opacity-95 transition cursor-pointer"
        >
          Upload RFP Document
        </Link>
      </EmptyState>
    )
  }

  const { items, total, pass_count, gap_count } = compliance
  const partial_count = compliance.partial_count ?? 0

  const filteredItems = items.filter((item) => {
    if (filter === 'All') return true
    return item.status.toUpperCase() === filter
  })

  const filters = ['All', 'PASS', 'GAP', 'PARTIAL']

  const countFor = (f) => {
    if (f === 'All') return total
    if (f === 'PASS') return pass_count
    if (f === 'GAP') return gap_count
    if (f === 'PARTIAL') return partial_count
    return 0
  }

  const selectedItem = items.find((i) => i.id === selectedItemId)

  return (
    <div className="space-y-6 fade-in select-none">
      {/* Title & Summary */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-(--border) pb-4">
        <div>
          <h3 className="font-serif font-bold text-lg text-(--text)">Compliance Matrix</h3>
          <p className="text-xs text-(--muted) mt-1 font-medium font-sans">
            Review requirements extracted from the RFP and check capability alignments.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1 bg-stone-100 dark:bg-stone-850 p-1 rounded-2xl border border-(--border) max-w-max self-start lg:self-center">
          {filters.map((f) => {
            const count = countFor(f)
            const isActive = filter === f
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold tracking-tight transition cursor-pointer flex items-center gap-1.5 ${
                  isActive ? 'bg-(--accent) text-white shadow-sm' : 'text-(--muted) hover:text-(--text)'
                }`}
              >
                <span>{f}</span>
                <span className={`text-[9px] rounded-md px-1.5 py-0.2 ${isActive ? 'bg-white/20 text-white' : 'bg-stone-200 dark:bg-stone-800 text-(--muted)'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Split Pane Layout */}
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Table */}
        <div className="w-full xl:w-2/3 shrink-0">
          <ComplianceTable
            requirements={filteredItems.map((item) => ({
              id: item.id,
              text: item.requirement_text,
              category: item.requirement_category,
              matchScore: item.match_score,
              status: item.status.toUpperCase(),
              evidence: item.capability
                ? [{ id: item.capability.id, title: item.capability.title, description: '', match: item.match_score }]
                : [],
            }))}
            selectedId={selectedItemId}
            onSelect={setSelectedItemId}
          />
        </div>

        {/* Evidence Panel */}
        <div className="w-full xl:w-1/3 rounded-3xl border border-(--border) bg-(--surface) p-5 shadow-xs h-125 overflow-y-auto">
          <EvidencePanel
            workspaceId={workspaceId}
            requirementId={selectedItemId}
            item={selectedItem}
          />
        </div>
      </div>
    </div>
  )
}

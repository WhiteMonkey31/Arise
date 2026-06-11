import React, { useState } from 'react'
import { useWorkspaceStore } from '../store/workspaceStore'
import WorkspaceCard from '../components/workspace/WorkspaceCard'
import CreateWorkspaceModal from '../components/workspace/CreateWorkspaceModal'
import EmptyState from '../components/ui/EmptyState'

export default function Dashboard() {
  const { workspaces } = useWorkspaceStore()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const totalRFPs = workspaces.length
  const avgWin = totalRFPs > 0 
    ? Math.round(workspaces.reduce((acc, curr) => acc + curr.winProbability, 0) / totalRFPs)
    : 0
  const pendingSubmissions = workspaces.filter(w => w.status !== 'Submitted').length
  const avgCompliance = totalRFPs > 0
    ? Math.round(workspaces.reduce((acc, curr) => acc + curr.complianceRate, 0) / totalRFPs)
    : 0

  return (
    <div className="space-y-8 fade-in select-none">
      {/* Title & Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif font-bold text-2xl text-(--text) tracking-tight">RFP Workspaces</h2>
          <p className="text-xs text-(--muted) mt-1 font-medium">Create and manage your proposal responses, compliance checks, and AI drafts.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-(--accent) hover:opacity-95 px-4.5 py-3 text-xs font-bold text-white shadow-sm transition cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New RFP Workspace
        </button>
      </div>

      {/* Summary Stats Grid */}
      {totalRFPs > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-3xl border border-(--border) bg-(--surface) p-5 shadow-xs flex flex-col justify-between min-h-25 transition-colors duration-200">
            <span className="text-[10px] uppercase font-bold tracking-wider text-(--muted)">Active Portfolios</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-serif font-bold text-3xl text-(--text)">{totalRFPs}</span>
              <span className="text-xs text-(--muted) font-medium">Opportunities</span>
            </div>
          </div>
          <div className="rounded-3xl border border-(--border) bg-(--surface) p-5 shadow-xs flex flex-col justify-between min-h-25 transition-colors duration-200">
            <span className="text-[10px] uppercase font-bold tracking-wider text-(--muted)">Average Win Chance</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-serif font-bold text-3xl text-(--text)">{avgWin}%</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-900/10">Strong</span>
            </div>
          </div>
          <div className="rounded-3xl border border-(--border) bg-(--surface) p-5 shadow-xs flex flex-col justify-between min-h-25 transition-colors duration-200">
            <span className="text-[10px] uppercase font-bold tracking-wider text-(--muted)">Pending Responses</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-serif font-bold text-3xl text-(--text)">{pendingSubmissions}</span>
              <span className="text-xs text-(--muted) font-medium">In Draft/Review</span>
            </div>
          </div>
          <div className="rounded-3xl border border-(--border) bg-(--surface) p-5 shadow-xs flex flex-col justify-between min-h-25 transition-colors duration-200">
            <span className="text-[10px] uppercase font-bold tracking-wider text-(--muted)">Average Compliance</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-serif font-bold text-3xl text-(--text)">{avgCompliance}%</span>
              <span className="text-xs text-(--muted) font-medium">Standard Fit</span>
            </div>
          </div>
        </div>
      )}

      {/* Workspace Cards Grid */}
      {totalRFPs === 0 ? (
        <EmptyState
          icon="workspace"
          title="No RFP Workspaces yet"
          description="Create your first workspace to upload an RFP document, analyze compliance requirements, and build your proposal draft."
          actionLabel="Create Workspace"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace) => (
            <WorkspaceCard key={workspace.id} workspace={workspace} />
          ))}
        </div>
      )}

      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  )
}
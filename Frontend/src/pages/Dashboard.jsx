import React, { useState } from 'react'
import { useWorkspaces } from '../hooks/useWorkspace'
import WorkspaceCard from '../components/workspace/WorkspaceCard'
import CreateWorkspaceModal from '../components/workspace/CreateWorkspaceModal'
import EmptyState from '../components/ui/EmptyState'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const KPI_CARD_VARIANTS = [
  {
    label: 'Active Portfolios',
    sub: 'Opportunities',
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/20',
  },
  {
    label: 'Average Win Chance',
    sub: null,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
  },
  {
    label: 'Pending Responses',
    sub: 'In Draft / Review',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
  },
  {
    label: 'Sectors Active',
    sub: 'Unique sectors',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/20',
  },
]

export default function Dashboard() {
  const { data: workspaces = [], isLoading } = useWorkspaces()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const totalRFPs = workspaces.length
  const avgWin = totalRFPs > 0
    ? Math.round(workspaces.reduce((acc, w) => acc + (w.win_probability ?? 0), 0) / totalRFPs)
    : 0
  const pendingCount = workspaces.filter(w => w.status !== 'submitted').length
  const sectors = new Set(workspaces.map(w => w.sector).filter(Boolean)).size

  const kpiValues = [totalRFPs, `${avgWin}%`, pendingCount, sectors]

  return (
    <div className="space-y-8 fade-in select-none">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif font-bold text-2xl text-(--text) tracking-tight">RFP Workspaces</h2>
          <p className="text-xs text-(--muted) mt-1 font-medium">
            Create and manage proposal responses, compliance checks, and AI drafts.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-(--accent) hover:opacity-90 px-4.5 py-3 text-xs font-bold text-white shadow-[var(--shadow-sm)] transition-all cursor-pointer hover:-translate-y-0.5 duration-200"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New RFP Workspace
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* KPI grid */}
          {totalRFPs > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {KPI_CARD_VARIANTS.map((v, i) => (
                <div
                  key={v.label}
                  className="rounded-3xl border border-(--border) bg-(--surface) p-5 shadow-[var(--shadow-sm)] flex flex-col justify-between min-h-24 stagger-fade"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider text-(--muted)">{v.label}</span>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className={`font-serif font-bold text-3xl ${v.color}`}>{kpiValues[i]}</span>
                    {v.sub && <span className="text-xs text-(--muted) font-medium">{v.sub}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Workspace cards */}
          {totalRFPs === 0 ? (
            <EmptyState
              icon="workspace"
              title="No RFP Workspaces yet"
              description="Create your first workspace to upload an RFP, analyze compliance, and build a proposal draft."
              actionLabel="Create Workspace"
              onAction={() => setShowCreateModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {workspaces.map((workspace, idx) => (
                <div key={workspace.id} className="stagger-fade" style={{ animationDelay: `${idx * 60 + 240}ms` }}>
                  <WorkspaceCard workspace={workspace} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  )
}

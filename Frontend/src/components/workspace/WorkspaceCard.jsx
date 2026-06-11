import React, { useState } from 'react'
import { Link } from 'react-router'
import SectorBadge from '../ui/SectorBadge'
import DeadlineChip from '../ui/DeadlineChip'
import WinProbabilityGauge from '../scoring/WinProbabilityGauge'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { toastSuccess } from '../ui/ToastProvider'

export default function WorkspaceCard({ workspace }) {
  const { deleteWorkspace, duplicateWorkspace } = useWorkspaceStore()
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const handleDelete = () => {
    deleteWorkspace(workspace.id)
    toastSuccess('Workspace deleted successfully')
  }

  const handleDuplicate = (e) => {
    e.preventDefault()
    e.stopPropagation()
    duplicateWorkspace(workspace.id)
    toastSuccess('Workspace duplicated')
    setShowMenu(false)
  }

  return (
    <div className="group relative rounded-3xl border border-(--border) bg-(--surface) p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-50 glow-hover">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <SectorBadge sector={workspace.sector} />
            <DeadlineChip deadline={workspace.deadline} />
          </div>
          <Link 
            to={`/workspace/${workspace.id}/overview`}
            className="font-serif font-bold text-base block text-(--text) hover:text-(--accent) transition-colors leading-snug line-clamp-2 mt-2"
          >
            {workspace.name}
          </Link>
        </div>

        {/* Menu Dropdown Trigger */}
        <div className="relative shrink-0">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="rounded-xl p-1.5 text-(--muted) hover:text-(--text) hover:bg-(--accent-bg) border border-transparent hover:border-(--border) transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
            </svg>
          </button>
          
          {showMenu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-1 w-36 rounded-2xl border border-(--border) bg-(--surface) p-1.5 shadow-lg z-30 flex flex-col gap-0.5 fade-in">
                <Link
                  to={`/workspace/${workspace.id}/overview`}
                  className="rounded-xl px-3 py-2 text-xs font-bold text-(--text) hover:bg-(--accent-bg) block text-left"
                >
                  Open
                </Link>
                <button
                  onClick={handleDuplicate}
                  className="w-full text-left rounded-xl px-3 py-2 text-xs font-bold text-(--text) hover:bg-(--accent-bg) cursor-pointer"
                >
                  Duplicate
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowConfirmDelete(true)
                    setShowMenu(false)
                  }}
                  className="w-full text-left rounded-xl px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between border-t border-(--border) pt-4 mt-4">
        <div className="space-y-0.5 leading-none">
          <span className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">Status</span>
          <div className="text-xs font-bold text-(--text) flex items-center gap-1.5 mt-0.5">
            <span className={`h-1.5 w-1.5 rounded-full ${
              workspace.status === 'Submitted' ? 'bg-emerald-500' :
              workspace.status === 'In Review' ? 'bg-indigo-500' :
              workspace.status === 'Analysing' ? 'bg-purple-500' : 'bg-stone-400'
            }`} />
            {workspace.status}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right leading-none space-y-0.5">
            <span className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">Budget</span>
            <div className="text-xs font-bold text-(--text) mt-0.5">
              {workspace.budget}
            </div>
          </div>
          <WinProbabilityGauge score={workspace.winProbability} />
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Workspace"
        message={`Are you sure you want to permanently delete the workspace "${workspace.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
      />
    </div>
  )
}
import React, { useState } from 'react'
import { Link } from 'react-router'
import SectorBadge from '../ui/SectorBadge'
import DeadlineChip from '../ui/DeadlineChip'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useDeleteWorkspace } from '../../hooks/useWorkspace'
import { toastSuccess } from '../ui/ToastProvider'

const STATUS_DOT = {
  draft:     'bg-stone-400',
  analysing: 'bg-indigo-500',
  in_review: 'bg-purple-500',
  submitted: 'bg-emerald-500',
}

const STATUS_BADGE = {
  draft:     'text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700',
  analysing: 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/30',
  in_review: 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/30',
  submitted: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/30',
}

export default function WorkspaceCard({ workspace }) {
  const deleteMutation = useDeleteWorkspace()
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const handleDelete = () => {
    deleteMutation.mutate(workspace.id, {
      onSuccess: () => toastSuccess('Workspace deleted'),
    })
  }

  const statusKey = workspace.status || 'draft'
  const statusLabel = statusKey.charAt(0).toUpperCase() + statusKey.slice(1).replace('_', ' ')

  return (
    <div className="group relative rounded-3xl border border-(--border) bg-(--surface) p-6 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between min-h-48 fade-in">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <SectorBadge sector={workspace.sector} />
            <DeadlineChip deadline={workspace.deadline} />
          </div>
          <Link
            to={`/workspace/${workspace.id}/overview`}
            className="font-serif font-bold text-base block text-(--text) hover:text-(--accent) transition-colors leading-snug line-clamp-2"
          >
            {workspace.name}
          </Link>
        </div>

        {/* Kebab menu */}
        <div className="relative shrink-0">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(!showMenu) }}
            className="rounded-xl p-1.5 text-(--muted) hover:text-(--text) hover:bg-(--accent-bg) border border-transparent hover:border-(--border) transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-1.5 w-36 rounded-2xl border border-(--border) bg-(--surface) p-1.5 shadow-[var(--shadow-md)] z-30 flex flex-col gap-0.5 slide-up">
                <Link
                  to={`/workspace/${workspace.id}/overview`}
                  className="rounded-xl px-3 py-2 text-xs font-bold text-(--text) hover:bg-(--accent-bg) block transition-colors"
                  onClick={() => setShowMenu(false)}
                >
                  Open
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirmDelete(true); setShowMenu(false) }}
                  className="w-full text-left rounded-xl px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-colors"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-(--border) pt-4 mt-4">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[statusKey] || 'bg-stone-400'}`} />
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${STATUS_BADGE[statusKey] || STATUS_BADGE.draft}`}>
            {statusLabel}
          </span>
        </div>
        <span className="text-[10px] text-(--muted) font-semibold">
          {workspace.created_at ? new Date(workspace.created_at).toLocaleDateString() : '—'}
        </span>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Workspace"
        message={`Permanently delete "${workspace.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
      />
    </div>
  )
}

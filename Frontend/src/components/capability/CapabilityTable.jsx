import React, { useState } from 'react'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { toastSuccess } from '../ui/ToastProvider'

export default function CapabilityTable({ capabilities, onEdit }) {
  const { deleteCapability } = useWorkspaceStore()
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [targetCapId, setTargetCapId] = useState(null)

  const formatCurrency = (val) => {
    if (!val) return '—'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
  }

  const handleDelete = () => {
    if (targetCapId) {
      deleteCapability(targetCapId)
      toastSuccess('Capability record deleted')
      setTargetCapId(null)
    }
  }

  return (
    <div className="overflow-x-auto border border-[var(--border)] rounded-3xl bg-[var(--surface)] shadow-xs transition-all duration-200">
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--accent-bg)]/20 text-[var(--muted)] font-bold uppercase tracking-wider text-[9px] sm:text-[10px]">
            <th className="px-5 py-4">ID</th>
            <th className="px-5 py-4">Domain Area</th>
            <th className="px-5 py-4">Certification</th>
            <th className="px-5 py-4">Year</th>
            <th className="px-5 py-4">Client / Industry</th>
            <th className="px-5 py-4">Value</th>
            <th className="px-5 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)] font-medium text-[var(--text)]">
          {capabilities.length === 0 ? (
            <tr>
              <td colSpan="7" className="px-5 py-8 text-center text-[var(--muted)]">
                No matching records found.
              </td>
            </tr>
          ) : (
            capabilities.map((cap) => (
              <tr 
                key={cap.id}
                className="hover:bg-[var(--accent-bg)]/30 transition-colors cursor-pointer group"
                onClick={() => onEdit(cap)}
              >
                <td className="px-5 py-4 font-mono font-bold text-[var(--accent)]">{cap.id}</td>
                <td className="px-5 py-4 max-w-xs sm:max-w-md">
                  <div className="font-serif font-bold text-xs sm:text-sm leading-snug">{cap.domain}</div>
                  <div className="text-[10px] text-[var(--muted)] line-clamp-1 mt-0.5 font-sans font-medium">{cap.summary}</div>
                </td>
                <td className="px-5 py-4">
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border whitespace-nowrap ${
                    cap.certification === 'None' 
                      ? 'bg-stone-50 dark:bg-stone-900/30 text-stone-600 dark:text-stone-400 border-stone-100 dark:border-stone-800'
                      : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/30'
                  }`}>
                    {cap.certification}
                  </span>
                </td>
                <td className="px-5 py-4">{cap.year}</td>
                <td className="px-5 py-4">{cap.clientType || '—'}</td>
                <td className="px-5 py-4 font-semibold">{formatCurrency(cap.contractValue)}</td>
                <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => onEdit(cap)}
                      className="rounded-xl p-1.5 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--accent-bg)] border border-transparent hover:border-[var(--border)] transition cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setTargetCapId(cap.id)
                        setShowConfirmDelete(true)
                      }}
                      className="rounded-xl p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-200 transition cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <ConfirmDialog
        isOpen={showConfirmDelete}
        onClose={() => {
          setShowConfirmDelete(false)
          setTargetCapId(null)
        }}
        onConfirm={handleDelete}
        title="Delete Capability Record"
        message="Are you sure you want to delete this capability record? It will be permanently removed from the past performance database."
        confirmLabel="Delete"
        isDestructive
      />
    </div>
  )
}
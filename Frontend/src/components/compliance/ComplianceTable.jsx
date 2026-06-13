import React from 'react'
import StatusBadge from './StatusBadge'

export default function ComplianceTable({ requirements, selectedId, onSelect }) {
  return (
    <div className="overflow-x-auto border border-(--border) rounded-3xl bg-(--surface) shadow-[var(--shadow-sm)]">
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="border-b border-(--border) bg-(--accent-bg)/30 text-(--muted) font-bold uppercase tracking-wider text-[9px] sm:text-[10px]">
            <th className="px-5 py-4">Requirement</th>
            <th className="px-5 py-4 w-28">Category</th>
            <th className="px-5 py-4 w-24">Type</th>
            <th className="px-5 py-4 w-28">Fit</th>
            <th className="px-5 py-4 w-24 text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-(--border) font-medium text-(--text)">
          {requirements.length === 0 ? (
            <tr>
              <td colSpan="5" className="px-5 py-10 text-center text-(--muted) text-xs">
                No matching requirements found.
              </td>
            </tr>
          ) : (
            requirements.map((req, idx) => {
              const isSelected = req.id === selectedId
              return (
                <tr
                  key={req.id}
                  onClick={() => onSelect(req.id)}
                  className={`cursor-pointer transition-all duration-150 stagger-fade ${
                    isSelected
                      ? 'bg-(--accent-bg)/50 dark:bg-(--accent-bg)/30'
                      : 'hover:bg-(--accent-bg)/20'
                  }`}
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <td className="px-5 py-4">
                    <p className="font-serif font-bold text-xs sm:text-[13px] leading-relaxed text-(--text) line-clamp-2">
                      {req.text}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-lg bg-stone-50 dark:bg-stone-900/40 px-2 py-0.5 font-semibold text-[10px] text-(--muted) border border-(--border)">
                      {req.category || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {req.mandatory ? (
                      <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-lg border border-red-100 dark:border-red-900/20">
                        Mandatory
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-(--muted)">Optional</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-14 bg-stone-100 dark:bg-stone-800 border border-(--border) rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            (req.matchScore ?? 0) >= 80 ? 'bg-emerald-500'
                            : (req.matchScore ?? 0) >= 50 ? 'bg-amber-500'
                            : 'bg-red-500'
                          }`}
                          style={{ width: `${req.matchScore ?? 0}%`, transitionDelay: `${idx * 40 + 100}ms` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] font-semibold text-(--muted)">{req.matchScore ?? 0}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <StatusBadge status={req.status} />
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

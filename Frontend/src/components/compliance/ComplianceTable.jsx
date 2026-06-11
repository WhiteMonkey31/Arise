import React from 'react'
import StatusBadge from './StatusBadge'

export default function ComplianceTable({ requirements, selectedId, onSelect }) {
  return (
    <div className="overflow-x-auto border border-[var(--border)] rounded-3xl bg-[var(--surface)] shadow-xs transition-all duration-200">
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--accent-bg)]/20 text-[var(--muted)] font-bold uppercase tracking-wider text-[9px] sm:text-[10px]">
            <th className="px-5 py-4 w-16">ID</th>
            <th className="px-5 py-4">Requirement</th>
            <th className="px-5 py-4 w-28">Category</th>
            <th className="px-5 py-4 w-24">Type</th>
            <th className="px-5 py-4 w-28">Capability Fit</th>
            <th className="px-5 py-4 w-24 text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)] font-medium text-[var(--text)]">
          {requirements.length === 0 ? (
            <tr>
              <td colSpan="6" className="px-5 py-8 text-center text-[var(--muted)]">
                No matching requirements found.
              </td>
            </tr>
          ) : (
            requirements.map((req) => {
              const isSelected = req.id === selectedId
              return (
                <tr 
                  key={req.id}
                  onClick={() => onSelect(req.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-[var(--accent-bg)]/60 hover:bg-[var(--accent-bg)]/70' 
                      : 'hover:bg-[var(--accent-bg)]/20'
                  }`}
                >
                  <td className="px-5 py-4 font-mono font-bold text-[var(--accent)]">{req.id}</td>
                  <td className="px-5 py-4">
                    <p className="font-serif font-bold text-xs sm:text-[13px] leading-relaxed text-[var(--text)]">{req.text}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-lg bg-stone-50 dark:bg-stone-900/30 px-2 py-0.5 font-semibold text-[10px] text-[var(--muted)] border border-[var(--border)]">
                      {req.category}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {req.mandatory ? (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-lg border border-red-100/50 dark:border-red-900/10">
                        Mandatory
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-[var(--muted)]">
                        Optional
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-stone-100 dark:bg-stone-850/80 border border-[var(--border)] rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            req.matchScore >= 80 
                              ? 'bg-emerald-500' 
                              : req.matchScore >= 50 
                              ? 'bg-amber-500' 
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${req.matchScore}%` }}
                        />
                      </div>
                      <span className="font-semibold font-mono text-[10px]">{req.matchScore}%</span>
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
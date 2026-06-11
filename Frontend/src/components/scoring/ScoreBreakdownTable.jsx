import React from 'react'

export default function ScoreBreakdownTable({ scoreBreakdown }) {
  if (!scoreBreakdown) return null

  return (
    <div className="overflow-x-auto border border-[var(--border)] rounded-3xl bg-[var(--surface)] shadow-xs transition-all duration-200">
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--accent-bg)]/20 text-[var(--muted)] font-bold uppercase tracking-wider text-[9px] sm:text-[10px]">
            <th className="px-5 py-4">Scoring Parameter</th>
            <th className="px-5 py-4 w-28 text-center">Workspace Score</th>
            <th className="px-5 py-4 w-28 text-center">Historical Avg</th>
            <th className="px-5 py-4 w-24 text-right">Comparison</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)] font-medium text-[var(--text)]">
          {scoreBreakdown.map((row) => {
            const isPositive = row.delta >= 0
            return (
              <tr key={row.name} className="hover:bg-[var(--accent-bg)]/20 transition-colors">
                <td className="px-5 py-4 font-serif font-bold text-xs sm:text-sm">{row.name}</td>
                <td className="px-5 py-4 text-center font-mono font-bold">{row.score}%</td>
                <td className="px-5 py-4 text-center font-mono text-[var(--muted)]">{row.benchmark}%</td>
                <td className="px-5 py-4 text-right">
                  {row.delta === 0 ? (
                    <span className="text-[10px] text-[var(--muted)] font-bold font-sans">On Par</span>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border font-sans ${
                      isPositive
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/10'
                        : 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-300 border-red-100 dark:border-red-900/10'
                    }`}>
                      {isPositive ? `+${row.delta}%` : `${row.delta}%`}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
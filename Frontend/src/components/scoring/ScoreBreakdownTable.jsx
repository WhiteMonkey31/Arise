import React from 'react'

export default function ScoreBreakdownTable({ scoreBreakdown }) {
  if (!scoreBreakdown) return null

  return (
    <div className="overflow-x-auto border border-(--border) rounded-3xl bg-(--surface) shadow-[var(--shadow-sm)]">
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="border-b border-(--border) bg-(--accent-bg)/30 text-(--muted) font-bold uppercase tracking-wider text-[9px] sm:text-[10px]">
            <th className="px-5 py-4">Scoring Parameter</th>
            <th className="px-5 py-4 w-28 text-center">Score</th>
            <th className="px-5 py-4 w-28 text-center">Benchmark</th>
            <th className="px-5 py-4 w-24 text-right">Delta</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-(--border) font-medium text-(--text)">
          {scoreBreakdown.map((row, idx) => {
            const isPositive = row.delta > 0
            const isNeutral  = row.delta === 0
            return (
              <tr
                key={row.name}
                className="hover:bg-(--accent-bg)/20 transition-colors stagger-fade"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    {/* Mini bar */}
                    <div className="w-16 h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden shrink-0">
                      <div
                        className="h-full rounded-full bg-(--accent) transition-all duration-700 ease-out"
                        style={{ width: `${row.score}%`, transitionDelay: `${idx * 60}ms` }}
                      />
                    </div>
                    <span className="font-serif font-bold text-xs sm:text-sm">{row.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-center font-mono font-bold">{row.score}%</td>
                <td className="px-5 py-4 text-center font-mono text-(--muted)">{row.benchmark}%</td>
                <td className="px-5 py-4 text-right">
                  {isNeutral ? (
                    <span className="text-[10px] text-(--muted) font-bold">On Par</span>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                      isPositive
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/20'
                        : 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-300 border-red-200 dark:border-red-900/20'
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

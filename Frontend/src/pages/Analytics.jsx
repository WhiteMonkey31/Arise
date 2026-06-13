import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getWinRateBySector, getScoreVsOutcome, getBidHistory } from '../services/analyticsService'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const KPI_CONFIGS = [
  { label: 'Total Bids',        color: 'text-indigo-600 dark:text-indigo-400' },
  { label: 'Global Win Rate',   color: 'text-emerald-600 dark:text-emerald-400' },
  { label: 'Sectors Tracked',  color: 'text-amber-600 dark:text-amber-400' },
  { label: 'Top Sector Rate',  color: 'text-(--accent)' },
]

export default function Analytics() {
  const { data: sectorData  = [], isLoading: sl } = useQuery({ queryKey: ['analytics', 'win-rate-by-sector'], queryFn: getWinRateBySector, staleTime: 60_000 })
  const { data: scatterData = [], isLoading: sc } = useQuery({ queryKey: ['analytics', 'score-vs-outcome'],   queryFn: getScoreVsOutcome,   staleTime: 60_000 })
  const { data: bidHistory  = [], isLoading: hl } = useQuery({ queryKey: ['analytics', 'bid-history'],        queryFn: () => getBidHistory({ limit: 120 }), staleTime: 60_000 })

  const isLoading = sl || sc || hl

  const totalBids      = bidHistory.length
  const wins           = bidHistory.filter(b => b.outcome === 'win').length
  const globalWinRate  = totalBids > 0 ? `${((wins / totalBids) * 100).toFixed(1)}%` : '—'
  const topSectorRate  = sectorData.length > 0 ? `${sectorData[0].win_rate}%` : '—'
  const kpiValues      = [totalBids, globalWinRate, sectorData.length, topSectorRate]

  return (
    <div className="space-y-8 fade-in select-none">
      {/* Title */}
      <div>
        <h2 className="font-serif font-bold text-2xl text-(--text) tracking-tight">Bid History Analytics</h2>
        <p className="text-xs text-(--muted) mt-1 font-medium font-sans">
          Evaluate past performance, compliance influence, and sector-wide win ratios.
        </p>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {KPI_CONFIGS.map((k, i) => (
              <div
                key={k.label}
                className="rounded-3xl border border-(--border) bg-(--surface) p-5 shadow-[var(--shadow-sm)] stagger-fade"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">{k.label}</span>
                <div className={`font-serif font-bold text-2xl mt-2 ${k.color}`}>{kpiValues[i]}</div>
                {i === 3 && sectorData[0] && (
                  <p className="text-[10px] text-(--muted) mt-1.5 font-semibold">{sectorData[0].sector}</p>
                )}
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Win Rate by Sector */}
            <div className="rounded-3xl border border-(--border) bg-(--surface) p-6 shadow-[var(--shadow-sm)] flex flex-col gap-5">
              <div>
                <h3 className="font-serif font-bold text-sm text-(--text)">Win Rate by Sector</h3>
                <span className="text-[10px] text-(--muted) font-sans">Percentage of wins per industry sector</span>
              </div>

              {sectorData.length === 0 ? (
                <p className="text-xs text-(--muted) py-6 text-center">No sector data yet</p>
              ) : (
                <div className="space-y-4">
                  {sectorData.map((d, idx) => (
                    <div key={d.sector} className="space-y-1.5 stagger-fade" style={{ animationDelay: `${idx * 60 + 200}ms` }}>
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-(--text)">{d.sector}</span>
                        <span className="text-(--muted) font-mono text-[11px]">
                          {d.win_rate}%
                          <span className="text-[9px] font-normal ml-1">({d.wins}/{d.total_bids})</span>
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden border border-(--border)">
                        <div
                          className="h-full bg-(--accent) rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${d.win_rate}%`, transitionDelay: `${idx * 80 + 300}ms` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Score vs Outcome scatter */}
            <div className="rounded-3xl border border-(--border) bg-(--surface) p-6 shadow-[var(--shadow-sm)] flex flex-col gap-5">
              <div>
                <h3 className="font-serif font-bold text-sm text-(--text)">Score vs Outcome</h3>
                <span className="text-[10px] text-(--muted) font-sans">Bid score versus win / loss result</span>
              </div>

              {scatterData.length === 0 ? (
                <p className="text-xs text-(--muted) py-6 text-center">No scored bids yet</p>
              ) : (
                <>
                  <div className="relative h-44 w-full border-l-2 border-b-2 border-(--border) mt-4">
                    <span className="absolute -left-5 top-0 text-[8px] font-bold text-(--muted)">WIN</span>
                    <span className="absolute -left-6 bottom-0 text-[8px] font-bold text-(--muted)">LOSS</span>
                    <span className="absolute left-0 -bottom-5 text-[8px] font-bold text-(--muted)">0</span>
                    <span className="absolute right-0 -bottom-5 text-[8px] font-bold text-(--muted)">100</span>

                    {scatterData.map((pt, idx) => {
                      const isWin = pt.outcome === 'win'
                      return (
                        <div
                          key={idx}
                          className={`absolute h-3.5 w-3.5 rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 hover:scale-150 stagger-fade ${
                            isWin
                              ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-500'
                              : 'bg-red-100 dark:bg-red-900/40 border-red-500'
                          }`}
                          style={{
                            left: `${pt.score}%`,
                            top: isWin ? '20%' : '78%',
                            animationDelay: `${idx * 30 + 200}ms`,
                          }}
                          title={`Score ${pt.score} · ${pt.outcome}`}
                        />
                      )
                    })}
                  </div>

                  <div className="flex justify-center gap-5 text-[10px] font-bold text-(--muted) mt-4">
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border-2 border-emerald-500" />
                      Win
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-red-100 dark:bg-red-900/40 border-2 border-red-500" />
                      Loss
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

import React from 'react'

export default function Analytics() {
  const sectorData = [
    { sector: 'IT Services', total: 12, wins: 9, winRate: 75 },
    { sector: 'Healthcare', total: 8, wins: 5, winRate: 62 },
    { sector: 'Logistics', total: 6, wins: 4, winRate: 66 },
    { sector: 'Construction', total: 5, wins: 3, winRate: 60 }
  ]

  const scatterData = [
    { score: 45, outcome: 'Loss', name: 'RFP-009' },
    { score: 58, outcome: 'Loss', name: 'RFP-014' },
    { score: 62, outcome: 'Win', name: 'RFP-002' },
    { score: 68, outcome: 'Loss', name: 'RFP-005' },
    { score: 71, outcome: 'Win', name: 'RFP-007' },
    { score: 78, outcome: 'Win', name: 'RFP-001' },
    { score: 82, outcome: 'Win', name: 'RFP-003' },
    { score: 89, outcome: 'Win', name: 'RFP-011' },
    { score: 94, outcome: 'Win', name: 'RFP-008' }
  ]

  return (
    <div className="space-y-8 fade-in select-none">
      {/* Title */}
      <div>
        <h2 className="font-serif font-bold text-2xl text-(--text) tracking-tight">Bid History Analytics</h2>
        <p className="text-xs text-(--muted) mt-1 font-medium font-sans">Evaluate past proposal performance, compliance influence, and sector-wide win ratios.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-(--border) bg-(--surface) p-5 shadow-xs">
          <span className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">Total Bids</span>
          <div className="font-serif font-bold text-2xl text-(--text) mt-2">31</div>
          <p className="text-[10px] text-(--muted) mt-1.5 font-semibold">Across 4 sectors</p>
        </div>
        <div className="rounded-3xl border border-(--border) bg-(--surface) p-5 shadow-xs">
          <span className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">Global Win Rate</span>
          <div className="font-serif font-bold text-2xl text-(--text) mt-2">67.7%</div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1.5 font-bold">21 Wins / 10 Losses</p>
        </div>
        <div className="rounded-3xl border border-(--border) bg-(--surface) p-5 shadow-xs">
          <span className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">Contract Value Won</span>
          <div className="font-serif font-bold text-2xl text-(--text) mt-2">$8.45M</div>
          <p className="text-[10px] text-(--muted) mt-1.5 font-semibold">Avg size: $400k</p>
        </div>
        <div className="rounded-3xl border border-(--border) bg-(--surface) p-5 shadow-xs">
          <span className="text-[9px] uppercase font-bold tracking-wider text-(--muted)">Compliance Factor</span>
          <div className="font-serif font-bold text-2xl text-(--text) mt-2">+24%</div>
          <p className="text-[10px] text-(--muted) mt-1.5 font-semibold">Win rate delta at 80%+</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Win Rate by Sector (Bar Chart) */}
        <div className="rounded-3xl border border-(--border) bg-(--surface) p-6 shadow-xs flex flex-col gap-4">
          <div className="leading-snug">
            <h3 className="font-serif font-bold text-sm text-(--text)">Win Rate by Sector</h3>
            <span className="text-[10px] text-(--muted) font-sans">Percentage of wins per industry sector</span>
          </div>
          
          <div className="space-y-4 pt-2">
            {sectorData.map((d) => (
              <div key={d.sector} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-(--text)">{d.sector}</span>
                  <span className="text-(--muted)">{d.winRate}% <span className="text-[9px] font-normal">({d.wins}/{d.total})</span></span>
                </div>
                <div className="h-3 w-full bg-stone-100 dark:bg-stone-850/80 rounded-full overflow-hidden border border-(--border)">
                  <div 
                    className="h-full bg-(--accent) rounded-full transition-all duration-500"
                    style={{ width: `${d.winRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Score vs Outcome (Scatter Plot) */}
        <div className="rounded-3xl border border-(--border) bg-(--surface) p-6 shadow-xs flex flex-col gap-4">
          <div className="leading-snug">
            <h3 className="font-serif font-bold text-sm text-(--text)">Score vs Outcome</h3>
            <span className="text-[10px] text-(--muted) font-sans">Calculated bid score compared to win/loss result</span>
          </div>
          
          <div className="relative h-44 w-full border-l border-b border-(--border) mt-4">
            {/* Y axis labels */}
            <div className="absolute -left-4 top-0 text-[8px] font-bold text-(--muted)">WIN</div>
            <div className="absolute -left-4.5 bottom-0 text-[8px] font-bold text-(--muted)">LOSS</div>
            
            {/* X axis labels */}
            <div className="absolute left-0 -bottom-4 text-[8px] font-bold text-(--muted)">Score: 0</div>
            <div className="absolute right-0 -bottom-4 text-[8px] font-bold text-(--muted)">100</div>

            {/* Scatter points */}
            {scatterData.map((pt, idx) => {
              const xPos = `${pt.score}%`
              const yPos = pt.outcome === 'Win' ? '20%' : '80%'
              const isWin = pt.outcome === 'Win'
              return (
                <div
                  key={idx}
                  className={`absolute h-3 w-3 rounded-full border transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-transform hover:scale-130 flex items-center justify-center ${
                    isWin 
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-300' 
                      : 'bg-red-50 dark:bg-red-950/40 text-red-650 border-red-300'
                  }`}
                  style={{ left: xPos, top: yPos }}
                  title={`${pt.name}: Score ${pt.score}% (${pt.outcome})`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-4 text-[9px] text-(--muted) mt-5.5 font-bold">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-300 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
              </span>
              Win
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 border border-red-300 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
              </span>
              Loss
            </div>
          </div>
        </div>

        {/* Compliance vs Win Rate Trend (Line Chart) */}
        <div className="rounded-3xl border border-(--border) bg-(--surface) p-6 shadow-xs flex flex-col gap-4">
          <div className="leading-snug">
            <h3 className="font-serif font-bold text-sm text-(--text)">Compliance Impact</h3>
            <span className="text-[10px] text-(--muted) font-sans">Win rate trend relative to RFP compliance percentage</span>
          </div>

          {/* Custom SVG Line Chart */}
          <div className="relative h-44 w-full mt-4 flex items-end">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Grid Lines */}
              <line x1="0" y1="20" x2="100" y2="20" className="stroke-stone-200/10 dark:stroke-stone-800" strokeWidth="0.5" strokeDasharray="2" />
              <line x1="0" y1="50" x2="100" y2="50" className="stroke-stone-200/10 dark:stroke-stone-800" strokeWidth="0.5" strokeDasharray="2" />
              <line x1="0" y1="80" x2="100" y2="80" className="stroke-stone-200/10 dark:stroke-stone-800" strokeWidth="0.5" strokeDasharray="2" />

              {/* Area Under Curve */}
              <path
                d="M 0 100 L 0 80 L 20 65 L 40 52 L 60 30 L 80 12 L 100 5 L 100 100 Z"
                fill="url(#accent-gradient)"
                className="opacity-10 dark:opacity-5"
              />

              {/* Trend Line */}
              <path
                d="M 0 80 L 20 65 L 40 52 L 60 30 L 80 12 L 100 5"
                fill="none"
                className="stroke-(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              <circle cx="0" cy="80" r="2" className="fill-(--accent) stroke-(--surface)" strokeWidth="0.5" />
              <circle cx="20" cy="65" r="2" className="fill-(--accent) stroke-(--surface)" strokeWidth="0.5" />
              <circle cx="40" cy="52" r="2" className="fill-(--accent) stroke-(--surface)" strokeWidth="0.5" />
              <circle cx="60" cy="30" r="2" className="fill-(--accent) stroke-(--surface)" strokeWidth="0.5" />
              <circle cx="80" cy="12" r="2" className="fill-(--accent) stroke-(--surface)" strokeWidth="0.5" />
              <circle cx="100" cy="5" r="2" className="fill-(--accent) stroke-(--surface)" strokeWidth="0.5" />

              <defs>
                <linearGradient id="accent-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>

            {/* Labels overlay */}
            <div className="absolute left-1.5 top-0 text-[8px] font-bold text-(--muted)">100% Win Rate</div>
            <div className="absolute left-1.5 bottom-1 text-[8px] font-bold text-(--muted)">0%</div>

            <div className="absolute right-0 -bottom-4 text-[8px] font-bold text-(--muted)">100% Compliance</div>
            <div className="absolute left-0 -bottom-4 text-[8px] font-bold text-(--muted)">50%</div>
          </div>
        </div>
      </div>
    </div>
  )
}
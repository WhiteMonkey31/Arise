import React from 'react'

export default function WinRadarChart({ scoreBreakdown }) {
  if (!scoreBreakdown || scoreBreakdown.length === 0) return null

  const W = 320, H = 320
  const cx = W / 2, cy = H / 2
  const r  = 100

  const toXY = (idx, value) => {
    const angle = (idx * 60 - 90) * (Math.PI / 180)
    return {
      x: cx + r * (value / 100) * Math.cos(angle),
      y: cy + r * (value / 100) * Math.sin(angle),
    }
  }

  const hexPoints = (level) =>
    Array.from({ length: 6 }, (_, i) => {
      const { x, y } = toXY(i, level)
      return `${x},${y}`
    }).join(' ')

  const scorePoints    = scoreBreakdown.map((d, i) => { const p = toXY(i, d.score);     return `${p.x},${p.y}` }).join(' ')
  const benchmarkPoints = scoreBreakdown.map((d, i) => { const p = toXY(i, d.benchmark); return `${p.x},${p.y}` }).join(' ')

  // Label nudge per axis position (6 axes)
  const nudge = [
    { dx:  0,   dy: -16, anchor: 'middle' },
    { dx:  14,  dy:  -6, anchor: 'start'  },
    { dx:  14,  dy:  14, anchor: 'start'  },
    { dx:  0,   dy:  22, anchor: 'middle' },
    { dx: -14,  dy:  14, anchor: 'end'    },
    { dx: -14,  dy:  -6, anchor: 'end'    },
  ]

  return (
    <div className="flex justify-center items-center py-2 select-none w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="overflow-visible max-w-full"
      >
        {/* Grid rings */}
        {[20, 40, 60, 80, 100].map((lvl) => (
          <polygon
            key={lvl}
            points={hexPoints(lvl)}
            fill="none"
            className="stroke-stone-200 dark:stroke-stone-700/60"
            strokeWidth="0.8"
          />
        ))}

        {/* Axis spokes */}
        {Array.from({ length: 6 }, (_, i) => {
          const { x, y } = toXY(i, 100)
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className="stroke-stone-200 dark:stroke-stone-700/60" strokeWidth="0.8" />
        })}

        {/* Benchmark polygon (dashed) */}
        <polygon
          points={benchmarkPoints}
          fill="none"
          className="stroke-stone-300 dark:stroke-stone-600"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />

        {/* Score polygon with subtle fill */}
        <polygon
          points={scorePoints}
          className="stroke-(--accent)"
          fill="var(--accent)"
          fillOpacity="0.12"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Score dot on each vertex */}
        {scoreBreakdown.map((d, i) => {
          const { x, y } = toXY(i, d.score)
          return (
            <circle
              key={i}
              cx={x} cy={y} r={3.5}
              fill="var(--accent)"
              className="stroke-(--surface)"
              strokeWidth="1.5"
            />
          )
        })}

        {/* Axis labels — use inline fill so they're always visible */}
        {scoreBreakdown.map((d, i) => {
          const { x, y } = toXY(i, 100)
          const { dx, dy, anchor } = nudge[i]
          return (
            <text
              key={i}
              x={x + dx}
              y={y + dy}
              textAnchor={anchor}
              fontSize="9"
              fontWeight="700"
              fontFamily="var(--font-sans)"
              fill="currentColor"
              className="text-(--muted) uppercase tracking-wide"
            >
              {d.name}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

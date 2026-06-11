import React from 'react'

export default function WinRadarChart({ scoreBreakdown }) {
  if (!scoreBreakdown) return null

  const width = 300
  const height = 300
  const cx = width / 2
  const cy = height / 2
  const r = 90

  const getCoordinates = (index, value) => {
    // 6 axes: 60 degrees apart, starting from top (-90 degrees)
    const angle = (index * 60 - 90) * (Math.PI / 180)
    const x = cx + r * (value / 100) * Math.cos(angle)
    const y = cy + r * (value / 100) * Math.sin(angle)
    return { x, y }
  }

  const gridLevels = [20, 40, 60, 80, 100]
  const renderHexagon = (level) => {
    const points = []
    for (let i = 0; i < 6; i++) {
      const coord = getCoordinates(i, level)
      points.push(`${coord.x},${coord.y}`)
    }
    return points.join(' ')
  }

  const scorePoints = scoreBreakdown.map((item, idx) => {
    const coord = getCoordinates(idx, item.score)
    return `${coord.x},${coord.y}`
  }).join(' ')

  const benchmarkPoints = scoreBreakdown.map((item, idx) => {
    const coord = getCoordinates(idx, item.benchmark)
    return `${coord.x},${coord.y}`
  }).join(' ')

  const labelOffsets = [
    { x: 0, y: -12, align: 'middle' },
    { x: 10, y: -4, align: 'start' },
    { x: 10, y: 12, align: 'start' },
    { x: 0, y: 18, align: 'middle' },
    { x: -10, y: 12, align: 'end' },
    { x: -10, y: -4, align: 'end' }
  ]

  return (
    <div className="flex justify-center items-center py-4 select-none">
      <svg width={width} height={height} className="overflow-visible">
        {/* Hexagonal Grids */}
        {gridLevels.map((lvl) => (
          <polygon
            key={lvl}
            points={renderHexagon(lvl)}
            className="fill-transparent stroke-stone-200 dark:stroke-stone-800"
            strokeWidth="0.8"
          />
        ))}

        {/* Axes guidelines */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const coord = getCoordinates(i, 100)
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={coord.x}
              y2={coord.y}
              className="stroke-stone-200 dark:stroke-stone-800"
              strokeWidth="0.8"
            />
          )
        })}

        {/* Benchmark Area (dashed) */}
        <polygon
          points={benchmarkPoints}
          className="fill-transparent stroke-stone-300 dark:stroke-stone-700"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />

        {/* Actual Score Area */}
        <polygon
          points={scorePoints}
          className="fill-[var(--accent)]/10 dark:fill-[var(--accent)]/5 stroke-[var(--accent)]"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Outer Axis Labels */}
        {scoreBreakdown.map((item, idx) => {
          const outerCoord = getCoordinates(idx, 100)
          const offset = labelOffsets[idx]
          return (
            <text
              key={idx}
              x={outerCoord.x + offset.x}
              y={outerCoord.y + offset.y}
              textAnchor={offset.align}
              className="fill-[var(--text)] text-[9px] font-bold tracking-tight uppercase"
            >
              {item.name}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
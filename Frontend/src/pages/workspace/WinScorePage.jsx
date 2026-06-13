import React from 'react'
import { useParams, Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { getWinScore, getGoNoGo } from '../../services/scoringService'
import WinRadarChart from '../../components/scoring/WinRadarChart'
import ScoreBreakdownTable from '../../components/scoring/ScoreBreakdownTable'
import GoNoGoCard from '../../components/scoring/GoNoGoCard'
import EmptyState from '../../components/ui/EmptyState'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function WinScorePage() {
  const { workspaceId } = useParams()

  const { data: winScore, isLoading: scoreLoading, error: scoreError } = useQuery({
    queryKey: ['win-score', workspaceId],
    queryFn: () => getWinScore(workspaceId),
    enabled: !!workspaceId,
    staleTime: 60_000,
    retry: false,
  })

  const { data: goNoGo, isLoading: goLoading } = useQuery({
    queryKey: ['go-no-go', workspaceId],
    queryFn: () => getGoNoGo(workspaceId),
    enabled: !!winScore,
    staleTime: 60_000,
    retry: false,
  })

  if (scoreLoading || goLoading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>

  // 404 from the engine means no requirements yet
  if (scoreError || !winScore) {
    return (
      <EmptyState
        icon="compliance"
        title="No RFP analyzed yet"
        description="To view win scoring metrics, upload your RFP document (PDF or DOCX). The engine will calculate indicators automatically."
      >
        <Link
          to={`/workspace/${workspaceId}/upload`}
          className="inline-flex items-center justify-center mt-5 rounded-2xl bg-(--accent) px-4.5 py-3 text-xs font-bold text-white shadow-sm hover:opacity-95 transition cursor-pointer"
        >
          Upload RFP Document
        </Link>
      </EmptyState>
    )
  }

  // Map backend axes → scoreBreakdown shape expected by existing chart components
  const scoreBreakdown = Object.entries(winScore.axes).map(([key, score]) => ({
    name: key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    score: Math.round(score * 100),
    benchmark: 70,
    delta: Math.round(score * 100) - 70,
  }))

  // Build workspace-compatible object for GoNoGoCard
  const workspaceLike = {
    winProbability: Math.round(winScore.overall * 100),
    gapCount: winScore.gap_count,
    aiReasoning: goNoGo?.reasoning || winScore.verdict,
    strengths: [],
    risks: goNoGo?.risks || [],
    scoreBreakdown,
  }

  return (
    <div className="space-y-8 fade-in select-none">
      {/* Title */}
      <div className="border-b border-(--border) pb-4">
        <h3 className="font-serif font-bold text-lg text-(--text)">Win Probability Analysis</h3>
        <p className="text-xs text-(--muted) mt-1 font-medium font-sans">
          Inspect scoring axis alignments and confirm bid feasibility evaluations.
        </p>
      </div>

      {/* Grid of Chart + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="rounded-3xl border border-(--border) bg-(--surface) p-6 shadow-sm flex flex-col items-center">
          <span className="text-[9px] uppercase font-bold tracking-wider text-(--muted) mb-3 self-start">Visual Scoring Map (Radar)</span>
          <WinRadarChart scoreBreakdown={scoreBreakdown} />
        </div>
        <div className="w-full">
          <ScoreBreakdownTable scoreBreakdown={scoreBreakdown} />
        </div>
      </div>

      {/* Go No Go Card */}
      <GoNoGoCard workspace={workspaceLike} goNoGo={goNoGo} />
    </div>
  )
}

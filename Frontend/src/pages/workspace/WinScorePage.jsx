import React from 'react'
import { useParams, Link } from 'react-router'
import { useWorkspaceStore } from '../../store/workspaceStore'
import WinRadarChart from '../../components/scoring/WinRadarChart'
import ScoreBreakdownTable from '../../components/scoring/ScoreBreakdownTable'
import GoNoGoCard from '../../components/scoring/GoNoGoCard'
import EmptyState from '../../components/ui/EmptyState'

export default function WinScorePage() {
  const { workspaceId } = useParams()
  const { workspaces } = useWorkspaceStore()
  
  const workspace = workspaces.find(w => w.id === workspaceId)

  if (!workspace) return null

  const hasUploaded = workspace.requirements && workspace.requirements.length > 0

  if (!hasUploaded) {
    return (
      <EmptyState
        icon="compliance"
        title="No RFP analyzed yet"
        description="To view win scoring metrics, upload your RFP document (PDF or DOCX). The engine will calculate indicators automatically."
      >
        <Link 
          to={`/workspace/${workspace.id}/upload`}
          className="inline-flex items-center justify-center mt-5 rounded-2xl bg-(--accent) px-4.5 py-3 text-xs font-bold text-white shadow-sm hover:opacity-95 transition cursor-pointer"
        >
          Upload RFP Document
        </Link>
      </EmptyState>
    )
  }

  return (
    <div className="space-y-8 fade-in select-none">
      {/* Title */}
      <div className="border-b border-(--border) pb-4">
        <h3 className="font-serif font-bold text-lg text-(--text)">Win Probability Analysis</h3>
        <p className="text-xs text-(--muted) mt-1 font-medium font-sans">Inspect scoring axis alignments and confirm bid feasibility evaluations.</p>
      </div>

      {/* Grid of Chart + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Radar Chart */}
        <div className="rounded-3xl border border-(--border) bg-(--surface) p-6 shadow-sm flex flex-col items-center">
          <span className="text-[9px] uppercase font-bold tracking-wider text-(--muted) mb-3 self-start">Visual Scoring Map (Radar)</span>
          <WinRadarChart scoreBreakdown={workspace.scoreBreakdown} />
        </div>

        {/* Breakdown Table */}
        <div className="w-full">
          <ScoreBreakdownTable scoreBreakdown={workspace.scoreBreakdown} />
        </div>
      </div>

      {/* Go No Go Card */}
      <GoNoGoCard workspace={workspace} />
    </div>
  )
}
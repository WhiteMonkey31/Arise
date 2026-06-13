import React from 'react'
import { Outlet, Link, useParams, useLocation } from 'react-router'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { useWorkspaceDetail } from '../../hooks/useWorkspace'
import LoadingSpinner from '../ui/LoadingSpinner'

export default function WorkspaceLayout() {
  const { workspaceId } = useParams()
  const location = useLocation()
  const { setActiveWorkspace } = useWorkspaceStore()

  const { data: workspace, isLoading } = useWorkspaceDetail(workspaceId)

  React.useEffect(() => {
    if (workspaceId) setActiveWorkspace(workspaceId)
  }, [workspaceId, setActiveWorkspace])

  if (isLoading) {
    return <div className="flex justify-center py-20"><LoadingSpinner /></div>
  }

  if (!workspace) {
    return (
      <div className="rounded-3xl border border-(--border) bg-(--surface) p-8 text-center shadow-sm max-w-lg mx-auto mt-12 fade-in">
        <h2 className="font-serif font-bold text-lg text-(--text)">Workspace Not Found</h2>
        <p className="text-xs text-(--muted) mt-2">The requested workspace does not exist or has been deleted.</p>
        <Link to="/dashboard" className="inline-flex items-center justify-center mt-5 rounded-2xl bg-(--accent) px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-95">
          Return to Dashboard
        </Link>
      </div>
    )
  }

  const tabs = [
    { name: 'Overview', path: 'overview' },
    { name: 'Compliance', path: 'compliance' },
    { name: 'Proposal Draft', path: 'proposal' },
    { name: 'Win Score', path: 'winscore' },
  ]

  const currentTab = location.pathname.split('/').pop()

  const deadlineLabel = workspace.deadline
    ? new Date(workspace.deadline).toLocaleDateString()
    : 'No deadline'

  return (
    <div className="space-y-6 fade-in">
      {/* Workspace Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-(--border) pb-5">
        <div>
          <h2 className="font-serif font-bold text-xl sm:text-2xl text-(--text) leading-snug tracking-tight">
            {workspace.name}
          </h2>
          <div className="flex flex-wrap gap-2 items-center text-xs text-(--muted) mt-2 font-medium">
            {workspace.sector && (
              <span className="rounded-full bg-(--accent-bg) border border-(--border) px-2.5 py-0.5 text-[10px] font-bold text-(--accent)">
                {workspace.sector}
              </span>
            )}
            <span>•</span>
            <span>Status: <strong className="text-(--text) capitalize">{workspace.status}</strong></span>
            <span>•</span>
            <span>Deadline: <strong className="text-(--text)">{deadlineLabel}</strong></span>
          </div>
        </div>

        {/* Tab Links */}
        <div className="flex flex-wrap gap-1 bg-(--surface) p-1 rounded-2xl border border-(--border) shadow-sm max-w-max self-start lg:self-center">
          {tabs.map((tab) => {
            const isActive =
              currentTab === tab.path ||
              (tab.path === 'overview' && currentTab === workspaceId)
            return (
              <Link
                key={tab.path}
                className={`rounded-xl px-4 py-2 text-xs font-bold tracking-tight transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-(--accent) text-white shadow-sm'
                    : 'text-(--muted) hover:text-(--text)'
                }`}
                to={tab.path}
              >
                {tab.name}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Child Pages Outlet Container */}
      <div className="rounded-3xl border border-(--border) bg-(--surface) p-6 md:p-8 shadow-sm transition-all duration-200">
        <Outlet />
      </div>
    </div>
  )
}

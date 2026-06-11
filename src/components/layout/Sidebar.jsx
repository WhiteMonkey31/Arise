import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { useAuthStore } from '../../store/authStore'

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore()
  const { user, logout } = useAuthStore()

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId)

  const links = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Portfolio', path: '/portfolio' },
    { name: 'Capabilities', path: '/capabilities' },
    { name: 'Analytics', path: '/analytics' }
  ]

  return (
    <aside className="flex-shrink-0 w-64 border-r border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs hidden md:flex flex-col justify-between h-screen sticky top-0 z-20 transition-all duration-200">
      <div className="flex flex-col gap-5 min-h-0">
        {/* Brand */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="h-8 w-8 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white font-serif font-semibold text-lg shadow-sm">
            C
          </div>
          <div>
            <h1 className="font-serif font-bold text-lg leading-none text-[var(--text)] tracking-tight">Cust</h1>
            <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--muted)]">Proposal Engine</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1 text-sm font-medium flex-shrink-0">
          {links.map((link) => {
            const isActive = link.path === '/dashboard' 
              ? location.pathname === '/dashboard' 
              : location.pathname.startsWith(link.path) && !location.pathname.startsWith('/workspace')
            return (
              <Link
                key={link.path}
                className={`flex items-center justify-between rounded-xl px-4 py-2.5 transition-all duration-200 ${
                  isActive
                    ? 'bg-[var(--accent)] text-white shadow-sm font-semibold'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--accent-bg)]'
                }`}
                to={link.path}
              >
                <span>{link.name}</span>
                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Workspaces List Section (Tabs) */}
        <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-4 min-h-0 flex-1">
          <div className="flex items-center justify-between px-2 mb-1 flex-shrink-0">
            <span className="text-[9.5px] uppercase font-bold tracking-wider text-[var(--muted)]">Workspaces</span>
            <Link to="/portfolio" className="text-[9.5px] font-bold text-[var(--accent)] hover:underline">Manage</Link>
          </div>
          <div className="flex flex-col gap-1 overflow-y-auto pr-1 flex-grow scrollbar-thin">
            {workspaces.map((ws) => {
              const isActive = activeWorkspaceId === ws.id && location.pathname.startsWith(`/workspace/${ws.id}`)
              return (
                <button
                  key={ws.id}
                  onClick={() => {
                    setActiveWorkspace(ws.id)
                    navigate(`/workspace/${ws.id}/overview`)
                  }}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all duration-200 cursor-pointer w-full flex-shrink-0 ${
                    isActive
                      ? 'bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--border)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--accent-bg)] border border-transparent'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                    ws.status === 'Draft' ? 'bg-amber-400' :
                    ws.status === 'Analysing' ? 'bg-indigo-400' :
                    ws.status === 'In Review' ? 'bg-purple-400' :
                    'bg-emerald-400'
                  }`} />
                  <span className="truncate flex-1">{ws.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Active Workspace Monitor (Compact version) */}
        {activeWorkspace && location.pathname.startsWith('/workspace') && (
          <div className="border-t border-[var(--border)] pt-3 flex-shrink-0">
            <span className="text-[8.5px] uppercase font-bold tracking-wider text-[var(--muted)] block mb-1">Current RFP Target</span>
            <div className="rounded-xl bg-[var(--accent-bg)] p-2.5 border border-[var(--border)] flex flex-col gap-1">
              <div className="font-serif font-bold text-[11px] text-[var(--text)] truncate leading-tight">
                {activeWorkspace.name}
              </div>
              <div className="flex justify-between items-center text-[9px] text-[var(--muted)]">
                <span>{activeWorkspace.sector}</span>
                <span className="font-bold text-[var(--accent)]">{activeWorkspace.winProbability}% Win</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Info at bottom */}
      {user && (
        <div className="border-t border-[var(--border)] pt-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--border)] flex items-center justify-center font-bold text-xs flex-shrink-0">
              {user.avatar}
            </div>
            <div className="leading-tight min-w-0">
              <div className="text-xs font-semibold text-[var(--text)] truncate max-w-[105px]">{user.name}</div>
              <div className="text-[10px] text-[var(--muted)] truncate max-w-[105px]">{user.role}</div>
            </div>
          </div>
          
          {/* Logout Button */}
          <button
            onClick={() => {
              logout()
              navigate('/')
            }}
            title="Sign Out"
            className="rounded-xl p-1.5 text-[var(--muted)] hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer border border-transparent hover:border-red-200/40 flex-shrink-0"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      )}
    </aside>
  )
}
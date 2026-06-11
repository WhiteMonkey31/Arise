import React, { useEffect, useState } from 'react'
import { useParams, Link, useLocation } from 'react-router'
import { useWorkspaceStore } from '../../store/workspaceStore'

function ThemeIcon({ mode }) {
  if (mode === 'dark') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

export default function TopBar() {
  const [theme, setTheme] = useState(() => {
    try {
      const t = localStorage.getItem('theme')
      return t || 'light'
    } catch (e) {
      return 'light'
    }
  })

  const { workspaces } = useWorkspaceStore()
  const location = useLocation()
  
  const workspaceMatch = location.pathname.match(/\/workspace\/([^/]+)/)
  const workspaceId = workspaceMatch ? workspaceMatch[1] : null
  const activeWorkspace = workspaces.find(w => w.id === workspaceId)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    try {
      localStorage.setItem('theme', theme)
    } catch (e) {}
  }, [theme])

  const getBreadcrumbs = () => {
    const parts = location.pathname.split('/').filter(Boolean)
    if (parts.length === 0) return []
    
    const crumbs = []
    
    if (parts[0] === 'workspace' && activeWorkspace) {
      crumbs.push({ name: 'Workspaces', link: '/dashboard' })
      crumbs.push({ name: activeWorkspace.name, link: `/workspace/${activeWorkspace.id}/overview` })
      if (parts[2]) {
        const pageName = parts[2].charAt(0).toUpperCase() + parts[2].slice(1)
        crumbs.push({ name: pageName })
      }
    } else {
      const pageName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
      crumbs.push({ name: pageName })
    }
    
    return crumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <header className="flex items-center justify-between gap-4 py-4 px-1 border-b border-(--border) mb-6 transition-all duration-200">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs text-(--muted) font-medium truncate">
        <Link to="/dashboard" className="hover:text-(--text) transition-colors">
          Home
        </Link>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            <span className="text-(--muted) opacity-50 font-normal">/</span>
            {crumb.link ? (
              <Link to={crumb.link} className="hover:text-(--text) transition-colors truncate max-w-35 sm:max-w-50">
                {crumb.name}
              </Link>
            ) : (
              <span className="text-(--text) font-semibold truncate max-w-35 sm:max-w-50">
                {crumb.name}
              </span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Theme Toggle Button */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          className="inline-flex items-center gap-2 rounded-2xl border border-(--border) bg-(--surface) px-4 py-2 text-[11px] font-bold tracking-tight text-(--text) transition hover:bg-(--accent-bg) shadow-sm hover:border-(--accent) cursor-pointer"
          onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        >
          <ThemeIcon mode={theme} />
          <span className="capitalize hidden sm:inline">{theme} Mode</span>
        </button>
      </div>
    </header>
  )
}

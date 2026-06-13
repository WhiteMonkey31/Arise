/**
 * DEV-ONLY — API Test Dashboard
 * Route: /dev/api-test
 *
 * Hits every backend endpoint and shows a live pass/fail report.
 * Only accessible when VITE_DEV_TOOLS=true in .env
 */

import React, { useState, useCallback } from 'react'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'

// ── Test definitions ─────────────────────────────────────────────────────────
function buildTests(wsId, capId) {
  return [
    // Auth
    { group: 'Auth',       method: 'GET',    label: 'GET  /api/auth/me',                    fn: () => api.get('/api/auth/me') },

    // Workspaces
    { group: 'Workspaces', method: 'GET',    label: 'GET  /api/workspaces',                 fn: () => api.get('/api/workspaces') },
    { group: 'Workspaces', method: 'POST',   label: 'POST /api/workspaces (create)',
      fn: () => api.post('/api/workspaces', {
        name: `API Test WS ${Date.now()}`,
        sector: 'IT Services',
        deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
      })
    },
    ...(wsId ? [
      { group: 'Workspaces', method: 'GET',  label: `GET  /api/workspaces/${wsId.slice(0,8)}…`,  fn: () => api.get(`/api/workspaces/${wsId}`) },
      { group: 'Workspaces', method: 'PUT',  label: `PUT  /api/workspaces/${wsId.slice(0,8)}… (update)`, fn: () => api.put(`/api/workspaces/${wsId}`, { sector: 'Healthcare' }) },
    ] : []),

    // Capabilities
    { group: 'Capabilities', method: 'GET',  label: 'GET  /api/capabilities',               fn: () => api.get('/api/capabilities?limit=5') },
    { group: 'Capabilities', method: 'POST', label: 'POST /api/capabilities (create)',
      fn: () => api.post('/api/capabilities', {
        title: `Test Capability ${Date.now()}`,
        description: 'Auto-generated capability for API testing.',
        domain: 'Cloud',
        certification: null,
        year: 2024,
        client_type: 'Federal',
      })
    },
    ...(capId ? [
      { group: 'Capabilities', method: 'PUT', label: `PUT  /api/capabilities/${capId.slice(0,8)}… (update)`, fn: () => api.put(`/api/capabilities/${capId}`, { domain: 'Updated Domain' }) },
      { group: 'Capabilities', method: 'DELETE', label: `DELETE /api/capabilities/${capId.slice(0,8)}…`, fn: () => api.delete(`/api/capabilities/${capId}`) },
    ] : []),

    // Analytics
    { group: 'Analytics', method: 'GET',     label: 'GET  /api/analytics/bid-history',      fn: () => api.get('/api/analytics/bid-history?limit=5') },
    { group: 'Analytics', method: 'GET',     label: 'GET  /api/analytics/win-rate-by-sector', fn: () => api.get('/api/analytics/win-rate-by-sector') },
    { group: 'Analytics', method: 'GET',     label: 'GET  /api/analytics/score-vs-outcome',  fn: () => api.get('/api/analytics/score-vs-outcome') },
    { group: 'Analytics', method: 'GET',     label: 'GET  /api/analytics/compliance-vs-win-rate', fn: () => api.get('/api/analytics/compliance-vs-win-rate') },

    // Workspace-scoped (only if we have a workspace)
    ...(wsId ? [
      { group: 'Documents',  method: 'GET',  label: `GET  /…/${wsId.slice(0,8)}/documents`,  fn: () => api.get(`/api/workspaces/${wsId}/documents`) },
      { group: 'Compliance', method: 'GET',  label: `GET  /…/${wsId.slice(0,8)}/compliance`,  fn: () => api.get(`/api/workspaces/${wsId}/compliance`) },
      { group: 'Proposals',  method: 'GET',  label: `GET  /…/${wsId.slice(0,8)}/proposals`,   fn: () => api.get(`/api/workspaces/${wsId}/proposals`) },
      { group: 'Win Score',  method: 'GET',  label: `GET  /…/${wsId.slice(0,8)}/win-score`,   fn: () => api.get(`/api/workspaces/${wsId}/win-score`), allowedCodes: [200, 404] },
      { group: 'Win Score',  method: 'GET',  label: `GET  /…/${wsId.slice(0,8)}/go-no-go`,    fn: () => api.get(`/api/workspaces/${wsId}/go-no-go`),  allowedCodes: [200, 404] },
      { group: 'Export',     method: 'POST', label: `POST /…/${wsId.slice(0,8)}/export`,      fn: () => api.post(`/api/workspaces/${wsId}/export`, null, { responseType: 'blob' }), allowedCodes: [200] },
    ] : []),

    // Health
    { group: 'System', method: 'GET', label: 'GET  /health',  fn: () => api.get('/health') },
    { group: 'System', method: 'GET', label: 'GET  /ready',   fn: () => api.get('/ready'),  allowedCodes: [200, 503] },
  ]
}

// ── Status badge ──────────────────────────────────────────────────────────────
function Badge({ status }) {
  const cfg = {
    idle:    'bg-stone-100 dark:bg-stone-800 text-stone-500',
    running: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 border-amber-200',
    pass:    'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 border-emerald-200',
    fail:    'bg-red-50 dark:bg-red-950/30 text-red-700 border-red-200',
    skip:    'bg-stone-50 dark:bg-stone-900 text-stone-400',
  }[status] || ''

  const labels = { idle: 'IDLE', running: '…', pass: 'PASS', fail: 'FAIL', skip: 'SKIP' }

  return (
    <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-bold border tracking-wider ${cfg}`}>
      {labels[status] || status}
    </span>
  )
}

const METHOD_COLOR = {
  GET:    'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30',
  POST:   'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30',
  PUT:    'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',
  DELETE: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30',
  PATCH:  'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30',
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ApiTestPage() {
  const { token } = useAuthStore()
  const [wsId,  setWsId]  = useState(null)
  const [capId, setCapId] = useState(null)
  const [results, setResults] = useState({})
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState([])

  const appendLog = (msg) => setLog(prev => [...prev, msg])

  const runTests = useCallback(async () => {
    if (!token) { appendLog('No auth token — log in first or use Demo Login'); return }

    setRunning(true)
    setResults({})
    setLog([])
    appendLog('Starting API test suite…')

    // First: create a fresh workspace to use for scoped tests
    let currentWsId  = wsId
    let currentCapId = capId

    if (!currentWsId) {
      try {
        appendLog('Creating fresh test workspace…')
        const r = await api.post('/api/workspaces', {
          name: `API Test — ${new Date().toLocaleTimeString()}`,
          sector: 'IT Services',
          deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
        })
        currentWsId = r.data.id
        setWsId(currentWsId)
        appendLog(`Test workspace: ${currentWsId}`)
      } catch (e) {
        appendLog(`Failed to create test workspace: ${e.message}`)
      }
    }

    const tests = buildTests(currentWsId, currentCapId)

    for (const test of tests) {
      const key = test.label
      setResults(prev => ({ ...prev, [key]: { status: 'running', code: null, ms: null } }))

      const t0 = performance.now()
      try {
        const resp = await test.fn()
        const ms   = Math.round(performance.now() - t0)
        const code = resp.status
        const allowed = test.allowedCodes || [200, 201, 202, 204]
        const pass  = allowed.includes(code)

        // Capture workspace/capability IDs from creation responses
        if (test.label.includes('POST /api/workspaces') && resp.data?.id)
          setWsId(resp.data.id)
        if (test.label.includes('POST /api/capabilities') && resp.data?.id) {
          setCapId(resp.data.id)
          currentCapId = resp.data.id
        }

        setResults(prev => ({ ...prev, [key]: { status: pass ? 'pass' : 'fail', code, ms } }))
        appendLog(`${pass ? '✓' : '✗'} ${key} → ${code} (${ms}ms)`)
      } catch (err) {
        const ms   = Math.round(performance.now() - t0)
        const code = err.response?.status ?? 0
        const allowed = test.allowedCodes || [200, 201, 202, 204]
        const pass  = allowed.includes(code)

        setResults(prev => ({ ...prev, [key]: { status: pass ? 'pass' : 'fail', code, ms } }))
        appendLog(`${pass ? '✓' : '✗'} ${key} → ${code} (${ms}ms)  ${err.response?.data?.detail || err.message}`)
      }

      // small delay so UI updates are visible
      await new Promise(r => setTimeout(r, 80))
    }

    setRunning(false)
    appendLog('Done.')
  }, [token, wsId, capId])

  const tests = buildTests(wsId, capId)
  const grouped = tests.reduce((acc, t) => {
    (acc[t.group] = acc[t.group] || []).push(t)
    return acc
  }, {})

  const allResults = Object.values(results)
  const passCount  = allResults.filter(r => r.status === 'pass').length
  const failCount  = allResults.filter(r => r.status === 'fail').length
  const runCount   = allResults.filter(r => r.status !== 'idle').length

  return (
    <div className="min-h-screen bg-(--bg) p-6 space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 px-3 py-1 rounded-full mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Dev Tool — Not visible in production
          </div>
          <h1 className="font-serif font-bold text-2xl text-(--text)">API Test Dashboard</h1>
          <p className="text-xs text-(--muted) mt-1">Hits every backend route and reports status codes + latency.</p>
        </div>

        <div className="flex gap-2 items-center">
          {runCount > 0 && (
            <div className="flex gap-3 text-xs font-bold">
              <span className="text-emerald-600">{passCount} pass</span>
              <span className="text-red-600">{failCount} fail</span>
              <span className="text-(--muted)">{runCount}/{tests.length} run</span>
            </div>
          )}
          <button
            onClick={runTests}
            disabled={running}
            className="rounded-xl bg-(--accent) px-5 py-2.5 text-xs font-bold text-white hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {running && <div className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
            {running ? 'Running…' : '▶  Run All Tests'}
          </button>
        </div>
      </div>

      {/* Auth warning */}
      {!token && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-950/20 p-4 text-xs text-amber-700 dark:text-amber-300 font-medium">
          ⚠ No auth token found. Use <strong>Demo Login</strong> on the login page, or run the seed script and paste the token.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: test groups */}
        <div className="xl:col-span-2 space-y-5">
          {Object.entries(grouped).map(([group, groupTests]) => (
            <div key={group} className="rounded-3xl border border-(--border) bg-(--surface) shadow-[var(--shadow-sm)] overflow-hidden">
              <div className="px-5 py-3 border-b border-(--border) bg-(--accent-bg)/20 flex items-center justify-between">
                <span className="font-serif font-bold text-sm text-(--text)">{group}</span>
                <span className="text-[10px] font-bold text-(--muted)">{groupTests.length} tests</span>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-(--border)">
                  {groupTests.map((t) => {
                    const r = results[t.label]
                    return (
                      <tr key={t.label} className="hover:bg-(--accent-bg)/10 transition-colors">
                        <td className="px-4 py-3 w-16">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${METHOD_COLOR[t.method] || ''}`}>
                            {t.method}
                          </span>
                        </td>
                        <td className="px-2 py-3 font-mono text-[11px] text-(--text) truncate max-w-xs">
                          {t.label}
                        </td>
                        <td className="px-2 py-3 w-20 text-right">
                          {r?.ms != null && (
                            <span className="text-[10px] text-(--muted) font-mono">{r.ms}ms</span>
                          )}
                        </td>
                        <td className="px-4 py-3 w-24 text-right">
                          <Badge status={r?.status || 'idle'} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Right: log + context */}
        <div className="space-y-4">
          {/* Context */}
          <div className="rounded-3xl border border-(--border) bg-(--surface) p-5 shadow-[var(--shadow-sm)] space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-(--muted)">Test Context</span>
            <div className="space-y-2 text-[11px] font-mono">
              <div className="flex gap-2">
                <span className="text-(--muted) shrink-0">Token:</span>
                <span className={`truncate ${token ? 'text-emerald-600' : 'text-red-500'}`}>
                  {token ? `${token.slice(0, 28)}…` : 'None'}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-(--muted) shrink-0">WS ID:</span>
                <span className="text-(--text) truncate">{wsId ? wsId.slice(0, 20) + '…' : '—'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-(--muted) shrink-0">Cap ID:</span>
                <span className="text-(--text) truncate">{capId ? capId.slice(0, 20) + '…' : '—'}</span>
              </div>
            </div>
            <button
              onClick={() => { setWsId(null); setCapId(null); setResults({}); setLog([]) }}
              className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
            >
              Reset context
            </button>
          </div>

          {/* Log */}
          <div className="rounded-3xl border border-(--border) bg-(--surface) shadow-[var(--shadow-sm)] overflow-hidden">
            <div className="px-5 py-3 border-b border-(--border) bg-(--accent-bg)/20 flex items-center justify-between">
              <span className="font-serif font-bold text-sm text-(--text)">Run Log</span>
              {log.length > 0 && (
                <button onClick={() => setLog([])} className="text-[10px] text-(--muted) hover:text-(--text)">Clear</button>
              )}
            </div>
            <div className="p-4 h-72 overflow-y-auto font-mono text-[10px] space-y-1">
              {log.length === 0 ? (
                <span className="text-(--muted)">Logs will appear here…</span>
              ) : (
                log.map((line, i) => (
                  <div key={i} className={`leading-relaxed ${
                    line.startsWith('✓') ? 'text-emerald-600 dark:text-emerald-400'
                    : line.startsWith('✗') ? 'text-red-600 dark:text-red-400'
                    : 'text-(--muted)'
                  }`}>
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

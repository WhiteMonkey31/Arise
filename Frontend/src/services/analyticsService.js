/**
 * Analytics service — aggregated bid history statistics.
 *
 * Backend endpoints:
 *   GET /api/analytics/bid-history          → BidHistoryRow[]
 *   GET /api/analytics/win-rate-by-sector   → WinRateBySector[]
 *   GET /api/analytics/score-vs-outcome     → ScoreVsOutcomePoint[]
 *   GET /api/analytics/compliance-vs-win-rate → ComplianceVsWinRate[]
 */

import api from './api'

export async function getBidHistory({ sector, outcome, limit } = {}) {
  const { data } = await api.get('/api/analytics/bid-history', {
    params: { sector, outcome, limit },
  })
  return data
}

export async function getWinRateBySector() {
  const { data } = await api.get('/api/analytics/win-rate-by-sector')
  return data
}

export async function getScoreVsOutcome() {
  const { data } = await api.get('/api/analytics/score-vs-outcome')
  return data
}

export async function getComplianceVsWinRate() {
  const { data } = await api.get('/api/analytics/compliance-vs-win-rate')
  return data
}

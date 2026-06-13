/**
 * Scoring service — win probability radar + GO/NO-GO recommendation.
 *
 * Backend endpoints:
 *   GET /api/workspaces/{id}/win-score → WinScoreResponse
 *   GET /api/workspaces/{id}/go-no-go  → GoNoGoResponse
 */

import api from './api'

export async function getWinScore(workspaceId) {
  const { data } = await api.get(`/api/workspaces/${workspaceId}/win-score`)
  return data
}

export async function getGoNoGo(workspaceId) {
  const { data } = await api.get(`/api/workspaces/${workspaceId}/go-no-go`)
  return data
}

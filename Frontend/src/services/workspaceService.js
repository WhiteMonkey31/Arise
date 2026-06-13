/**
 * Workspace service — CRUD for workspaces.
 *
 * Backend endpoints (all under /api/workspaces):
 *   GET    /api/workspaces                   → WorkspaceResponse[]
 *   POST   /api/workspaces                   → WorkspaceResponse
 *   GET    /api/workspaces/{id}              → WorkspaceDetailResponse
 *   PUT    /api/workspaces/{id}              → WorkspaceResponse
 *   DELETE /api/workspaces/{id}              → 204
 */

import api from './api'

export async function listWorkspaces() {
  const { data } = await api.get('/api/workspaces')
  return data
}

export async function getWorkspace(workspaceId) {
  const { data } = await api.get(`/api/workspaces/${workspaceId}`)
  return data
}

export async function createWorkspace(payload) {
  const { data } = await api.post('/api/workspaces', payload)
  return data
}

export async function updateWorkspace(workspaceId, payload) {
  const { data } = await api.put(`/api/workspaces/${workspaceId}`, payload)
  return data
}

export async function deleteWorkspace(workspaceId) {
  await api.delete(`/api/workspaces/${workspaceId}`)
}

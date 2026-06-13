/**
 * Proposal service — section CRUD, approval workflow, AI regeneration.
 *
 * Backend endpoints:
 *   GET  /api/workspaces/{id}/proposals                        → ProposalResponse[]
 *   POST /api/workspaces/{id}/proposals/generate               → { job_id, message }
 *   GET  /api/workspaces/{id}/proposals/{section_id}           → ProposalResponse
 *   PUT  /api/workspaces/{id}/proposals/{section_id}           → ProposalResponse
 *   PATCH /api/workspaces/{id}/proposals/{section_id}/status   → ProposalResponse
 *   POST /api/workspaces/{id}/proposals/{section_id}/regenerate → SSE stream
 */

import api from './api'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export async function listProposals(workspaceId) {
  const { data } = await api.get(`/api/workspaces/${workspaceId}/proposals`)
  return data
}

export async function generateProposals(workspaceId) {
  const { data } = await api.post(`/api/workspaces/${workspaceId}/proposals/generate`)
  return data // { job_id, message }
}

export async function getProposal(workspaceId, sectionId) {
  const { data } = await api.get(`/api/workspaces/${workspaceId}/proposals/${sectionId}`)
  return data
}

export async function updateProposal(workspaceId, sectionId, payload) {
  const { data } = await api.put(
    `/api/workspaces/${workspaceId}/proposals/${sectionId}`,
    payload
  )
  return data
}

export async function updateProposalStatus(workspaceId, sectionId, status) {
  const { data } = await api.patch(
    `/api/workspaces/${workspaceId}/proposals/${sectionId}/status`,
    { status }
  )
  return data
}

/**
 * Open an SSE EventSource for AI section regeneration.
 * Caller is responsible for closing the returned EventSource.
 *
 * @param {string} workspaceId
 * @param {string} sectionId
 * @returns {EventSource}
 */
export function openRegenerateStream(workspaceId, sectionId) {
  const token = localStorage.getItem('auth_token')
  // SSE doesn't support custom headers — pass token as query param.
  // Backend must support ?token= for SSE routes if auth is required,
  // otherwise set withCredentials=true and use cookie-based auth.
  const url = `${BASE_URL}/api/workspaces/${workspaceId}/proposals/${sectionId}/regenerate?token=${token}`
  return new EventSource(url)
}

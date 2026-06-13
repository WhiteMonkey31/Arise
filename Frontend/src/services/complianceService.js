/**
 * Compliance service — checklist and item status overrides.
 *
 * Backend endpoints:
 *   GET   /api/workspaces/{id}/compliance           → ComplianceSummary
 *   PATCH /api/workspaces/{id}/compliance/{item_id} → ComplianceItemResponse
 */

import api from './api'

/**
 * Fetch compliance summary + all items for a workspace.
 * @param {string} workspaceId
 * @returns {Promise<ComplianceSummary>}
 */
export async function getCompliance(workspaceId) {
  const { data } = await api.get(`/api/workspaces/${workspaceId}/compliance`)
  return data
}

/**
 * Override the status, notes, or linked capability of a compliance item.
 * @param {string} workspaceId
 * @param {string} itemId
 * @param {{ status?, notes?, capability_id? }} payload
 * @returns {Promise<ComplianceItemResponse>}
 */
export async function patchComplianceItem(workspaceId, itemId, payload) {
  const { data } = await api.patch(
    `/api/workspaces/${workspaceId}/compliance/${itemId}`,
    payload
  )
  return data
}

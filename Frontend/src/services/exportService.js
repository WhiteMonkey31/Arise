/**
 * Export service — trigger DOCX generation and download the file blob.
 *
 * Backend endpoint:
 *   POST /api/workspaces/{id}/export → DOCX file stream
 */

import api from './api'

/**
 * Request DOCX export and trigger browser download.
 * @param {string} workspaceId
 * @param {string} [filename] — optional override; defaults to server-provided name
 */
export async function exportProposal(workspaceId, filename) {
  const response = await api.post(
    `/api/workspaces/${workspaceId}/export`,
    null,
    { responseType: 'blob' }
  )

  // Derive filename from Content-Disposition header if not provided
  const disposition = response.headers['content-disposition'] || ''
  const match = disposition.match(/filename="?([^";\n]+)"?/)
  const resolvedName = filename || (match ? match[1] : `proposal_${workspaceId}.docx`)

  // Trigger browser download
  const url = URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.download = resolvedName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

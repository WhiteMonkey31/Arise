/**
 * Upload service — multipart file upload for RFP documents.
 *
 * Backend endpoints:
 *   POST /api/workspaces/{id}/upload    → { document_id, job_id, filename, status }
 *   GET  /api/workspaces/{id}/documents → DocumentResponse[]
 */

import api from './api'

/**
 * Upload a PDF/DOCX file for a workspace.
 *
 * @param {string} workspaceId
 * @param {File} file
 * @param {(pct: number) => void} [onProgress] — called with 0-100 upload progress
 * @returns {Promise<{ document_id, job_id, filename, status }>}
 */
export async function uploadDocument(workspaceId, file, onProgress) {
  const form = new FormData()
  form.append('file', file)

  const { data } = await api.post(
    `/api/workspaces/${workspaceId}/upload`,
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded / evt.total) * 100))
        }
      },
    }
  )
  return data
}

/**
 * List all documents uploaded to a workspace.
 * @param {string} workspaceId
 * @returns {Promise<DocumentResponse[]>}
 */
export async function listDocuments(workspaceId) {
  const { data } = await api.get(`/api/workspaces/${workspaceId}/documents`)
  return data
}

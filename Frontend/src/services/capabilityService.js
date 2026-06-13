/**
 * Capability service — library CRUD and batch XLSX import.
 *
 * Backend endpoints:
 *   GET    /api/capabilities              → CapabilityResponse[]
 *   POST   /api/capabilities              → CapabilityResponse
 *   PUT    /api/capabilities/{id}         → CapabilityResponse
 *   DELETE /api/capabilities/{id}         → 204
 *   POST   /api/capabilities/import       → ImportResponse
 */

import api from './api'

export async function listCapabilities({ domain, certification, year, search, limit, offset } = {}) {
  const { data } = await api.get('/api/capabilities', {
    params: { domain, certification, year, search, limit, offset },
  })
  return data
}

export async function createCapability(payload) {
  const { data } = await api.post('/api/capabilities', payload)
  return data
}

export async function updateCapability(capabilityId, payload) {
  const { data } = await api.put(`/api/capabilities/${capabilityId}`, payload)
  return data
}

export async function deleteCapability(capabilityId) {
  await api.delete(`/api/capabilities/${capabilityId}`)
}

/**
 * Batch import capabilities from an XLSX file.
 * @param {File} file
 * @returns {Promise<{ created, failed, errors }>}
 */
export async function importCapabilities(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/api/capabilities/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

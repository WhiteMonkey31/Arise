/**
 * Job service — poll Celery background task status.
 *
 * Backend endpoint:
 *   GET /api/jobs/{job_id} → JobResponse { id, status, progress_pct, error_msg, ... }
 */

import api from './api'

/**
 * Fetch the current status of a background job.
 * @param {string} jobId
 * @returns {Promise<JobResponse>}
 */
export async function getJobStatus(jobId) {
  const { data } = await api.get(`/api/jobs/${jobId}`)
  return data
}

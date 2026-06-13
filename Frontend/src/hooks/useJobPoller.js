/**
 * useJobPoller — polls /api/jobs/{jobId} every 2 seconds until the job
 * reaches status "done" or "failed", then stops automatically.
 *
 * @param {string|null} jobId
 * @returns {{ status, progress, error, isDone }}
 */

import { useQuery } from '@tanstack/react-query'
import { getJobStatus } from '../services/jobService'

const TERMINAL_STATUSES = new Set(['done', 'failed'])

export function useJobPoller(jobId) {
  const { data, error } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => getJobStatus(jobId),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (!status || TERMINAL_STATUSES.has(status)) return false
      return 2000
    },
    staleTime: 0,
  })

  return {
    status: data?.status ?? null,
    progress: data?.progress_pct ?? 0,
    error: data?.error_msg ?? (error?.message || null),
    isDone: TERMINAL_STATUSES.has(data?.status),
  }
}

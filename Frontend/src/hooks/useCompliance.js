/**
 * useCompliance — React Query hook for compliance checklist.
 *
 * useComplianceData(workspaceId)   → query for full compliance summary
 * usePatchCompliance()             → mutation with optimistic update
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCompliance, patchComplianceItem } from '../services/complianceService'

export const complianceKey = (workspaceId) => ['compliance', workspaceId]

export function useComplianceData(workspaceId) {
  return useQuery({
    queryKey: complianceKey(workspaceId),
    queryFn: () => getCompliance(workspaceId),
    enabled: !!workspaceId,
    staleTime: 15_000,
  })
}

export function usePatchCompliance(workspaceId) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, payload }) => patchComplianceItem(workspaceId, itemId, payload),

    // Optimistic update — immediately reflect status change in the cache
    onMutate: async ({ itemId, payload }) => {
      await qc.cancelQueries({ queryKey: complianceKey(workspaceId) })
      const snapshot = qc.getQueryData(complianceKey(workspaceId))

      qc.setQueryData(complianceKey(workspaceId), (old) => {
        if (!old) return old
        return {
          ...old,
          items: old.items.map((item) =>
            item.id === itemId ? { ...item, ...payload } : item
          ),
        }
      })

      return { snapshot }
    },

    onError: (_err, _vars, ctx) => {
      // Roll back on failure
      if (ctx?.snapshot) {
        qc.setQueryData(complianceKey(workspaceId), ctx.snapshot)
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: complianceKey(workspaceId) })
    },
  })
}

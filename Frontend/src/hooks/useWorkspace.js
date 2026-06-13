/**
 * useWorkspace — React Query hook for workspace data.
 *
 * useWorkspaces()            list all workspaces for the org
 * useWorkspaceDetail(id)     single workspace with documents
 * useCreateWorkspace()       mutation → POST /api/workspaces
 * useUpdateWorkspace()       mutation → PUT /api/workspaces/{id}
 * useDeleteWorkspace()       mutation → DELETE /api/workspaces/{id}
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import * as ws from '../services/workspaceService'

export const WORKSPACES_KEY = ['workspaces']
export const workspaceKey = (id) => ['workspace', id]

// ── Queries ──────────────────────────────────────────────────────────────────

export function useWorkspaces() {
  return useQuery({
    queryKey: WORKSPACES_KEY,
    queryFn: ws.listWorkspaces,
    staleTime: 30_000,
  })
}

export function useWorkspaceDetail(workspaceId) {
  return useQuery({
    queryKey: workspaceKey(workspaceId),
    queryFn: () => ws.getWorkspace(workspaceId),
    enabled: !!workspaceId,
    staleTime: 20_000,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => ws.createWorkspace(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKSPACES_KEY }),
  })
}

export function useUpdateWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, payload }) => ws.updateWorkspace(workspaceId, payload),
    onSuccess: (_, { workspaceId }) => {
      qc.invalidateQueries({ queryKey: WORKSPACES_KEY })
      qc.invalidateQueries({ queryKey: workspaceKey(workspaceId) })
    },
  })
}

export function useDeleteWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (workspaceId) => ws.deleteWorkspace(workspaceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKSPACES_KEY }),
  })
}

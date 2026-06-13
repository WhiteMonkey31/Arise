/**
 * useProposal — React Query hook for proposal sections.
 *
 * useProposals(workspaceId)      → query for all sections
 * useGenerateProposals()         → mutation → POST …/generate (returns job_id)
 * useSaveProposal()              → mutation → PUT …/{section_id}
 * useApproveProposal()           → mutation → PATCH …/{section_id}/status (approved)
 * useRejectProposal()            → mutation → PATCH …/{section_id}/status (pending)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as ps from '../services/proposalService'

export const proposalsKey = (workspaceId) => ['proposals', workspaceId]

export function useProposals(workspaceId) {
  return useQuery({
    queryKey: proposalsKey(workspaceId),
    queryFn: () => ps.listProposals(workspaceId),
    enabled: !!workspaceId,
    staleTime: 20_000,
  })
}

export function useGenerateProposals(workspaceId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => ps.generateProposals(workspaceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: proposalsKey(workspaceId) }),
  })
}

export function useSaveProposal(workspaceId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sectionId, payload }) => ps.updateProposal(workspaceId, sectionId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: proposalsKey(workspaceId) }),
  })
}

export function useApproveProposal(workspaceId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sectionId) => ps.updateProposalStatus(workspaceId, sectionId, 'approved'),
    onSuccess: () => qc.invalidateQueries({ queryKey: proposalsKey(workspaceId) }),
  })
}

export function useRejectProposal(workspaceId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sectionId) => ps.updateProposalStatus(workspaceId, sectionId, 'pending'),
    onSuccess: () => qc.invalidateQueries({ queryKey: proposalsKey(workspaceId) }),
  })
}

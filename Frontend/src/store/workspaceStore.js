/**
 * workspaceStore — lightweight Zustand store.
 *
 * After connecting to the backend all workspace and capability LIST data
 * is owned by React Query. This store only holds:
 *   - activeWorkspaceId  (which workspace tab is open in the sidebar)
 *   - selectedRequirementId  (which row is highlighted in CompliancePage)
 *
 * All mock initial data and local-only CRUD actions have been removed.
 */

import { create } from 'zustand'

export const useWorkspaceStore = create((set) => ({
  activeWorkspaceId: null,
  selectedRequirementId: null,

  setActiveWorkspace: (id) => set({ activeWorkspaceId: id, selectedRequirementId: null }),
  setSelectedRequirement: (id) => set({ selectedRequirementId: id }),
}))
